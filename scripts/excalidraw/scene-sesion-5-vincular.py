"""Escena: por qué Baileys, y de dónde viene (sesión 5, slide 2). Lienzo 4:3.

Uso: python3 scene-sesion-5-vincular.py [N]   (tres "next")
  1 las tres puertas a WhatsApp · 2 la historia · 3 el precio de lo no oficial
"""
import json, sys, base64
from pathlib import Path
files = {}

V = 1
AZUL, GRIS, AMBAR, MORADO, WA, ROJO, VERDE = "#1971c2", "#868e96", "#f08c00", "#7048e8", "#128c7e", "#c92a2a", "#2f9e44"
els = []
T = lambda x, y, t, s, c: els.append({"type": "text", "x": x, "y": y, "fontSize": s, "fontFamily": V, "text": t, "strokeColor": c})

def rect(x, y, w, h, bg, stroke, sw=4, dash="solid"):
    els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg,
                "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": sw, "strokeStyle": dash,
                "roundness": {"type": 3}})

def ellipse(x, y, w, h, bg, stroke, sw=4):
    els.append({"type": "ellipse", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg,
                "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": sw})

def arrow(x, y, pts, stroke, sw=5, dash="solid"):
    els.append({"type": "arrow", "x": x, "y": y, "strokeColor": stroke, "strokeWidth": sw,
                "strokeStyle": dash, "roundness": {"type": 2}, "points": pts})

N = int(sys.argv[1]) if len(sys.argv) > 1 else 3

rect(120, 20, 1760, 1320, "transparent", "#ffffff", 1)
T(140, 40, "¿Por qué Baileys?", 62, WA)

# --- 1. las tres puertas ---
if N >= 1:
    T(160, 150, "tres formas de meter un programa a WhatsApp:", 32, GRIS)
    rect(160, 220, 520, 330, "#e7f5ff", AZUL)
    T(200, 245, "🏢 Cloud API", 42, AZUL)
    T(200, 320, "la oficial, de Meta", 28, GRIS)
    T(200, 360, "número de empresa,", 28, GRIS)
    T(200, 400, "verificación y plantillas", 28, GRIS)
    T(200, 460, "sin grupos", 28, ROJO)

    rect(740, 220, 520, 330, "#fff9db", AMBAR)
    T(780, 245, "🌐 whatsapp-web.js", 40, AMBAR)
    T(780, 320, "abre un Chrome oculto", 28, GRIS)
    T(780, 360, "y le da clics a", 28, GRIS)
    T(780, 400, "WhatsApp Web", 28, GRIS)
    T(780, 460, "pesado y frágil", 28, ROJO)

    rect(1320, 220, 520, 330, "#d3f9d8", WA)
    T(1360, 245, "🔌 Baileys", 42, WA)
    T(1360, 320, "habla el protocolo", 28, GRIS)
    T(1360, 360, "de WhatsApp Web directo,", 28, GRIS)
    T(1360, 400, "por WebSocket", 28, GRIS)
    T(1360, 460, "tu número, grupos, gratis  ^‿^", 28, VERDE)

# --- 2. la historia ---
if N >= 2:
    T(160, 620, "de dónde viene:", 32, GRIS)
    arrow(200, 720, [[0, 0], [1560, 0]], GRIS, 4)
    hitos = [
        (200, "2020", "Adhiraj Singh", "ingeniería inversa", MORADO),
        (720, "2021-22", "reescritura multi-dispositivo", "Signal + Noise: el teléfono ya no", MORADO),
        (1240, "2023", "el autor la deja", "la comunidad la sigue: WhiskeySockets", AMBAR),
    ]
    # la foto del autor (avatar de GitHub, guardado junto al script)
    foto = Path(__file__).parent / "assets" / "adhiraj.png"
    if foto.exists():
        files["adhiraj"] = {"dataURL": "data:image/png;base64," + base64.b64encode(foto.read_bytes()).decode(), "mimeType": "image/png"}
        els.append({"type": "image", "x": 420, "y": 745, "width": 150, "height": 150, "fileId": "adhiraj", "roundness": {"type": 3}})
    for (x, anio, que, nota, c) in hitos:
        ellipse(x - 14, 706, 28, 28, c, c)
        T(x - 10, 740, anio, 34, c)
        T(x - 10, 790, que, 28, GRIS)
        T(x - 10, 826, nota, 24, GRIS)
    T(720, 862, "tiene que estar prendido", 24, GRIS)
    T(1500, 640, "hoy: v7, MIT, ~10k ★", 28, WA)
    T(1500, 676, "@whiskeysockets/baileys", 22, WA)

# --- 3. el precio ---
if N >= 3:
    rect(160, 920, 1680, 150, "#fff5f5", ROJO)
    T(200, 940, "⚠️ el precio de lo no oficial", 36, ROJO)
    T(200, 1000, "Meta no la reconoce y puede bloquear el número; si cambia el protocolo, se rompe hasta que la comunidad la alcanza.", 24, GRIS)

    rect(160, 1100, 1680, 150, "#d3f9d8", VERDE)
    T(200, 1120, "🚀 y aun así, la industria la usa a diario", 36, VERDE)
    T(200, 1180, "miles de bots, CRMs y automatizaciones en producción corren sobre Baileys. Con lo de hoy ya sabes hacer uno.", 24, GRIS)
    T(160, 1275, "es un gran inicio: el mismo motor te sirve mañana para la Cloud API si el cliente la pide.", 30, "#e67700")

T(1760, 1300, f"2/4 · {N}/3", 20, GRIS)

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els, "files": files}, ensure_ascii=False))
print("version", prev + 1)
