"""Coloca ítems de librerías .excalidrawlib dentro de la escena de la pizarra.

Uso desde otro script:
    from place import lib_item
    elements += lib_item("halloween-elements", "Happy ghost", x=900, y=300, height=260)

Devuelve elementos completos (no skeleton) reposicionados y escalados, con ids nuevos
para poder repetir el mismo ítem varias veces sin colisiones.
"""
import json, uuid, copy
from pathlib import Path

LIBS = Path(__file__).parent / "libs"


def _items(lib_name):
    data = json.loads((LIBS / f"{lib_name}.excalidrawlib").read_text())
    return data.get("libraryItems") or data.get("library")


def lib_item(lib_name, name_or_index, x, y, width=None, height=None):
    items = _items(lib_name)
    if isinstance(name_or_index, int):
        item = items[name_or_index]
    else:
        item = next(i for i in items if isinstance(i, dict) and i.get("name") == name_or_index)
    els = copy.deepcopy(item["elements"] if isinstance(item, dict) else item)

    min_x = min(e["x"] for e in els)
    min_y = min(e["y"] for e in els)
    max_x = max(e["x"] + e["width"] for e in els)
    max_y = max(e["y"] + e["height"] for e in els)
    w0, h0 = max_x - min_x, max_y - min_y
    scale = 1.0
    if width:
        scale = width / w0
    elif height:
        scale = height / h0

    # ids nuevos, conservando bindings internos (contenedor↔texto, flechas)
    id_map = {e["id"]: uuid.uuid4().hex[:12] for e in els}
    group = uuid.uuid4().hex[:12]
    for e in els:
        e["id"] = id_map[e["id"]]
        e["x"] = x + (e["x"] - min_x) * scale
        e["y"] = y + (e["y"] - min_y) * scale
        e["width"] *= scale
        e["height"] *= scale
        if e.get("fontSize"):
            e["fontSize"] *= scale
        if e.get("points"):
            e["points"] = [[px * scale, py * scale] for px, py in e["points"]]
        if e.get("containerId"):
            e["containerId"] = id_map.get(e["containerId"], e["containerId"])
        if e.get("boundElements"):
            for b in e["boundElements"]:
                b["id"] = id_map.get(b["id"], b["id"])
        for k in ("startBinding", "endBinding"):
            if e.get(k):
                e[k]["elementId"] = id_map.get(e[k]["elementId"], e[k]["elementId"])
        e["groupIds"] = [group] + [id_map.get(g, g) for g in e.get("groupIds", [])]
        e["version"] = 1
        e["isDeleted"] = False
    return els


def ghosty(x, y, height=260):
    """Ghosty, el personaje: cuerpo morado con tres olanes abajo, lentes redondos y ojos negros.

    Dibujado con primitivas siguiendo ~/ghosty-launch/assets/ghosty.png (unidad base 100x115).
    """
    import math
    s = height / 115.0
    group = uuid.uuid4().hex[:12]
    els = []

    def add(e):
        e.setdefault("strokeWidth", 3)
        e.setdefault("roughness", 1)
        e.setdefault("fillStyle", "solid")
        e["groupIds"] = [group]
        els.append(e)
        return e

    # Cuerpo: polígono cerrado. Domo arriba (arco) y tres olanes abajo (arcos hacia arriba)
    pts = []
    for i in range(0, 19):  # arco superior, de izquierda a derecha
        a = math.pi - math.pi * i / 18
        pts.append((50 + 46 * math.cos(a), 46 - 44 * math.sin(a)))
    pts.append((96, 87))
    # olanes de tamaños distintos, de derecha a izquierda: el derecho chico y alto,
    # el de en medio mediano, el izquierdo ancho y el que más baja (como en el asset)
    for cx, rx, ry, base in ((80, 16, 10, 87), (50, 14, 9, 90), (18, 18, 12, 89)):
        for i in range(1, 12):
            a = math.pi * i / 12
            pts.append((cx + rx * math.cos(a), base + ry * math.sin(a)))
    pts.append((0, 89))
    pts.append(pts[0])
    add({"type": "line", "x": x, "y": y, "points": [[px * s, py * s] for px, py in pts],
         "backgroundColor": "#8b83e8", "strokeColor": "#6c63d6", "width": 100 * s, "height": 115 * s,
         "roundness": {"type": 2}})

    # Rubor
    for cx in (17, 74):
        add({"type": "ellipse", "x": x + cx * s, "y": y + 40 * s, "width": 12 * s, "height": 6 * s,
             "backgroundColor": "#a29cf0", "strokeColor": "transparent"})
    # Ojos: almendras negras
    for cx in (22, 58):
        add({"type": "ellipse", "x": x + cx * s, "y": y + 17 * s, "width": 18 * s, "height": 27 * s,
             "backgroundColor": "#1f1f23", "strokeColor": "#1f1f23"})
    # Lentes: dos aros grises, puente y patillas
    for cx in (5, 52):
        add({"type": "ellipse", "x": x + cx * s, "y": y + 12 * s, "width": 43 * s, "height": 40 * s,
             "backgroundColor": "transparent", "strokeColor": "#c9c9cc", "strokeWidth": 4})
    add({"type": "line", "x": x + 47 * s, "y": y + 26 * s, "points": [[0, 0], [3 * s, -3 * s], [6 * s, 0]],
         "strokeColor": "#c9c9cc", "strokeWidth": 4})
    add({"type": "line", "x": x + 5 * s, "y": y + 30 * s, "points": [[0, 0], [-5 * s, 1 * s]],
         "strokeColor": "#c9c9cc", "strokeWidth": 4})
    add({"type": "line", "x": x + 95 * s, "y": y + 30 * s, "points": [[0, 0], [5 * s, 1 * s]],
         "strokeColor": "#c9c9cc", "strokeWidth": 4})
    return els
