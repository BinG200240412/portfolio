import getpass
import importlib.util
import io
import math
import os
from pathlib import Path
import stat
import struct
import sys
import tempfile
import types
import unittest
from unittest import mock
import warnings
import wave

import speech_audio
import store_speech_key as store
spec = importlib.util.spec_from_file_location('speech_gateway_config',Path(__file__).with_name('server.py'))
service = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = service
spec.loader.exec_module(service)
KEY='test_only_not_a_real_speech_key_012345'

class SpeechConfigurationTests(unittest.TestCase):
    def test_private_key_paste_permissions_and_other_configuration_untouched(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory).resolve(); path=root/'private'/'doubao-speech.env'
            primary=root/'primary.env';primary.write_text('unchanged private settings\n')
            store.save_key(path,'\x1b[200~'+KEY+'\x1b[201~')
            self.assertEqual(path.read_text(),'DOUBAO_SPEECH_API_KEY='+KEY+'\nSPEECH_PROVIDER=doubao\nSPEECH_ENABLED=1\n')
            self.assertEqual(stat.S_IMODE(path.stat().st_mode),0o600)
            self.assertEqual(stat.S_IMODE(path.parent.stat().st_mode),0o700)
            self.assertEqual(primary.read_text(),'unchanged private settings\n')
            before=path.read_bytes()
            for bad in (KEY+'\nOTHER=value','\x1b[200~'+KEY,' '+KEY,KEY+'\0'):
                with self.assertRaises(ValueError):store.save_key(path,bad)
                self.assertEqual(path.read_bytes(),before)
            linked=root/'link.env';linked.symlink_to(path)
            with self.assertRaises(ValueError):store.save_key(linked,KEY)

    def test_hidden_input_never_falls_back_to_echo(self):
        def warning(_):warnings.warn('unavailable',getpass.GetPassWarning)
        with mock.patch.object(store.os,'geteuid',return_value=0),mock.patch.object(store.os,'isatty',return_value=True),mock.patch.object(store.getpass,'getpass',side_effect=warning),mock.patch.object(store,'save_key') as save:
            with self.assertRaises(SystemExit):store.main()
            save.assert_not_called()

    def test_provider_is_allowlisted_and_credentials_never_in_configuration_errors(self):
        with mock.patch.dict(os.environ,{'SPEECH_PROVIDER':'doubao','DOUBAO_SPEECH_API_KEY':KEY},clear=True):
            config=service.Config.from_env();self.assertEqual(config.speech_provider,'doubao');self.assertEqual(config.doubao_speech_key,KEY)
        with mock.patch.dict(os.environ,{'SPEECH_PROVIDER':'https://untrusted.example'},clear=True):
            with self.assertRaises(ValueError):service.Config.from_env()

    def test_cloud_selection_uses_fixed_adapter_without_local_fallback_or_secret_errors(self):
        module=types.ModuleType('doubao_speech')
        class SpeechError(Exception):
            def __init__(self,code,status=503):self.code,self.status=code,status
        module.SpeechError=SpeechError
        module.recognize=mock.Mock(return_value='a recognised question')
        with tempfile.TemporaryDirectory() as directory,mock.patch.dict(sys.modules,{'doubao_speech':module}),mock.patch.object(service,'local_transcribe') as local:
            config=service.Config('test',b'x'*32,str(Path(directory)/'quota.sqlite3'),'facts',speech_enabled=True,speech_provider='doubao',doubao_speech_key=KEY)
            app=service.Application(config)
            self.assertEqual(app.configured_transcribe(b'wav'),'a recognised question')
            module.recognize.assert_called_once_with(b'wav',KEY);local.assert_not_called()
            module.recognize.side_effect=SpeechError(KEY,999)
            with self.assertRaises(service.ServiceError) as caught:app.configured_transcribe(b'wav')
            self.assertEqual((caught.exception.code,caught.exception.status),('voice_unavailable',503))
            app.config=service.Config('test',b'x'*32,config.database,'facts',speech_enabled=True,speech_provider='doubao')
            with self.assertRaises(service.ServiceError) as caught:app.configured_transcribe(b'wav')
            self.assertEqual(caught.exception.code,'voice_not_configured')

    def test_quiet_pcm_is_not_rejected_by_the_server_loudness_gate(self):
        output=io.BytesIO()
        with wave.open(output,'wb') as target:
            target.setparams((1,2,16000,0,'NONE','not compressed'))
            target.writeframes(struct.pack('<3200h',*(int(35*math.sin(i*.2)) for i in range(3200))))
        self.assertEqual(len(speech_audio.read_pcm(output.getvalue())),3200)

if __name__=='__main__':unittest.main()
