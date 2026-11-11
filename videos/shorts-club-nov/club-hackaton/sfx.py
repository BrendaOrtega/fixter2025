#!/usr/bin/env python3
"""Pista de efectos: lee score.gen.json y coloca cada efecto del catálogo CC0
(fixter2025/docs/shorts-taller/sfx) en su tiempo, con su ganancia (0.7 por defecto)."""
import json, os, subprocess, wave
import numpy as np
SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.expanduser("~/fixter2025/docs/shorts-taller/sfx")
score = json.load(open(os.path.join(HERE, "score.gen.json")))
n = int(score["duration"] * SR)
out = np.zeros((n, 2))
cache = {}
def load(name):
    if name not in cache:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(LIB, name + ".wav"), "-f", "s16le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
        cache[name] = np.frombuffer(raw, np.int16).reshape(-1, 2).astype(float) / 32768
    return cache[name]
for e in score["sfx"]:
    s = load(e["file"]).copy()
    if e.get("dur"):  # recorte con fade corto al final, nunca corte seco
        s = s[: int(e["dur"] * SR)]
        f = min(len(s), int(0.12 * SR)); s[len(s) - f:] *= np.linspace(1, 0, f)[:, None]
    a = int(round(e["t"] * SR)); b = min(n, a + len(s))
    out[a:b] += s[: b - a] * e["gain"]
pk = np.abs(out).max()
print(f"{len(score['sfx'])} efectos · pico {20*np.log10(pk):.1f} dBFS")
with wave.open(os.path.join(HERE, "sfx.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
