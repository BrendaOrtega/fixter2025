"""beat_snap.py — el mismo snap que beat-snap.js, para plan.py (SFX y beats en scene.json).

Uso desde plan.py:
    import sys; sys.path.insert(0, "skills/motion-lab/_lib")
    from beat_snap import grid, words, word_at, snap
    B = grid(bpm=112, offset=0.21, subdiv=2, duration=DUR)
    W = words(json.load(open("voice/transcript.json")))
    t = snap(word_at(W, "agente"), beats=B, max_shift=0.12)        # la palabra elige, el beat afina
    t = snap(t, beats=B, impact=1 / (1.8 + 1), duration=0.5)       # golpe de back.out(1.8) en el beat
"""
import math
import re
import unicodedata


def grid(bpm, offset=0.0, subdiv=1, duration=600.0):
    """Tiempos de beat desde BPM + offset (subdiv 2 = corcheas)."""
    step = 60.0 / bpm / subdiv
    t = offset - math.floor(offset / step) * step
    out = []
    while t <= duration + 1e-9:
        out.append(round(t, 4))
        t += step
    return out


def beats(lst):
    """number[] o [{time}|{t}|{start}] -> lista ordenada."""
    out = [b if isinstance(b, (int, float)) else b.get("time", b.get("t", b.get("start"))) for b in lst or []]
    return sorted(x for x in out if x is not None)


def words(js):
    """`npx hyperframes transcribe --json` ([{text,start,end}]) o whisper ({words}|{segments}) -> [{text,start,end}]."""
    if isinstance(js, dict):
        arr = js.get("words") or [w for s in js.get("segments", []) for w in s.get("words", [])]
    else:
        arr = js
    return [{"text": str(w.get("text", w.get("word", ""))).strip(), "start": float(w["start"]), "end": float(w.get("end", w["start"]))}
            for w in arr if "start" in w]


def _norm(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^\w]", "", s).lower()


def word_at(ws, text, nth=0):
    hits = [w for w in ws if _norm(w["text"]) == _norm(text)]
    if len(hits) <= nth:
        raise KeyError(f"beat_snap: no está la palabra «{text}» (#{nth})")
    return hits[nth]["start"]


def snap(t, beats=None, words=None, to="beat", max_shift=0.12, impact=0.0, duration=0.0, lead=0.0, fps=30):
    """Mismo contrato que snap() de beat-snap.js. Si nada cae a max_shift, t queda igual."""
    hit = t + impact * duration
    cands = []
    if to != "word":
        cands += list(beats or [])
    if to != "beat":
        cands += [w["start"] for w in words or []]
    c = min(cands, key=lambda x: abs(x - hit)) if cands else None
    out = (c - impact * duration) if c is not None and abs(c - hit) <= max_shift else t
    out += lead
    if fps:
        out = round(out * fps) / fps
    return max(0.0, round(out, 4))
