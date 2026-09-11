#!/usr/bin/env python3
"""Arma la pista de efectos de un short: lee sfx.json (tiempos del CLIP por tipo de sonido),
los coloca a BO + 0.3 (donde caen las animaciones) y escribe un WAV 48 kHz estéreo.
Uso: sfx-track.py <sfx.json> <TOTAL> <salida.wav> [tipo=archivo.wav:gain ...]
"""
import sys, json, wave, array, subprocess, os
sfx_json, total, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
BO = 4.4; OFF = 0.3; SR = 48000
here = os.path.dirname(os.path.abspath(__file__))
maps = {}
for m in sys.argv[4:]:
    k, v = m.split("="); f, g = (v.split(":") + ["1"])[:2]
    maps[k] = (os.path.join(here, "sfx", f), float(g))
def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "s16le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True).stdout
    return array.array("h", raw)
n = int(total * SR) * 2
mix = [0] * n
hits = json.load(open(sfx_json))
count = 0
for kind, times in hits.items():
    if kind not in maps: continue
    pcm, gain = load(maps[kind][0]), maps[kind][1]
    for t in times:
        start = int((BO + OFF + t) * SR) * 2
        for i, v in enumerate(pcm):
            j = start + i
            if j >= n: break
            mix[j] += int(v * gain)
        count += 1
buf = array.array("h", [max(-32768, min(32767, v)) for v in mix])
w = wave.open(out, "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(buf.tobytes()); w.close()
print(f"sfx: {count} golpes → {out}")
