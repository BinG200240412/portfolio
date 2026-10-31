"""Private Seed-ASR 2.0 one-sentence adapter, using the official V3 protocol.

The gateway owns cookie/CSRF checks, durable quotas and concurrency. Audio and
provider responses stay in memory. Only final text or stable errors escape.
Protocol: https://docs.volcengine.com/docs/doubao-voice/unidirectional-streaming-automatic-speech-recognition-websocket
"""
import asyncio
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
import gzip
import json
import logging
import ssl
import struct
import sys
import threading
import uuid
import zlib

from speech_audio import AudioError, SAMPLE_RATE, read_pcm


ENDPOINT = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_nostream'
RESOURCE_ID = 'volc.seedasr.sauc.duration'
TIMEOUT_SECONDS = 25
MAX_MESSAGE_BYTES = 32 * 1024
MAX_MESSAGES = 128
CHUNK_BYTES = 6400  # 200ms PCM16 / mono / 16kHz, as in the official example.
_QUIET_LOGGER = logging.Logger('portfolio-doubao-private')
_QUIET_LOGGER.disabled = True
_LOOP_INIT_SECONDS = 2
_LOOP_LOCK = threading.Lock()
_LOOP_READY = threading.Event()
_LOOP = None
_LOOP_THREAD = None


class SpeechError(Exception):
    def __init__(self, code, status=503):
        self.code, self.status = code, status
        super().__init__(code)


def _run_loop():
    """One process-lifetime I/O loop and one bounded DNS executor, created lazily."""
    global _LOOP
    loop = None
    try:
        loop = asyncio.new_event_loop()
        loop.set_default_executor(ThreadPoolExecutor(max_workers=1,
                                  thread_name_prefix='portfolio-doubao-dns'))
        asyncio.set_event_loop(loop)
        _LOOP = loop
        # Signal readiness only after run_forever has actually started.
        loop.call_soon(_LOOP_READY.set)
        loop.run_forever()
    except Exception:
        # Initialization errors contain no request data and aren't logged.
        _LOOP_READY.set()
    finally:
        _LOOP = None
        if loop is not None:
            # close() doesn't wait for a blocked default-executor DNS thread.
            loop.close()


def _get_loop():
    global _LOOP_THREAD
    loop = _LOOP
    if loop is not None and loop.is_running():
        return loop
    if not _LOOP_LOCK.acquire(timeout=_LOOP_INIT_SECONDS):
        raise SpeechError('voice_busy', 429)
    try:
        if _LOOP_THREAD is None:
            _LOOP_THREAD = threading.Thread(target=_run_loop,
                                           name='portfolio-doubao-io', daemon=True)
            try:
                _LOOP_THREAD.start()
            except RuntimeError:
                raise SpeechError('voice_unavailable') from None
    finally:
        _LOOP_LOCK.release()
    if not _LOOP_READY.wait(_LOOP_INIT_SECONDS):
        raise SpeechError('voice_unavailable')
    loop = _LOOP
    if loop is None or not loop.is_running():
        raise SpeechError('voice_unavailable')
    return loop


def _provider_status(code):
    if code in (0, 20000000, '0', '20000000'):
        return
    if code in (20000003, '20000003', 45000002, '45000002'):
        raise SpeechError('voice_empty', 422)
    if code in (55000031, '55000031'):
        raise SpeechError('voice_busy', 429)
    raise SpeechError('voice_unavailable')


def _packet(kind, sequence, payload, *, final=False):
    # The official Python RequestBuilder keeps JSON+gzip (0x11) for both full
    # requests and audio-only messages. Negative sequence marks the final PCM.
    compressed = gzip.compress(payload, mtime=0)
    return (bytes((0x11, (kind << 4) | (3 if final else 1), 0x11, 0)) +
            struct.pack('>iI', -sequence if final else sequence, len(compressed)) + compressed)


def _decompress(payload):
    try:
        decoder = zlib.decompressobj(16 + zlib.MAX_WBITS)
        decoded = decoder.decompress(payload, MAX_MESSAGE_BYTES + 1)
        if (len(decoded) > MAX_MESSAGE_BYTES or not decoder.eof or
                decoder.unconsumed_tail or decoder.unused_data):
            raise SpeechError('voice_unavailable')
        return decoded
    except zlib.error:
        raise SpeechError('voice_unavailable') from None


def _response(message):
    """Parse one bounded binary message; never return provider error strings."""
    if not isinstance(message, bytes) or not 8 <= len(message) <= MAX_MESSAGE_BYTES:
        raise SpeechError('voice_unavailable')
    version, header_size = message[0] >> 4, (message[0] & 15) * 4
    kind, flags = message[1] >> 4, message[1] & 15
    serialization, compression = message[2] >> 4, message[2] & 15
    if (version != 1 or not 4 <= header_size <= len(message) or
            kind not in (9, 15) or flags & ~7 or compression not in (0, 1)):
        raise SpeechError('voice_unavailable')
    offset = header_size
    if flags & 1:
        offset += 4  # signed sequence
    if flags & 4:
        offset += 4  # optional event field
    if offset + (8 if kind == 15 else 4) > len(message):
        raise SpeechError('voice_unavailable')
    if kind == 15:
        _provider_status(struct.unpack_from('>i', message, offset)[0])
        # An error packet must never be accepted as a successful text response.
        raise SpeechError('voice_unavailable')
    length = struct.unpack_from('>I', message, offset)[0]
    payload = message[offset + 4:]
    if length != len(payload) or serialization != 1 or not payload:
        raise SpeechError('voice_unavailable')
    if compression:
        payload = _decompress(payload)
    if len(payload) > MAX_MESSAGE_BYTES:
        raise SpeechError('voice_unavailable')
    try:
        data = json.loads(payload)
    except (ValueError, RecursionError):
        raise SpeechError('voice_unavailable') from None
    if not isinstance(data, dict):
        raise SpeechError('voice_unavailable')
    if 'code' in data:
        _provider_status(data['code'])
    return data, bool(flags & 2)


def _connect(headers):
    # Import only for selected cloud ASR. The regular text backend and the
    # separate local worker don't require this optional package.
    from websockets.asyncio.client import connect

    class NoRedirectConnect(connect):
        def process_redirect(self, exc):
            # Pinned websockets 15.0.1 calls this hook before every redirect.
            # Never forward authentication to a second URL, including same-host.
            return exc

    return NoRedirectConnect(
        ENDPOINT, additional_headers=headers, ssl=ssl.create_default_context(),
        proxy=None, compression=None, open_timeout=8, close_timeout=.1,
        ping_interval=None, max_size=MAX_MESSAGE_BYTES, max_queue=1,
        write_limit=MAX_MESSAGE_BYTES, logger=_QUIET_LOGGER)


async def _send_audio(connection, pcm):
    for offset in range(0, len(pcm), CHUNK_BYTES):
        sequence = offset // CHUNK_BYTES + 2
        final = offset + CHUNK_BYTES >= len(pcm)
        await connection.send(_packet(2, sequence, pcm[offset:offset + CHUNK_BYTES], final=final))
        # Upload already-recorded short PCM without an additional real-time
        # replay delay. Yield so incoming errors / backpressure are handled.
        await asyncio.sleep(0)


async def _receive_result(connection):
    for _ in range(MAX_MESSAGES):
        data, final = _response(await connection.recv())
        if not final:
            continue
        result = data.get('result')
        text = result.get('text') if isinstance(result, dict) else None
        if not isinstance(text, str) or len(text) > 1000:
            raise SpeechError('voice_unavailable')
        if not text.strip():
            raise SpeechError('voice_empty', 422)
        return text.strip()
    raise SpeechError('voice_unavailable')


async def _exchange(pcm, api_key):
    connection = None
    sender = receiver = None
    try:
        connection = await _connect({
            'X-Api-Key': api_key, 'X-Api-Resource-Id': RESOURCE_ID,
            'X-Api-Request-Id': str(uuid.uuid4()),
        })
        status = connection.response.headers.get('X-Api-Status-Code')
        if status is not None:
            _provider_status(status)
        config = json.dumps({
            'user': {'uid': 'portfolio-voice'},
            'audio': {'format': 'pcm', 'codec': 'raw', 'rate': SAMPLE_RATE, 'bits': 16, 'channel': 1},
            'request': {'model_name': 'bigmodel', 'enable_itn': True, 'enable_punc': True,
                        'enable_ddc': False, 'show_utterances': False},
        }, separators=(',', ':')).encode('utf-8')
        await connection.send(_packet(1, 1, config))
        _, final = _response(await connection.recv())  # full-request ACK first
        if final:
            raise SpeechError('voice_unavailable')
        sender = asyncio.create_task(_send_audio(connection, pcm))
        receiver = asyncio.create_task(_receive_result(connection))
        _, text = await asyncio.gather(sender, receiver)
        return text
    finally:
        for task in (sender, receiver):
            if task is not None and not task.done():
                task.cancel()
        if sender is not None or receiver is not None:
            await asyncio.gather(*(task for task in (sender, receiver) if task is not None), return_exceptions=True)
        if connection is not None:
            # Deterministic cleanup even on cancellation; don't wait for an
            # untrusted peer's close handshake beyond the overall deadline.
            connection.transport.abort()


async def _bounded_exchange(pcm, api_key):
    return await asyncio.wait_for(_exchange(pcm, api_key), timeout=TIMEOUT_SECONDS)


def recognize(raw, api_key):
    """Return only final recognized text from a <=20s PCM16 WAV recording."""
    try:
        samples = read_pcm(raw)
    except AudioError as exc:
        raise SpeechError(exc.code, 422 if exc.code == 'voice_empty' else 400) from None
    if (not isinstance(api_key, str) or not 8 <= len(api_key) <= 512 or
            any(not 33 <= ord(char) <= 126 for char in api_key)):
        raise SpeechError('voice_not_configured')
    if sys.byteorder != 'little':
        samples.byteswap()
    try:
        # asyncio.run() waits for its DNS executor at shutdown even after an
        # exchange timeout. Reuse one loop instead; a stalled DNS thread cannot
        # hold the HTTP worker or create another executor on the next request.
        loop = _get_loop()
        work = _bounded_exchange(samples.tobytes(), api_key)
        try:
            future = asyncio.run_coroutine_threadsafe(work, loop)
        except RuntimeError:
            work.close()
            raise SpeechError('voice_unavailable') from None
        try:
            return future.result(timeout=TIMEOUT_SECONDS + .2)
        except FutureTimeoutError:
            future.cancel()
            raise SpeechError('timeout', 504) from None
    except SpeechError:
        raise
    except (TimeoutError, asyncio.TimeoutError):
        raise SpeechError('timeout', 504) from None
    except Exception as exc:
        # Handshake exceptions may contain echoed request headers; only inspect
        # the numeric status and suppress the entire original exception chain.
        status = getattr(getattr(exc, 'response', None), 'status_code', None)
        if status in (401, 403):
            raise SpeechError('voice_not_configured') from None
        if status == 429:
            raise SpeechError('voice_busy', 429) from None
        raise SpeechError('voice_unavailable') from None
