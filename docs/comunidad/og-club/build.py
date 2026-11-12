#!/usr/bin/env python3
# Miniatura Open Graph del Club de Agentes de IA (1200x630) para WhatsApp, X, LinkedIn y Facebook.
# Arma un HTML con SVG (ilustración plana, paleta FixterGeek), lo renderiza con Chrome headless
# y lo deja en public/og-club-de-agentes-2.png. Uso: python3 docs/comunidad/og-club/build.py
#
# Las naves, los pilotos y el cristal son un port a SVG de lo que dibuja el Mundo del club
# (app/components/community/v2/world/engine.ts: drawShip, drawPilot, flame, drawGem). Si allá
# cambian las formas, se actualizan aquí. WhatsApp y Facebook cachean la imagen por URL: al
# cambiar el dibujo, subir el número del archivo y la entrada de OG_IMAGES en comunidad.$slug.tsx.
import math
import random
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = ROOT / "public" / "og-club-de-agentes-2.png"
LOGO = ROOT / "public" / "logo.png"  # logo oficial, sin alterar
GHOSTY = ROOT / "public" / "ghosty-oficial.png"  # idéntico byte a byte a https://formmy.app/logo.png
GHOSTY_W, GHOSTY_H = 512, 592
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

W, H = 1200, 630
BG, PANEL, LINE = "#0E1317", "#141B20", "#232D33"
MINT, GREEN, INK, GRAY = "#85DDCB", "#8DCF6E", "#F2F5F4", "#7C8A8E"
MINT_DEEP, MINT_MID, MOON_SHADE = "#357265", "#65B0A1", "#D9E3E0"
SUIT, SUIT_LINE = "#D1DEDB", "#9AA9A6"
COLORS = {"mint": (MINT, MINT_DEEP), "green": (GREEN, "#4C7A39")}

uid = 0


def stars():
    # Estrellas fijas (semilla) fuera de la franja del título y del planeta.
    rnd = random.Random(7)
    out = []
    while len(out) < 70:
        x, y = rnd.uniform(20, W - 20), rnd.uniform(20, H - 20)
        if 300 < x < 900 and 60 < y < 420:
            continue
        if (x - 600) ** 2 + (y - 790) ** 2 < 370 ** 2:
            continue
        r = rnd.choice([1.4, 1.8, 2.4, 3])
        color = rnd.choice([INK, INK, GRAY, MINT])
        out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r}" fill="{color}" opacity="{rnd.uniform(.35, .9):.2f}"/>')
    return "\n".join(out)


def flame(x, y, length, half):
    l = length
    return (f'<path d="M{x} {y - half} Q{x - l * .5} {y - half * .5} {x - l} {y} Q{x - l * .5} {y + half * .5} {x} {y + half} Z" fill="{MINT}"/>'
            f'<path d="M{x} {y - half * .45} Q{x - l * .3} {y} {x - l * .5} {y} Q{x - l * .3} {y} {x} {y + half * .45} Z" fill="{INK}"/>')


def pilot(kind, x, y, r):
    # El piloto va derecho (cabeza arriba) aunque la nave gire, igual que en el Mundo.
    global uid
    uid += 1
    cid = f"cockpit{uid}"
    if kind == "ghosty":
        h = r * 1.72
        w = h * GHOSTY_W / GHOSTY_H
        inner = f'<image href="{GHOSTY.as_uri()}" x="{x - w / 2}" y="{y - h / 2 + r * .1}" width="{w}" height="{h}"/>'
    elif kind == "alien":
        inner = (f'<path d="M{x - r * .3} {y - r * .5} L{x - r * .5} {y - r * .86} M{x + r * .3} {y - r * .5} L{x + r * .5} {y - r * .86}" stroke="{GREEN}" stroke-width="{r * .12}" stroke-linecap="round"/>'
                 f'<ellipse cx="{x}" cy="{y + r * .12}" rx="{r * .66}" ry="{r * .7}" fill="{GREEN}"/>'
                 f'<ellipse cx="{x - r * .27}" cy="{y + r * .08}" rx="{r * .19}" ry="{r * .31}" fill="{BG}" transform="rotate(-28.6 {x - r * .27} {y + r * .08})"/>'
                 f'<ellipse cx="{x + r * .27}" cy="{y + r * .08}" rx="{r * .19}" ry="{r * .31}" fill="{BG}" transform="rotate(28.6 {x + r * .27} {y + r * .08})"/>')
    else:  # astronauta: casco claro con visor oscuro
        inner = (f'<circle cx="{x}" cy="{y + r * .06}" r="{r * .82}" fill="{SUIT}"/>'
                 f'<rect x="{x - r * .56}" y="{y - r * .34}" width="{r * 1.12}" height="{r * .78}" rx="{r * .34}" fill="{BG}"/>'
                 f'<circle cx="{x + r * .24}" cy="{y - r * .1}" r="{r * .12}" fill="{MINT}"/>')
    return (f'<clipPath id="{cid}"><circle cx="{x}" cy="{y}" r="{r}"/></clipPath>'
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="{BG}"/><g clip-path="url(#{cid})">{inner}</g>'
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="{SUIT}" stroke-width="{max(1, r * .14)}"/>')


def ship(model, color, who, x, y, deg, size):
    # Nave de ~56 unidades apuntando a +x (mismas coordenadas que drawShip).
    fill, dark = COLORS[color]
    k = size / 56
    cockpit_x, cockpit_r = 0, 9
    if model == "saucer":
        cockpit_r, deg = 11, 0
        dots = "".join(f'<circle cx="{math.cos(i * math.tau / 6 + .5) * 20.8:.2f}" cy="{math.sin(i * math.tau / 6 + .5) * 20.8:.2f}" r="2" fill="{INK}"/>' for i in range(6))
        body = (f'<circle r="25" fill="{fill}" stroke="{dark}" stroke-width="3" vector-effect="non-scaling-stroke"/><circle r="16.5" fill="{dark}"/>{dots}')
    elif model == "rocket":
        cockpit_x = -1
        fins = "".join(f'<path d="M-10 {s * 9} L-27 {s * 21} Q-25 {s * 12} -22 {s * 8} Z" fill="{fill}" stroke="{dark}" stroke-width="3" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>' for s in (-1, 1))
        body = (flame(-24, 0, 22, 5.5) + fins +
                f'<path d="M-22 -10.5 L8 -10.5 Q27 -9 31 0 Q27 9 8 10.5 L-22 10.5 Q-25 0 -22 -10.5 Z" fill="{INK}" stroke="{SUIT_LINE}" stroke-width="3" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>'
                f'<path d="M14 -9.6 Q27 -8 30.3 0 Q27 8 14 9.6 Z" fill="{fill}"/><rect x="-19" y="-9.8" width="4" height="19.6" fill="{fill}"/>')
    elif model == "pod":
        cockpit_x, cockpit_r = -1, 10
        pods = "".join(f'<rect x="-25" y="{s * 14 - 5}" width="20" height="10" rx="4" fill="{fill}" stroke="{dark}" stroke-width="3" vector-effect="non-scaling-stroke"/>' for s in (-1, 1))
        body = (flame(-24, -14, 16, 3.5) + flame(-24, 14, 16, 3.5) + pods +
                f'<rect x="-18" y="-16" width="40" height="32" rx="14" fill="{INK}" stroke="{SUIT_LINE}" stroke-width="3" vector-effect="non-scaling-stroke"/>'
                f'<rect x="14" y="-9" width="6" height="18" rx="3" fill="{fill}"/>')
    else:  # dardo
        cockpit_x, cockpit_r = -1, 8
        body = (flame(-13, 0, 22, 5) +
                f'<path d="M31 0 L-23 -21 Q-14 -8 -13 0 Q-14 8 -23 21 Z" fill="{fill}" stroke="{dark}" stroke-width="3" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>'
                f'<path d="M27 0 L-11 -8.5 L-11 8.5 Z" fill="{INK}"/>')
    a = math.radians(deg)
    px, py = x + math.cos(a) * cockpit_x * k, y + math.sin(a) * cockpit_x * k
    # Borde fino: el grosor no crece con la escala de la nave.
    return f'<g transform="translate({x} {y}) rotate({deg}) scale({k})">{body}</g>' + pilot(who, px, py, cockpit_r * k)


def gem(x, y, k):
    # Cristal plano de tres facetas (drawGem): w = 9, h = 15.
    return (f'<g transform="translate({x} {y}) scale({k})">'
            f'<path d="M0 -15 L9 -3 L0 15 L-9 -3 Z" fill="{MINT}"/>'
            f'<path d="M0 -15 L0 -3 L-9 -3 Z" fill="#BDEEE3"/><path d="M9 -3 L0 15 L0 -3 Z" fill="#4FA896"/>'
            f'<path d="M0 -15 L9 -3 L0 15 L-9 -3 Z" fill="none" stroke="{MINT_DEEP}" stroke-width="1" stroke-linejoin="round"/></g>')


html = f"""<!doctype html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;background:{BG}}} svg{{display:block}}
text{{font-family:"Inter","SF Pro Display",system-ui,-apple-system,"Helvetica Neue",sans-serif}}
</style></head><body>
<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{W}" height="{H}" fill="{BG}"/>
  <!-- cielo: bandas planas y órbita, para que el fondo no sea negro liso -->
  <circle cx="600" cy="790" r="640" fill="{PANEL}"/>
  <circle cx="600" cy="790" r="470" fill="#18222A"/>
  <ellipse cx="600" cy="580" rx="560" ry="250" fill="none" stroke="{LINE}" stroke-width="3" stroke-dasharray="3 16" stroke-linecap="round"/>
  {stars()}

  {gem(330, 470, 2.3)}
  {gem(72, 96, 1.7)}
  {gem(1128, 330, 1.9)}

  {ship("rocket", "mint", "ghosty", 190, 250, -16, 204)}
  {ship("saucer", "green", "alien", 1046, 176, 0, 176)}
  {ship("pod", "mint", "astro", 1010, 468, 196, 172)}
  {ship("dart", "green", "astro", 150, 520, -34, 96)}

  <!-- planeta grande (claro): sobre él va el logo oficial, que trae letras oscuras -->
  <circle cx="600" cy="790" r="330" fill="{INK}"/>
  <circle cx="420" cy="585" r="24" fill="{MOON_SHADE}"/>
  <circle cx="796" cy="600" r="17" fill="{MOON_SHADE}"/>
  <circle cx="760" cy="528" r="9" fill="{MOON_SHADE}"/>
  <circle cx="464" cy="520" r="8" fill="{MOON_SHADE}"/>
  <image href="{LOGO.as_uri()}" x="435" y="536" width="330" height="59.8"/>

  <!-- pastilla -->
  <rect x="464" y="58" width="272" height="44" rx="22" fill="{PANEL}" stroke="{MINT_DEEP}" stroke-width="2"/>
  <circle cx="492" cy="80" r="7" fill="{GREEN}"/>
  <text x="510" y="87.500" font-size="20" font-weight="700" fill="{MINT}" letter-spacing="1.2">COMUNIDAD EN VIVO</text>

  <!-- nombre del club: cabe en el cuadrado central (recorte de WhatsApp) -->
  <text x="600" y="196" text-anchor="middle" font-size="84" font-weight="800" fill="{INK}" letter-spacing="-2">Club de</text>
  <text x="600" y="284" text-anchor="middle" font-size="84" font-weight="800" fill="{INK}" letter-spacing="-2">Agentes <tspan fill="{MINT}">de IA</tspan></text>
  <text x="600" y="340" text-anchor="middle" font-size="27" font-weight="500" fill="#C7D1CF">Llamadas en vivo, grabaciones y cursos</text>
  <text x="600" y="376" text-anchor="middle" font-size="27" font-weight="500" fill="#C7D1CF">para crear tus agentes de IA</text>
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
    im.quantize(colors=200, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(OUT, optimize=True)
except ImportError:
    pass
print(OUT, OUT.stat().st_size // 1024, "KB")
