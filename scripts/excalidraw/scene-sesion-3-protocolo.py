"""Escena: cómo se pide la memoria por el protocolo (sesión 3).

Uso: python3 scene-sesion-3-protocolo.py [N]
  1 muchos hilos, una sesión · 2 los tres verbos · 3 cambiar de hilo
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
AZUL, VERDE, AMBAR, GRIS, ROJO = "#1971c2", "#2f9e44", "#f08c00", "#868e96", "#c92a2a"
els = []
T = lambda x, y, t, s, c: els.append({"type": "text", "x": x, "y": y, "fontSize": s, "fontFamily": V, "text": t, "strokeColor": c})

def rect(x, y, w, h, bg, stroke, sw=4, dash="solid", r=3):
    els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg,
                "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": sw, "strokeStyle": dash,
                "roundness": {"type": r}})

def line(x, y, pts, stroke, sw=4, dash="solid"):
    els.append({"type": "line", "x": x, "y": y, "strokeColor": stroke, "strokeWidth": sw,
                "strokeStyle": dash, "points": pts})

def arrow(x, y, pts, stroke, sw=4, dash="solid"):
    els.append({"type": "arrow", "x": x, "y": y, "strokeColor": stroke, "strokeWidth": sw,
                "strokeStyle": dash, "roundness": {"type": 2}, "points": pts})

def caja(x, y, w=440, h=380, stroke=AZUL, bg="#ffffff"):
    """La microVM, dibujada como caja de cartón con las solapas abiertas."""
    rect(x, y + 44, w, h - 44, bg, stroke)
    line(x, y + 44, [[0, 0], [78, -44], [w / 2, -44], [w / 2, 0]], stroke)
    line(x + w, y + 44, [[0, 0], [-78, -44], [-w / 2, -44], [-w / 2, 0]], stroke)

def carpeta(x, y, w=330, h=60, stroke=GRIS, bg="#f1f3f5", titulo=""):
    """Un hilo guardado: una fichita en el archivero."""
    rect(x, y, w, h, bg, stroke, 3)
    if titulo:
        T(x + 22, y + 14, titulo, 26, stroke)

N = int(sys.argv[1]) if len(sys.argv) > 1 else 3

T(120, 30, "Pedirle la memoria al agente", 62, AZUL)
els.extend(ghosty(x=1660, y=20, height=150))

# --- 1. la caja: muchos hilos guardados, uno solo despierto ---
caja(140, 210)
T(180, 250, "la caja", 30, GRIS)
guardados = ["de qué color…", "qué ves?", "di hola", "New Chat"]
for i, t in enumerate(guardados):
    carpeta(195, 320 + i * 76, titulo=t)

if N >= 1:
    # el que está vivo: mismo sitio, otro color, y un cable a la app
    carpeta(195, 320, w=330, h=60, stroke=VERDE, bg="#d3f9d8", titulo="de qué color…")
    T(200, 640, "uno vivo · el resto, dormido", 26, VERDE)

# --- la app, enfrente ---
rect(1180, 250, 480, 300, "#e7f5ff", AZUL)
T(1300, 285, "tu Cliente", 40, AZUL)
T(1225, 360, "una conexión", 30, GRIS)
T(1225, 415, "una sesión", 30, GRIS)

# --- 2. los tres verbos ---
if N >= 2:
    arrow(700, 330, [[0, 0], [230, -30], [470, -10]], AZUL)
    T(790, 250, "session/list", 34, AZUL)
    T(800, 300, "¿qué hay?", 24, GRIS)

    arrow(1170, 430, [[0, 0], [-230, 20], [-460, 10]], VERDE)
    T(770, 430, "session/load", 34, VERDE)
    T(790, 480, "tráemelo", 24, GRIS)

    arrow(700, 560, [[0, 0], [240, 40], [470, 20]], AMBAR)
    T(770, 590, "session/close", 34, AMBAR)
    T(775, 640, "suéltalo · la caja puede dormir", 24, GRIS)

# --- 3. cambiar de hilo ---
if N >= 3:
    rect(140, 740, 1520, 180, "#fff9db", AMBAR)
    T(190, 770, "cambiar de hilo, en dos movimientos", 40, AMBAR)
    T(190, 840, "1. close del que estaba", 32, GRIS)
    T(800, 840, "2. load del nuevo", 32, GRIS)
    T(1290, 840, "misma conexión", 32, VERDE)
    T(190, 960, "abrirla cuesta segundos: es del agente, no del hilo.", 32, GRIS)

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
