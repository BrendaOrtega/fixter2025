#!/usr/bin/env python3
# Genera la hoja de sprites (12 objetos) con la API de imágenes de OpenAI. Los textos los pone HTML encima.
# Uso: python3 assets/sprites/gen-sheet.py  (lee OPENAI_API_KEY de ~/fixter2025/.env sin imprimirla)
import base64, json, os, re, sys, urllib.request
env = open(os.path.expanduser("~/fixter2025/.env")).read()
key = re.search(r"^OPENAI_API_KEY=\"?([^\"\n]+)", env, re.M).group(1)
PROMPT = """A sprite sheet of 12 separate objects arranged in a clean 4-column by 3-row grid, each object centered in its own cell with generous empty space, nothing touching.
Style: modern minimal flat vector illustration like a polished SaaS website for developers: soft rounded geometric shapes, NO outlines at all (no black strokes), flat solid fills with one subtle darker tone for depth, gently rounded corners, no drop shadows, no gradients, no glow, no texture, no text, no letters, no numbers, no logos.
Palette strictly: mint #85DDCB, green #8DCF6E, dark navy surfaces #182128 and #2C3944, light grey #B7B9BA, soft white #F2F5F4, small red #E5484D only where noted.
Objects in reading order:
1) a small potted plant: dark slate pot (#2C3944) with two rounded leaves, one mint and one green
2) a coffee mug in mint with a rounded handle
3) a smartphone front view: dark slate body (#2C3944), blank soft-white screen
4) a paper receipt, soft white, blank, small zigzag bottom edge
5) a square sticky note in green, blank, one softly curled corner
6) a file folder in mint, closed, blank front
7) a laptop front view: slate (#2C3944) body and keyboard base, dark screen (#182128) blank
8) a studio microphone on a short stand with round base: soft-white rounded mic head with mint grille slots, slate stand
9) a rectangular pin board: rounded slate (#2C3944) frame with a slightly lighter grey surface, empty
10) a single push pin, mint head, light grey needle
11) a round badge seal: mint circle with a thin darker mint inner ring, blank center
12) a credit card in mint with a green chip and a slate stripe, no numbers
Background: perfectly uniform flat pure magenta #FF00FF filling the whole image (for chroma-key cutout)."""
body = json.dumps({"model": "gpt-image-2", "prompt": PROMPT, "size": "1536x1024", "quality": "high", "output_format": "png", "n": 1}).encode()
req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=body, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
try:
    r = json.load(urllib.request.urlopen(req, timeout=300))
except urllib.error.HTTPError as e:
    sys.exit(e.read().decode()[:500])
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sheet.png")
open(out, "wb").write(base64.b64decode(r["data"][0]["b64_json"]))
print(out, r.get("usage"))
