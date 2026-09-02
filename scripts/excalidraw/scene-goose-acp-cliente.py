"""Escena: goose acp + el primer cliente (el editor) hablando ACP por stdio."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import lib_item

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})
ARROW = lambda x, y, pts, color: els.append({"type": "arrow", "x": x, "y": y, "points": pts, "strokeColor": color, "strokeWidth": 4, "roundness": {"type": 2}})
BOX = lambda x, y, w, h, bg, stroke, text, size: els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}, "label": {"text": text, "fontSize": size, "fontFamily": V}})

T(300, 40, "ACP: un cliente le habla al agente", 62, "#6741d9")
T(560, 120, "el mismo stdio, ahora con protocolo", 36, "#868e96")

# Tú, ya no hablas directo: usas un cliente
els.extend(lib_item("stick-figures", "Happy", 120, 300, height=240))
T(110, 560, "tú  ◕‿◕", 44, "#1971c2")
ARROW(330, 400, [[0, 0], [60, -30], [120, 0]], "#1971c2")

# El cliente ACP: el editor
BOX(470, 280, 380, 260, "#d0ebff", "#1971c2", "🖥️\nVS Code · Zed\n(cliente)", 40)
T(520, 560, "spawn → goose acp", 32, "#6741d9")

# ACP por stdio, JSON-RPC de ida y vuelta
ARROW(850, 340, [[0, 0], [160, -50], [320, 0]], "#2f9e44")
T(920, 250, "ACP · JSON-RPC", 38, "#2f9e44")
ARROW(1170, 470, [[0, 0], [-160, 50], [-320, 0]], "#2f9e44")
T(960, 520, "stdin · stdout", 34, "#2f9e44")

# goose en modo ACP
BOX(1170, 280, 380, 260, "#e5dbff", "#6741d9", "🪿\ngoose\n^‿^", 52)
BOX(1210, 570, 300, 60, "#fff3bf", "#e8590c", "$ goose acp", 34)

# Cómo se registra el cliente
T(300, 700, "el editor lo registra como agente ACP:", 34, "#495057")
els.append({"type": "text", "x": 300, "y": 750, "fontSize": 26, "fontFamily": 3, "strokeColor": "#495057",
            "text": '// settings.json (VS Code)  ·  settings.json (Zed)\n"agent_servers": { "goose": { "command": "goose", "args": ["acp"] } }'})

T(300, 880, "💡 el cliente cambia, el agente no: ACP es el enchufe común.", 39, "#e67700")

# La barra de herramientas tapa lo que queda arriba de y≈90
for e in els: e["y"] += 90

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
