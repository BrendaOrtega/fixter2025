#!/usr/bin/env python3
# Voz em_santa (Kokoro) en es-419, speed 1.0, con el léxico de la casa (réplica de apply_lexicon() de kokoro-svc).
# El texto es el literal de pantalla; el léxico lo vuelve fonético. Uso: ~/.venv-tts/bin/python voice/synth.py [id...]
import json, os, re, sys
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.expanduser("~/.cache/hyperframes/tts")
LEX_PATH = os.path.expanduser("~/sandbox-host/templates/kokoro-svc/lexicon.es.json")
LINES = json.load(open(os.path.join(HERE, "lines.src.json")))

raw = json.load(open(LEX_PATH))
LEX = {k.lower(): v for k, v in raw.items() if not k.startswith("_") and v}
LEX_RE = re.compile(r"(?<!\w)(?:" + "|".join(re.escape(k) for k in sorted(LEX, key=len, reverse=True)) + r")(?!\w)", re.IGNORECASE)
apply_lexicon = lambda t: LEX_RE.sub(lambda m: LEX[m.group(0).lower()], t)

k = Kokoro(f"{CACHE}/models/kokoro-v1.0.onnx", f"{CACHE}/voices/voices-v1.0.bin")
only = set(sys.argv[1:])
for line in LINES:
    if only and line["id"] not in only:
        continue
    # la URL se dice con «diagonal»: en pantalla va «/»
    spoken = apply_lexicon(line["text"].replace("/", ", diagonal "))
    samples, sr = k.create(spoken, voice="em_santa", speed=1.0, lang="es-419")
    sf.write(os.path.join(HERE, line["id"] + ".wav"), samples, sr, subtype="PCM_16")
    print(f"{line['id']:8} {len(samples)/sr:5.2f}s  {spoken}")
