"""Escena: el deploy de la webapp en otra caja de EasyBits (cierre de la sesión 2).

Uso: python3 scene-sesion-3-deploy.py [1..4]  → revela los pasos (default 4).
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})
MONO = lambda x, y, text, size=22, color="#212529": els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": 3, "text": text, "strokeColor": color})

def box(x, y, w, h, bg, stroke, label, size=32, dashed=False):
    e = {"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke,
         "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3},
         "label": {"text": label, "fontSize": size, "fontFamily": V, "strokeColor": stroke}}
    if dashed: e["strokeStyle"] = "dashed"
    els.append(e)

def arrow(x, y, dx, dy, color, bend=-30):
    els.append({"type": "arrow", "x": x, "y": y, "strokeColor": color, "strokeWidth": 4, "roundness": {"type": 2},
                "points": [[0, 0], [dx / 2, bend], [dx, dy]]})

N = int(sys.argv[1]) if len(sys.argv) > 1 else 4

T(100, 20, "cierre · deploy: la app en su propia caja", 58, "#6741d9")
T(100, 95, "dos cajas: una corre al agente, otra corre a la app", 32, "#868e96")
els.extend(ghosty(x=1560, y=10, height=160))

# las dos cajas
box(100, 190, 520, 250, "#e5dbff", "#6741d9", "", 30)
T(120, 200, "🤖 caja del agente", 30, "#6741d9")
MONO(120, 250, "goose serve --host 0.0.0.0\nwss://sb-…-3000.sandboxes.easybits.cloud", 20, "#6741d9")
T(120, 340, "ya existía; ACP_WS_URL apunta aquí", 24, "#495057")

box(760, 190, 520, 250, "#d3f9d8", "#2f9e44", "", 30, dashed=(N < 2))
T(780, 200, "🖥️ caja de la app (nueva)", 30, "#2f9e44")
MONO(780, 250, "git clone → npm run build → npm start\nhttps://sb-…-3000.sandboxes.easybits.cloud", 20, "#2f9e44")
T(780, 340, "SSR + ruta SSE; la 3 le agrega memoria", 24, "#495057")
arrow(760, 315, -140, 0, "#6741d9", -40)
T(640, 250, "ACP\nwss", 22, "#6741d9")

box(1380, 190, 300, 250, "#a5d8ff", "#1971c2", "🌐 alumno\n(y en la 4,\nWhatsApp)", 28)
arrow(1380, 315, -100, 0, "#1971c2", -40)

# pasos
steps = [
    ("01", "lanzar", "#2f9e44", "#d3f9d8",
     'launch_app({ sandboxId, repo,\n  buildCommand: "npm run build",\n  startCommand: "npm start",\n  port: 3000,\n  env: { ACP_WS_URL, ACP_SECRET, EASYBITS_API_KEY } })',
     "sandboxId es el destino, repo la fuente. Se buildea DENTRO de la caja (Linux)."),
    ("02", "verificar", "#1971c2", "#d0ebff",
     "curl -I https://sb-…/   → 200",
     "no está publicada hasta que el GET responde 200. Si no: get_machine_logs primero."),
    ("03", "iterar", "#e8590c", "#ffd8a8",
     "launch_app({ …mismo sandboxId })   → release v2, ~20 s\nrollback_machine({ sandboxId, releaseId })   → ~12 s",
     "cada deploy es un release; volver atrás no rebuildea."),
    ("04", "matarla", "#c92a2a", "#ffe3e3",
     "destroy → launch_app otra vez → ¿qué se perdió?  (puente a la 3)",
     "se pierde TODO: el Map, las fotos locales… y con eso abre la sesión 3."),
]
y = 480
for num, title, stroke, bg, cmd, note in steps[:N]:
    h = 40 + 26 * (cmd.count("\n") + 1) + 40
    box(100, y, 1580, h, bg, stroke, "", 30)
    T(120, y + 10, f"{num}  {title}", 32, stroke)
    MONO(360, y + 12, cmd, 19, stroke)
    T(360, y + h - 32, note, 20, "#495057")
    y += h + 18

if N == 4:
    T(100, y + 15, "💡 los secretos van por env, nunca en el repo. Express 5: app.use(handler), no app.all(\"*\").", 32, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
