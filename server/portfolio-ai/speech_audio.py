"""Strict, small PCM contract shared by the public gateway and CPU worker."""
from array import array
import io
import math
import struct
import sys
import wave

SAMPLE_RATE = 16000
MAX_SECONDS = 20
MAX_AUDIO_BYTES = SAMPLE_RATE * MAX_SECONDS * 2 + 4096


class AudioError(ValueError):
    def __init__(self, code):
        self.code = code


def read_pcm(raw, *, require_sound=True):
    """Return signed PCM samples without codecs, external programs or temp files."""
    if (not isinstance(raw, bytes) or not 44 <= len(raw) <= MAX_AUDIO_BYTES or
            raw[:4] != b'RIFF' or raw[8:12] != b'WAVE' or
            struct.unpack_from('<I', raw, 4)[0] + 8 != len(raw)):
        raise AudioError('invalid_audio')
    try:
        with wave.open(io.BytesIO(raw), 'rb') as source:
            if (source.getnchannels() != 1 or source.getsampwidth() != 2 or
                    source.getframerate() != SAMPLE_RATE or source.getcomptype() != 'NONE' or
                    not 1600 <= source.getnframes() <= SAMPLE_RATE * MAX_SECONDS):
                raise AudioError('invalid_audio')
            expected = source.getnframes() * 2
            frames = source.readframes(source.getnframes())
            if len(frames) != expected:
                raise AudioError('invalid_audio')
    except (wave.Error, EOFError, struct.error, OverflowError):
        raise AudioError('invalid_audio') from None
    samples = array('h')
    samples.frombytes(frames)
    if sys.byteorder != 'little':
        samples.byteswap()
    if require_sound and math.sqrt(sum(x * x for x in samples) / len(samples)) < 82:
        raise AudioError('voice_empty')
    return samples
