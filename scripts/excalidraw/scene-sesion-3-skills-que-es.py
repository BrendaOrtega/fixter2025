"""Escena 4a: qué es una skill — un archivo que cambia lo que sale del agente.

Uso: python3 scene-sesion-3-skills-que-es.py [1..2]
  1 el archivo · 2 el mismo encargo, dos resultados
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _skills_base import make, publish, step, AMBAR, VERDE, GRIS, ROJO
from place import ghosty

els, T, rect, line, arrow, hoja, caja = make()
N = step()

T(120, 40, "🔧 una skill es un archivo", 62, AMBAR)
T(120, 120, "el encargo: «sube esta app»", 34, GRIS)
els.extend(ghosty(x=1280, y=30, height=150))

# --- 1. el archivo ---
hoja(160, 320, 380, 260)
T(210, 360, "publicar/SKILL.md", 40, AMBAR)
T(210, 440, "1. secretos al vault", 28, GRIS)
T(210, 482, "2. no está listo hasta el 200", 28, GRIS)

# --- 2. el mismo encargo, dos resultados ---
if N >= 2:
    arrow(590, 450, [[0, 0], [90, -20], [180, 0]], AMBAR)
    rect(800, 320, 700, 110, "#d3f9d8", VERDE, 4)
    T(835, 345, "con la skill", 24, VERDE)
    T(835, 382, "vault, y espera el 200", 34, VERDE)

    rect(800, 470, 700, 110, "#ffe3e3", ROJO, 4)
    T(835, 495, "sin la skill", 24, ROJO)
    T(835, 532, "las llaves al repo, y «ya quedó»", 34, ROJO)

    T(160, 700, "mismo agente, mismo modelo, mismo prompt.", 34, GRIS)

publish(els)
