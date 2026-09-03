"""Escena: cierre de la sesión 2 — cada pestaña de la UI es una pieza del protocolo.

Uso: python3 scene-sesion-2-cierre.py [1..8]  → revela renglón por renglón (default 8).
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})

def box(x, y, w, h, bg, stroke, label, size=30, dashed=False):
    e = {"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke,
         "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}}
    if dashed: e["strokeStyle"] = "dashed"
    if label: e["label"] = {"text": label, "fontSize": size, "fontFamily": V, "strokeColor": stroke}
    els.append(e)

N = int(sys.argv[1]) if len(sys.argv) > 1 else 8

T(100, 20, "Para dónde vamos", 60, "#6741d9")
T(100, 100, "cada pestaña de la barra es una pieza del protocolo", 32, "#868e96")
els.extend(ghosty(x=1130, y=5, height=170))

# (pestaña, pieza de ACP, cuándo, listo)
# color por sesión
HOY, S3, S4, S5, S6, FUERA = "#2f9e44", "#1971c2", "#6741d9", "#c2255c", "#e8590c", "#adb5bd"
BG = {HOY: "#d3f9d8", S3: "#d0ebff", S4: "#e5dbff", S5: "#ffdeeb", S6: "#ffd8a8", FUERA: "#f8f9fa"}

filas = [
    ("💬", "Nueva conversación", "session/new + prompt", "hoy", HOY),
    ("🕘", "Historial", "session/load", "la que sigue", S3),
    ("🧩", "Extensiones", "mcpServers[]", "sesión 4", S4),
    ("🗂️", "Apps", "UI que dibuja un MCP", "sesión 4", S4),
    ("💬", "WhatsApp", "otro cliente, mismo agente", "sesión 5", S5),
    ("⚡", "Habilidades", "lo que sabe hacer", "sesión 6", S6),
    ("📋", "Recetas", "prompts guardados de goose", "por tu cuenta", FUERA),
    ("🕐", "Agenda", "turnos sin nadie mirando", "por tu cuenta", FUERA),
]

y = 230
for emoji, pest, pieza, cuando, color in filas[:N]:
    box(100, y, 1200, 96, BG[color], color, "", 30)
    T(130, y + 26, emoji, 36, "#212529")
    T(200, y + 30, pest, 32, "#212529")
    T(620, y + 32, pieza, 28, "#868e96")
    T(1060, y + 32, cuando, 26, color)
    y += 116

if N >= 8:
    T(100, y + 40, "🎪 El agente ya está vivo, ahora hay que enseñarle trucos. 🤹", 36, "#e8590c")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("cierre", N, "· version", prev + 1)
