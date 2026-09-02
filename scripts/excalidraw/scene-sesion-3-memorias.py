"""Escena: plan de la sesión 3 del taller (memoria y estado) — los 4 tipos de memoria y su almacén,
más el ritual de cada bloque (pizarra → romper → construir).

Uso: python3 scene-sesion-3-memorias.py [N]  → muestra las filas 1..N (default 4), para revelar en vivo.
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})

def box(x, y, w, h, bg, stroke, label, size=40):
    els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke,
                "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3},
                "label": {"text": label, "fontSize": size, "fontFamily": V, "strokeColor": stroke}})

def arrow(x, y, dx, dy, color, bend=-40):
    els.append({"type": "arrow", "x": x, "y": y, "strokeColor": color, "strokeWidth": 4, "roundness": {"type": 2},
                "points": [[0, 0], [dx / 2, bend], [dx, dy]]})

T(120, 20, "Sesión 3 · si la caja muere, ¿qué se pierde?", 62, "#6741d9")
T(120, 100, "4 memorias, 2 almacenes usados + 1 explicado, un mismo ritual", 34, "#868e96")
els.extend(ghosty(x=1560, y=10, height=170))

# ritual de cada bloque
rx, ry = 120, 190
box(rx, ry, 300, 90, "#e7f5ff", "#1971c2", "✏️ pizarra 5'", 34)
arrow(rx + 300, ry + 45, 60, 0, "#1971c2", -25)
box(rx + 360, ry, 300, 90, "#ffe3e3", "#c92a2a", "💥 romper 5'", 34)
arrow(rx + 660, ry + 45, 60, 0, "#c92a2a", -25)
box(rx + 720, ry, 340, 90, "#d3f9d8", "#2f9e44", "🔨 construir 15'", 34)
T(rx + 1090, ry + 22, "× 4", 45, "#868e96")

rows = [
    ("🧠 trabajo",     "el turno en curso",            "#e5dbff", "#6741d9", "☁️ S3 (json)", "checkpoint del turno; la base de datos sólo se explica"),
    ("📼 episódica",   "qué pasó (sesiones)",          "#d0ebff", "#1971c2", "disco → ☁️ S3", "goose sessions, respaldo"),
    ("📝 semántica",   "qué sé (memory/*.md)",         "#d3f9d8", "#2f9e44", "☁️ S3 + MCP http", "fuente; índice desechable; tools remember/recall en la app"),
    ("🔧 procedimental","cómo se hace (skills)",       "#ffec99", "#f08c00", "disco (repo)",  "viaja con el código"),
]
N = int(sys.argv[1]) if len(sys.argv) > 1 else len(rows)
y = 330
for name, what, bg, stroke, store, note in rows[:N]:
    box(120, y, 460, 110, bg, stroke, name, 42)
    T(600, y + 30, what, 28, "#495057")
    arrow(880, y + 55, 140, 0, stroke, -35)
    box(1040, y, 480, 110, bg, stroke, store, 36)
    T(1050, y + 118, note, 22, "#868e96")
    y += 150

if N == len(rows):
    T(120, y + 25, "💡 a S3 va lo que no puedes regenerar; índices y cachés se quedan en disco.", 36, "#e67700")
    T(120, y + 85, "abre: ¿qué se pierde si mato la caja?   ·   cierra: launch_app en otra caja, GET 200… y matarla también", 28, "#868e96")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
