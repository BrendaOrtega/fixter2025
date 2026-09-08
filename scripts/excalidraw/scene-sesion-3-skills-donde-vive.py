"""Escena 4b: dónde vive una skill y por qué no se respalda.

Uso: python3 scene-sesion-3-skills-donde-vive.py [1..2]
  1 repo → git clone → caja · 2 el criterio de respaldo
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _skills_base import make, publish, step, AMBAR, VERDE, AZUL, GRIS
from place import ghosty

els, T, rect, line, arrow, hoja, caja = make()
N = step()

T(120, 40, "🔧 vive en el repo, no en la caja", 62, AMBAR)
els.extend(ghosty(x=1280, y=30, height=150))

# --- 1. el viaje: repo → clone → caja ---
rect(140, 260, 480, 250, "#fff9db", AMBAR, 4)
T(185, 290, "el repo", 44, AMBAR)
T(185, 365, ".goose/skills/", 32, GRIS)
T(185, 415, "  estilo/SKILL.md", 30, GRIS)

arrow(650, 380, [[0, 0], [110, -25], [230, 5]], VERDE)
T(700, 290, "git clone", 36, VERDE)
T(670, 440, "lo hace el bootstrap,", 26, GRIS)
T(670, 478, "en cada despertar", 26, GRIS)

caja(1080, 250, 420, 270)
T(1130, 420, "/data/work", 32, GRIS)

# el dato: tres rutas válidas, relativas al cwd
T(140, 545, "las busca en .goose/skills · .agents/skills · .claude/skills", 30, GRIS)
T(140, 588, "relativas al cwd — goose y ghosty leen las tres (medido, 8 sep)", 26, VERDE)

# --- 2. el criterio ---
if N >= 2:
    T(140, 690, "si la caja muere…", 40, GRIS)
    rect(140, 760, 940, 110, "#e7f5ff", AZUL, 4)
    T(180, 788, "las conversaciones sólo existían ahí", 34, AZUL)
    T(180, 832, "→ súbelas a S3 antes", 28, GRIS)
    rect(140, 900, 940, 110, "#fff9db", AMBAR, 4)
    T(180, 928, "las skills están en git", 34, AMBAR)
    T(180, 972, "→ la caja nueva las clona sola", 28, GRIS)

    T(1130, 850, "a S3 va sólo lo que", 34, "#e67700")
    T(1130, 898, "no puedes regenerar", 34, "#e67700")

publish(els)
