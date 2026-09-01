"""Escena: storyboard en 3 actos del trailer de ghosty 0.0.20 (serve → wss → varias sesiones)."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty, lib_item

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})
ARROW = lambda x, y, pts, color, w=4: els.append({"type": "arrow", "x": x, "y": y, "points": pts, "strokeColor": color, "strokeWidth": w, "roundness": {"type": 2}})
BOX = lambda x, y, w, h, bg, stroke, text, size, **kw: els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}, "label": {"text": text, "fontSize": size, "fontFamily": V}, **kw})
PANEL = lambda x, title, color: (els.append({"type": "rectangle", "x": x, "y": 180, "width": 540, "height": 560, "backgroundColor": "#fff", "strokeColor": color, "fillStyle": "solid", "strokeWidth": 5, "roundness": {"type": 3}}), T(x + 20, 195, title, 34, color))

T(340, 20, "ghosty 0.0.20 · trailer en 3 actos", 60, "#6741d9")
T(340, 100, "≈ 30 s · un acto = 10 s · sin narración, sólo cartelas", 30, "#868e96")

# ---- Acto 1: encerrado en stdio
PANEL(80, "1 · encerrado", "#c92a2a")
BOX(110, 270, 200, 120, "#d0ebff", "#1971c2", "🖥️\nun editor", 28)
ARROW(310, 330, [[0, 0], [60, 0]], "#c92a2a")
T(315, 290, "stdio", 24, "#c92a2a")
els.extend(ghosty(x=390, y=260, height=140))
T(110, 430, "😕 un solo padre\n😕 una sola sesión\n😕 se muere con la terminal", 26, "#c92a2a")
T(110, 640, "cartela: «un agente, un dueño»", 24, "#868e96")

# ---- Acto 2: ghosty serve
PANEL(660, "2 · ghosty serve", "#6741d9")
els.append({"type": "text", "x": 690, "y": 260, "fontSize": 30, "fontFamily": 3, "strokeColor": "#212529", "text": "$ ghosty serve"})
BOX(690, 320, 220, 120, "#e5dbff", "#6741d9", "🌉\nwss ✓", 30)
els.extend(ghosty(x=980, y=300, height=160))
T(690, 470, "el puente: el agente sigue en stdio,\ndel otro lado hay un socket\ny cada sesión lleva la suya", 24, "#495057")
T(690, 640, "cartela: «el mismo agente, en la red»", 24, "#868e96")

# ---- Acto 3: desde donde sea
PANEL(1240, "3 · desde donde sea", "#2f9e44")
for i, (x, y, label) in enumerate(((1270, 270, "💬 Teams"), (1270, 350, "📱 celular"), (1270, 430, "🖥️ VS Code"))):
    BOX(x, y, 170, 60, "#d3f9d8", "#2f9e44", label, 22)
    ARROW(1440, y + 30, [[0, 0], [60, (380 - y) * 0.6], [120, 380 - y]], "#2f9e44", 3)
T(1450, 230, "A · B · C", 26, "#2f9e44")
els.extend(ghosty(x=1570, y=300, height=160))
T(1270, 520, "😀 N sesiones, un solo proceso\n😀 en tu laptop o en una caja", 26, "#2f9e44")
T(1270, 640, "cartela: «npm i -g ghostycode@0.0.20»", 24, "#868e96")

T(300, 790, "💡 ritmo: acto 1 quieto y gris · acto 2 entra el morado y la malla se abre · acto 3 todo se conecta y cierra con el logo", 26, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
