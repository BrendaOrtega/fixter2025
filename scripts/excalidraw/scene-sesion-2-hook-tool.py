"""Escena: el viaje de una herramienta — de goose a la tarjeta. De dónde sale la info y cómo se parsea.

Uso: python3 scene-sesion-2-hook-tool.py [1..5]  → revela las etapas una por una (default 5).
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})
MONO = lambda x, y, text, size=20, color="#212529": els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": 3, "text": text, "strokeColor": color})

def box(x, y, w, h, bg, stroke, label, size=32):
    els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke,
                "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3},
                "label": {"text": label, "fontSize": size, "fontFamily": V, "strokeColor": stroke}})

def arrow(x, y, dx, dy, color, bend=-30, label=None):
    e = {"type": "arrow", "x": x, "y": y, "strokeColor": color, "strokeWidth": 4, "roundness": {"type": 2},
         "points": [[0, 0], [dx / 2, bend], [dx, dy]]}
    if label: e["label"] = {"text": label, "fontSize": 22, "fontFamily": V, "strokeColor": color}
    els.append(e)

N = int(sys.argv[1]) if len(sys.argv) > 1 else 5

T(120, 20, "el viaje de una herramienta: de goose a la tarjeta", 58, "#6741d9")
T(120, 95, "un mismo toolCallId llega tres veces; en pantalla es una sola fila", 32, "#868e96")
els.extend(ghosty(x=2080, y=10, height=160))

stages = [
    ("goose", "#e5dbff", "#6741d9",
     "corre el shell y avisa\npor JSON-RPC",
     'session/update\n  sessionUpdate: "tool_call"\n  toolCallId: "call_7"\n  title: "node --version"\n  status: "pending"\n\n…y dos "tool_call_update"\n  status: "in_progress"\n  status: "completed"'),
    ("acp.ts", "#d3f9d8", "#2f9e44",
     "un if por sessionUpdate;\ncopia sólo lo que viene",
     'ev = { type: "tool",\n       id: u.toolCallId }\nif (u.title)  ev.title\nif (u.status) ev.status\nemit(ev)'),
    ("ruta SSE", "#fff3bf", "#e8590c",
     "cada evento, una línea\nen el stream abierto",
     'event: tool\ndata: {"id":"call_7",\n  "status":"pending"}\n\nevent: tool\ndata: {"id":"call_7",\n  "status":"completed"}'),
    ("useAcpStream", "#d0ebff", "#1971c2",
     "hook de React; escucha\n\"tool\" y hace upsert por id",
     'on("tool", e => {\n  const t = JSON.parse(e.data)\n  fila(t.id) existe?\n    ? mezclar\n    : agregar\n})'),
    ("ToolRow", "#ffe3e3", "#c92a2a",
     "componente React en\nchat.tsx; el ícono\nsale del status",
     'pending      ⏳\nin_progress  ●\ncompleted    ✓\n\n✓ node --version'),
]
X0, W, GAP = 100, 400, 110
# franjas de dónde corre cada paso
bands = [("🤖 agente · en la caja", 0, 1, "#6741d9"), ("🖥️ backend · Express (SSR)", 1, 3, "#2f9e44"), ("🌐 frontend · navegador", 3, 5, "#1971c2")]
for label, a, b, color in bands:
    if a >= N: continue
    b = min(b, N)
    x = X0 + a * (W + GAP) - 15
    w = (b - a) * (W + GAP) - GAP + 30 if b - a > 1 else W + 30
    els.append({"type": "rectangle", "x": x, "y": 140, "width": w, "height": 560, "strokeColor": color,
                "backgroundColor": "transparent", "strokeWidth": 2, "strokeStyle": "dashed", "roundness": {"type": 3}})
    T(x + 15, 150, label, 28, color)
for i, (name, bg, stroke, note, code) in enumerate(stages[:N]):
    x = X0 + i * (W + GAP)
    box(x, 200, W, 90, bg, stroke, name, 40)
    if i == 1:
        arrow(x - GAP + 15, 245, GAP - 30, 0, stroke, -30); T(x - GAP + 25, 262, "ACP\nwss", 20, stroke)
    elif i == 3:
        arrow(x - GAP + 15, 245, GAP - 30, 0, stroke, -30); T(x - GAP + 25, 262, "SSE\nhttp", 20, stroke)
    elif i > 0:
        arrow(x - GAP, 245, GAP, 0, stroke, -18)
    T(x, 305, note, 26, "#495057")
    MONO(x, 420, code, 22, stroke)

if N == 5:
    T(100, 750, "💡 la info ya venía en el cable: goose la manda siempre. El hook sólo deja de tirarla.", 34, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
