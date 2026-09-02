"""Escena: el salto a la caja, en su versión más simple — el agente se muda, el cliente lo alcanza por wss."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})
ARROW = lambda x, y, pts, color: els.append({"type": "arrow", "x": x, "y": y, "points": pts, "strokeColor": color, "strokeWidth": 4, "roundness": {"type": 2}})
BOX = lambda x, y, w, h, bg, stroke, text, size, **kw: els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}, "label": {"text": text, "fontSize": size, "fontFamily": V}, **kw})

T(420, 120, "El salto a la caja", 62, "#6741d9")
T(430, 200, "mismo agente, mismo ACP; sólo cambia dónde vive", 36, "#868e96")

# Hoy: tu laptop
BOX(140, 300, 620, 340, "#f1f3f5", "#495057", "", 30, strokeStyle="dashed")
T(180, 315, "💻 tu laptop", 40, "#495057")
BOX(200, 420, 240, 150, "#d0ebff", "#1971c2", "🖥️\nVS Code", 36)
ARROW(440, 495, [[0, 0], [60, -30], [120, 0]], "#2f9e44")
T(465, 420, "stdio", 34, "#2f9e44")
BOX(560, 420, 160, 150, "#fff3bf", "#e8590c", "🪿\ngoose", 36)

# El salto
ARROW(770, 470, [[0, 0], [120, -90], [240, 0]], "#6741d9")
T(800, 330, "el salto", 44, "#6741d9")

# La caja
BOX(1020, 300, 760, 340, "#f3f0ff", "#6741d9", "", 30)
T(1060, 315, "📦 sandbox EasyBits", 40, "#6741d9")
BOX(1080, 420, 320, 150, "#fff3bf", "#e8590c", "🪿\ngoose serve", 36)
els.extend(ghosty(x=1560, y=410, height=180))

# El cliente ahora llega por wss
ARROW(320, 640, [[0, 0], [400, 200], [920, 0]], "#e03131")
T(660, 850, "wss://…easybits.cloud", 40, "#e03131")

T(360, 940, "💡 el proceso ya no muere con tu terminal: vive en la caja.", 39, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
