---
name: blueprint-route
description: |
  Piel blueprint: un texto se desarma en partes con cotas, Ghosty se lleva una parte por una ruta curva con dos
  paradas (una falla con X rosa, otra contesta con destello) y regresa con la respuesta a un hueco que se llena tecleando.
triggers:
  - "un viaje de ida y vuelta con paradas"
  - "explicar un lookup / una consulta que pasa por caché y servidor"
  - "Ghosty lleva un dato y trae la respuesta"
origin: réplica de "how browsers work" hecho con Claude Opus 5.5 (cute.mp4, escena "dns lookup"), 24 sep 2026
---

# blueprint-route

La URL (o cualquier texto) está en una pastilla doble; debajo salen cotas con `scheme / host / path`. Ghosty toma la parte de enmedio y la carga por tres curvas punteadas; cada curva se vuelve sólida detrás de él. En la primera parada, un caché hexagonal, aparece una X rosa y «cache miss». En la segunda, un servidor, hay destello y sus renglones se encienden. Ghosty regresa con la respuesta al hueco punteado, que se llena tecla por tecla con un pulso rosa.

## Cuándo usarla
- Consultas con ida y vuelta: DNS, caché → origen, agente → herramienta → respuesta, webhook.
- Mostrar un fallo intermedio sin dejarlo como el remate: la ruta sigue y termina en la respuesta.

## Cuándo NO (contención)
- Más de dos paradas: añade curvas y el ojo se pierde. Mejor dos escenas.
- Si lo que importa es el contenido de la respuesta y no el viaje, usar `node-tree`.

## Cómo aplicarla
1. Copiar `recipe.html` y `assets/ghosty.png`, y editar `PARAMS` (`url`, `parts`, `carry`, `missLabel`, `answer`).
2. Los tiempos `s16` van en dieciseisavos. Cada viaje dura de `goN` a la llegada siguiente (`miss`, `hit`, `land`).
3. Las curvas `A`, `B` y `C` y las posiciones `R`, `S` y `SLOT` están en el código; moverlas si cambia el layout.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| bpm / duration | number / s | 120 / 8 | tempo y duración |
| title / stage | string | "dns lookup" / "1 · fetch" | HUD |
| url | string | https://example.com/ | texto de la pastilla |
| parts | [label, desde, hasta][] | scheme/host/path | cotas por rango de caracteres |
| carry | string | example.com | lo que se lleva Ghosty |
| missLabel | string | cache miss | etiqueta de la parada que falla |
| answer / answerLabel | string | 203.0.113.7 / ip address | respuesta y su etiqueta |
| s16 | objeto | scheme 4 … pulse 52 | tiempos de cada momento |

## SFX sugerido
- Cotas: tres campanas subiendo (en `scheme`, `host` y `path`).
- Toma del host: sonido «boing» que sube, de 0.35 s.
- Viaje: barrido de ruido que dura todo el trayecto (`goN` → llegada).
- Miss: dos plucks graves a medio tono de distancia, para que suene a error.
- Hit: campana aguda y tres clics, uno por renglón.
- Llegada: bombo y marimba; la respuesta, un clic por carácter en tresillos.

## Trampas
- Las mismas de `blueprint-tree` (`<`, captura sin fast-capture).
- El tilt del personaje sale de la pendiente de la curva; limitarlo a ±0.3 rad, o en las bajadas parece que se cae.
