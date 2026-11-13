"""Generate original synthetic teaching clips. See docs/AUDIO_SOURCES.md.
Usage: python scripts/generate-audio.py INPUT.json MODEL.onnx
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import wave
import onnxruntime
from piper import PiperVoice

onnxruntime.disable_telemetry_events()
source = Path(sys.argv[1])
model = Path(sys.argv[2])
root = Path(__file__).resolve().parents[1]
voice = PiperVoice.load(model)
entries = json.loads(source.read_text())
manifest = {}
with tempfile.TemporaryDirectory(prefix='atlas-audio-') as temp:
    for entry in entries:
        wav = Path(temp) / 'speech.wav'
        with wave.open(str(wav), 'wb') as target:
            voice.synthesize_wav(entry['spokenText'], target)
        dest = root / 'public/audio' / entry['file']
        dest.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(['ffmpeg', '-nostdin', '-y', '-loglevel', 'error', '-i', str(wav), '-af', 'loudnorm=I=-18:TP=-2:LRA=7', '-codec:a', 'libmp3lame', '-b:a', '64k', str(dest)], check=True)
        manifest[entry['text']] = {**{k:entry[k] for k in ('file','spokenText','review')}, 'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}
        print(entry['file'], flush=True)
(root / 'src/content/audio-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Generated',len(manifest),'clips. Human listening review remains pending.')
