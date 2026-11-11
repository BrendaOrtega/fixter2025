#!/usr/bin/env python3
# Recorta sheet.png (4×3) a PNG con alfa: rellena el fondo blanco desde las esquinas (los blancos encerrados
# por contorno se quedan), corta por celda al bbox del alfa y guarda cada objeto a 2× (Lanczos).
import os
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
NAMES = ["plant", "mug", "phone", "receipt", "postit", "folder", "laptop", "mic", "board", "pin", "stamp", "ccard"]
im = Image.open(os.path.join(HERE, "sheet.png")).convert("RGB")
W, H = im.size
key = (255, 0, 255)
work = im.copy()
for xy in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1), (W // 2, 2), (W // 2, H - 3), (2, H // 2), (W - 3, H // 2)]:
    if work.getpixel(xy) != key:
        ImageDraw.floodfill(work, xy, key, thresh=40)
px = work.load(); src = im.load()
rgba = Image.new("RGBA", (W, H)); out = rgba.load()
for y in range(H):
    for x in range(W):
        p = px[x, y]
        out[x, y] = (0, 0, 0, 0) if p == key else (*src[x, y], 255)
# limpia el halo claro de 1 px que deja el antialias contra el blanco
a2 = rgba.copy(); o2 = a2.load()
for y in range(1, H - 1):
    for x in range(1, W - 1):
        r, g, b, a = out[x, y]
        if a and min(r, g, b) > 215 and any(out[x + dx, y + dy][3] == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            o2[x, y] = (0, 0, 0, 0)
cw, ch = W / 4, H / 3
for i, name in enumerate(NAMES):
    c, r = i % 4, i // 4
    cell = a2.crop((int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch)))
    bb = cell.getchannel("A").getbbox()
    crop = cell.crop((max(0, bb[0] - 3), max(0, bb[1] - 3), bb[2] + 3, bb[3] + 3))
    crop = crop.resize((crop.width * 2, crop.height * 2), Image.LANCZOS)
    crop.save(os.path.join(HERE, f"{name}.png"))
    print(name, crop.size)
