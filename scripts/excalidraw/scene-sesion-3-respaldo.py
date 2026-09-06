"""Escena: la memoria episódica sobrevive a la caja (bloque de respaldo, sesión 3).

Uso: python3 scene-sesion-3-respaldo.py [N]
  1 caja viva · 2 se muere · 3 otra caja, mismo hilo · 4 la pantalla vacía
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
AZUL, GRIS, ROJO = "#1971c2", "#868e96", "#c92a2a"
els = []
T = lambda x, y, t, s, c: els.append({"type": "text", "x": x, "y": y, "fontSize": s, "fontFamily": V, "text": t, "strokeColor": c})

def rect(x, y, w, h, bg, stroke, sw=4, dash="solid", r=3):
    els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg,
                "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": sw, "strokeStyle": dash,
                "roundness": {"type": r}})

def ellipse(x, y, w, h, bg, stroke, sw=4):
    els.append({"type": "ellipse", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg,
                "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": sw})

def line(x, y, pts, stroke, sw=4, dash="solid"):
    els.append({"type": "line", "x": x, "y": y, "strokeColor": stroke, "strokeWidth": sw,
                "strokeStyle": dash, "points": pts})

def arrow(x, y, pts, stroke, sw=4, dash="solid"):
    els.append({"type": "arrow", "x": x, "y": y, "strokeColor": stroke, "strokeWidth": sw,
                "strokeStyle": dash, "roundness": {"type": 2}, "points": pts})

def caja(x, y, w=320, h=250, stroke=AZUL, bg="#ffffff", dash="solid"):
    """Una microVM dibujada como caja de cartón, con solapas abiertas."""
    rect(x, y + 40, w, h - 40, bg, stroke, 4, dash)
    line(x, y + 40, [[0, 0], [70, -40], [w / 2, -40], [w / 2, 0]], stroke, 4, dash)   # solapa izq
    line(x + w, y + 40, [[0, 0], [-70, -40], [-w / 2, -40], [-w / 2, 0]], stroke, 4, dash)  # solapa der

def hilo(x, y, stroke=AZUL, bg="#d0ebff"):
    """El hilo: burbujas de conversación apiladas, alternando lado."""
    for i, (dx, w) in enumerate(((0, 150), (60, 130), (0, 170), (75, 115))):
        by = y + i * 54
        rect(x + dx, by, w, 42, bg if i % 2 == 0 else "#ffffff", stroke, 3)
        # colita de la burbuja
        line(x + dx + (14 if i % 2 == 0 else w - 14), by + 42,
             [[0, 0], [0, 14], [14 if i % 2 == 0 else -14, 0]], stroke, 3)

def nube(x, y, w=420, h=150, stroke=AZUL, bg="#e7f5ff"):
    ellipse(x, y + h * 0.32, w * 0.46, h * 0.68, bg, stroke)
    ellipse(x + w * 0.24, y, w * 0.52, h * 0.86, bg, stroke)
    ellipse(x + w * 0.54, y + h * 0.26, w * 0.46, h * 0.74, bg, stroke)
    rect(x + w * 0.1, y + h * 0.62, w * 0.8, h * 0.3, bg, bg, 1, "solid", 3)

N = int(sys.argv[1]) if len(sys.argv) > 1 else 4

T(120, 30, "📼 la episódica sobrevive a la caja", 62, AZUL)
els.extend(ghosty(x=1620, y=20, height=160))

# la nube, arriba y al centro: el único lugar que no muere
nube(760, 190)
T(858, 246, "S3", 54, AZUL)
T(806, 360, "sessions.db", 26, GRIS)

# --- 1. la caja viva, con su hilo adentro ---
caja(140, 520)
hilo(215, 570)
T(190, 800, "la caja trabaja", 30, GRIS)
arrow(400, 530, [[0, 0], [180, -110], [370, -140]], AZUL)
T(520, 430, ".backup", 30, AZUL)

# --- 2. la caja muere ---
if N >= 2:
    caja(770, 520, stroke=ROJO, bg="#fff5f5", dash="dashed")
    line(850, 590, [[0, 0], [160, 160]], ROJO, 5)
    line(1010, 590, [[0, 0], [-160, 160]], ROJO, 5)
    T(830, 800, "se muere", 30, ROJO)

# --- 3. otra caja, el hilo regresa ---
if N >= 3:
    caja(1400, 520)
    hilo(1475, 570)
    T(1420, 800, "otra caja, mismo hilo", 30, GRIS)
    arrow(1230, 390, [[0, 0], [190, 30], [330, 130]], AZUL)
    T(1300, 430, "GetObject", 30, AZUL)

if N >= 3:
    T(140, 870, "🪿 goose  guarda en /root: su sessions.db se va con la caja", 34, "#e67700")
    rect(140, 936, 1000, 96, "#fff9db", "#f08c00", 4)
    T(190, 958, "XDG_DATA_HOME=/data/state", 48, "#e67700")
    T(1180, 966, "una línea en el bootstrap", 28, GRIS)
    T(140, 1076, "👻 ghosty-lite  ya escribe en /data: no necesita nada", 34, "#2f9e44")

# 4 — la memoria está ahí; nadie la fue a buscar
if N >= 4:
    rect(140, 1130, 700, 230, "#ffffff", ROJO, 4, "dashed")
    T(200, 1160, "/sessions", 34, GRIS)
    T(200, 1235, "Todavía no hay ninguna", 40, ROJO)
    T(200, 1300, "la pantalla, ahora mismo", 24, GRIS)

    arrow(880, 1245, [[0, 0], [90, -20], [180, 0]], "#e67700")
    T(920, 1180, "¿?", 54, "#e67700")

    rect(1120, 1130, 560, 230, "#e7f5ff", AZUL, 4)
    T(1180, 1160, "sessions.db", 34, GRIS)
    T(1180, 1225, "13 sesiones", 44, AZUL)
    T(1180, 1285, "63 mensajes", 44, AZUL)

    T(140, 1410, "la memoria sí está; nadie la fue a buscar.", 40, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
