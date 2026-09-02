"""Escena: lo más simple — tú hablas con goose por stdio, nada más."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import lib_item

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})
ARROW = lambda x, y, pts, color: els.append({"type": "arrow", "x": x, "y": y, "points": pts, "strokeColor": color, "strokeWidth": 4, "roundness": {"type": 2}})
BOX = lambda x, y, w, h, bg, stroke, text, size: els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}, "label": {"text": text, "fontSize": size, "fontFamily": V}})

T(380, 40, "Un agente en tu terminal", 62, "#6741d9")

# Tú, en la terminal
els.extend(lib_item("stick-figures", "Happy", 220, 240, height=260))
T(200, 520, "tú  ◕‿◕", 44, "#1971c2")

# stdio de ida y vuelta
ARROW(460, 330, [[0, 0], [150, -50], [300, 0]], "#2f9e44")
T(540, 240, "stdin", 40, "#2f9e44")
ARROW(760, 430, [[0, 0], [-150, 50], [-300, 0]], "#2f9e44")
T(530, 490, "stdout", 40, "#2f9e44")

# goose
BOX(760, 250, 360, 260, "#e5dbff", "#6741d9", "🪿\ngoose\n^‿^", 52)
# Cómo instalarlo y arrancarlo, en tres pasos
T(1280, 230, "1. instalar", 36, "#e8590c")
BOX(1280, 275, 620, 60, "#fff3bf", "#e8590c", "curl -fsSL .../download_cli.sh | bash", 26)
T(1280, 360, "2. configurar (proveedor + modelo)", 36, "#e8590c")
BOX(1280, 405, 620, 60, "#fff3bf", "#e8590c", "$ goose configure", 34)
T(1280, 490, "3. correr", 36, "#e8590c")
BOX(1280, 535, 620, 60, "#fff3bf", "#e8590c", "$ goose", 34)

T(340, 720, "💡 un proceso, dos tuberías: eso es todo el agente.", 39, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
