#!/usr/bin/env python3
# Genera la hoja de sprites (12 objetos) con la API de imágenes de OpenAI. Los textos los pone HTML encima.
# Uso: python3 assets/sprites/gen-sheet.py  (lee OPENAI_API_KEY de ~/fixter2025/.env sin imprimirla)
import base64, json, os, re, sys, urllib.request
env = open(os.path.expanduser("~/fixter2025/.env")).read()
key = re.search(r"^OPENAI_API_KEY=\"?([^\"\n]+)", env, re.M).group(1)
PROMPT = """A sprite sheet of 12 separate flat cartoon objects arranged in a clean 4-column by 3-row grid, each object centered in its own cell with generous empty space around it, nothing touching or overlapping.
Style: flat vector cartoon illustration, very thick solid black outlines (#0E1317), flat solid fills only, one hard offset drop shadow per object (solid dark shape shifted down-right, no blur), no gradients, no glow, no blur, no texture, no grain, no text, no letters, no numbers, no logos anywhere.
Palette strictly: mint #85DDCB, green #8DCF6E, off-white #F2F5F4, grey #7C8A8E, dark #0E1317, plus small red #E5484D only where noted.
Objects, in reading order:
1) a small potted plant: grey pot with two leaves (one mint, one green)
2) a coffee mug, mint, with a handle
3) a smartphone seen from the front, off-white blank screen with a green top bar, rounded corners
4) a paper receipt, off-white, blank, with zigzag torn bottom edge, slightly tilted
5) a square sticky note, green, blank, slightly curled corner
6) a file folder, mint, closed, blank front
7) a laptop seen from the front, open, grey keyboard base, dark bezel, blank off-white screen
8) a studio microphone on a short desk stand with round base, off-white mic head with dark grille lines, grey stand
9) a rectangular cork board with a thick off-white wooden frame, cork surface in grey #7C8A8E with tiny dots, empty
10) a single push pin seen from the side, green head, grey needle
11) a round rubber stamp imprint: an empty green circle badge with a thick dark ring and an inner ring, blank center
12) a credit card, mint, with a green chip and a dark stripe, no numbers
Plain flat white background everywhere, perfectly uniform."""
body = json.dumps({"model": "gpt-image-2", "prompt": PROMPT, "size": "1536x1024", "quality": "high", "output_format": "png", "n": 1}).encode()
req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=body, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
try:
    r = json.load(urllib.request.urlopen(req, timeout=300))
except urllib.error.HTTPError as e:
    sys.exit(e.read().decode()[:500])
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sheet.png")
open(out, "wb").write(base64.b64decode(r["data"][0]["b64_json"]))
print(out, r.get("usage"))
