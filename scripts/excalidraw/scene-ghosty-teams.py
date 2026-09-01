"""Escena: del editor a Ghosty Teams — una interfaz web que habla wss con la caja y suma lo que un editor no da."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty, lib_item

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})
ARROW = lambda x, y, pts, color, w=5: els.append({"type": "arrow", "x": x, "y": y, "points": pts, "strokeColor": color, "strokeWidth": w, "roundness": {"type": 2}})
BOX = lambda x, y, w, h, bg, stroke, text, size, **kw: els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}, "label": {"text": text, "fontSize": size, "fontFamily": V}, **kw})

T(200, 20, "De VS Code a Ghosty Teams", 62, "#6741d9")
T(200, 100, "la misma caja, ahora con una interfaz hecha para equipos", 34, "#868e96")

# ---- Personas: varias, desde el navegador
for i, y in enumerate((220, 360, 500)):
    els.extend(lib_item("stick-figures", "Happy", x=90, y=y, height=120))
T(60, 640, "👥 tu equipo\n(navegador, celular)", 24, "#1971c2")
for y in (280, 420, 560):
    ARROW(170, y, [[0, 0], [90, (400 - y) * 0.5], [180, 400 - y]], "#1971c2", 3)
T(200, 170, "https", 26, "#1971c2")

# ---- Ghosty Teams
els.append({"type": "rectangle", "x": 360, "y": 200, "width": 560, "height": 480, "backgroundColor": "#d0ebff", "strokeColor": "#1971c2", "fillStyle": "solid", "strokeWidth": 5, "roundness": {"type": 3}})
T(390, 215, "💬 Ghosty Teams", 40, "#1971c2")
T(390, 265, "app web · Node 22 · React Router", 22, "#495057")
BOX(390, 310, 230, 70, "#fff", "#1971c2", "🗂️ historial", 22)
BOX(640, 310, 250, 70, "#fff", "#1971c2", "🔐 permisos", 22)
BOX(390, 400, 230, 70, "#fff", "#1971c2", "🔁 revive la caja", 22)
BOX(640, 400, 250, 70, "#fff", "#1971c2", "🧩 extensiones", 22)
BOX(390, 490, 230, 70, "#fff", "#1971c2", "🛠️ habilidades", 22)
BOX(640, 490, 250, 70, "#fff", "#1971c2", "📊 operación", 22)
T(390, 590, "1 conversación = 1 WebSocket\nnew WebSocket(url) … close()", 22, "#495057")

# ---- wss
ARROW(920, 400, [[0, 0], [90, -60], [180, 0]], "#c2255c")
T(960, 300, "wss://", 40, "#c2255c")

# ---- La caja
els.append({"type": "rectangle", "x": 1100, "y": 240, "width": 560, "height": 400, "backgroundColor": "#f3f0ff", "strokeColor": "#6741d9", "fillStyle": "solid", "strokeWidth": 5, "roundness": {"type": 3}})
T(1130, 255, "📦 sandbox EasyBits", 36, "#6741d9")
BOX(1130, 330, 260, 200, "#fff3bf", "#e8590c", "🪿\ngoose serve\n:3284", 32)
els.extend(ghosty(x=1440, y=340, height=180))
T(1130, 560, "la misma caja de VS Code; aquí nada cambió", 22, "#495057")

# ---- Qué ganamos
T(200, 740, "🆚 VS Code: 1 persona, 1 sesión, en su máquina    ·    Ghosty Teams: N personas, N sesiones, desde donde sea", 26, "#495057")
T(150, 800, "💡 el editor probó el cable; en Teams es donde el equipo trabaja con el agente.", 36, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
