"""Escena de cierre: la arquitectura completa — clientes → wss → caja (goose serve) → modelo, con la lección del cwd."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty, lib_item

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})
ARROW = lambda x, y, pts, color: els.append({"type": "arrow", "x": x, "y": y, "points": pts, "strokeColor": color, "strokeWidth": 4, "roundness": {"type": 2}})
BOX = lambda x, y, w, h, bg, stroke, text, size, **kw: els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}, "label": {"text": text, "fontSize": size, "fontFamily": V}, **kw})

T(380, 110, "La arquitectura completa", 62, "#6741d9")
T(400, 190, "un agente en la caja, muchos clientes, un solo protocolo", 36, "#868e96")

# Tú
els.extend(lib_item("stick-figures", "Happy", 60, 420, height=220))
T(60, 660, "tú  ◕‿◕", 40, "#1971c2")

# Clientes ACP (columna)
BOX(300, 290, 300, 110, "#d0ebff", "#1971c2", "🖥️ VS Code · Zed", 32)
BOX(300, 430, 300, 110, "#d0ebff", "#1971c2", "💬 Ghosty Teams", 32)
BOX(300, 570, 300, 110, "#d0ebff", "#1971c2", "📱 celular", 32)
T(320, 700, "clientes ACP", 32, "#1971c2")
ARROW(260, 520, [[0, 0], [20, -40], [40, -80]], "#1971c2")
ARROW(260, 530, [[0, 0], [40, 0]], "#1971c2")
ARROW(260, 540, [[0, 0], [20, 40], [40, 80]], "#1971c2")

# wss hacia la caja
ARROW(600, 345, [[0, 0], [150, 60], [280, 120]], "#e03131")
ARROW(600, 485, [[0, 0], [140, 0], [280, 0]], "#e03131")
ARROW(600, 625, [[0, 0], [150, -60], [280, -120]], "#e03131")
T(620, 400, "wss://…/acp", 32, "#e03131")
T(620, 545, "ACP · JSON-RPC", 28, "#e03131")

# La caja
BOX(880, 260, 700, 460, "#f3f0ff", "#6741d9", "", 30)
T(920, 275, "📦 sandbox EasyBits", 40, "#6741d9")
BOX(930, 360, 340, 170, "#fff3bf", "#e8590c", "🪿\ngoose serve\n--host 0.0.0.0 :3284", 28)
BOX(930, 560, 340, 60, "#fff9db", "#e8590c", "cwd: /data/work  ✅", 26)
T(930, 640, "🔑 X-Secret-Key", 28, "#868e96")
els.extend(ghosty(x=1330, y=380, height=190))

# El modelo
ARROW(1580, 440, [[0, 0], [80, -40], [160, 0]], "#e8590c")
T(1600, 370, "https", 32, "#e8590c")
els.append({"type": "ellipse", "x": 1740, "y": 330, "width": 240, "height": 220, "backgroundColor": "#fff3bf", "strokeColor": "#e8590c", "fillStyle": "solid", "strokeWidth": 4,
            "label": {"text": "☁️\nDeepSeek\n(EasyBits)", "fontSize": 30, "fontFamily": V}})

# Lecciones
T(300, 790, "1. stdio → wss: el proceso vive en la caja, no en tu terminal", 32, "#495057")
T(300, 840, "2. --host 0.0.0.0: si no, el proxy no lo alcanza (502)", 32, "#495057")
T(300, 890, "3. el cwd que manda el cliente debe existir en la caja (\"Invalid params\")", 32, "#495057")

T(360, 970, "💡 el cliente cambia, el cable cambia; el agente y ACP no.", 39, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
