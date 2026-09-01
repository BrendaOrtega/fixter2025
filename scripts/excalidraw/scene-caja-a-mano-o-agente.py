"""Escena: levantar la caja a mano (REST) o pedírselo a un agente (MCP). Mismo destino."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty, lib_item

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})
MONO = lambda x, y, text, size: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": 3, "text": text, "strokeColor": "#212529"})
ARROW = lambda x, y, pts, color: els.append({"type": "arrow", "x": x, "y": y, "points": pts, "strokeColor": color, "strokeWidth": 5, "roundness": {"type": 2}})
BOX = lambda x, y, w, h, bg, stroke, text, size: els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg, "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}, "label": {"text": text, "fontSize": size, "fontFamily": V}})

T(200, 20, "La caja: a mano o con un agente", 62, "#6741d9")
T(200, 100, "dos caminos, el mismo wss al final", 34, "#868e96")

# ---- Camino A: a mano
els.append({"type": "rectangle", "x": 80, "y": 180, "width": 800, "height": 400, "backgroundColor": "#e7f5ff", "strokeColor": "#1971c2", "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}})
T(110, 195, "🔧 a mano (para entender)", 34, "#1971c2")
els.extend(lib_item("stick-figures", "Happy", x=120, y=260, height=150))
T(100, 420, "tú + curl", 24, "#1971c2")
MONO(260, 250, "POST /sandboxes            → id, running (~1.3 s)\n\nPOST /sandboxes/:id/exec\n  { \"command\": \"goose serve --host 0.0.0.0 &\" }\n\nPOST /sandboxes/:id/expose\n  { \"port\": 3284 }         → wss://…", 20)
T(110, 520, "Bearer $EASYBITS_API_KEY  ·  https://www.easybits.cloud/api/v2", 20, "#495057")

# ---- Camino B: con un agente
els.append({"type": "rectangle", "x": 920, "y": 180, "width": 800, "height": 400, "backgroundColor": "#e5dbff", "strokeColor": "#6741d9", "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}})
T(950, 195, "🤖 con un agente (para el día a día)", 34, "#6741d9")
els.extend(ghosty(x=960, y=260, height=150))
T(950, 440, "Claude Code\n+ MCP EasyBits", 20, "#6741d9")
BOX(1180, 250, 300, 90, "#fff", "#6741d9", "«levántame una caja\ncon goose, por wss»", 22)
BOX(1520, 250, 170, 90, "#fffbe6", "#e67700", "📄 specs\ndocs/spec1…6", 20)
ARROW(1520, 295, [[0, 0], [-40, 0]], "#e67700")
ARROW(1330, 340, [[0, 0], [0, 25]], "#6741d9")
MONO(1180, 360, "sandbox_create\nsandbox_exec\n  { command: \"goose serve --host 0.0.0.0 &\" }\nsandbox_expose_port { port: 3284 } → wss://…", 20)
T(950, 515, "trae la llave y lee los specs de acp-agent-ui para no perderse;\ncada tool es una llamada REST de la izquierda.", 20, "#495057")

# ---- Convergen
ARROW(460, 580, [[0, 0], [150, 90], [330, 120]], "#c2255c")
ARROW(1320, 580, [[0, 0], [-170, 90], [-370, 120]], "#c2255c")
BOX(760, 700, 300, 100, "#fcc2d7", "#c2255c", "🌐 wss://…easybits.cloud", 26)

T(200, 850, "💡 hazlo a mano una vez para saber qué pide el agente; después, pídeselo.", 38, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
