"""Escena 4c: cómo las pide el Cliente, y la trampa.

Uso: python3 scene-sesion-3-skills-como-se-piden.py [1..3]
  1 la llamada · 2 no es del protocolo · 3 autodescubrible ≠ leída
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _skills_base import make, publish, step, AZUL, GRIS, ROJO, VERDE
from place import ghosty

els, T, rect, line, arrow, hoja, caja = make()
N = step()

T(120, 40, "🔧 cómo se las pides", 62, AZUL)
els.extend(ghosty(x=1280, y=30, height=150))

# --- 1. la llamada: ida y vuelta ---
rect(140, 300, 460, 300, "#ffffff", AZUL, 4)
T(185, 330, "🖥️ tu app", 40, AZUL)
T(185, 400, "la pantalla", 28, GRIS)
T(185, 440, "/skills", 28, GRIS)

caja(1040, 290, 460, 310)
T(1090, 340, "🤖 el agente", 36, GRIS)
T(1090, 470, ".goose/skills/", 28, GRIS)

arrow(620, 380, [[0, 0], [200, -25], [400, 0]], AZUL)
T(660, 225, "sources/list", 32, AZUL)
T(660, 272, "🚩 no es del protocolo", 26, ROJO)

arrow(1020, 540, [[0, 0], [-200, 25], [-400, 0]], VERDE)
T(680, 560, "publicar · estilo · pruebas", 30, VERDE)

T(185, 680, "el nombre completo: _goose/unstable/sources/list", 32, GRIS)
T(185, 730, "buscar «skills» en el protocolo no encuentra nada.", 30, GRIS)

# --- 2. la advertencia ---
if N >= 2:
    rect(140, 800, 1360, 210, "#ffffff", ROJO, 4, "dashed")
    T(185, 835, "ojo: no es del protocolo", 40, ROJO)
    T(185, 900, "_goose = extensión de la casa · unstable = puede cambiar", 28, GRIS)
    T(185, 945, "va por ACP, pero otro agente no la tiene", 28, GRIS)

# --- 3. la trampa ---
if N >= 3:
    rect(140, 1060, 1360, 190, "#ffe3e3", ROJO, 4)
    T(185, 1095, "autodescubrible ≠ leída", 52, ROJO)
    T(185, 1170, "que el archivo esté donde el agente podría verlo", 28, GRIS)
    T(185, 1210, "no significa que lo abra: o lo indexa, o va por ruta exacta.", 28, GRIS)

publish(els)
