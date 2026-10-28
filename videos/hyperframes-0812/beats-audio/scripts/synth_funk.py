# Sintetiza una cama funk instrumental de verdad-terreno conocida (BPM y offset fijos),
# porque Openverse no respondió. Así se puede medir el error de cada detector.
import numpy as np, wave, sys

SR = 44100
BPM = 112.0
OFFSET = 0.30          # segundo del primer beat (downbeat del compás 1)
BARS = 6
BEAT = 60 / BPM
DUR = OFFSET + BARS * 4 * BEAT + 0.8
rng = np.random.default_rng(7)   # azar con semilla
out = np.zeros(int(DUR * SR))

def add(sig, t, gain=1.0):
    i = int(t * SR); j = min(len(out), i + len(sig))
    out[i:j] += gain * sig[: j - i]

def env(n, decay):
    return np.exp(-np.arange(n) / SR / decay)

def kick():
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 50 + 90 * np.exp(-t / 0.04)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.12)

def snare():
    n = int(0.22 * SR); t = np.arange(n) / SR
    return (0.7 * rng.standard_normal(n) + 0.5 * np.sin(2 * np.pi * 190 * t)) * env(n, 0.06)

def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    x = rng.standard_normal(n); x = np.diff(np.concatenate([[0], x]))  # paso alto barato
    return x * env(n, 0.06 if open_ else 0.012)

def bass(freq, length):
    n = int(length * SR); t = np.arange(n) / SR
    x = np.sign(np.sin(2 * np.pi * freq * t)) * 0.5 + np.sin(2 * np.pi * freq * t)
    return np.tanh(x) * env(n, 0.18)

def stab(freqs):
    n = int(0.16 * SR); t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) for f in freqs) * env(n, 0.07) / len(freqs)

E, G, A, D = 82.41, 98.0, 110.0, 73.42
riff = [(0, E), (0.75, E), (1.5, G), (2.5, A), (3.25, D)]   # en beats dentro del compás
chord = [329.6, 392.0, 493.9]   # Em
BREAK_BAR = 3   # compás 4 (índice 3): último medio compás en silencio → prueba de silencios

for bar in range(BARS):
    b0 = OFFSET + bar * 4 * BEAT
    full = bar >= 2           # sección A (compases 1–2) sólo bombo y hat; sección B completa
    for k in range(8):        # corcheas
        t = b0 + k * BEAT / 2
        beat_in_bar = k / 2
        if bar == BREAK_BAR and beat_in_bar >= 2:
            continue
        if k % 4 == 0: add(kick(), t, 1.0)
        if full and k % 4 == 2: add(snare(), t, 0.7)
        add(hat(open_=(k % 4 == 3 and full)), t, 0.25 if k % 2 else 0.35)
    if full:
        for (bt, f) in riff:
            if bar == BREAK_BAR and bt >= 2: continue
            add(bass(f, BEAT * 0.7), b0 + bt * BEAT, 0.45)
        for bt in (1.5, 3.5):
            if bar == BREAK_BAR and bt >= 2: continue
            add(stab(chord), b0 + bt * BEAT, 0.35)

out = out / np.max(np.abs(out)) * 0.85
pcm = (out * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f"bpm={BPM} offset={OFFSET} beat={BEAT:.4f}s dur={DUR:.2f}s break=bar{BREAK_BAR+1} beats 3-4")
