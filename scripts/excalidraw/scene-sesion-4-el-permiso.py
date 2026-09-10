"""Escena: el permiso, que queda de tarea (sesión 4, slide 5, el último). Lienzo 4:3.

Uso: python3 scene-sesion-4-el-permiso.py [N]
  1 el viaje del permiso · 2 cómo se ve en el protocolo · 3 la tarea
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
AZUL, VERDE, AMBAR, GRIS, ROJO = "#1971c2", "#2f9e44", "#f08c00", "#868e96", "#c92a2a"
MORADO = "#7048e8"
els = []
T = lambda x, y, t, s, c: els.append({"type": "text", "x": x, "y": y, "fontSize": s, "fontFamily": V, "text": t, "strokeColor": c})
M = lambda x, y, t, s, c: els.append({"type": "text", "x": x, "y": y, "fontSize": s, "fontFamily": 3, "text": t, "strokeColor": c})

def rect(x, y, w, h, bg, stroke, sw=4, dash="solid", r=3):
    els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg,
                "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": sw, "strokeStyle": dash,
                "roundness": {"type": r}})

def arrow(x, y, pts, stroke, sw=4, dash="solid"):
    els.append({"type": "arrow", "x": x, "y": y, "strokeColor": stroke, "strokeWidth": sw,
                "strokeStyle": dash, "roundness": {"type": 2}, "points": pts})

N = int(sys.argv[1]) if len(sys.argv) > 1 else 3

rect(120, 20, 1760, 1320, "transparent", "#ffffff", 1)
T(140, 30, "La tarea: ¿quién da el permiso?", 58, AZUL)
els.extend(ghosty(x=1680, y=20, height=110))

# --- 1. el viaje del permiso ---
if N >= 1:
    rect(140, 160, 1700, 340, "#e7f5ff", AZUL)
    T(180, 178, "el agente pregunta antes de lo arriesgado", 34, AZUL)

    rect(220, 260, 420, 180, "#ffffff", AZUL, 3)
    T(255, 286, "el Agente", 32, AZUL)
    T(255, 340, "va a borrar un archivo", 26, GRIS)
    M(255, 384, "session/request_permission", 21, MORADO)

    arrow(670, 350, [[0, 0], [200, 0]], AZUL)

    rect(910, 260, 420, 180, "#ffffff", MORADO, 3)
    T(945, 286, "el Cliente", 32, MORADO)
    T(945, 340, "recibe la pregunta", 26, GRIS)
    T(945, 384, "con sus opciones", 26, GRIS)

    arrow(1360, 350, [[0, 0], [140, 0]], MORADO)

    rect(1530, 260, 260, 180, "#ffffff", VERDE, 3)
    T(1565, 286, "tú", 32, VERDE)
    T(1565, 340, "decides", 26, GRIS)

# --- 2. cómo se ve en el protocolo ---
if N >= 2:
    rect(140, 540, 820, 280, "#f1f3f5", GRIS)
    T(180, 556, "lo que llega", 30, GRIS)
    for k, ln in enumerate([
            '"toolCall": { "title": "rm -rf build" },',
            '"options": [',
            '  { "optionId": "a1", "kind": "allow_once" },',
            '  { "optionId": "r1", "kind": "reject_once" } ]']):
        M(180, 610 + k * 44, ln, 21, AZUL)

    rect(1020, 540, 820, 280, "#f1f3f5", GRIS)
    T(1060, 556, "lo que se contesta", 30, GRIS)
    M(1060, 618, '"outcome": {', 22, VERDE)
    M(1060, 662, '  "outcome": "selected",', 22, VERDE)
    M(1060, 706, '  "optionId": "a1"', 22, VERDE)
    M(1060, 750, '}', 22, VERDE)
    T(1060, 790, "una sola línea, y el turno sigue.", 22, GRIS)

# --- 3. la tarea ---
if N >= 3:
    rect(140, 860, 1700, 390, "#f3f0ff", MORADO)
    T(180, 878, "✓ la tarea: hoy el Cliente contesta \"a1\" solo, sin preguntarte", 32, MORADO)
    for k, ln in enumerate([
            "1 · que el turno espere tu respuesta",
            "2 · contestar desde otro lado: el mismo optionId por WhatsApp"]):
        T(180, 950 + k * 62, ln, 29, GRIS)
    T(180, 1096, "un agente que pregunta todo es inusable;", 27, MORADO)
    T(180, 1138, "uno que no pregunta nada, peligroso.", 27, MORADO)
    T(180, 1196, "dónde vive: app/.server/acp.ts", 24, GRIS)

T(1740, 1290, "5 / 5", 26, GRIS)

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
