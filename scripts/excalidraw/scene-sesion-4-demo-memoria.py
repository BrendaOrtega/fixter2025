"""Escena: el MCP de memoria que vamos a escribir (sesión 4, slide 3 · dispara el demo). Lienzo 4:3.

Uso: python3 scene-sesion-4-demo-memoria.py [N]
  1 las tres tools · 2 la tabla · 3 cómo busca · 4 el demo, paso a paso
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

N = int(sys.argv[1]) if len(sys.argv) > 1 else 4

rect(120, 20, 1760, 1320, "transparent", "#ffffff", 1)
T(140, 30, "Ahora una tuya: la memoria semántica", 58, AZUL)
els.extend(ghosty(x=1360, y=25, height=110))

# --- 1. las tres tools ---
if N >= 1:
    rect(140, 150, 820, 420, "#e7f5ff", AZUL)
    T(180, 168, "tres tools, un servidor", 34, AZUL)
    firmas = [
        ('recordar', '{ texto, etiqueta? }', 'guarda una frase'),
        ('buscar',   '{ consulta, limite? }', 'devuelve las que se parecen'),
        ('olvidar',  '{ id }', 'borra una'),
    ]
    for k, (n, args, que) in enumerate(firmas):
        y = 230 + k * 110
        rect(180, y, 740, 90, "#ffffff", VERDE, 3)
        M(205, y + 14, n, 28, VERDE)
        M(400, y + 16, args, 22, GRIS)
        T(205, y + 52, que, 22, GRIS)

# --- 2. la tabla ---
if N >= 2:
    rect(1000, 150, 840, 420, "#f3f0ff", MORADO)
    T(1040, 168, "una tabla en SQLite", 34, MORADO)
    for k, ln in enumerate([
            'CREATE TABLE memoria (',
            '  id       INTEGER PRIMARY KEY,',
            '  texto    TEXT,',
            '  etiqueta TEXT,',
            '  creado   TEXT',
            ');',
            '',
            'CREATE VIRTUAL TABLE memoria_fts',
            '  USING fts5(texto, content=memoria);']):
        M(1040, 230 + k * 34, ln, 22, GRIS)
    T(1040, 545, "vive en /data/state/memoria.db · sobrevive a que la caja duerma", 22, MORADO)

# --- 3. cómo busca ---
if N >= 3:
    rect(140, 620, 1700, 240, "#f1f3f5", GRIS)
    T(180, 638, "buscar por significado, sin API de embeddings", 34, GRIS)
    M(180, 700, 'buscar("¿cómo te pedí que contestaras?")', 24, VERDE)
    arrow(880, 715, [[0, 0], [60, 0]], GRIS, 3)
    M(950, 700, 'MATCH \'pedir OR contestar OR respuesta\'  →  "prefiero respuestas cortas"', 21, GRIS)
    T(180, 770, "FTS5 viene dentro de SQLite: cero dependencias, cero costo por consulta.", 24, GRIS)
    T(180, 810, "✓ si luego quieres vectores, cambias el SELECT: la tool no se entera.", 24, VERDE)

# --- 4. el demo ---
if N >= 4:
    rect(140, 910, 1700, 410, "#d3f9d8", VERDE)
    T(180, 928, "el demo", 38, VERDE)
    pasos = [
        ('1', 'lo damos de alta desde la web', 'node /data/repo/mcp/memoria.ts'),
        ('2', 'entra en el hilo abierto, sin reiniciar', 'session/extensions/add'),
        ('3', 'le contamos algo nuestro', '"prefiero respuestas cortas"'),
        ('4', 'cerramos el hilo, lo revivimos y preguntamos', '"¿cómo te pedí que contestaras?"'),
    ]
    for k, (n, que, como) in enumerate(pasos):
        y = 995 + k * 76
        M(190, y, n, 30, VERDE)
        T(240, y - 4, que, 28, GRIS)
        M(1060, y, como, 21, MORADO)
    T(190, 1300 - 20, "el modelo nunca vio esa frase: la trae la tool.", 26, VERDE)

# folio: para no dejar la presentación a medias
T(1740, 1290, "3 / 5", 26, GRIS)

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
