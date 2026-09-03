"""Escena: arranque de la sesión 2 — tres diapositivas.

Uso: python3 scene-sesion-2-ui-piezas.py [1|2|3]
  1 → la UI propuesta, sus piezas y los conectores de hoy
  2 → lo que ya hay y lo que falta
  3 → qué modificamos, con los diffs
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})

def box(x, y, w, h, bg, stroke, label, size=34, dashed=False):
    e = {"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke,
         "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}}
    if dashed: e["strokeStyle"] = "dashed"
    if label: e["label"] = {"text": label, "fontSize": size, "fontFamily": V, "strokeColor": stroke}
    els.append(e)

def arrow(x, y, dx, dy, color, bend=-40, label=None):
    e = {"type": "arrow", "x": x, "y": y, "strokeColor": color, "strokeWidth": 4, "roundness": {"type": 2},
         "points": [[0, 0], [dx / 2, bend], [dx, dy]]}
    if label: e["label"] = {"text": label, "fontSize": 24, "fontFamily": V, "strokeColor": color}
    els.append(e)

def col(x, y, title, color, items, w=760, todo=None):
    """Columna de tarjetas con nota debajo. todo=True las pone punteadas."""
    T(x, y - 60, title, 40, color)
    for name, note, bg, stroke, dashed in items:
        box(x, y, w, 66, bg, stroke, name, 26, dashed=dashed)
        T(x + 12, y + 72, note, 22, "#868e96")
        y += 116 + (30 if "\n" in note else 0)
    return y

N = int(sys.argv[1]) if len(sys.argv) > 1 else 1

# =========================================================================
# 1. la UI propuesta, sus piezas, los conectores de hoy
# =========================================================================
if N == 1:
    T(120, 20, "Sesión 2 · una UI propia, y qué hay debajo", 62, "#6741d9")
    T(120, 100, "la portada de goose Desktop, en web", 34, "#868e96")
    els.extend(ghosty(x=1460, y=5, height=150))

    WX, WY = 120, 190
    box(WX, WY, 900, 560, "#f8f9fa", "#495057", None)
    box(WX + 15, WY + 15, 200, 530, "#e7f5ff", "#1971c2", "nav\n^‿^", 30)
    box(WX + 240, WY + 15, 640, 400, "#ffffff", "#adb5bd", None)
    T(WX + 250, WY + 25, "hilo del chat (markdown en streaming)", 22, "#adb5bd")
    box(WX + 240, WY + 440, 640, 90, "#fff3bf", "#e8590c", "input  ▸", 30)
    T(WX + 300, WY + 100, "◕‿◕  ¿qué versión de Node tienes?", 26, "#495057")
    box(WX + 300, WY + 150, 380, 60, "#ffe3e3", "#c92a2a", "▸ node --version", 22, dashed=True)
    T(WX + 300, WY + 235, "🤖  Node 22.16", 26, "#6741d9")

    PX = 1100
    T(PX, WY, "4 piezas para chatear, 1 para ver", 40, "#2f9e44")
    pieces = [
        ("① input", "crea la conversación y navega", "#fff3bf", "#e8590c"),
        ("② hilo", "pinta lo que llega, en vivo", "#ffffff", "#adb5bd"),
        ("③ ruta SSE", "un stream abierto por conversación", "#d3f9d8", "#2f9e44"),
        ("④ motor ACP", "en el servidor; el navegador nunca habla ACP", "#e5dbff", "#6741d9"),
    ]
    y = WY + 70
    for name, note, bg, stroke in pieces:
        box(PX, y, 480, 72, bg, stroke, name, 30)
        T(PX + 10, y + 78, note, 22, "#868e96")
        y += 118
    box(PX, y, 480, 72, "#ffe3e3", "#c92a2a", "⑤ tarjeta de tool", 30, dashed=True)
    T(PX + 10, y + 78, "qué corrió y qué salió; la construimos hoy", 22, "#c92a2a")

    CY = 900
    T(120, CY - 60, "cómo están los conectores hoy (headless)", 40, "#1971c2")
    box(120, CY, 260, 110, "#a5d8ff", "#1971c2", "navegador", 32)
    arrow(380, CY + 55, 140, 0, "#2f9e44", -30, "SSE")
    box(520, CY, 300, 110, "#d3f9d8", "#2f9e44", "app (SSR)", 32)
    arrow(820, CY + 55, 140, 0, "#6741d9", -30, "ACP / wss")
    box(960, CY, 330, 110, "#e5dbff", "#6741d9", "goose en la caja", 32)
    T(130, CY + 125, "EventSource: chunk · done", 22, "#868e96")
    T(530, CY + 125, "SDK oficial, secreto en el header", 22, "#868e96")
    T(970, CY + 125, "goose serve 0.0.0.0, systemd", 22, "#868e96")
    T(120, CY + 190, "💡 ya funciona: preguntas y responde.", 34, "#e67700")
    T(120, CY + 235, "Lo que falta es ver qué hizo en el camino.", 34, "#e67700")

# =========================================================================
# 2. lo que hay y lo que falta
# =========================================================================
if N == 2:
    T(120, 20, "Lo que ya hay, y lo que falta", 62, "#6741d9")
    T(120, 100, "recorrido de archivos, en este orden", 34, "#868e96")
    els.extend(ghosty(x=1450, y=15, height=150))

    Y = 260
    col(120, Y, "ya está escrito", "#2f9e44", [
        ("app/.server/acp.ts:247", "buildSession(...).start() — aquí nace la sesión", "#d3f9d8", "#2f9e44", False),
        ("app/.server/acp.ts:279", "el switch: chunk · thought · tool_call · usage", "#d3f9d8", "#2f9e44", False),
        ("routes/api...events.ts", "cada evento sale tal cual por SSE", "#d3f9d8", "#2f9e44", False),
        ("hooks/useAcpStream.ts", "el tipo Turn y el estado del hilo", "#d3f9d8", "#2f9e44", False),
        ("chat.tsx · ChatInput.tsx", "quien lo pinta, y dónde se escribe", "#d3f9d8", "#2f9e44", False),
        ("MessageUsageStats.tsx", "el precedente: ya pinta tokens y costo", "#d3f9d8", "#2f9e44", False),
    ])
    col(940, Y, "falta", "#c2255c", [
        ("la tarjeta de tool", "los eventos ya llegan; nadie los pinta", "#ffdeeb", "#c2255c", True),
        ("la barra: modo · modelo · esfuerzo", "los tres son un configOptions[] con category;\nvienen en session/new y hoy se tiran", "#ffdeeb", "#c2255c", True),
    ])

    box(940, 640, 760, 86, "#fff3bf", "#e8590c", "mandar imágenes", 30, dashed=True)
    T(950, 736, "esto es otra cosa: no es config, es contenido", 26, "#868e96")
    T(950, 776, "del turno — un ContentBlock más en el prompt", 26, "#868e96")

    T(120, 1010, "Hoy construimos dos:", 40, "#e8590c")
    box(120, 1080, 760, 86, "#ffe3e3", "#c92a2a", "① la tarjeta de tool", 30, dashed=True)
    T(130, 1176, "ver qué corrió, no sólo la respuesta", 26, "#868e96")
    box(940, 1080, 760, 86, "#ffe3e3", "#c92a2a", "② mandarle una foto", 30, dashed=True)
    T(950, 1176, "va inline como bloque image, no como link", 26, "#868e96")
    T(120, 1250, "⚠️ resource_link con URL no sirve: el agente sólo ve un link.", 30, "#e67700")

# =========================================================================
# 3. qué modificamos hoy
# =========================================================================
if N == 3:
    T(120, 20, "Qué tocamos hoy", 62, "#6741d9")
    T(120, 100, "punteado = archivo nuevo", 34, "#868e96")
    els.extend(ghosty(x=1420, y=15, height=150))

    T(120, 250, "① la tarjeta de tool", 40, "#c92a2a")
    T(120, 296, "de calentamiento: ya funciona, sólo hay que vestirla", 26, "#868e96")
    tool = [
        ("ya está: acp.ts → useAcpStream → chat.tsx", "el evento llega, hace upsert por id y se pinta", "#d3f9d8", "#2f9e44", False),
        ("chat.tsx · ToolRow", "de renglón suelto a tarjeta: borde, fondo, padding", "#a5d8ff", "#1971c2", False),
        ("el estado se ve", "kind como etiqueta, y pulso mientras corre", "#a5d8ff", "#1971c2", False),
    ]
    y = 350
    for donde, que, bg, stroke, nuevo in tool:
        box(120, y, 700, 82, bg, stroke, donde, 30, dashed=nuevo)
        T(130, y + 92, que, 24, "#868e96")
        y += 145

    y += 60
    T(120, y, "② mandarle una foto", 40, "#e8590c")
    y += 70
    foto = [
        ("ChatInput.tsx", "soltar la foto y verla, sin subir nada", "#fff3bf", "#e8590c", False),
        ("la ruta del mensaje", "sube la foto a S3 con el SDK de EasyBits", "#d3f9d8", "#2f9e44", True),
        ("acp.ts", "al agente le va la foto, no la liga", "#ffdeeb", "#c2255c", False),
    ]
    for donde, que, bg, stroke, nuevo in foto:
        box(120, y, 700, 82, bg, stroke, donde, 30, dashed=nuevo)
        T(130, y + 92, que, 24, "#868e96")
        y += 145 + (34 if "\n" in que else 0)

    # ---- ilustración: cómo se ve cada una en la pantalla -------------------
    IX = 900
    T(IX, 250, "cómo se ve", 40, "#868e96")
    # ① la tarjeta de tool, dentro del hilo
    box(IX, 320, 700, 330, "#ffffff", "#adb5bd", None)
    T(IX + 30, 355, "◕‿◕  ¿qué versión de Node?", 26, "#495057")
    box(IX + 30, 410, 640, 130, "#ffe3e3", "#c92a2a", None, dashed=True)
    T(IX + 55, 430, "shell · node --version", 26, "#495057")
    T(IX + 55, 480, "✓ v22.22.3", 26, "#2f9e44")
    T(IX + 30, 570, "🤖  Corro Node v22.22.3", 26, "#6741d9")
    T(IX, 670, "nace en \"pending\" con pulso y se completa solo", 24, "#868e96")

    # ② la foto: preview local → inline al agente
    box(IX, 760, 320, 300, "#f8f9fa", "#e8590c", None, dashed=True)
    box(IX + 60, 820, 200, 150, "#a5d8ff", "#1971c2", None)
    els.append({"type": "ellipse", "x": IX + 90, "y": 845, "width": 45, "height": 45,
                "backgroundColor": "#ffec99", "strokeColor": "#e8590c", "fillStyle": "solid", "strokeWidth": 3})
    els.append({"type": "line", "x": IX + 70, "y": 960, "strokeColor": "#1971c2", "strokeWidth": 4,
                "points": [[0, 0], [50, -60], [95, 0], [140, -85], [180, 0]]})
    T(IX + 60, 990, "preview local (no sube todavía)", 22, "#868e96")
    arrow(IX + 340, 890, 130, 0, "#6741d9", -25, "al enviar")
    box(IX + 490, 830, 210, 120, "#e5dbff", "#6741d9", "base64\ninline", 26)
    T(IX, 1090, "la URL de S3 es para el hilo; al agente le va la imagen", 24, "#868e96")

    T(IX, 1180, "La línea que hay que recordar", 34, "#e8590c")
    T(IX, 1225, "app/.server/acp.ts:273  ·  dentro de pump()", 26, "#c2255c")
    box(IX, 1275, 1180, 260, "#f8f9fa", "#adb5bd", None)
    T(IX + 25, 1295, "- const promptP = this.session.prompt(", 24, "#c92a2a")
    T(IX + 25, 1332, "-     this.messages[this.messages.length - 1].text);", 24, "#c92a2a")
    T(IX + 25, 1382, "+ const promptP = this.session.prompt([", 24, "#2f9e44")
    T(IX + 25, 1419, "+     { type: \"text\",  text: this.messages.at(-1).text },", 24, "#2f9e44")
    T(IX + 25, 1456, "+     { type: \"image\", data: base64, mimeType },", 24, "#2f9e44")
    T(IX + 25, 1493, "+ ]);", 24, "#2f9e44")
    T(IX, 1560, "de un string suelto a una lista de bloques: el texto", 26, "#495057")
    T(IX, 1598, "sigue igual y la imagen es un bloque más al lado.", 26, "#495057")
    T(IX, 1660, "⚠️ resource_link con URL no sirve: el agente sólo ve un link.", 26, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("diapositiva", N, "· version", prev + 1)
