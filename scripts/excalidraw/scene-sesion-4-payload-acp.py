"""Escena: el payload de ACP donde entran los MCP (sesión 4, slide 2). Lienzo 4:3.

Uso: python3 scene-sesion-4-payload-acp.py [N]
  1 session/new · 2 session/load al lado · 3 los tres métodos que lo aceptan
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

def json_col(x, y, w, h, bg, stroke, titulo, lineas, pie=""):
    rect(x, y, w, h, bg, stroke)
    T(x + 30, y + 18, titulo, 34, stroke)
    for k, ln in enumerate(lineas):
        M(x + 30, y + 76 + k * 34, ln, 21, GRIS)
    if pie:
        T(x + 30, y + h - 54, pie, 24, stroke)

N = int(sys.argv[1]) if len(sys.argv) > 1 else 3

rect(120, 20, 1760, 1320, "transparent", "#ffffff", 1)
T(140, 30, "El payload, tal cual va por el cable", 58, AZUL)
els.extend(ghosty(x=1300, y=25, height=110))

# --- 1. session/new ---
if N >= 1:
    json_col(140, 150, 820, 780, "#d3f9d8", VERDE, "session/new", [
        '{ "method": "session/new",',
        '  "params": {',
        '    "cwd": "/data/work",',
        '    "mcpServers": [',
        '',
        '      { "name": "memoria",',
        '        "command": "npx",',
        '        "args": ["-y","tsx","mcp/memoria.ts"],',
        '        "env": [{ "name": "DB",',
        '                  "value": "memoria.db" }] },',
        '',
        '      { "type": "http",',
        '        "name": "easybits",',
        '        "url": "https://easybits.cloud/api/mcp",',
        '        "headers": [{ "name": "Authorization",',
        '                      "value": "Bearer sk_…" }] }',
        '    ] } }',
        '',
        '→ { "sessionId": "sess_9f2a" }',
    ], "hilo nuevo: lo que declaras es todo lo que hay.")

# --- 2. session/load ---
if N >= 2:
    json_col(1020, 150, 820, 780, "#f3f0ff", MORADO, "session/load", [
        '{ "method": "session/load",',
        '  "params": {',
        '    "sessionId": "sess_9f2a",',
        '    "cwd": "/data/work",',
        '',
        '    // el hilo ya traía memoria y easybits',
        '    // guardados de la vez pasada',
        '',
        '    "mcpServers": [',
        '      { "name": "entregar_archivo",',
        '        "command": "npx",',
        '        "args": ["-y","tsx","mcp/entregar.ts"] }',
        '',
        '    ] } }',
        '',
        '→ revive con las tres:',
        '   memoria · easybits · entregar_archivo',
    ], "mismo campo. aquí se agrega a lo guardado.")

# --- 3. los tres métodos ---
if N >= 3:
    rect(140, 980, 1000, 340, "#f1f3f5", GRIS)
    T(180, 1000, "sólo tres métodos aceptan mcpServers[]", 38, GRIS)
    for k, (m, que) in enumerate([
            ("session/new", "hilo nuevo · lo que declaras es todo"),
            ("session/load", "revive un hilo · se agrega a lo guardado"),
            ("session/fork", "ramifica un hilo · la copia puede traer otras")]):
        M(190, 1070 + k * 72, m, 30, VERDE)
        T(560, 1070 + k * 72, que, 24, GRIS)
    T(190, 1290, "prompt y set_model no las tocan.", 24, GRIS)

    # la pregunta que siempre sale: ¿y a una sesión ya abierta?
    rect(1190, 1020, 620, 250, "#ffe3e3", ROJO, 3)
    T(1220, 1038, "¿y a una sesión viva?", 32, ROJO)
    T(1220, 1092, "✗  el protocolo no trae método para eso", 26, ROJO)
    T(1220, 1140, "✓  esto sí lo haces:", 26, VERDE)
    M(1252, 1180, "session/close → session/load", 24, VERDE)
    T(1252, 1222, "tarda segundos y la conversación se conserva", 22, GRIS)

# folio: para no dejar la presentación a medias
T(1740, 1290, "2 / 5", 26, GRIS)

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
