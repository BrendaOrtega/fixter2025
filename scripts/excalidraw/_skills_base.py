"""Helpers compartidos por las tres pizarras de memoria procedimental (skills)."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

V = 1
AMBAR, VERDE, AZUL, GRIS, ROJO = "#f08c00", "#2f9e44", "#1971c2", "#868e96", "#c92a2a"


def make():
    els = []

    def T(x, y, t, s, c):
        els.append({"type": "text", "x": x, "y": y, "fontSize": s, "fontFamily": V, "text": t, "strokeColor": c})

    def rect(x, y, w, h, bg, stroke, sw=4, dash="solid"):
        els.append({"type": "rectangle", "x": x, "y": y, "width": w, "height": h, "backgroundColor": bg,
                    "strokeColor": stroke, "fillStyle": "solid", "strokeWidth": sw, "strokeStyle": dash,
                    "roundness": {"type": 3}})

    def line(x, y, pts, stroke, sw=4, dash="solid"):
        els.append({"type": "line", "x": x, "y": y, "strokeColor": stroke, "strokeWidth": sw,
                    "strokeStyle": dash, "points": pts})

    def arrow(x, y, pts, stroke, sw=4, dash="solid"):
        els.append({"type": "arrow", "x": x, "y": y, "strokeColor": stroke, "strokeWidth": sw,
                    "strokeStyle": dash, "roundness": {"type": 2}, "points": pts})

    def hoja(x, y, w=300, h=200, stroke=AMBAR, bg="#fff9db"):
        """Una hoja con la esquina doblada: el archivo de la skill."""
        dob = 46
        els.append({"type": "line", "x": x, "y": y, "strokeColor": stroke, "strokeWidth": 4,
                    "backgroundColor": bg, "fillStyle": "solid",
                    "points": [[0, 0], [w - dob, 0], [w, dob], [w, h], [0, h], [0, 0]]})
        line(x + w - dob, y, [[0, 0], [0, dob], [dob, dob]], stroke, 3)

    def caja(x, y, w=360, h=250, stroke=AZUL, bg="#ffffff", dash="solid"):
        rect(x, y + 40, w, h - 40, bg, stroke, 4, dash)
        line(x, y + 40, [[0, 0], [66, -40], [w / 2, -40], [w / 2, 0]], stroke, 4, dash)
        line(x + w, y + 40, [[0, 0], [-66, -40], [-w / 2, -40], [-w / 2, 0]], stroke, 4, dash)

    return els, T, rect, line, arrow, hoja, caja


def publish(els):
    out = Path(__file__).resolve().parents[2] / "app/data/excalidraw-scene.json"
    prev = json.loads(out.read_text()).get("version", 0)
    out.write_text(json.dumps({"version": prev + 1, "elements": els}, ensure_ascii=False))
    print("version", prev + 1)


def step():
    return int(sys.argv[1]) if len(sys.argv) > 1 else 9
