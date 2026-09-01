"""Escena: goose es servidor ACP hacia arriba y cliente ACP hacia abajo (Claude Code con OAuth del plan Max)."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import lib_item, ghosty

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})
ARROW = lambda x, y, pts, color: els.append({"type": "arrow", "x": x, "y": y, "points": pts, "strokeColor": color, "strokeWidth": 4, "roundness": {"type": 2}})
BOX = lambda x, y, w, h, bg, stroke, text, size, **kw: els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}, "label": {"text": text, "fontSize": size, "fontFamily": V}, **kw})

T(240, 20, "goose: servidor ACP y cliente ACP a la vez", 58, "#6741d9")
T(430, 100, "un agente que a su vez es padre de otro agente", 36, "#868e96")

# 1. Cliente arriba
BOX(100, 300, 300, 220, "#d0ebff", "#1971c2", "🖥️\nZed · VS Code\nGhosty Teams", 36)
T(140, 530, "cliente ACP", 32, "#1971c2")

ARROW(400, 380, [[0, 0], [100, -40], [200, 0]], "#1971c2")
T(420, 200, "ACP · stdio", 30, "#1971c2")
T(430, 395, "goose acp", 26, "#868e96")

# 2. goose en medio: dos sombreros
BOX(600, 260, 340, 300, "#fff3bf", "#e8590c", "🪿\ngoose\n\nservidor ⬅\ncliente ➡", 38)
T(600, 570, "provider: claude-acp", 30, "#e8590c")

ARROW(940, 380, [[0, 0], [100, -40], [200, 0]], "#6741d9")
T(960, 200, "ACP · stdio", 30, "#6741d9")
T(940, 240, "spawn(claude-agent-acp)", 24, "#868e96")

# 3. Claude Code abajo, con la llave OAuth
BOX(1140, 300, 320, 220, "#e5dbff", "#6741d9", "✨\nclaude-agent-acp\n↳ claude", 34)
T(1140, 530, "adaptador ACP", 28, "#6741d9")

ARROW(1400, 520, [[0, 0], [40, 40], [0, 80]], "#2f9e44")
BOX(1140, 600, 320, 90, "#d3f9d8", "#2f9e44", "🔑 OAuth · plan Max", 32)
T(1480, 610, "sin API key:\nva por tu suscripción", 28, "#2f9e44")

# Moraleja
els.append({"type": "rectangle", "x": 100, "y": 720, "width": 900, "height": 170, "backgroundColor": "#f1f3f5", "strokeColor": "#495057", "fillStyle": "solid", "strokeWidth": 3, "roundness": {"type": 3}})
T(130, 735, "⌨️ cómo se arma", 30, "#495057")
els.append({"type": "text", "x": 130, "y": 780, "fontSize": 26, "fontFamily": 3, "strokeColor": "#212529",
            "text": "npm i -g @agentclientprotocol/claude-agent-acp\ngoose configure          # provider → claude-acp\ngoose acp                # ya es servidor y cliente"})
T(200, 930, "💡 goose habla ACP hacia los dos lados: lo que te cobran es el plan, no los tokens.", 39, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
