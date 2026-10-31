"""Voice protocol/security/lifecycle tests; no microphone, model download or API."""
from dataclasses import replace
import concurrent.futures
import http.client
import importlib.util
import io
import json
import math
from pathlib import Path
import struct
import sys
import tempfile
import threading
import unittest
from unittest.mock import Mock, patch
import wave

from speech_audio import AudioError, MAX_AUDIO_BYTES, read_pcm
import speech_worker

spec = importlib.util.spec_from_file_location('voice_gateway', Path(__file__).with_name('server.py'))
service = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = service
spec.loader.exec_module(service)


def wav(seconds=.2, *, rate=16000, channels=1, width=2, silent=False):
    target = io.BytesIO()
    with wave.open(target, 'wb') as source:
        source.setparams((channels, width, rate, 0, 'NONE', 'not compressed'))
        frames = int(rate * seconds)
        samples = [0 if silent else int(5000 * math.sin(n * .2)) for n in range(frames * channels)]
        source.writeframes(struct.pack('<' + 'h' * len(samples), *samples) if width == 2 else b'\0' * frames * channels * width)
    return target.getvalue()


class AudioTests(unittest.TestCase):
    def test_wav_contract_no_codecs_and_no_unbounded_duration(self):
        self.assertEqual(len(read_pcm(wav())), 3200)
        self.assertEqual(len(read_pcm(wav(20))), 320000)
        invalid = [b'not a wave', wav(rate=48000), wav(channels=2), wav(width=1),
                   wav(.05), wav(20.1), wav()[:-2], wav() + b'junk', b'x' * (MAX_AUDIO_BYTES + 1)]
        for raw in invalid:
            with self.subTest(size=len(raw)), self.assertRaises(AudioError) as caught:
                read_pcm(raw)
            self.assertEqual(caught.exception.code, 'invalid_audio')

    def test_silence_is_rejected_before_any_model_call(self):
        with self.assertRaises(AudioError) as caught:
            read_pcm(wav(silent=True))
        self.assertEqual(caught.exception.code, 'voice_empty')


class VoiceGatewayTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.calls = []
        self.config = service.Config('test-only-key', b'x' * 32,
            str(Path(self.temp.name) / 'quota.sqlite3'), 'public facts', speech_enabled=True)
        self.app = service.Application(self.config, _speech=self.recognize, _upstream=lambda *_: 'chat works', _clock=lambda: 1800000000)
        self.server = service.Server(('127.0.0.1', 0), self.app)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.ip = self.app.ip('127.0.0.1', None)
        token, csrf = self.app.session(self.ip)
        self.auth = {'Cookie': service.COOKIE + '=' + token, 'X-CSRF-Token': csrf}

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def recognize(self, raw):
        self.calls.append(raw)
        return '我想了解这个数独项目。'

    def http(self, raw, *, headers=None, method='POST'):
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=3)
        sent = {'Origin': 'https://bing2002.com', 'Content-Type': 'audio/wav', **self.auth, **(headers or {})}
        conn.request(method, '/portfolio-ai/transcribe', raw, sent)
        response = conn.getresponse()
        data = json.loads(response.read())
        result = response.status, dict(response.getheaders()), data
        conn.close()
        return result

    def test_real_http_wav_contract_and_cors_no_transcript_persistence(self):
        status, headers, data = self.http(wav())
        self.assertEqual((status, data), (200, {'status': 'ok', 'text': '我想了解这个数独项目。'}))
        self.assertEqual(headers['Access-Control-Allow-Origin'], 'https://bing2002.com')
        self.assertEqual(headers['Cache-Control'], 'no-store')
        with service.closing(service.sqlite3.connect(self.config.database)) as db:
            buckets = [row[0] for row in db.execute('SELECT bucket FROM counters')]
        self.assertIn('voice-global-day', buckets)
        self.assertNotIn('global-day', buckets)
        raw = Path(self.config.database).read_bytes()
        self.assertNotIn('我想了解'.encode(), raw)
        self.assertNotIn(b'RIFF', raw)

    def test_auth_origin_format_size_and_silence_fail_without_inference(self):
        for headers, expected in [({'Origin': 'https://evil.example'}, 403),
                ({'X-CSRF-Token': 'bad'}, 403), ({'Cookie': ''}, 403),
                ({'Content-Type': 'audio/webm'}, 415), ({'Transfer-Encoding': 'chunked'}, 415)]:
            self.assertEqual(self.http(wav(), headers=headers)[0], expected)
        self.assertEqual(self.http(b'x' * (MAX_AUDIO_BYTES + 1))[0], 413)
        self.assertEqual(self.http(wav(silent=True))[0], 422)
        self.assertEqual(self.http(b'bad')[0], 400)
        self.assertEqual(self.calls, [])
        self.assertEqual(self.http(None, method='OPTIONS', headers={
            'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-csrf-token'})[0], 200)
        self.assertEqual(self.http(None, method='OPTIONS', headers={
            'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization'})[0], 400)

    def test_disabled_fails_closed_independently_of_text_model(self):
        self.app.config = replace(self.config, speech_enabled=False)
        status, _, data = self.http(wav())
        self.assertEqual((status, data['error']['code']), (503, 'voice_unavailable'))
        self.assertEqual(self.app.chat([{'role': 'user', 'content': 'question'}], self.ip, 'sid'), 'chat works')
        self.assertEqual(self.calls, [])

    def test_voice_budget_survives_restart_and_failure_chat_not_spent(self):
        config = replace(self.config, voice_global_day=1)
        def fail(_):
            raise service.ServiceError('voice_unavailable', 503)
        app = service.Application(config, _speech=fail, _clock=lambda: 1800000000)
        with self.assertRaises(service.ServiceError):
            app.transcribe(wav(), self.ip, 'sid')
        again = service.Application(config, _speech=self.recognize, _clock=lambda: 1800000000)
        with self.assertRaises(service.ServiceError) as caught:
            again.transcribe(wav(), 'another-ip', 'another-sid')
        self.assertEqual(caught.exception.code, 'quota_exceeded')
        self.assertEqual(self.calls, [])
        self.assertEqual(self.app.chat([{'role': 'user', 'content': 'question'}], self.ip, 'sid'), 'chat works')

    def test_single_inference_no_queue_but_text_can_continue(self):
        entered, release = threading.Event(), threading.Event()
        def waiting(raw):
            entered.set()
            release.wait(2)
            return self.recognize(raw)
        self.app.speech = waiting
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            running = pool.submit(self.app.transcribe, wav(), self.ip, 'sid')
            self.assertTrue(entered.wait(1))
            try:
                with self.assertRaises(service.ServiceError) as caught:
                    self.app.transcribe(wav(), self.ip, 'sid')
                self.assertEqual(caught.exception.code, 'voice_busy')
                self.assertEqual(self.app.chat([{'role': 'user', 'content': 'question'}], self.ip, 'sid'), 'chat works')
            finally:
                release.set()
            self.assertEqual(running.result(), '我想了解这个数独项目。')

    def test_local_worker_transport_fixed_loopback_no_keys_and_redacted_failures(self):
        body = json.dumps({'status': 'ok', 'text': 'Recognized speech.'}).encode()
        with patch.object(service.request.OpenerDirector, 'open', return_value=io.BytesIO(body)) as mocked:
            self.assertEqual(service.local_transcribe(wav()), 'Recognized speech.')
            req = mocked.call_args.args[0]
            self.assertEqual(req.full_url, 'http://127.0.0.1:8792/transcribe')
            self.assertIsNone(req.get_header('Authorization'))
            self.assertEqual(req.get_header('Content-type'), 'audio/wav')
        self.app.speech = lambda _: (_ for _ in ()).throw(RuntimeError('test-only-key'))
        status, _, result = self.http(wav())
        self.assertEqual(status, 503)
        self.assertNotIn('test-only-key', json.dumps(result))


class PrivateWorkerTests(unittest.TestCase):
    def test_hung_native_inference_is_terminated_and_only_worker_restarts(self):
        recognizer = object.__new__(speech_worker.RecognizerProcess)
        recognizer.connection = Mock()
        recognizer.connection.poll.return_value = False
        recognizer.process = Mock()
        recognizer.process.is_alive.return_value = True
        with patch.object(speech_worker.threading, 'Timer') as timer:
            with self.assertRaises(speech_worker.SpeechError) as caught:
                recognizer(wav())
            self.assertEqual(caught.exception.code, 'voice_unavailable')
            recognizer.connection.poll.assert_called_once_with(28)
            recognizer.process.terminate.assert_called_once()
            recognizer.process.kill.assert_called_once()
            recognizer.connection.close.assert_called_once()
            timer.return_value.start.assert_called_once()

    def test_private_http_worker_validates_audio_and_stays_loopback(self):
        calls = []
        server = speech_worker.Server(('127.0.0.1', 0), lambda raw: calls.append(raw) or 'Recognized.')
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            for raw, expected in [(wav(silent=True), 422), (b'bad', 413), (wav(), 200)]:
                conn = http.client.HTTPConnection('127.0.0.1', server.server_port, timeout=3)
                conn.request('POST', '/transcribe', raw, {'Content-Type': 'audio/wav'})
                result = conn.getresponse()
                self.assertEqual(result.status, expected)
                result.read()
                conn.close()
            self.assertEqual(len(calls), 1)
            with self.assertRaises(ValueError):
                speech_worker.Server(('0.0.0.0', 0), lambda _: '')
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == '__main__':
    unittest.main()
