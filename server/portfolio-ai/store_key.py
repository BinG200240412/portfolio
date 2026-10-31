#!/usr/bin/env python3
"""Run in the server's private terminal; never put a key in argv or shell history."""
import getpass
import os
from pathlib import Path
import re
import secrets
import tempfile
import warnings

TARGET = Path('/etc/portfolio-ai/portfolio-ai.env')
DEFAULTS = {
    'DEEPSEEK_MODEL': 'deepseek-flash',
    'PORT': '8791',
    'QUOTA_DATABASE': '/var/lib/portfolio-ai/quota.sqlite3',
    'KNOWLEDGE_FILE': '/opt/portfolio-ai/knowledge.md',
    'ALLOWED_ORIGINS': 'https://bing2002.com',
    'TRUST_LOOPBACK_PROXY': '1',
    'IP_MINUTE_LIMIT': '6', 'IP_DAY_LIMIT': '30', 'SESSION_DAY_LIMIT': '20',
    'GLOBAL_DAY_LIMIT': '100', 'GLOBAL_MONTH_LIMIT': '1000',
}


def save_key(target, key):
    # Workbench may pass bracketed-paste framing through getpass's hidden read.
    # Unwrap only a complete outer pair, never arbitrary ANSI/control sequences.
    begin, end = '\x1b[200~', '\x1b[201~'
    if isinstance(key, str) and key.startswith(begin) and key.endswith(end):
        key = key[len(begin):-len(end)]
    if not isinstance(key, str):
        raise ValueError('Key format rejected; no configuration changed.')
    if not re.fullmatch(r'sk-[A-Za-z0-9_-]{20,256}', key):
        raise ValueError('Key format rejected; no configuration changed.')
    if target.is_symlink() or target.parent.resolve() != target.parent:
        raise ValueError('Unsafe configuration path; no configuration changed.')
    values = dict(DEFAULTS)
    if target.exists():
        for line in target.read_text().splitlines():
            name, sep, value = line.partition('=')
            if sep and name in (*DEFAULTS, 'SESSION_SECRET'):
                values[name] = value
    # Preserve the secret on subsequent key entry so session/IP digests stay stable.
    if len(values.get('SESSION_SECRET', '').encode()) < 32:
        values['SESSION_SECRET'] = secrets.token_urlsafe(48)
    values['DEEPSEEK_API_KEY'] = key
    target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(target.parent, 0o700)
    fd, temporary = tempfile.mkstemp(prefix='.portfolio-ai-', dir=target.parent)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, 'w') as handle:
            for name, value in values.items():
                if not re.fullmatch(r'[A-Za-z0-9_.,:/-]+', value):
                    raise ValueError('Unsafe configuration value; no configuration changed.')
                handle.write(name + '=' + value + '\n')
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, target)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main():
    if os.geteuid() != 0 or not os.isatty(0):
        raise SystemExit('Run with sudo in an interactive server terminal.')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', getpass.GetPassWarning)
            key = getpass.getpass('DeepSeek API Key (hidden input): ')
        save_key(TARGET, key)
        del key
    except (ValueError, OSError, EOFError, KeyboardInterrupt, getpass.GetPassWarning):
        raise SystemExit('Key was not saved. Check input and private configuration permissions.') from None
    print('Private configuration saved. Restart only portfolio-ai after configuration review.')


if __name__ == '__main__':
    main()
