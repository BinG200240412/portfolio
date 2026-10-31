#!/usr/bin/env python3
"""Save an existing Doubao Speech key using hidden terminal input only."""
import getpass
import os
from pathlib import Path
import re
import tempfile
import warnings

TARGET = Path('/etc/portfolio-ai/doubao-speech.env')
KEY_PATTERN = r'[A-Za-z0-9._~+/-]{16,512}={0,2}'


def save_key(target, key):
    begin, end = '\x1b[200~', '\x1b[201~'
    if isinstance(key, str) and key.startswith(begin) and key.endswith(end):
        key = key[len(begin):-len(end)]
    if not isinstance(key, str) or not re.fullmatch(KEY_PATTERN, key):
        raise ValueError('Invalid speech key; nothing saved')
    if target.is_symlink() or target.parent.resolve() != target.parent:
        raise ValueError('Unsafe private configuration path')
    target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(target.parent, 0o700)
    fd, temporary = tempfile.mkstemp(prefix='.speech-key-', dir=target.parent)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, 'w') as handle:
            handle.write('DOUBAO_SPEECH_API_KEY=' + key + '\nSPEECH_PROVIDER=doubao\nSPEECH_ENABLED=1\n')
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, target)
    finally:
        Path(temporary).unlink(missing_ok=True)


def main():
    if os.geteuid() != 0 or not os.isatty(0):
        raise SystemExit('Use an interactive administrator terminal on your server')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', getpass.GetPassWarning)
            key = getpass.getpass('Existing Doubao Speech API Key (hidden): ')
        save_key(TARGET, key)
        del key
    except (ValueError, OSError, EOFError, KeyboardInterrupt, getpass.GetPassWarning):
        raise SystemExit('Speech key not saved; check hidden input and private permissions') from None
    print('Private speech configuration saved; no service has been restarted.')


if __name__ == '__main__':
    main()
