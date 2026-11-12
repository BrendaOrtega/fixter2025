#!/usr/bin/env python3
# Miniatura Open Graph del Club de Agentes de IA (1200x630) para WhatsApp, X, LinkedIn y Facebook.
# Arma un HTML con SVG (ilustración plana, paleta FixterGeek), lo renderiza con Chrome headless
# y lo deja en public/og-club-de-agentes.png. Uso: python3 docs/comunidad/og-club/build.py
import random
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = ROOT / "public" / "og-club-de-agentes.png"
LOGO = ROOT / "public" / "logo.png"  # logo oficial, sin alterar
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

W, H = 1200, 630
BG, PANEL, LINE = "#0E1317", "#141B20", "#232D33"
MINT, GREEN, INK, GRAY = "#85DDCB", "#8DCF6E", "#F2F5F4", "#7C8A8E"
MINT_DEEP, MINT_MID, MOON_SHADE = "#357265", "#65B0A1", "#D9E3E0"


def stars():
    # Estrellas fijas (semilla) fuera de la franja del título y del planeta.
    rnd = random.Random(7)
    out = []
    while len(out) < 70:
        x, y = rnd.uniform(20, W - 20), rnd.uniform(20, H - 20)
        if 300 < x < 900 and 110 < y < 400:
            continue
        if (x - 600) ** 2 + (y - 770) ** 2 < 370 ** 2:
            continue
        r = rnd.choice([1.4, 1.8, 2.4, 3])
        color = rnd.choice([INK, INK, GRAY, MINT])
        out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r}" fill="{color}" opacity="{rnd.uniform(.35, .9):.2f}"/>')
    return "\n".join(out)


def ship(x, y, angle, scale, body, dark):
    # Nave plana: cuerpo redondeado, ventana, aletas y estela corta. Apunta a +x antes de girar.
    return f"""
  <g transform="translate({x} {y}) rotate({angle}) scale({scale})">
    <path d="M-150 0 h70" stroke="{LINE}" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 22"/>
    <path d="M-52 0 q-34 -14 -52 0 q18 14 52 0 z" fill="{GREEN}"/>
    <path d="M-50 0 q-18 -7 -28 0 q10 7 28 0 z" fill="{INK}"/>
    <path d="M-30 -22 l-30 -24 q-6 30 6 34 z" fill="{dark}"/>
    <path d="M-30 22 l-30 24 q-6 -30 6 -34 z" fill="{dark}"/>
    <path d="M-48 -26 h52 q46 4 62 26 q-16 22 -62 26 h-52 q-12 -26 0 -52 z" fill="{body}" stroke="{dark}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="10" cy="0" r="14" fill="{BG}" stroke="{INK}" stroke-width="4"/>
    <rect x="-40" y="-26" width="9" height="52" fill="{dark}"/>
  </g>"""


html = f"""<!doctype html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;background:{BG}}} svg{{display:block}}
text{{font-family:"Inter","SF Pro Display",system-ui,-apple-system,"Helvetica Neue",sans-serif}}
</style></head><body>
<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{W}" height="{H}" fill="{BG}"/>
  <!-- cielo: bandas planas y órbitas, para que el fondo no sea negro liso -->
  <circle cx="600" cy="770" r="640" fill="{PANEL}"/>
  <circle cx="600" cy="770" r="470" fill="#18222A"/>
  <ellipse cx="600" cy="560" rx="560" ry="250" fill="none" stroke="{LINE}" stroke-width="3" stroke-dasharray="3 16" stroke-linecap="round"/>
  {stars()}

  <!-- planeta chico con anillo -->
  <g transform="translate(1010 470) rotate(-18)">
    <ellipse rx="92" ry="22" fill="none" stroke="{MINT_DEEP}" stroke-width="8"/>
    <circle r="52" fill="{GREEN}"/>
    <path d="M-50 -14 q50 22 100 0 M-46 20 q46 18 92 0" stroke="#6FB154" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M-92 0 a92 22 0 0 0 184 0" fill="none" stroke="{MINT}" stroke-width="8"/>
  </g>
  <!-- asteroide -->
  <g transform="translate(150 500)">
    <path d="M-44 -6 l18 -30 l40 -6 l30 24 l-6 36 l-36 20 l-34 -12 z" fill="#3A474E" stroke="#4B5A62" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="-8" cy="-6" r="9" fill="#2B363C"/><circle cx="16" cy="14" r="6" fill="#2B363C"/>
  </g>

  {ship(170, 235, -22, 1.0, MINT, MINT_DEEP)}
  {ship(1030, 205, 200, 0.82, INK, GRAY)}
  {ship(985, 80, -8, 0.5, GREEN, "#4C7A39")}

  <!-- planeta grande (claro): sobre él va el logo oficial, que trae letras oscuras -->
  <circle cx="600" cy="770" r="330" fill="{INK}"/>
  <circle cx="415" cy="560" r="26" fill="{MOON_SHADE}"/>
  <circle cx="800" cy="585" r="18" fill="{MOON_SHADE}"/>
  <circle cx="760" cy="512" r="9" fill="{MOON_SHADE}"/>
  <circle cx="462" cy="500" r="8" fill="{MOON_SHADE}"/>
  <image href="{LOGO.as_uri()}" x="435" y="522" width="330" height="59.8"/>

  <!-- pastilla -->
  <rect x="452" y="72" width="296" height="44" rx="22" fill="{PANEL}" stroke="{MINT_DEEP}" stroke-width="2"/>
  <circle cx="480" cy="94" r="7" fill="{GREEN}"/>
  <text x="498" y="101.500" font-size="20" font-weight="700" fill="{MINT}" letter-spacing="1.2">LLAMADA CADA SEMANA</text>

  <!-- nombre del club: cabe en el cuadrado central (recorte de WhatsApp) -->
  <text x="600" y="212" text-anchor="middle" font-size="84" font-weight="800" fill="{INK}" letter-spacing="-2">Club de</text>
  <text x="600" y="302" text-anchor="middle" font-size="84" font-weight="800" fill="{INK}" letter-spacing="-2">Agentes <tspan fill="{MINT}">de IA</tspan></text>
  <text x="600" y="356" text-anchor="middle" font-size="27" font-weight="500" fill="#C7D1CF">Construye agentes que trabajan de verdad</text>
</svg></body></html>"""

src = HERE / "_og.html"
src.write_text(html, encoding="utf-8")
subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                f"--window-size={W},{H}", f"--screenshot={OUT}", "--allow-file-access-from-files", src.as_uri()],
               check=True, capture_output=True)
src.unlink()
# Paleta indexada: baja el peso sin que se note en una ilustración plana.
try:
    from PIL import Image
    im = Image.open(OUT).convert("RGB")
    assert im.size == (W, H), im.size
    im.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(OUT, optimize=True)
except ImportError:
    pass
print(OUT, OUT.stat().st_size // 1024, "KB")
