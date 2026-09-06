"""Escena: la memoria procedimental — la que no se respalda porque se regenera.

Uso: python3 scene-sesion-3-procedimental.py [N]
  1 qué es · 2 dónde vive · 3 el criterio · 4 cómo se piden · 5 la trampa
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
AMBAR, VERDE, AZUL, GRIS, ROJO = "#f08c00", "#2f9e44", "#1971c2", "#868e96", "#c92a2a"
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

def hoja(x, y, w=300, h=200, stroke=AMBAR, bg="#fff9db"):
    """Una hoja con la esquina doblada: el archivo de la skill."""
    dob = 46
    els.append({"type": "line", "x": x, "y": y, "strokeColor": stroke, "strokeWidth": 4,
                "backgroundColor": bg, "fillStyle": "solid",
                "points": [[0, 0], [w - dob, 0], [w, dob], [w, h], [0, h], [0, 0]]})
    line(x + w - dob, y, [[0, 0], [0, dob], [dob, dob]], stroke, 3)

def caja(x, y, w=360, h=250, stroke=AZUL, bg="#ffffff", dash="solid"):
    rect(x, y + 40, w, h - 40, bg, stroke, 4, dash)
    line(x, y + 40, [[0, 0], [66, -40], [w / 2, -40], [w / 2, 0]], stroke, 4, dash)
    line(x + w, y + 40, [[0, 0], [-66, -40], [-w / 2, -40], [-w / 2, 0]], stroke, 4, dash)

N = int(sys.argv[1]) if len(sys.argv) > 1 else 5

T(120, 30, "🔧 cómo se hace: la memoria que no se respalda", 58, AMBAR)
els.extend(ghosty(x=1680, y=20, height=150))

# --- 1. QUÉ es: un archivo, y lo que le hace al agente ---
hoja(140, 170)
T(178, 200, "SKILL.md", 34, AMBAR)
T(178, 258, "identificadores", 24, GRIS)
T(178, 292, "en inglés,", 24, GRIS)
T(178, 326, "comentarios", 24, GRIS)
T(178, 360, "en español", 24, GRIS)

if N >= 1:
    arrow(470, 270, [[0, 0], [90, -20], [180, 0]], AMBAR)
    T(700, 175, "el mismo encargo, dos resultados", 30, GRIS)
    rect(690, 225, 620, 96, "#d3f9d8", VERDE, 4)
    T(720, 248, "con la skill", 22, VERDE)
    T(720, 282, "greet(name)  + comentario", 30, VERDE)
    rect(690, 345, 620, 96, "#ffe3e3", ROJO, 4)
    T(720, 368, "sin la skill", 22, ROJO)
    T(720, 402, "despedirse(nombre)", 30, ROJO)
    T(690, 470, "mismo agente, mismo modelo, mismo prompt", 26, GRIS)

# --- 2. DÓNDE vive: el repo, y de ahí a la caja ---
if N >= 2:
    rect(140, 560, 420, 210, "#fff9db", AMBAR, 4)
    T(180, 585, "el repo", 40, AMBAR)
    T(180, 650, ".goose/skills/", 30, GRIS)
    T(180, 700, "  estilo/SKILL.md", 28, GRIS)

    arrow(580, 660, [[0, 0], [120, -20], [250, 10]], VERDE)
    T(620, 590, "git clone", 32, VERDE)
    T(600, 720, "lo hace el bootstrap, en cada despertar", 24, GRIS)

    caja(860, 545)
    T(900, 700, "/data/work", 30, GRIS)

# --- 3. el criterio: dos flechas, dos destinos ---
if N >= 3:
    T(1330, 560, "si la caja muere…", 32, GRIS)
    rect(1330, 615, 480, 84, "#e7f5ff", AZUL, 4)
    T(1360, 640, "📼 episódica → hay que subirla", 28, AZUL)
    rect(1330, 715, 480, 84, "#fff9db", AMBAR, 4)
    T(1360, 740, "🔧 esta → se vuelve a clonar", 28, AMBAR)
    T(1330, 825, "a S3 va lo que no puedes regenerar", 28, "#e67700")

# --- 4. cómo se las pide el Cliente ---
if N >= 4:
    rect(140, 890, 800, 190, "#e7f5ff", AZUL, 4)
    T(180, 915, "para verlas en tu app", 32, AZUL)
    T(180, 975, "_goose/unstable/sources/list", 34, GRIS)
    T(180, 1025, "buscar «skills» no encuentra nada", 24, GRIS)

    rect(980, 890, 830, 190, "#ffffff", ROJO, 4, "dashed")
    T(1020, 915, "ojo: no es del protocolo", 32, ROJO)
    T(1020, 970, "_goose = extensión de la casa · unstable = puede cambiar", 24, GRIS)
    T(1020, 1015, "va por ACP, pero otro agente no la tiene", 24, GRIS)

# --- 5. la trampa ---
if N >= 5:
    rect(140, 1120, 1670, 130, "#ffffff", ROJO, 4, "dashed")
    T(180, 1145, "autodescubrible ≠ leída", 44, ROJO)
    T(180, 1205, "que el archivo esté donde el agente podría verlo no significa que lo abra: o lo indexa, o va por ruta exacta.", 26, GRIS)

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
