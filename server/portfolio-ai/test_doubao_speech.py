"""Seed-ASR binary contract, bounded I/O and secret-safe errors; no paid API."""
import asyncio
from concurrent.futures import ThreadPoolExecutor
import gzip
import io
import json
import math
import ssl
import struct
import sys
import threading
import time
import types
import unittest
from unittest.mock import Mock, patch
import wave

import doubao_speech as speech


def wav(seconds=.2, silent=False):
    target = io.BytesIO()
    with wave.open(target, 'wb') as out:
        out.setparams((1, 2, 16000, 0, 'NONE', 'not compressed'))
        values = [0 if silent else int(4000 * math.sin(i * .2)) for i in range(int(16000 * seconds))]
        out.writeframes(struct.pack('<' + 'h' * len(values), *values))
    return target.getvalue()


def response(data=None, *, final=False, compressed=True, sequence=1, event=None):
    body = json.dumps({} if data is None else data, ensure_ascii=False).encode()
    if compressed:
        body = gzip.compress(body)
    flags = 1 | (2 if final else 0) | (4 if event is not None else 0)
    head = bytes((0x11, 0x90 | flags, 0x10 | int(compressed), 0))
    sequence = -abs(sequence) if final else sequence
    prefix = struct.pack('>i', sequence) + (struct.pack('>i', event) if event is not None else b'')
    return head + prefix + struct.pack('>I', len(body)) + body


class Transport:
    def __init__(self):
        self.aborted = False

    def abort(self):
        self.aborted = True


class Connection:
    def __init__(self, responses=None, status=None):
        self.responses = list(responses if responses is not None else [response(), response({'result': {'text': '  你好。  '}}, final=True)])
        self.response = types.SimpleNamespace(headers={} if status is None else {'X-Api-Status-Code': status})
        self.transport = Transport()
        self.sent = []

    async def send(self, message):
        self.sent.append(message)

    async def recv(self):
        if not self.responses:
            await asyncio.Event().wait()
        return self.responses.pop(0)


class DoubaoTests(unittest.TestCase):
    key = 'test-only-doubao-secret'

    def call(self, connection=None, raw=None):
        connection = connection or Connection()
        headers_seen = []

        async def connect(headers):
            headers_seen.append(headers)
            return connection

        with patch.object(speech, '_connect', side_effect=connect):
            text = speech.recognize(wav() if raw is None else raw, self.key)
        return text, connection, headers_seen

    def test_correct_model_auth_pcm_binary_sequences_and_final_text(self):
        raw = wav(.45)
        text, connection, headers = self.call(raw=raw)
        self.assertEqual(text, '你好。')
        self.assertEqual(len(headers), 1)
        self.assertEqual(headers[0]['X-Api-Key'], self.key)
        self.assertEqual(headers[0]['X-Api-Resource-Id'], 'volc.seedasr.sauc.duration')
        packets = connection.sent
        self.assertEqual(len(packets), 4)
        self.assertEqual(packets[0][:4], bytes.fromhex('11111100'))
        self.assertEqual(struct.unpack_from('>i', packets[0], 4)[0], 1)
        config = json.loads(gzip.decompress(packets[0][12:]))
        self.assertEqual(config['audio'], {'format': 'pcm', 'codec': 'raw', 'rate': 16000, 'bits': 16, 'channel': 1})
        self.assertEqual(config['request']['model_name'], 'bigmodel')
        self.assertFalse(config['request']['enable_ddc'])
        self.assertNotIn(self.key, json.dumps(config))
        self.assertEqual([struct.unpack_from('>i', p, 4)[0] for p in packets[1:]], [2, 3, -4])
        self.assertEqual(packets[-1][:4], bytes.fromhex('11231100'))
        pcm = b''.join(gzip.decompress(p[12:]) for p in packets[1:])
        with wave.open(io.BytesIO(raw), 'rb') as source:
            self.assertEqual(pcm, source.readframes(source.getnframes()))
        self.assertTrue(connection.transport.aborted)

    def test_invalid_audio_silence_and_header_injection_never_connect(self):
        with patch.object(speech, '_connect') as connect:
            for raw, key, code in [(b'bad', self.key, 'invalid_audio'), (wav(20.1), self.key, 'invalid_audio'),
                                   (wav(silent=True), self.key, 'voice_empty'), (wav(), '', 'voice_not_configured'),
                                   (wav(), 'secret\r\nheader', 'voice_not_configured'),
                                   (wav(), 'x' * 513, 'voice_not_configured')]:
                with self.subTest(code=code), self.assertRaises(speech.SpeechError) as caught:
                    speech.recognize(raw, key)
                self.assertEqual(caught.exception.code, code)
            connect.assert_not_called()

    def test_connector_is_fixed_tls_verified_without_redirects_proxies_compression_or_logs(self):
        class BaseConnect:
            def __init__(self, *args, **kwargs):
                self.args, self.kwargs = args, kwargs

        client = types.ModuleType('websockets.asyncio.client')
        client.connect = BaseConnect
        with patch.dict(sys.modules, {'websockets.asyncio.client': client}):
            connector = speech._connect({'X-Api-Key': self.key})
        self.assertEqual(connector.args, ('wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_nostream',))
        options = connector.kwargs
        self.assertIsNone(options['proxy'])
        self.assertIsNone(options['compression'])
        self.assertTrue(options['ssl'].check_hostname)
        self.assertEqual(options['ssl'].verify_mode, ssl.CERT_REQUIRED)
        self.assertEqual(options['max_size'], 32768)
        self.assertEqual(options['max_queue'], 1)
        self.assertTrue(options['logger'].disabled)
        error = RuntimeError('redirect to https://attacker.invalid')
        self.assertIs(connector.process_redirect(error), error)

    def test_protocol_parses_plain_gzip_optional_events_and_final_flag(self):
        for compressed in (True, False):
            data, final = speech._response(response({'result': {'text': 'hello'}}, final=True, compressed=compressed, event=0))
            self.assertEqual(data['result']['text'], 'hello')
            self.assertTrue(final)

    def test_unknown_packets_truncation_size_mismatch_and_json_schema_are_rejected(self):
        valid = response()
        malformed = [b'', b'\x11' * 7, 'text-frame', b'x' * 32769,
                     bytes((0x21,)) + valid[1:], valid[:5], valid[:-1], valid + b'junk',
                     bytes((0x11, 0x51)) + valid[2:], valid[:2] + b'\x12' + valid[3:],
                     response([])]
        for frame in malformed:
            with self.subTest(size=len(frame)), self.assertRaises(speech.SpeechError):
                speech._response(frame)

    def test_application_gzip_bombs_truncation_and_concatenation_are_bounded(self):
        for compressed in [gzip.compress(b'a' * 1000000), gzip.compress(b'{}')[:-1],
                           gzip.compress(b'{}') + gzip.compress(b'{}')]:
            with self.subTest(size=len(compressed)), self.assertRaises(speech.SpeechError):
                speech._decompress(compressed)

    def test_binary_provider_errors_ignore_secret_error_bodies(self):
        for code, normalized in [(20000003, 'voice_empty'), (45000002, 'voice_empty'),
                                 (55000031, 'voice_busy'), (45000001, 'voice_unavailable')]:
            body = self.key.encode()
            packet = bytes.fromhex('11f01000') + struct.pack('>iI', code, len(body)) + body
            with self.subTest(code=code), self.assertRaises(speech.SpeechError) as caught:
                speech._response(packet)
            self.assertEqual(caught.exception.code, normalized)
            self.assertNotIn(self.key, str(caught.exception))

    def test_only_final_bounded_text_can_escape(self):
        for result, code in [({}, 'voice_unavailable'), ({'result': []}, 'voice_unavailable'),
                             ({'result': {'text': 1}}, 'voice_unavailable'),
                             ({'result': {'text': ' '}}, 'voice_empty'),
                             ({'result': {'text': 'x' * 1001}}, 'voice_unavailable')]:
            connection = Connection([response(), response(result, final=True)])
            with self.subTest(code=code), self.assertRaises(speech.SpeechError) as caught:
                self.call(connection)
            self.assertEqual(caught.exception.code, code)
            self.assertTrue(connection.transport.aborted)
        text, _, _ = self.call(Connection([response(), response({'result': {'text': 'partial'}}),
                                          response({'result': {'text': 'final'}}, final=True)]))
        self.assertEqual(text, 'final')

    def test_total_deadline_cancels_receiving_and_aborts_transport(self):
        connection = Connection([response()])
        with patch.object(speech, 'TIMEOUT_SECONDS', .02), self.assertRaises(speech.SpeechError) as caught:
            self.call(connection)
        self.assertEqual((caught.exception.code, caught.exception.status), ('timeout', 504))
        self.assertTrue(connection.transport.aborted)

    def test_blocked_dns_does_not_delay_timeout_until_executor_shutdown(self):
        entered, release, finished = threading.Event(), threading.Event(), threading.Event()

        def stalled_dns():
            entered.set()
            release.wait(.25)
            finished.set()

        async def connect(_headers):
            await asyncio.to_thread(stalled_dns)

        try:
            started = time.monotonic()
            with patch.object(speech, 'TIMEOUT_SECONDS', .02), patch.object(speech, '_connect', side_effect=connect):
                with self.assertRaises(speech.SpeechError) as caught:
                    speech.recognize(wav(), self.key)
            elapsed = time.monotonic() - started
            self.assertEqual((caught.exception.code, caught.exception.status), ('timeout', 504))
            self.assertTrue(entered.is_set(), 'exercise a real executor thread, not just a cancelled coroutine')
            self.assertFalse(finished.is_set(), 'timeout must return while the DNS thread is still blocked')
            self.assertLess(elapsed, .24)
            # A cancelled queued DNS job must not run after the blocked one.
            queued = threading.Event()
            async def queued_connect(_headers):
                await asyncio.to_thread(queued.set)
            with patch.object(speech, 'TIMEOUT_SECONDS', .02), patch.object(speech, '_connect', side_effect=queued_connect):
                with self.assertRaises(speech.SpeechError):
                    speech.recognize(wav(), self.key)
            release.set()
            self.assertTrue(finished.wait(1))
            loop = speech._get_loop()
            asyncio.run_coroutine_threadsafe(asyncio.sleep(.01), loop).result(timeout=1)
            self.assertFalse(queued.is_set(), 'cancelled DNS queue entries must not later issue a connection')
        finally:
            release.set()
            finished.wait(1)

    def test_requests_share_one_lazy_io_loop_and_single_dns_executor(self):
        loop = speech._get_loop()
        with ThreadPoolExecutor(max_workers=4) as callers:
            loops = list(callers.map(lambda _: speech._get_loop(), range(12)))
        self.assertTrue(all(candidate is loop for candidate in loops))
        self.assertEqual(sum(thread.name == 'portfolio-doubao-io' for thread in threading.enumerate()), 1)
        async def dns_thread():
            return await asyncio.to_thread(threading.get_ident)
        first = asyncio.run_coroutine_threadsafe(dns_thread(), loop).result(timeout=1)
        second = asyncio.run_coroutine_threadsafe(dns_thread(), loop).result(timeout=1)
        self.assertEqual(first, second)
        self.assertEqual(sum(thread.name.startswith('portfolio-doubao-dns') for thread in threading.enumerate()), 1)

    def test_http_thread_deadline_also_cancels_an_exchange_without_an_async_deadline(self):
        cancelled = threading.Event()
        async def waiting(_pcm, _key):
            try:
                await asyncio.Event().wait()
            finally:
                cancelled.set()
        started = time.monotonic()
        with patch.object(speech, 'TIMEOUT_SECONDS', .02), patch.object(speech, '_bounded_exchange', side_effect=waiting):
            with self.assertRaises(speech.SpeechError) as caught:
                speech.recognize(wav(), self.key)
        self.assertEqual((caught.exception.code, caught.exception.status), ('timeout', 504))
        self.assertLess(time.monotonic() - started, .6)
        self.assertTrue(cancelled.wait(1))

    def test_initialization_lock_is_bounded_and_does_not_spawn_another_loop(self):
        lock = Mock()
        lock.acquire.return_value = False
        with patch.object(speech, '_LOOP', None), patch.object(speech, '_LOOP_LOCK', lock):
            with self.assertRaises(speech.SpeechError) as caught:
                speech._get_loop()
        self.assertEqual((caught.exception.code, caught.exception.status), ('voice_busy', 429))
        lock.acquire.assert_called_once_with(timeout=2)
        lock.release.assert_not_called()

    def test_response_message_count_is_capped(self):
        connection = Connection([response()] * (speech.MAX_MESSAGES + 2))
        with self.assertRaises(speech.SpeechError) as caught:
            self.call(connection)
        self.assertEqual(caught.exception.code, 'voice_unavailable')
        self.assertTrue(connection.transport.aborted)

    def test_handshake_permission_failure_and_network_error_never_echo_key_or_retry(self):
        for status, code in [(401, 'voice_not_configured'), (403, 'voice_not_configured'),
                             (429, 'voice_busy'), (302, 'voice_unavailable'), (None, 'voice_unavailable')]:
            error = RuntimeError(self.key)
            error.response = types.SimpleNamespace(status_code=status)

            async def fail(_):
                raise error

            with self.subTest(status=status), patch.object(speech, '_connect', side_effect=fail) as connect:
                with self.assertRaises(speech.SpeechError) as caught:
                    speech.recognize(wav(), self.key)
                self.assertEqual(caught.exception.code, code)
                self.assertNotIn(self.key, str(caught.exception))
                self.assertTrue(caught.exception.__suppress_context__)
                self.assertEqual(connect.call_count, 1)


if __name__ == '__main__':
    unittest.main()
