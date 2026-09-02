"""Escena: arranque de la sesión 2 — la UI propuesta, sus 4 piezas mínimas y cómo están los conectores headless.

Uso: python3 scene-sesion-2-ui-piezas.py [1|2|3]  → 1 wireframe, 2 + piezas, 3 + conectores (default 3).
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})

def box(x, y, w, h, bg, stroke, label, size=34, dashed=False):
    e = {"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke,
         "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}}
    if dashed: e["strokeStyle"] = "dashed"
    if label: e["label"] = {"text": label, "fontSize": size, "fontFamily": V, "strokeColor": stroke}
    els.append(e)

def arrow(x, y, dx, dy, color, bend=-40, label=None):
    e = {"type": "arrow", "x": x, "y": y, "strokeColor": color, "strokeWidth": 4, "roundness": {"type": 2},
         "points": [[0, 0], [dx / 2, bend], [dx, dy]]}
    if label: e["label"] = {"text": label, "fontSize": 24, "fontFamily": V, "strokeColor": color}
    els.append(e)

N = int(sys.argv[1]) if len(sys.argv) > 1 else 3

T(120, 20, "Sesión 2 · una UI propia, y qué hay debajo", 62, "#6741d9")
T(120, 100, "la portada de goose Desktop, en web", 34, "#868e96")
els.extend(ghosty(x=1560, y=10, height=170))

# --- 1. wireframe --------------------------------------------------------
WX, WY = 120, 190
box(WX, WY, 900, 560, "#f8f9fa", "#495057", None)                      # ventana
box(WX + 15, WY + 15, 200, 530, "#e7f5ff", "#1971c2", "nav\n^‿^", 30)  # panel
box(WX + 240, WY + 15, 640, 400, "#ffffff", "#adb5bd", "\n\n\n\n\n\n\nhilo del chat (markdown en streaming)", 24)
box(WX + 240, WY + 440, 640, 90, "#fff3bf", "#e8590c", "input  ▸", 30)
T(WX + 300, WY + 60, "◕‿◕  ¿qué versión de Node tienes?", 26, "#495057")
box(WX + 300, WY + 105, 380, 60, "#ffe3e3", "#c92a2a", "▸ node --version   (tool)", 22, dashed=True)
T(WX + 300, WY + 180, "🤖  Node 22.16", 26, "#6741d9")

# --- 2. piezas mínimas ----------------------------------------------------
if N >= 2:
    PX = 1100
    T(PX, WY, "4 piezas para chatear, 1 para ver", 40, "#2f9e44")
    pieces = [
        ("① input", "crea la conversación y navega", "#fff3bf", "#e8590c"),
        ("② hilo", "pinta lo que llega, en vivo", "#ffffff", "#adb5bd"),
        ("③ ruta SSE", "un stream abierto por conversación", "#d3f9d8", "#2f9e44"),
        ("④ motor ACP", "en el servidor; el navegador nunca habla ACP", "#e5dbff", "#6741d9"),
    ]
    y = WY + 70
    for name, note, bg, stroke in pieces:
        box(PX, y, 480, 72, bg, stroke, name, 30)
        T(PX + 10, y + 78, note, 22, "#868e96")
        y += 118
    box(PX, y, 480, 72, "#ffe3e3", "#c92a2a", "⑤ tarjeta de tool", 30, dashed=True)
    T(PX + 10, y + 78, "qué corrió y qué salió; la construimos hoy", 22, "#c92a2a")

# --- 3. conectores headless ----------------------------------------------
if N >= 3:
    CY = 900
    T(120, CY - 60, "cómo están los conectores hoy (headless)", 40, "#1971c2")
    box(120, CY, 260, 110, "#a5d8ff", "#1971c2", "navegador", 32)
    arrow(380, CY + 55, 140, 0, "#2f9e44", -30, "SSE")
    box(520, CY, 300, 110, "#d3f9d8", "#2f9e44", "app (SSR)", 32)
    arrow(820, CY + 55, 140, 0, "#6741d9", -30, "ACP / wss")
    box(960, CY, 330, 110, "#e5dbff", "#6741d9", "goose en la caja", 32)
    T(130, CY + 125, "EventSource: chunk · done", 22, "#868e96")
    T(530, CY + 125, "SDK oficial, secreto en el header", 22, "#868e96")
    T(970, CY + 125, "goose serve 0.0.0.0, systemd", 22, "#868e96")
    T(120, CY + 190, "💡 ya funciona: preguntas y responde. Lo que falta es ver qué hizo en el camino.", 34, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
