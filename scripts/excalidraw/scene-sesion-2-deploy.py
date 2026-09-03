"""Escena: el deploy de la webapp en otra caja de EasyBits (cierre de la sesión 2).

Uso: python3 scene-sesion-3-deploy.py [1..4]  → revela los pasos (default 4).
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})
MONO = lambda x, y, text, size=22, color="#212529": els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": 3, "text": text, "strokeColor": color})

def box(x, y, w, h, bg, stroke, label, size=32, dashed=False):
    e = {"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke,
         "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3},
         "label": {"text": label, "fontSize": size, "fontFamily": V, "strokeColor": stroke}}
    if dashed: e["strokeStyle"] = "dashed"
    els.append(e)

def arrow(x, y, dx, dy, color, bend=-30):
    els.append({"type": "arrow", "x": x, "y": y, "strokeColor": color, "strokeWidth": 4, "roundness": {"type": 2},
                "points": [[0, 0], [dx / 2, bend], [dx, dy]]})

N = int(sys.argv[1]) if len(sys.argv) > 1 else 3

T(100, 20, "3 de 4 · la app en su propia caja", 58, "#6741d9")
T(100, 95, "dos cajas: una corre al agente, otra corre a la app", 32, "#868e96")

els.extend(ghosty(x=1440, y=5, height=170))

# ---- el diagrama, protagonista ------------------------------------------
box(300, 200, 520, 150, "#f8f9fa", "#495057", "", 30)
T(325, 225, "💻 tu Mac", 32, "#495057")
T(325, 280, "un JSON con la URL del repo", 26, "#868e96")
arrow(560, 360, 0, 110, "#2f9e44", 0)

box(220, 510, 680, 380, "#d3f9d8", "#2f9e44", "", 30)
T(250, 535, "📦 la caja de la app", 32, "#2f9e44")
T(250, 600, "git clone", 26, "#495057")
T(250, 645, "npm ci && npm run build", 26, "#495057")
T(250, 690, "node server.js  + vault", 26, "#6741d9")
box(250, 750, 620, 110, "#a5d8ff", "#1971c2", "", 26)
T(275, 770, "🌐 …-3000.sandboxes.easybits.cloud", 26, "#1971c2")
T(275, 812, "su puerta al mundo", 22, "#495057")

arrow(910, 665, 200, 0, "#6741d9", -20)
els.append({"type": "arrow", "x": 1110, "y": 745, "strokeColor": "#6741d9", "strokeWidth": 4,
            "roundness": {"type": 2}, "points": [[0, 0], [-100, 20], [-200, 0]]})
T(940, 590, "ACP / wss", 26, "#6741d9")

box(1130, 620, 520, 160, "#e5dbff", "#6741d9", "", 30)
T(1155, 650, "🤖 caja del agente", 32, "#6741d9")
T(1155, 705, "la de siempre, ya viva", 26, "#495057")

# ---- los tres pasos, en una tira abajo -----------------------------------
steps = [
    ("01", "lanzar", "#2f9e44", "#d3f9d8", "le das el repo;\nla caja lo clona"),
    ("02", "secretos", "#6741d9", "#e5dbff", "van al vault,\nnunca al repo"),
    ("03", "verificar", "#1971c2", "#d0ebff", "no está publicada\nhasta que da 200"),
]
x = 220
for num, title, stroke, bg, que in steps[:N]:
    box(x, 1000, 400, 170, bg, stroke, "", 30)
    T(x + 25, 1025, f"{num}  {title}", 32, stroke)
    T(x + 25, 1085, que, 24, "#212529")
    x += 440

T(220, 1220, "💡 se buildea dentro de la caja, no en tu Mac.", 30, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
