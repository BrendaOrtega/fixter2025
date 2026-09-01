"""Escena: todo empieza con un proceso hijo en el kernel (goose / ghosty / gemini-cli --acp)."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import lib_item, ghosty

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})
ARROW = lambda x, y, pts, color, label=None: els.append({"type": "arrow", "x": x, "y": y, "points": pts, "strokeColor": color, "strokeWidth": 4, "roundness": {"type": 2}})
BOX = lambda x, y, w, h, bg, stroke, text, size: els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}, "label": {"text": text, "fontSize": size, "fontFamily": V}})

T(260, 20, "Todo empieza con un proceso hijo", 62, "#6741d9")
T(420, 100, "el kernel lo crea, tú le hablas por stdio", 36, "#868e96")

# Kernel: caja grande gris que contiene a los dos procesos
els.append({"type": "rectangle", "x": 120, "y": 180, "width": 1180, "height": 560, "backgroundColor": "#f1f3f5", "strokeColor": "#495057", "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}, "strokeStyle": "dashed"})
T(150, 195, "🧠 kernel", 40, "#495057")

# Proceso padre: tu programa
BOX(200, 320, 300, 240, "#d0ebff", "#1971c2", "🖥️\nZed · VS Code\nGhosty Teams\n(padre)", 36)

# spawn
ARROW(500, 400, [[0, 0], [110, -40], [220, 0]], "#6741d9")
T(560, 320, "spawn()", 40, "#6741d9")

# stdio de ida y vuelta
ARROW(720, 500, [[0, 0], [-110, 50], [-220, 0]], "#2f9e44")
T(520, 570, "stdin · stdout", 36, "#2f9e44")

# Proceso hijo: el agente
BOX(720, 320, 300, 240, "#e5dbff", "#6741d9", "🤖\nagente\n(hijo)", 44)
els.extend(ghosty(x=1030, y=330, height=220))

# Los tres sabores del hijo
T(230, 620, "el hijo puede ser cualquiera que hable ACP:", 34, "#495057")
BOX(200, 660, 240, 60, "#fff3bf", "#e8590c", "goose acp", 30)
BOX(460, 660, 320, 60, "#d3f9d8", "#2f9e44", "ghosty serve --acp", 30)
BOX(800, 660, 400, 60, "#ffd8a8", "#e8590c", "gemini --experimental-acp", 30)

T(300, 790, "💡 sin red, sin puerto: solo dos tuberías y un proceso.", 39, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
