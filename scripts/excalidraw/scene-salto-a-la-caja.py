"""Escena: el salto del proceso hijo local a la caja con wss — por qué y cómo."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import lib_item, ghosty

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})
ARROW = lambda x, y, pts, color, w=4: els.append({"type": "arrow", "x": x, "y": y, "points": pts, "strokeColor": color, "strokeWidth": w, "roundness": {"type": 2}})
BOX = lambda x, y, w, h, bg, stroke, text, size, **kw: els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}, "label": {"text": text, "fontSize": size, "fontFamily": V}, **kw})

T(80, 20, "El salto a la caja: de stdio a wss", 60, "#6741d9")
T(80, 100, "mismo agente, mismo ACP; cambia dónde vive y cómo llegas", 34, "#868e96")

# ---- HOY: proceso hijo en tu laptop
els.append({"type": "rectangle", "x": 80, "y": 190, "width": 520, "height": 380, "backgroundColor": "#f1f3f5", "strokeColor": "#495057", "fillStyle": "solid", "strokeWidth": 3, "roundness": {"type": 3}, "strokeStyle": "dashed"})
T(110, 205, "💻 hoy: tu laptop", 34, "#495057")
BOX(120, 290, 200, 130, "#d0ebff", "#1971c2", "🖥️\nVS Code", 30)
ARROW(320, 355, [[0, 0], [70, -25], [140, 0]], "#1971c2")
T(340, 300, "stdio", 26, "#1971c2")
BOX(460, 290, 120, 130, "#fff3bf", "#e8590c", "🪿\ngoose", 30)
T(110, 450, "😕 un solo padre\n😕 sólo en esta máquina\n😕 se muere con la terminal", 26, "#c92a2a")

# ---- EL SALTO
ARROW(620, 380, [[0, 0], [90, -60], [180, 0]], "#6741d9", 6)
T(640, 280, "el salto", 36, "#6741d9")

# ---- MAÑANA: la caja
els.append({"type": "rectangle", "x": 820, "y": 190, "width": 780, "height": 380, "backgroundColor": "#f3f0ff", "strokeColor": "#6741d9", "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}})
T(850, 205, "📦 sandbox EasyBits (microVM)", 34, "#6741d9")
BOX(860, 290, 300, 130, "#fff3bf", "#e8590c", "🪿 goose serve --acp\n--host 0.0.0.0", 26)
ARROW(1160, 355, [[0, 0], [60, -20], [120, 0]], "#c2255c")
T(1170, 300, "expose", 26, "#c2255c")
BOX(1280, 290, 280, 130, "#fcc2d7", "#c2255c", "🌐 wss://…easybits.cloud", 24)
els.extend(ghosty(x=1440, y=425, height=120))
T(850, 450, "😀 aislado, no toca tu disco\n😀 despierta con el Upgrade\n😀 N clientes, desde donde sea", 26, "#2f9e44")

# ---- Clientes que llegan por wss
ARROW(1420, 190, [[0, 0], [-40, -60], [-100, -90]], "#c2255c")
BOX(1160, 60, 180, 60, "#d0ebff", "#1971c2", "💬 Ghosty Teams", 22)
BOX(1360, 20, 140, 60, "#d0ebff", "#1971c2", "📱 celular", 22)
BOX(1520, 60, 150, 60, "#d0ebff", "#1971c2", "🖥️ VS Code", 22)
ARROW(1430, 190, [[0, 0], [0, -110]], "#c2255c")
ARROW(1440, 190, [[0, 0], [60, -40], [150, -70]], "#c2255c")

# ---- Por qué wss y no ssh
els.append({"type": "rectangle", "x": 80, "y": 620, "width": 1640, "height": 170, "backgroundColor": "#e7f5ff", "strokeColor": "#1971c2", "fillStyle": "solid", "strokeWidth": 3, "roundness": {"type": 3}})
T(110, 635, "🔌 por qué wss", 32, "#1971c2")
T(110, 685, "1 conversación = 1 WebSocket: new WebSocket(url) … close(), sin child.kill() ni señales\nNode 22 lo trae nativo: cero dependencias. el proxy de la caja pasa el Upgrade (capa 7): sin túnel ssh ni llaves en el app", 26, "#1864ab")

# ---- Cómo
els.append({"type": "rectangle", "x": 80, "y": 820, "width": 1640, "height": 160, "backgroundColor": "#f1f3f5", "strokeColor": "#495057", "fillStyle": "solid", "strokeWidth": 3, "roundness": {"type": 3}})
T(110, 835, "⌨️ cómo (≈5 s de cero a ACP)", 30, "#495057")
els.append({"type": "text", "x": 110, "y": 885, "fontSize": 26, "fontFamily": 3, "strokeColor": "#212529",
            "text": "create  →  running  →  goose serve --acp --host 0.0.0.0  →  expose 3284  →  wss://…  →  initialize"})

T(200, 1020, "💡 sin --host 0.0.0.0 el proxy no te encuentra: llega a la IP de la microVM, no al loopback.", 34, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
