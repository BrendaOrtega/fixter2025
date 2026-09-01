"""Escena: los 5 pasos para dejar ghosty listo (comandos oficiales de la landing del taller).

Uso: python3 scene-setup-ghosty.py [N]  → muestra los pasos 1..N (default 5). Para irlos revelando en vivo.
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from place import ghosty

V = 1
els = []
T = lambda x, y, text, size, color: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": V, "text": text, "strokeColor": color})
MONO = lambda x, y, text, size=26: els.append({"type": "text", "x": x, "y": y, "fontSize": size, "fontFamily": 3, "text": text, "strokeColor": "#212529"})

T(200, 20, "ghosty listo en 5 pasos", 62, "#6741d9")
T(200, 100, "de cero a --yolo", 34, "#868e96")
els.extend(ghosty(x=1320, y=20, height=170))

steps = [
    ("01", "Borra los ghostys viejos", "#c92a2a", "#ffe3e3",
     "rm -f ~/.local/bin/ghosty\nrm -rf ~/.ghosty",
     "si lo instalaste en otro taller, esa versión arranca en lugar de la nueva. which -a ghosty no debe imprimir nada"),
    ("02", "Instala GhostyCode", "#6741d9", "#e5dbff",
     "curl -fsSL https://formmy.app/ghosty/install.sh | sh",
     "binario precompilado, sin Node ni Rust. También: npm install -g ghostycode"),
    ("03", "Conecta tu key de EasyBits", "#e8590c", "#ffd8a8",
     "ghosty auth set --provider easybits --api-key TU_KEY",
     "la key se crea en tu cuenta de EasyBits (panel de desarrollador); queda en tu config"),
    ("04", "Conecta las sandboxes", "#1971c2", "#d0ebff",
     "ghosty mcp add easybits --url \"https://www.easybits.cloud/api/mcp/sandbox\"\nghosty mcp login easybits",
     "son las cajas donde corre el agente; login abre el navegador y autorizas"),
    ("05", "Arranca", "#2f9e44", "#d3f9d8",
     "ghosty --yolo",
     "pídele algo; si responde, listo para la sesión 1. --yolo ejecuta sin pedir permiso en cada paso"),
]
N = int(sys.argv[1]) if len(sys.argv) > 1 else len(steps)
y = 200
for num, title, stroke, bg, cmd, note in steps[:N]:
    h = 175 if "\n" in cmd else 150
    els.append({"type": "rectangle", "x": 120, "y": y, "width": 1400, "height": h, "backgroundColor": bg, "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": 4, "roundness": {"type": 3}})
    T(145, y + 12, f"{num}  {title}", 32, stroke)
    MONO(160, y + 58, cmd)
    T(160, y + h - 32, note, 20, "#495057")
    y += h + 22

if N == len(steps):
    T(300, y + 20, "💡 el paso 1 no es opcional: el ghosty viejo gana en el PATH.", 34, "#e67700")

out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
prev = json.loads(out.read_text()).get("version", 0)
out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
print("version", prev + 1)
