"""Escena: VS Code → goose (ACP) → DeepSeek por API. Sin adaptador ni proceso hijo extra."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})
ARROW = lambda x, y, pts, color: els.append({"type": "arrow", "x": x, "y": y, "points": pts, "strokeColor": color, "strokeWidth": 4, "roundness": {"type": 2}})
BOX = lambda x, y, w, h, bg, stroke, text, size: els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}, "label": {"text": text, "fontSize": size, "fontFamily": V}})

T(240, 20, "goose con EasyBits: el camino corto", 58, "#6741d9")
T(400, 100, "un proceso hijo, un endpoint compatible con OpenAI y tu key", 36, "#868e96")

BOX(100, 300, 300, 220, "#d0ebff", "#1971c2", "🖥️\nVS Code", 40)
T(160, 530, "cliente ACP", 32, "#1971c2")

T(420, 200, "ACP · stdio", 30, "#1971c2")
ARROW(400, 380, [[0, 0], [100, -40], [200, 0]], "#1971c2")
T(430, 395, "goose acp", 26, "#868e96")

BOX(600, 260, 340, 300, "#fff3bf", "#e8590c", "🪿\ngoose\n\nservidor ACP\n+ cliente HTTP", 38)
T(640, 570, "provider: easybits", 30, "#e8590c")

T(970, 200, "https", 30, "#c2255c")
ARROW(940, 380, [[0, 0], [100, -40], [200, 0]], "#c2255c")
T(955, 240, "OpenAI compatible", 26, "#868e96")

els.append({"type": "ellipse", "x": 1140, "y": 250, "width": 360, "height": 300, "backgroundColor": "#e5dbff", "strokeColor": "#6741d9", "fillStyle": "solid", "strokeWidth": 4,
            "label": {"text": "🧩\nEasyBits\nLLM API", "fontSize": 44, "fontFamily": V}})
BOX(1120, 580, 400, 80, "#ffe3e3", "#c92a2a", "🔑 EASYBITS_API_KEY", 28)
T(1540, 590, "la misma key\nde tus sandboxes", 28, "#c92a2a")

els.append({"type": "rectangle", "x": 100, "y": 720, "width": 900, "height": 200, "backgroundColor": "#f1f3f5", "strokeColor": "#495057", "fillStyle": "solid", "strokeWidth": 3, "roundness": {"type": 3}})
T(130, 735, "⌨️ cómo se arma", 30, "#495057")
els.append({"type": "text", "x": 130, "y": 780, "fontSize": 26, "fontFamily": 3, "strokeColor": "#212529",
            "text": "goose configure          # Custom Provider (OpenAI compatible)\n#   base URL: https://www.easybits.cloud/api/v2/llm/v1\n#   api key:  EASYBITS_API_KEY\ngoose acp                # VS Code lo lanza así"})

T(200, 960, "💡 mismo goose, mismo ACP arriba; lo que cambia es a quién le pide el modelo.", 39, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
