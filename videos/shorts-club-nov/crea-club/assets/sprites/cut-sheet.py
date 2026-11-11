#!/usr/bin/env python3
# Recorta sheet.png (4×3, fondo magenta) a PNG con alfa por chroma-key suave + des-spill,
# corta por celda al bbox del alfa y guarda cada objeto a 2× (Lanczos).
import os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
NAMES = ["plant", "mug", "phone", "receipt", "postit", "folder", "laptop", "mic", "board", "pin", "stamp", "ccard"]
im = Image.open(os.path.join(HERE, "sheet.png")).convert("RGBA")
W, H = im.size
px = im.load()
for y in range(H):
    for x in range(W):
        r, g, b, _ = px[x, y]
        m = min(r, b) - g  # cuánto «magenta» tiene el píxel
        if m > 140:
            px[x, y] = (0, 0, 0, 0)
        elif m > 40:
            a = int(255 * (140 - m) / 100)
            cap = g + 40  # quita el tinte magenta del borde
            px[x, y] = (min(r, cap), g, min(b, cap), a)
cw, ch = W / 4, H / 3
for i, name in enumerate(NAMES):
    c, r = i % 4, i // 4
    cell = im.crop((int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch)))
    bb = cell.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    crop = cell.crop((max(0, bb[0] - 3), max(0, bb[1] - 3), bb[2] + 3, bb[3] + 3))
    crop = crop.resize((crop.width * 2, crop.height * 2), Image.LANCZOS)
    crop.save(os.path.join(HERE, f"{name}.png"))
    print(name, crop.size)
