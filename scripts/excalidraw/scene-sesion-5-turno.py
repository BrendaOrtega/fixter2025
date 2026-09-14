"""Escena: un mensaje del grupo es un turno (sesión 5, slide 3). Lienzo 4:3.

Uso: python3 scene-sesion-5-turno.py [N]   (tres "next")
  1 sólo en los grupos prendidos · 2 varios mensajes, un turno · 3 la respuesta a los dos lados
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
AZUL, GRIS, AMBAR, MORADO, WA, ROJO, VERDE = "#1971c2", "#868e96", "#f08c00", "#7048e8", "#128c7e", "#c92a2a", "#2f9e44"
els = []
M = lambda x, y, t, s, c: els.append({"type": "text", "x": x, "y": y, "fontSize": s, "fontFamily": 3, "text": t, "strokeColor": c})
T = lambda x, y, t, s, c: els.append({"type": "text", "x": x, "y": y, "fontSize": s, "fontFamily": V, "text": t, "strokeColor": c})

def rect(x, y, w, h, bg, stroke, sw=4, dash="solid"):
    els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg,
                "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": sw, "strokeStyle": dash,
                "roundness": {"type": 3}})

def arrow(x, y, pts, stroke, sw=5, dash="solid"):
    els.append({"type": "arrow", "x": x, "y": y, "strokeColor": stroke, "strokeWidth": sw,
                "strokeStyle": dash, "roundness": {"type": 2}, "points": pts})

N = int(sys.argv[1]) if len(sys.argv) > 1 else 3

rect(120, 20, 1760, 1320, "transparent", "#ffffff", 1)
T(140, 40, "Un mensaje del grupo es un turno", 62, WA)

# --- 1. cómo decidimos en qué grupo contestar ---
if N >= 1:
    T(160, 170, "1 · Baileys entrega TODO; nosotros decidimos dónde contestar", 36, WA)
    rect(160, 240, 460, 150, "#d3f9d8", WA)
    T(190, 258, "Baileys", 32, WA)
    M(190, 308, "messages.upsert", 24, GRIS)
    T(190, 345, "cada mensaje, de cada chat", 22, GRIS)
    arrow(630, 315, [[0, 0], [50, -20], [100, 0]], WA)
    rect(740, 240, 560, 150, "#f3f0ff", MORADO)
    T(770, 258, "nuestro filtro", 32, MORADO)
    M(770, 308, "if (!grupoActivo(jid)) return", 22, MORADO)
    T(770, 345, "la tabla whatsapp_groups en sqlite", 22, GRIS)
    arrow(1310, 315, [[0, 0], [50, -20], [100, 0]], MORADO)
    rect(1420, 240, 420, 150, "#fff9db", AMBAR)
    T(1450, 258, "el switch de la vista", 30, AMBAR)
    T(1450, 308, "Equipo  ● on", 26, VERDE)
    T(1450, 345, "Familia  ○ off", 26, GRIS)

# --- 2. varios mensajes, un turno ---
if N >= 2:
    T(160, 430, "2 · varios mensajes seguidos = UN turno", 36, AZUL)
    for k, ln in enumerate(["oye", "me haces un resumen", "del repo?"]):
        rect(160, 510 + k * 80, 520, 60, "#e7f5ff", AZUL, 3)
        T(190, 524 + k * 80, ln, 28, GRIS)
    arrow(700, 630, [[0, 0], [80, -30], [160, 0]], AZUL)
    T(720, 560, "espera 1.5 s", 24, AZUL)
    rect(880, 560, 520, 140, "#f3f0ff", MORADO)
    T(910, 585, "⚙️ un turno", 40, MORADO)
    T(910, 645, "👀 al leer  ·  ✅ al contestar", 26, GRIS)
    T(1440, 600, "si no: tres respuestas", 26, ROJO)
    T(1440, 636, "y parece spam", 26, ROJO)

# --- 3. la respuesta a los dos lados, y todo lo que falta ---
if N >= 3:
    T(160, 780, "3 · la respuesta sale a los dos lados", 36, AMBAR)
    els.extend(ghosty(x=880, y=850, height=150))
    rect(160, 860, 520, 120, "#d3f9d8", WA)
    T(190, 878, "💬 al grupo", 34, WA)
    M(190, 930, "sendMessage({ text })", 24, GRIS)
    rect(1160, 860, 520, 120, "#fff9db", AMBAR)
    T(1190, 878, "🌐 al chat web", 34, AMBAR)
    T(1190, 930, "SSE, etiquetado 'WhatsApp · Osvaldo'", 22, GRIS)
    arrow(870, 925, [[0, 0], [-90, -30], [-180, 0]], WA)
    arrow(1050, 925, [[0, 0], [50, -30], [100, 0]], AMBAR)

    rect(160, 1020, 1680, 170, "#fff5f5", ROJO, 3, "dashed")
    T(190, 1035, "hoy sólo texto. Un canal completo es implementar TODA su superficie:", 28, ROJO)
    T(190, 1085, "📎 adjuntos (fotos, audios, documentos) · 😀 reacciones · ↩️ citar · 🎙️ notas de voz · 📍 ubicación · ✏️ editados y borrados", 24, GRIS)
    T(190, 1130, "cada uno es un tipo de mensaje distinto en Baileys, de ida y de vuelta; y los adjuntos hay que descifrarlos y subirlos.", 24, GRIS)
    T(160, 1240, "dos puertas, una sola conversación; la puerta de WhatsApp apenas está entreabierta.", 34, "#e67700")

T(1760, 1300, f"3/4 · {N}/3", 20, GRIS)

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
