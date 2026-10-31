#!/usr/bin/env python3
"""Private, CPU-only SenseVoice worker. No audio is stored or logged.

The text gateway stays stdlib-only. Native model inference lives in a child
process so a hard inference deadline can terminate it even inside C++ code.
"""
import ipaddress
import json
import multiprocessing
import os
from pathlib import Path
import re
import socket
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from speech_audio import AudioError, MAX_AUDIO_BYTES, SAMPLE_RATE, read_pcm


class SpeechError(Exception):
    def __init__(self, code, status=503):
        self.code, self.status = code, status


def create_recognizer(model_dir):
    # Imported only in the separate CPU process, never the text service.
    import sherpa_onnx
    directory = Path(model_dir)
    return sherpa_onnx.OfflineRecognizer.from_sense_voice(
        model=str(directory / 'model.int8.onnx'), tokens=str(directory / 'tokens.txt'),
        num_threads=1, sample_rate=SAMPLE_RATE, debug=False, language='auto',
        use_itn=True, provider='cpu:' + str(directory / 'cpu.config'))


def decode(recognizer, raw):
    import numpy as np
    samples = read_pcm(raw)
    audio = np.asarray(samples, dtype=np.float32) / 32768.0
    stream = recognizer.create_stream()
    stream.accept_waveform(SAMPLE_RATE, audio)
    recognizer.decode_stream(stream)
    # SenseVoice metadata must not appear in the user's input field.
    return re.sub(r'<\|[^|<>]*\|>', '', stream.result.text).strip()[:1000]


def inference_child(connection, model_dir):
    try:
        recognizer = create_recognizer(model_dir)
        connection.send(('ready', None))
        while True:
            raw = connection.recv_bytes(MAX_AUDIO_BYTES)
            try:
                text = decode(recognizer, raw)
                connection.send(('ok', text))
            except AudioError as exc:
                connection.send(('error', exc.code))
            except Exception:
                connection.send(('error', 'voice_unavailable'))
    except (EOFError, BrokenPipeError):
        pass
    except Exception:
        try:
            connection.send(('error', 'voice_unavailable'))
        except (OSError, EOFError):
            pass
    finally:
        connection.close()


class RecognizerProcess:
    def __init__(self, model_dir):
        context = multiprocessing.get_context('spawn')
        self.connection, child = context.Pipe()
        self.process = context.Process(target=inference_child, args=(child, model_dir), daemon=True)
        self.process.start()
        child.close()
        if not self.connection.poll(45) or self.connection.recv()[0] != 'ready':
            self.close()
            raise RuntimeError('Speech model initialization failed')

    def close(self):
        self.connection.close()
        if self.process.is_alive():
            self.process.terminate()
            self.process.join(1)
            if self.process.is_alive():
                self.process.kill()
        self.process.join(1)

    def __call__(self, raw):
        try:
            self.connection.send_bytes(raw)
            if not self.connection.poll(28):
                raise TimeoutError()
            status, value = self.connection.recv()
        except (OSError, EOFError, TimeoutError):
            self.close()
            # systemd restarts only this isolated service; the text API stays up.
            threading.Timer(.5, lambda: os._exit(1)).start()
            raise SpeechError('voice_unavailable') from None
        if status != 'ok':
            raise SpeechError('voice_empty' if value == 'voice_empty' else 'voice_unavailable',
                              422 if value == 'voice_empty' else 503)
        if not isinstance(value, str) or not value.strip():
            raise SpeechError('voice_empty', 422)
        return value[:1000]


class Handler(BaseHTTPRequestHandler):
    timeout = 5
    server_version = 'PortfolioSpeech'
    sys_version = ''

    def setup(self):
        super().setup()
        self.input_timer = threading.Timer(5, self.expire_input)
        self.input_timer.daemon = True
        self.input_timer.start()

    def expire_input(self):
        try:
            self.connection.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass

    def finish(self):
        self.input_timer.cancel()
        super().finish()

    def log_message(self, *_):
        pass

    def respond(self, status, data):
        self.input_timer.cancel()
        raw = json.dumps(data, ensure_ascii=False).encode()
        try:
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(raw)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(raw)
        except OSError:
            pass

    def do_GET(self):
        if self.path == '/health':
            return self.respond(200, {'ready': True})
        self.respond(404, {'status': 'error', 'error': {'code': 'not_found'}})

    def do_POST(self):
        occupied = False
        try:
            if not ipaddress.ip_address(self.client_address[0]).is_loopback or self.path != '/transcribe':
                raise SpeechError('not_found', 404)
            if self.headers.get('Transfer-Encoding') or self.headers.get_content_type() != 'audio/wav':
                raise SpeechError('invalid_audio', 415)
            lengths = self.headers.get_all('Content-Length', [])
            if len(lengths) != 1 or not lengths[0].isdigit():
                raise SpeechError('invalid_audio', 411)
            length = int(lengths[0])
            if not 44 <= length <= MAX_AUDIO_BYTES:
                raise SpeechError('invalid_audio', 413)
            occupied = self.server.inference_slot.acquire(blocking=False)
            if not occupied:
                raise SpeechError('voice_busy', 429)
            raw = self.rfile.read(length)
            self.input_timer.cancel()
            if len(raw) != length:
                raise SpeechError('invalid_audio', 400)
            read_pcm(raw)
            text = self.server.recognize(raw)
            self.respond(200, {'status': 'ok', 'text': text})
        except AudioError as exc:
            self.respond(422 if exc.code == 'voice_empty' else 400,
                         {'status': 'error', 'error': {'code': exc.code}})
        except SpeechError as exc:
            self.respond(exc.status, {'status': 'error', 'error': {'code': exc.code}})
        except Exception:
            self.respond(503, {'status': 'error', 'error': {'code': 'voice_unavailable'}})
        finally:
            if occupied:
                self.server.inference_slot.release()


class Server(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, recognize):
        if not ipaddress.ip_address(address[0]).is_loopback:
            raise ValueError('Speech worker must remain private on loopback')
        self.recognize = recognize
        self.inference_slot = threading.BoundedSemaphore(1)
        self.request_slots = threading.BoundedSemaphore(4)
        super().__init__(address, Handler)

    def process_request(self, sock, address):
        if not self.request_slots.acquire(blocking=False):
            self.shutdown_request(sock)
            return
        try:
            super().process_request(sock, address)
        except Exception:
            self.request_slots.release()
            raise

    def process_request_thread(self, sock, address):
        try:
            super().process_request_thread(sock, address)
        finally:
            self.request_slots.release()

    def handle_error(self, *_):
        pass


if __name__ == '__main__':
    os.umask(0o077)
    recognizer = RecognizerProcess(os.environ.get('SPEECH_MODEL_DIR', '/opt/portfolio-speech/model'))
    server = Server(('127.0.0.1', 8792), recognizer)
    print('Portfolio speech worker ready on loopback', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        recognizer.close()
