"""Escena: la caja, súper simplificada. Cliente → wss → caja (goose + modelo)."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})
ARROW = lambda x, y, pts, color: els.append({"type": "arrow", "x": x, "y": y, "points": pts, "strokeColor": color, "strokeWidth": 5, "roundness": {"type": 2}})
BOX = lambda x, y, w, h, bg, stroke, text, size: els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}, "label": {"text": text, "fontSize": size, "fontFamily": V}})

T(380, 20, "Así queda la caja", 64, "#6741d9")

# Cliente
# Tu máquina: el editor + el puente
els.append({"type": "rectangle", "x": 40, "y": 180, "width": 560, "height": 420, "backgroundColor": "#f1f3f5", "strokeColor": "#495057", "fillStyle": "solid", "strokeWidth": 3, "roundness": {"type": 3}, "strokeStyle": "dashed"})
T(70, 195, "💻 tu máquina", 34, "#495057")
BOX(70, 290, 200, 200, "#d0ebff", "#1971c2", "🖥️\nVS Code\nZed", 32)
ARROW(270, 390, [[0, 0], [40, -15], [80, 0]], "#1971c2")
T(280, 340, "stdio", 24, "#1971c2")
BOX(350, 290, 230, 200, "#ffec99", "#f08c00", "🔌\nnpx ghosty-acp\nwss://…", 26)
T(70, 510, "el editor sólo sabe lanzar un hijo por stdio;\nghosty-acp es ese hijo y cambia el cable por wss", 22, "#495057")

# wss
ARROW(580, 390, [[0, 0], [80, -50], [160, 0]], "#c2255c")
T(600, 300, "wss://", 40, "#c2255c")

# Caja
els.append({"type": "rectangle", "x": 740, "y": 180, "width": 720, "height": 420, "backgroundColor": "#f3f0ff", "strokeColor": "#6741d9", "fillStyle": "solid", "strokeWidth": 5, "roundness": {"type": 3}})
T(770, 195, "📦 sandbox EasyBits", 36, "#6741d9")
BOX(780, 270, 360, 240, "#fff3bf", "#e8590c", "🪿\ngoose serve\n:3284", 38)
els.extend(ghosty(x=1220, y=290, height=210))

# Modelo
ARROW(1460, 380, [[0, 0], [90, -40], [180, 0]], "#e8590c")
T(1500, 300, "https", 32, "#e8590c")
els.append({"type": "ellipse", "x": 1640, "y": 260, "width": 320, "height": 240, "backgroundColor": "#e5dbff", "strokeColor": "#6741d9", "fillStyle": "solid", "strokeWidth": 4,
            "label": {"text": "☁️\nel modelo", "fontSize": 38, "fontFamily": V}})

T(300, 680, "💡 el editor no cambia; sólo cambia el cable: un hijo local que habla wss con la caja.", 40, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
