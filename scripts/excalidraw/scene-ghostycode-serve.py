"""Escena: ghostycode serve v0.0.20 — puente wss que multiplexa sesiones al agente."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import lib_item

V = 1  # Virgil
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})
ARROW = lambda x, y, pts, color: els.append({"type": "arrow", "x": x, "y": y, "points": pts, "strokeColor": color, "strokeWidth": 4, "roundness": {"type": 2}})

T(300, 20, "ghostycode serve  v0.0.20", 62, "#6741d9")
T(380, 100, "muchas sesiones, un solo agente ✨", 36, "#868e96")

# Sesiones: muñequitos felices de la librería stick-figures
for i, (label, y) in enumerate([("A", 180), ("B", 380), ("C", 580)]):
    els.extend(lib_item("stick-figures", "Happy", x=120, y=y, height=170))
    T(210, y + 60, label, 44, "#1971c2")
T(60, 780, "💬 Ghosty Teams", 34, "#1971c2")

ARROW(240, 265, [[0, 0], [110, 70], [220, 180]], "#1971c2")
ARROW(240, 465, [[0, 0], [110, -10], [220, 0]], "#1971c2")
ARROW(240, 665, [[0, 0], [110, -70], [220, -180]], "#1971c2")
T(320, 400, "wss", 36, "#1971c2")

# Puente
els.append({"type": "rectangle", "x": 470, "y": 320, "width": 300, "height": 290, "backgroundColor": "#e5dbff", "strokeColor": "#6741d9", "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3},
            "label": {"text": "🌉\nserve\n(A · B · C)", "fontSize": 52, "fontFamily": V}})
T(470, 625, "puente + multiplexor", 34, "#6741d9")

ARROW(770, 465, [[0, 0], [90, -30], [180, 0]], "#2f9e44")
T(815, 480, "stdio", 36, "#2f9e44")

# Agente: fantasma feliz = Ghosty
els.extend(lib_item("halloween-elements", "Happy ghost", x=960, y=270, height=340))
T(1000, 625, "ghosty · 1 proceso", 34, "#2f9e44")

T(300, 850, "💡 stdio solo admite un padre. El puente lo abre a la red.", 39, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1, "elements", len(els))
