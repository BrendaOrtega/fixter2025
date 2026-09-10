"""Escena: qué es un MCP y cómo entra al agente (sesión 4, slide 1). Lienzo 4:3.

Uso: python3 scene-sesion-4-que-es-un-mcp.py [N]
  1 el servidor y sus herramientas · 2 todas van al prompt · 3 quién hace qué · 4 new vs load
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
AZUL, VERDE, AMBAR, GRIS, ROJO = "#1971c2", "#2f9e44", "#f08c00", "#868e96", "#c92a2a"
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

# --- lienzo 4:3 (1760 x 1320), esquinas invisibles para fijar el encuadre ---
rect(120, 20, 1760, 1320, "transparent", "#ffffff", 1)

T(140, 30, "Un MCP es un servidor con un conjunto de herramientas", 56, AZUL)
els.extend(ghosty(x=1720, y=120, height=130))

# --- 1. el servidor y sus tools ---
if N >= 1:
    rect(140, 140, 560, 380, "#e7f5ff", AZUL)
    T(180, 162, "servidor MCP · memoria", 34, AZUL)
    for i, t in enumerate(["recordar", "buscar", "olvidar"]):
        rect(180, 230 + i * 88, 470, 68, "#ffffff", VERDE, 3)
        M(210, 248 + i * 88, t, 30, VERDE)
    T(180, 490, "lo levantas una vez · trae varias", 24, GRIS)

# --- 2. la tool por dentro, y a dónde va a dar ---
if N >= 2:
    arrow(710, 300, [[0, 0], [50, -10], [100, 0]], GRIS, 3, "dashed")
    rect(840, 140, 660, 210, "#ffffff", VERDE)
    T(880, 158, "por dentro, una tool", 32, VERDE)
    M(880, 215, "name:        recordar", 24, GRIS)
    M(880, 258, 'description: "guarda un dato…"', 24, AMBAR)
    M(880, 301, "inputSchema: { texto: string }", 24, GRIS)

    arrow(1170, 360, [[0, 0], [0, 40]], ROJO, 3)
    rect(840, 410, 660, 230, "#ffe3e3", ROJO)
    T(880, 428, "todas van al prompt del sistema", 32, ROJO)
    T(880, 485, "memoria: 3 tools · 400 caracteres", 24, GRIS)
    T(880, 526, "EasyBits: 200 tools · 190,341 caracteres", 24, ROJO)
    T(880, 567, "≈ 48,000 tokens antes de que escribas nada", 24, ROJO)
    T(880, 608, "por eso EasyBits sólo carga 50 de las 200", 24, GRIS)

# --- 3. quién hace qué ---
if N >= 3:
    rect(140, 680, 1600, 300, "#d3f9d8", VERDE)
    T(180, 698, "quién hace qué", 38, VERDE)

    rect(180, 762, 420, 120, "#ffffff", AZUL, 3)
    T(205, 776, "tu Cliente", 28, AZUL)
    T(205, 820, "declara mcpServers[]", 24, GRIS)
    T(205, 852, "en session/new", 24, GRIS)

    arrow(610, 822, [[0, 0], [60, 0]], GRIS, 3)

    rect(690, 762, 480, 120, "#ffffff", VERDE, 3)
    T(715, 776, "el Agente", 28, VERDE)
    T(715, 820, "levanta o conecta · initialize", 24, GRIS)
    T(715, 852, "lista tools · tools/call", 24, GRIS)

    arrow(1180, 822, [[0, 0], [60, 0]], GRIS, 3)

    rect(1260, 762, 440, 120, "#ffffff", AMBAR, 3)
    T(1285, 776, "el servidor MCP", 28, AMBAR)
    T(1285, 820, "ejecuta y devuelve", 24, GRIS)
    T(1285, 852, "content[]", 24, GRIS)

    T(180, 908, "stdio: el Agente lanza el proceso.", 26, GRIS)
    M(180, 944, "{ name, command, args, env }", 22, GRIS)
    T(880, 908, "http: el Agente abre la conexión a un servicio que ya escucha.", 26, GRIS)
    M(880, 944, "{ name, url, headers }", 22, GRIS)

# --- 4. new vs load ---
if N >= 4:
    rect(140, 1010, 1600, 320, "#fff9db", AMBAR)
    T(180, 1028, "los dos declaran mcpServers[]", 38, AMBAR)

    for k, (verbo, izq, fin, color) in enumerate([
            ("session/new", "hilo vacío", "eso es todo", VERDE),
            ("session/load", "lo guardado", "se suman", VERDE)]):
        y = 1090 + k * 96
        M(180, y + 18, verbo, 28, VERDE)
        rect(460, y, 280, 72, "#ffffff", GRIS, 3)
        T(485, y + 20, izq, 26, GRIS)
        T(770, y + 14, "+", 34, AMBAR)
        rect(830, y, 320, 72, "#e7f5ff", AZUL, 3)
        T(855, y + 20, "lo que declaras", 26, AZUL)
        arrow(1170, y + 36, [[0, 0], [50, 0]], AMBAR, 3)
        T(1250, y + 20, fin, 26, color)

    T(180, 1250, "ayer el hilo \"de qué color…\" corrió con el MCP de memoria;", 24, GRIS)
    T(180, 1288, "hoy lo revives declarando entregar_archivo y ese mismo hilo ya puede mandarte el audio.", 24, VERDE)

# folio: para no dejar la presentación a medias
T(1740, 1290, "1 / 5", 26, GRIS)

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
