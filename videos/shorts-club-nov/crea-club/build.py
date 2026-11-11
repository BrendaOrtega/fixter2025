#!/usr/bin/env python3
# Arma index.html (karaoke desde voice/words.json) y sfx.wav (lista de efectos de abajo).
# Uso: python3 build.py   → luego: npx hyperframes render, y bash mix.sh
import json, os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
DUR = 35.6
SFXDIR = os.path.abspath(os.path.join(HERE, "../../../docs/shorts-taller/sfx"))

# ── Subtítulos: palabras del transcript con el texto literal del guion ─────────────
words = json.load(open(os.path.join(HERE, "voice/words.json")))
words = words["words"] if isinstance(words, dict) else words
FIX = {"Das": "¿Das", "Drive.": "Drive?", "FixGig": "FixterGeek", "FixsterGig": "FixterGeek",
       "club": "Club", "agentes": "Agentes", "pago.": "pago:", "Tus": "tus", "página,": "página;", "FixterGig.com.": "fixtergeek.com."}
for i, w in enumerate(words):
    t = w["text"]
    if i == 0 and t == "Das":
        w["text"] = "¿Das"
    elif t in FIX and t != "Das":
        w["text"] = FIX[t]

# Una línea a la vez: corta en puntuación, pausa > 0.6 s o 20 caracteres.
lines, cur = [], []
for i, w in enumerate(words):
    cand = " ".join(x["text"] for x in cur + [w])
    if cur and len(cand) > 18:
        lines.append(cur); cur = []
    cur.append(w)
    nxt = words[i + 1] if i + 1 < len(words) else None
    if re.search(r"[.,;:?!]$", w["text"]) or (nxt and nxt["start"] - w["end"] > 0.6) or not nxt:
        lines.append(cur); cur = []
if cur:
    lines.append(cur)

cap_html, cap_js = [], []
for li, ln in enumerate(lines):
    start = round(ln[0]["start"] - 0.05, 3)
    nxt = lines[li + 1][0]["start"] - 0.05 if li + 1 < len(lines) else DUR - 0.4
    end = min(round(ln[-1]["end"] + 0.5, 3), round(nxt, 3))
    spans = " ".join(f'<span id="w{li}_{k}" class="w">{x["text"]}</span>' for k, x in enumerate(ln))
    cap_html.append(f'<div id="cap{li}" class="clip cap" data-start="{start}" data-duration="{round(end - start, 3)}" data-track-index="9"><div class="capin">{spans}</div></div>')
    for k, x in enumerate(ln):
        cap_js.append(f'tl.set("#w{li}_{k}", {{color: "#85DDCB"}}, {x["start"]:.3f});')
        cap_js.append(f'tl.set("#w{li}_{k}", {{color: "#F2F5F4"}}, {x["end"]:.3f});')

tpl = open(os.path.join(HERE, "src/index.tpl")).read()
html = tpl.replace("<!--CAPTIONS-->", "\n      ".join(cap_html)).replace("/*CAPJS*/", "\n      ".join(cap_js))
open(os.path.join(HERE, "index.html"), "w").write(html)
print(f"{len(lines)} líneas de subtítulos")

# ── Efectos: (segundo, archivo). Nunca el mismo dos veces seguidas. ────────────────
SFX = [
    (1.28, "paper"),        # el recibo de transferencia se sacude
    (3.40, "card"),         # el post-it se despega
    (3.75, "tick"),         # y se vuelve a pegar
    (4.42, "pop"),          # el teléfono vibra y entra el mensaje con el link
    (5.44, "8bit-blip"),    # «¿Y la grabación?»
    (6.25, "land"),         # el video cae en la carpeta de Drive
    (6.45, "whoosh-fly"),   # todo vuela en arco a la laptop
    (7.15, "hit-low"),      # zoom-punch: todo quedó dentro
    (8.96, "ding"),         # «comunidad» se subraya
    (9.42, "whoosh-short"), # entra la tarjeta de membresía
    (10.50, "pop"),         # avatares de miembros (1)
    (10.94, "pin"),         # avatares (3)
    (11.30, "card"),        # la tarjeta de crédito entra
    (12.74, "coin"),        # la tarjeta paga
    (12.90, "stamp"),       # «Pagado ✓»
    (13.22, "whoosh-short"),  # rebanadas sesgadas entran
    (13.55, "block"),       # la chincheta gigante sella el corte
    (14.24, "land"),        # post 1 cae
    (14.88, "card"),        # post 2
    (15.62, "tick"),        # likes
    (16.32, "pop"),         # post 3 (la pregunta)
    (17.44, "8bit-pickup"), # respuesta
    (18.02, "whoosh-fly"),  # disco REC crece
    (18.40, "hit-sub"),     # impacto
    (19.50, "8bit-blip"),   # placa VIVO
    (21.98, "pin"),         # REC
    (22.88, "paper"),       # la grabación entra a la carpeta de miembros
    (23.80, "whoosh-short"),  # ventana de YouTube
    (24.30, "bean"),        # ventana de Facebook
    (24.80, "pop"),         # 👍 Live
    (26.05, "whoosh-fly"),  # columnas verticales
    (26.35, "hit-low"),     # glifo
    (28.24, "stamp"),       # sello Club de Agentes de IA + polvo
    (28.27, "hit-sub"),     # zoom-punch del sello
    (29.90, "whoosh-short"),  # empujón dentro de la pantalla
    (31.02, "tick"),        # botón «Entrar a la llamada en vivo»
    (31.27, "card"),        # post del muro en la miniatura
    (31.52, "pop"),         # fila de miembros
    (31.90, "ding"),        # la URL
    (32.62, "8bit-coin"),   # los avatares brincan
]
for a, b in zip(SFX, SFX[1:]):
    assert a[1] != b[1], f"repetido seguido: {a} {b}"
ins, fc = [], []
for i, (t, f) in enumerate(SFX):
    ins += ["-i", f"{SFXDIR}/{f}.wav"]
    ms = int(round(t * 1000))
    fc.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=0.7,adelay={ms}|{ms},apad=whole_dur={DUR}[s{i}]")
fc.append("".join(f"[s{i}]" for i in range(len(SFX))) + f"amix=inputs={len(SFX)}:normalize=0:duration=longest[a]")
subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fc), "-map", "[a]", "-t", str(DUR), os.path.join(HERE, "sfx.wav")], check=True)
json.dump([{"t": t, "sfx": f} for t, f in SFX], open(os.path.join(HERE, "sfx.json"), "w"), indent=1)
print(f"{len(SFX)} efectos → sfx.wav")
