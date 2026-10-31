"""Exercise private key entry using dummy values and temporary files only."""
import contextlib
import getpass
import importlib.util
import io
from pathlib import Path
import stat
import tempfile
import unittest
from unittest import mock
import warnings

spec = importlib.util.spec_from_file_location('portfolio_store_key', Path(__file__).with_name('store_key.py'))
store = importlib.util.module_from_spec(spec)
spec.loader.exec_module(store)
FAKE_KEY = 'sk-' + 'dummy_only_0123456789' * 2
BEGIN, END = '\x1b[200~', '\x1b[201~'


def values(path):
    return dict(line.split('=', 1) for line in path.read_text().splitlines())


class PrivateEntryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        # Normalize macOS's /var alias without weakening the production path check.
        self.root = Path(self.temporary.name).resolve()
        self.target = self.root / 'private' / 'portfolio-ai.env'

    def test_paired_bracketed_paste_is_saved_as_plain_key(self):
        store.save_key(self.target, BEGIN + FAKE_KEY + END)
        self.assertEqual(values(self.target)['DEEPSEEK_API_KEY'], FAKE_KEY)
        self.assertNotIn('\x1b', self.target.read_text())

    def test_stray_controls_and_incomplete_or_nested_wrappers_are_rejected(self):
        store.save_key(self.target, FAKE_KEY)
        before = self.target.read_bytes()
        rejected = (
            BEGIN + FAKE_KEY, FAKE_KEY + END, '\x1b[0m' + FAKE_KEY,
            BEGIN + BEGIN + FAKE_KEY + END + END,
            FAKE_KEY + '\nINJECTED=value', ' ' + FAKE_KEY, FAKE_KEY + '\t',
            BEGIN + FAKE_KEY + '\x00' + END,
        )
        for candidate in rejected:
            with self.subTest(case=rejected.index(candidate)):
                with self.assertRaises(ValueError):
                    store.save_key(self.target, candidate)
                self.assertEqual(self.target.read_bytes(), before)

    def test_target_and_parent_symlinks_are_refused_without_touching_destination(self):
        destination = self.root / 'destination.env'
        destination.write_text('untouched\n')
        link = self.root / 'link.env'
        link.symlink_to(destination)
        with self.assertRaises(ValueError):
            store.save_key(link, FAKE_KEY)
        self.assertEqual(destination.read_text(), 'untouched\n')
        actual = self.root / 'actual'
        actual.mkdir()
        parent_link = self.root / 'linked-parent'
        parent_link.symlink_to(actual, target_is_directory=True)
        with self.assertRaises(ValueError):
            store.save_key(parent_link / 'portfolio-ai.env', FAKE_KEY)
        self.assertFalse((actual / 'portfolio-ai.env').exists())

    def test_permissions_atomic_replacement_and_session_identity_survive_rekey(self):
        store.save_key(self.target, FAKE_KEY)
        first = values(self.target)
        self.assertGreaterEqual(len(first['SESSION_SECRET'].encode()), 32)
        self.assertEqual(stat.S_IMODE(self.target.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(self.target.parent.stat().st_mode), 0o700)
        original = self.target.read_text().replace('GLOBAL_DAY_LIMIT=100\n', 'GLOBAL_DAY_LIMIT=30\n')
        self.target.write_text(original)
        store.save_key(self.target, BEGIN + FAKE_KEY + 'new' + END)
        after = values(self.target)
        self.assertEqual(after['SESSION_SECRET'], first['SESSION_SECRET'])
        self.assertEqual(after['GLOBAL_DAY_LIMIT'], '30')
        self.assertEqual(after['DEEPSEEK_API_KEY'], FAKE_KEY + 'new')
        self.assertEqual(stat.S_IMODE(self.target.stat().st_mode), 0o600)
        self.assertEqual(list(self.target.parent.glob('.portfolio-ai-*')), [])

    def test_getpass_warning_stops_before_any_echo_fallback_or_save(self):
        def no_hidden_terminal(_prompt):
            warnings.warn('Hidden terminal unavailable', getpass.GetPassWarning)
            self.fail('An echoed-input fallback must not be reached')
        output = io.StringIO()
        with mock.patch.object(store.os, 'geteuid', return_value=0), \
             mock.patch.object(store.os, 'isatty', return_value=True), \
             mock.patch.object(store.getpass, 'getpass', side_effect=no_hidden_terminal), \
             mock.patch.object(store, 'save_key') as save, \
             contextlib.redirect_stdout(output):
            with self.assertRaises(SystemExit) as stopped:
                store.main()
        self.assertNotIn(FAKE_KEY, str(stopped.exception) + output.getvalue())
        save.assert_not_called()
        self.assertFalse(self.target.exists())


if __name__ == '__main__':
    unittest.main()
