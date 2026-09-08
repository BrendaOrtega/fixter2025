"""Escena 6: lo que queda como tarea después de la sesión 3.

Uso: python3 scene-sesion-3-tarea.py  → va completa, sin pasos.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _skills_base import make, publish, AMBAR, VERDE, AZUL, GRIS, ROJO
from place import ghosty

els, T, rect, line, arrow, hoja, caja = make()

T(120, 40, "📋 por tu cuenta", 62, AZUL)
T(120, 120, "tres cosas que la sesión deja abiertas", 34, GRIS)
els.extend(ghosty(x=1280, y=30, height=150))

tareas = [
    ("1", "el turno interrumpido", ROJO, "#ffe3e3",
     "duermes la caja a media respuesta:",
     "goose arranca de cero y el hilo viejo ya no existe"),
    ("2", "session/cancel", AMBAR, "#fff9db",
     "el botón de parar está dibujado",
     "y no interrumpe nada"),
    ("3", "replayTail", VERDE, "#d3f9d8",
     "cargar un hilo largo tarda ~1.1 s:",
     "_meta.replayTail recorta el replay, no el contexto"),
]

y = 260
for num, titulo, stroke, bg, linea1, linea2 in tareas:
    rect(140, y, 1360, 190, bg, stroke, 4)
    T(185, y + 25, f"{num} · {titulo}", 40, stroke)
    T(185, y + 90, linea1, 28, GRIS)
    T(185, y + 132, linea2, 28, GRIS)
    y += 230

T(185, y + 15, "la app ya trae el arreglo del 1 y el 3 apagado: ACP_REPLAY_TAIL en el .env", 28, AZUL)
T(185, y + 57, "y el push del agente: token del repo en el vault + credential.helper (hoy sólo llegamos al commit)", 28, AMBAR)

# La sugerencia que abre la sesión 4: el historial como tool, no como carga.
rect(140, y + 110, 1360, 200, "#e5dbff", "#6741d9", 4, "dashed")
T(185, y + 135, "💡 y una idea para la 4", 40, "#6741d9")
T(185, y + 200, "en vez de volcar el hilo al contexto, dárselo como tool:", 28, GRIS)
T(185, y + 242, "buscar_en_el_hilo(\"qué decidimos del vault\") → tres fragmentos, no diez mil tokens", 28, GRIS)

publish(els)
