"""Escena: cierre del taller (sesión 5, slide 4). Lienzo 4:3.

Uso: python3 scene-sesion-5-cierre.py [N]   (tres "next")
  1 el recorrido · 2 lo que se llevan · 3 lo que sigue + moraleja
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
AZUL, GRIS, AMBAR, MORADO, WA, ROJO, VERDE = "#1971c2", "#868e96", "#f08c00", "#7048e8", "#128c7e", "#c92a2a", "#2f9e44"
els = []
T = lambda x, y, t, s, c: els.append({"type": "text", "x": x, "y": y, "fontSize": s, "fontFamily": V, "text": t, "strokeColor": c})
M = lambda x, y, t, s, c: els.append({"type": "text", "x": x, "y": y, "fontSize": s, "fontFamily": 3, "text": t, "strokeColor": c})

def rect(x, y, w, h, bg, stroke, sw=4, dash="solid"):
    els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg,
                "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": sw, "strokeStyle": dash,
                "roundness": {"type": 3}})

def arrow(x, y, pts, stroke, sw=5, dash="solid"):
    els.append({"type": "arrow", "x": x, "y": y, "strokeColor": stroke, "strokeWidth": sw,
                "strokeStyle": dash, "roundness": {"type": 2}, "points": pts})

N = int(sys.argv[1]) if len(sys.argv) > 1 else 3

rect(120, 20, 1760, 1320, "transparent", "#ffffff", 1)
T(140, 40, "Lo que construimos, sesión por sesión", 62, MORADO)

# --- 1. el recorrido ---
if N >= 1:
    pasos = [("1", "agente en su caja", "ACP, la caja, wss", AZUL, "#e7f5ff"),
             ("2", "web UI y backend", "sólido: SSE, tools a la vista", VERDE, "#d3f9d8"),
             ("3", "tipos de memoria", "tres almacenes", AMBAR, "#fff9db"),
             ("4", "extensiones y MCP", "por ACP, en la caja", MORADO, "#f3f0ff"),
             ("5", "canales + WhatsApp", "hoy: Baileys", WA, "#d3f9d8")]
    for k, (n, titulo, nota, c, bg) in enumerate(pasos):
        x = 160 + k * 345
        rect(x, 180, 310, 200, bg, c)
        T(x + 24, 196, n, 60, c)
        T(x + 24, 280, titulo, 28, c)
        T(x + 24, 330, nota, 22, GRIS)
        if k < 4:
            arrow(x + 316, 280, [[0, 0], [14, -10], [28, 0]], GRIS, 4)

# --- 2. lo que se llevan ---
if N >= 2:
    T(160, 450, "lo que se llevan", 40, VERDE)
    rect(160, 520, 820, 330, "#f8f9fa", GRIS, 3)
    T(200, 540, "📦 el repo", 36, GRIS)
    M(200, 600, "acp-agent-ui", 26, GRIS)
    T(200, 645, "seis specs: cinco hechos, uno por venir", 24, GRIS)
    T(200, 685, "un motor ACP con canales, MCPs y memoria", 24, GRIS)
    T(200, 725, "un MCP de 100 líneas que devuelve imágenes", 24, GRIS)
    T(200, 780, "clónalo, cámbiale la caja y es tuyo", 24, VERDE)

    rect(1020, 520, 820, 330, "#f3f0ff", MORADO, 3)
    T(1060, 540, "🧠 la forma de pensar", 36, MORADO)
    T(1060, 600, "el sistema agéntico = ACP + MCP", 26, MORADO)
    T(1060, 645, "la interfaz es un canal; el producto es el motor", 24, GRIS)
    T(1060, 685, "cada canal se implementa entero, oficial o no", 24, GRIS)
    T(1060, 725, "lo que no está en la doc se descubre en el log", 24, GRIS)
    els.extend(ghosty(x=1660, y=690, height=140))

# --- 3. lo que sigue ---
if N >= 3:
    T(160, 900, "lo que sigue", 40, AMBAR)
    for k, (t, c) in enumerate([("6 · habilidades: el agente haciendo lo tuyo (opcional, privada)", AMBAR),
                                ("el permiso desde el grupo, cuando ghosty lo entregue", GRIS),
                                ("toda la superficie del canal: audios, docs, citas…", GRIS),
                                ("operación: saber cuándo se rompe", GRIS)]):
        T(200, 965 + k * 46, t, 26, c)
    T(160, 1200, "ya no necesitan a nadie para conectarle un canal más a su agente.", 38, "#e67700")

T(1760, 1300, f"4/4 · {N}/3", 20, GRIS)

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
