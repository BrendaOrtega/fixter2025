"""Escena: mandarle una foto al agente — dropzone, S3 de EasyBits y el bloque resource_link de ACP.

Uso: python3 scene-sesion-2-fotos.py [1..5]  → revela las etapas (default 5).
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})
MONO = lambda x, y, text, size=22, color="#212529": els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": 3, "text": text, "strokeColor": color})

def box(x, y, w, h, bg, stroke, label, size=32):
    els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke,
                "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3},
                "label": {"text": label, "fontSize": size, "fontFamily": V, "strokeColor": stroke}})

def arrow(x, y, dx, dy, color, bend=-30):
    els.append({"type": "arrow", "x": x, "y": y, "strokeColor": color, "strokeWidth": 4, "roundness": {"type": 2},
                "points": [[0, 0], [dx / 2, bend], [dx, dy]]})

N = int(sys.argv[1]) if len(sys.argv) > 1 else 5

T(100, 20, "mandarle una foto al agente", 58, "#6741d9")
T(100, 95, "los bytes van al agente, inline; la URL de S3 es para el hilo", 32, "#868e96")
els.extend(ghosty(x=2080, y=10, height=160))

stages = [
    ("dropzone", "#d0ebff", "#1971c2",
     "arrastrar o pegar;\npreview local, sin subir",
     'const url =\n  URL.createObjectURL(file)\n\n<img src={url} />\n\n(se sube al enviar,\n no al soltar)'),
    ("ruta de envío", "#d3f9d8", "#2f9e44",
     "recibe el FormData;\nsube a S3 (para el hilo)\ny se queda con los bytes\n(para el agente)",
     'const bytes = Buffer.from(\n  await file.arrayBuffer())\nconst { url } =\n  await easybits.storage\n    .upload(file, {\n      access: "public" })'),
    ("acp.ts", "#fff3bf", "#e8590c",
     "el prompt lleva dos\nbloques: texto + imagen\nen base64",
     'session.prompt([\n  { type: "text",\n    text: "¿qué ves?" },\n  { type: "image",\n    data: bytes\n      .toString("base64"),\n    mimeType: "image/jpeg" }\n])'),
    ("agente", "#e5dbff", "#6741d9",
     "la mira; en initialize\ndijo que puede",
     'promptCapabilities: {\n  image: true\n}\n\n→ "un fantasma morado\n    con lentes atrapado\n    en un cubo de cristal…"\n\n⚠ resource_link con URL\n  NO: sólo ve un link\n  (probado con DeepSeek)'),
    ("hilo", "#ffe3e3", "#c92a2a",
     "dos fuentes, misma URL:\n① al enviar, la ruta la\ndevuelve y el hook la pone\n② al recargar, el loader la\ntrae con el historial",
     '// el turno guarda la URL,\n// no los bytes\nturn.attachments = [\n  { url, mimeType }\n]\n<img src={url} />'),
]
X0, W, GAP = 100, 400, 110
bands = [("🌐 frontend · navegador", 0, 1, "#1971c2"), ("🖥️ backend · Express (SSR)", 1, 3, "#2f9e44"), ("🤖 agente · en la caja", 3, 4, "#6741d9"), ("🌐 frontend", 4, 5, "#c92a2a")]
for label, a, b, color in bands:
    if a >= N: continue
    b = min(b, N)
    x = X0 + a * (W + GAP) - 15
    w = (b - a) * (W + GAP) - GAP + 30 if b - a > 1 else W + 30
    els.append({"type": "rectangle", "x": x, "y": 140, "width": w, "height": 660, "strokeColor": color,
                "backgroundColor": "transparent", "strokeWidth": 2, "strokeStyle": "dashed", "roundness": {"type": 3}})
    T(x + 15, 150, label, 28, color)
for i, (name, bg, stroke, note, code) in enumerate(stages[:N]):
    x = X0 + i * (W + GAP)
    box(x, 200, W, 90, bg, stroke, name, 40)
    if i == 1:
        arrow(x - GAP + 15, 245, GAP - 30, 0, stroke, -30); T(x - GAP + 25, 262, "POST\nform", 20, stroke)
    elif i == 3:
        arrow(x - GAP + 15, 245, GAP - 30, 0, stroke, -30); T(x - GAP + 25, 262, "ACP\nwss", 20, stroke)
    elif i == 4:
        arrow(x - GAP + 15, 245, GAP - 30, 0, stroke, -30); T(x - GAP + 25, 262, "SSE", 20, stroke)
    elif i > 0:
        arrow(x - GAP, 245, GAP, 0, stroke, -18)
    T(x, 305, note, 26, "#495057")
    MONO(x, 480, code, 22, stroke)

if N == 5:
    T(100, 830, "💡 antes de escribir: leer acp.ts — client() + initialize, buildSession().start(), session.prompt([...]). Ahí vive el SDK de ACP.", 30, "#e67700")
    T(100, 890, "producto real (ChatGPT, Claude) sube al soltar con spinner; aquí subimos al enviar: un solo camino, sin basura en S3.", 24, "#868e96")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
