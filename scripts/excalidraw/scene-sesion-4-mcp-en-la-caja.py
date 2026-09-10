"""Escena: cómo entra tu MCP a la caja (sesión 4, slide 4). Lienzo 4:3.

Uso: python3 scene-sesion-4-mcp-en-la-caja.py [N]
  1 lo que ya trae · 2 cómo llega tu código · 3 cómo se arranca · 4 la declaración · 5 la UI
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

N = int(sys.argv[1]) if len(sys.argv) > 1 else 5

rect(120, 20, 1760, 1320, "transparent", "#ffffff", 1)
T(140, 30, "Cómo entra tu MCP a la caja", 58, AZUL)
els.extend(ghosty(x=1680, y=20, height=110))

# --- 1. lo que la caja ya trae ---
if N >= 1:
    rect(140, 150, 1700, 230, "#e7f5ff", AZUL)
    T(180, 168, "lo que la caja ya trae", 34, AZUL)
    for k, (bin_, para) in enumerate([
            ("node 22.22 · npx", "corre tu MCP en TypeScript, sin compilar"),
            ("git", "el bootstrap clona el repo en /data/repo"),
            ("salida a internet", "npx baja lo que le falte")]):
        y = 228 + k * 46
        M(180, y, bin_, 24, VERDE)
        T(700, y - 2, para, 24, GRIS)

# --- 2. cómo llega tu código ---
if N >= 2:
    rect(140, 410, 820, 330, "#f3f0ff", MORADO)
    T(180, 428, "cómo llega tu código", 34, MORADO)
    for k, ln in enumerate([
            "1 · lo escribes en la rama sesion-4-mcp",
            "2 · git push",
            "3 · el bootstrap la clona en /data/repo",
            "4 · lo declaras en session/new"]):
        T(180, 492 + k * 52, ln, 26, GRIS)
    T(180, 700, "✓ cambias la rama, reinicias el hilo", 26, VERDE)

# --- 3. cómo se arranca ---
if N >= 3:
    rect(1000, 410, 840, 330, "#fff9db", AMBAR)
    T(1040, 428, "cómo se arranca", 34, AMBAR)
    T(1040, 486, "ruta absoluta: el agente trabaja en /data/work,", 24, GRIS)
    T(1040, 518, "el código vive en /data/repo.", 24, GRIS)
    M(1040, 566, 'node /data/repo/mcp/memoria.ts', 26, VERDE)
    T(1040, 612, "node 22.22 borra los tipos solo: sin banderas.", 22, GRIS)
    T(1040, 668, "el ajeno, en npm:", 24, AMBAR)
    M(1400, 668, 'npx -y @tal/mcp', 22, AMBAR)
    T(1040, 706, "en los dos casos el proceso muere con la sesión.", 22, GRIS)

# --- 4. la declaración ---
if N >= 4:
    rect(140, 770, 900, 480, "#f1f3f5", GRIS)
    T(180, 788, "cómo se declara", 34, GRIS)
    for k, ln in enumerate([
            '"mcpServers": [{',
            '   "name": "memoria",',
            '   "command": "node",',
            '   "args": ["/data/repo/mcp/memoria.ts"],',
            '   "env": []',
            '}]']):
        M(180, 852 + k * 42, ln, 24, VERDE)
    T(180, 1130, "va igual en session/new y en session/load;", 24, GRIS)
    T(180, 1164, "al revivir un hilo hay que volver a mandarlos:", 24, GRIS)
    T(180, 1198, "se SUMAN a las extensiones guardadas.", 24, AMBAR)

# --- 5. cómo se ve en la UI ---
if N >= 5:
    rect(1080, 770, 760, 480, "#ffffff", MORADO, 3)
    T(1120, 788, "y en la web: Extensiones", 34, MORADO)
    rect(1120, 850, 680, 250, "#f8f9fa", GRIS, 2)
    T(1150, 872, "🧩  Extensiones", 28, GRIS)
    T(1150, 916, "Los servidores MCP conectados.", 22, GRIS)
    rect(1150, 962, 620, 52, "#ffffff", VERDE, 2)
    M(1175, 976, "memoria", 24, VERDE)
    T(1600, 976, "activo", 22, VERDE)
    rect(1150, 1024, 620, 52, "#ffffff", GRIS, 2)
    M(1175, 1038, "filesystem", 24, GRIS)
    T(1600, 1038, "apagado", 22, GRIS)
    T(1120, 1130, "hoy esa vista es un placeholder:", 24, AMBAR)
    T(1120, 1164, "el initialize manda mcpServers vacío.", 24, AMBAR)
    T(1120, 1198, "llenarla es el ejercicio de hoy.", 24, MORADO)

# folio: para no dejar la presentación a medias
T(1740, 1290, "4 / 5", 26, GRIS)

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
