"""Escena: un backend permanente, n canales (sesión 5, slide 1). Lienzo 4:3.

Uso: python3 scene-sesion-5-baileys.py [N]   (tres "next")
  1 el backend + el chat web · 2 WhatsApp, el canal de hoy · 3 los canales que faltan + moraleja
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
AZUL, GRIS, AMBAR, MORADO, WA = "#1971c2", "#868e96", "#f08c00", "#7048e8", "#128c7e"
els = []
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
T(140, 40, "Un backend, n canales", 62, MORADO)
if N >= 3:
    T(1000, 60, "el sistema agéntico = ACP + MCP", 36, GRIS)

# --- 1. el backend, al centro ---
if N >= 1:
    rect(700, 180, 600, 1000, "#f8f9fa", MORADO, 4, "dashed")
    T(740, 200, "el backend · siempre encendido", 32, MORADO)

    rect(740, 270, 520, 470, "#f3f0ff", MORADO)
    T(780, 295, "⚙️ motor ACP", 44, MORADO)
    T(780, 380, "1 · entra por un canal,", 26, GRIS)
    T(820, 414, "con su 'via'", 26, GRIS)
    T(780, 460, "2 · cola: un turno a la vez,", 26, GRIS)
    T(820, 494, "una sola sesión viva", 26, GRIS)
    T(780, 540, "3 · el agente contesta por wss", 26, GRIS)
    T(780, 586, "4 · la respuesta sale", 26, GRIS)
    T(820, 620, "por donde entró", 26, GRIS)
    T(780, 680, "🗄️ sqlite: credenciales, grupos, MCPs", 22, GRIS)

    rect(740, 860, 520, 280, "#e5dbff", MORADO)
    T(780, 885, "📦 la caja", 44, MORADO)
    T(780, 970, "goose por ACP", 26, GRIS)
    T(780, 1010, "memoria · MCPs · skills", 26, GRIS)
    els.extend(ghosty(x=1080, y=920, height=180))
    arrow(960, 750, [[0, 0], [-20, 50], [0, 100]], MORADO)
    arrow(1040, 850, [[0, 0], [20, -50], [0, -100]], MORADO)
    T(1080, 780, "wss", 26, MORADO)

# --- 1b. el canal que ya teníamos (izquierda) ---
if N >= 1:
    rect(160, 300, 460, 170, "#e7f5ff", AZUL)
    T(200, 325, "🌐 chat web", 42, AZUL)
    T(200, 405, "un canal más, no el producto", 26, GRIS)
    arrow(630, 385, [[0, 0], [60, 20], [100, 60]], AZUL)
    T(300, 500, "SSE de vuelta", 24, AZUL)

# --- 2. el canal de hoy (izquierda) ---
if N >= 2:
    rect(160, 640, 460, 190, "#d3f9d8", WA)
    T(200, 665, "💬 WhatsApp", 42, WA)
    T(200, 745, "Baileys: un dispositivo", 26, GRIS)
    T(200, 780, "vinculado más", 26, GRIS)
    arrow(630, 700, [[0, 0], [60, -100], [100, -200]], WA)
    T(200, 860, "hoy ^‿^  ·  sendMessage de vuelta", 24, WA)

# --- 3. los que faltan (derecha) ---
if N >= 3:
    for k, nombre in enumerate(["✈️ Telegram", "💼 Slack", "📧 correo", "📞 voz"]):
        y = 320 + k * 150
        rect(1420, y, 420, 90, "#fff9db", AMBAR, 3, "dashed")
        T(1460, y + 22, nombre, 34, AMBAR)
        arrow(1410, y + 45, [[0, 0], [-60, (500 - y - 45) * 0.5], [-100, 500 - y - 45]], AMBAR, 4, "dashed")
    T(1420, 930, "te contratan para Slack:", 28, AMBAR)
    T(1420, 970, "escribes la puerta,", 28, AMBAR)
    T(1420, 1010, "el motor ya está", 28, AMBAR)
    T(160, 1230, "la interfaz pierde peso: lo que vendes es el motor ACP + MCP, no la pantalla.", 36, "#e67700")

T(1700, 1290, f"1 / 4 · {N}/3", 26, GRIS)

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
