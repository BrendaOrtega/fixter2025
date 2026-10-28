---
name: toon-object
description: |
  Escena 3D en caricatura plana con three.js dentro de HyperFrames: una caja de regalo HUECA sobre una mesa en un
  cuarto (pared, zoclo, piso, cuadro) tiembla, la tapa sale volando y de adentro sale un robot-agente que saluda.
  Toon de 3 tonos, línea de tinta en espacio de pantalla (una silueta por objeto, redonda, interiores delgados),
  sombra dura gris, cámara con dolly y cambio de ángulo, titular palabra por palabra y CTA que se escribe.
triggers:
  - "un objeto 3D en caricatura plana"
  - "una caja de regalo que se abre y sale un agente"
  - "3D toon con contorno grueso en el reel"
  - "un robot que sale de una caja"
origin: investigación motion 20 oct 2026 (fixter2025/docs/motion-investigacion-oct20, propuesta 2; línea según 5-estilo-de-linea.md), 20 oct 2026
---

# toon-object

Cuarto con mesa: la caja tiembla, se encoge y suelta la tapa, que sube en vertical, da una voltereta por encima de todo y cae en la mesa; la cámara sube
para ver adentro (paredes con grosor, forro de otro tono, borde visible) y sale un robot estirado con overshoot,
aterriza aplastado, la antena rebota, saluda y parpadea. A la izquierda el titular entra palabra por palabra, la
palabra acento reacciona cuando aterriza el robot y la pastilla CTA se escribe. 6.5 s, máximo 3 cosas en movimiento.

## Cuándo usarla
- Un beat «héroe» con un objeto concreto que se abre, gira o revela algo (la caja, el teléfono, el cubo de la
  fábrica): 1–3 por video. Texto, pastillas y SVG siguen en el DOM con GSAP encima del canvas.
- Cuando un SVG isométrico no basta porque el objeto gira más de ~30° o se ve por dentro.

## Cuándo NO (contención)
- Gráficas, diagramas y texto: SVG plano (`iso-bars`, `node-tree`) se lee mejor y es más barato.
- Personajes orgánicos: el robot de primitivas sí, una persona no (eso es Blender + Line Art).
- A Ghosty no se le modela ni repinta: si tiene que salir de la caja, sólo el PNG oficial
  `https://formmy.app/logo.png` como plano (billboard); preferible el robot.
- Nunca `OutlinePass`, `UnrealBloomPass`, `MeshStandardMaterial` con envmap ni `requestAnimationFrame`.

## Cómo aplicarla
1. Copiar `recipe.html` (y `../_lib/beat-snap.js` si se quiere pegar al beat), editar `PARAMS`.
2. Otro objeto: `curObj = N` (rango: el de mayor número va encima en los contactos) y piezas con
   `part(geo, toon(color), padre, { sub })`. Piezas con el mismo `sub` no llevan línea entre ellas.
3. Animar sólo dentro de `renderAt(t)` como función pura de `t`; el DOM en la timeline GSAP.
4. `data-duration` del HTML = `timings.total` (el adaptador `three` no infiere duración).
5. Si cambias medidas, `lidRest` o tiempos: `node toon-object/check-lid.mjs` (desde `motion-lab/`, ~15 s). Mide cada cuadro
   con Box3 la tapa contra caja, mesa y robot (falla si se encajan > 1 px) y que no salga del cuadro con todo y contorno.
6. Renderizar desde `motion-lab/` para que cargue `_lib`: `npx hyperframes render . -c toon-object/preview.html -o out.mp4`
   (GPU del Mac: ~1 min por 6.5 s; borra el `.hyperframes/` que deja). Verificar `start_time` 0, `blackdetect`, y mirar cuadros.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | "fixtergeek" \| "easybits" | fixtergeek | colores; además `wall`, `floor`, `table`, `inside`, `screen`, `shadow` (gris, no tinta), `outline` |
| kicker, title, label | string, string[], string | … | renglón mono; titular (renglón 0 fijo en el cuadro 0, `*palabra*` = acento letra por letra); CTA |
| gift | {w,h,wall,lidH,lidOver,ribbon,radius,bevel} | 1.6, 0.95, 0.1, 0.3, 0.08, 0.24, 0.16, 0.03 | caja hueca: medidas, grosor de pared, radio de las esquinas en planta y bisel de los cantos |
| table | {top,w,d,x} | 1.0, 6.4, 2.8, 0.7 | mesa |
| lidRest, lidApex | {x,z,yaw}, u | 2.12, −0.66, 0.45 · 0.18 | dónde cae la tapa (relativo a la caja, en su giro; la planta debe librar la caja) y cuánto sube sobre la altura mínima para girar |
| giftYaw, botRise | rad, u | −0.45, 0.2 | giro de la caja; cuánto asoma el robot |
| bands | number[] | [0.42, 0.72, 1.0] | luz de cada banda del toon |
| line | {outer,env,extra,inner} | 9, 5.5, 2.5, 4.5 | px a 1280×720: silueta del protagonista, del entorno (mesa), peso extra abajo-derecha, interiores |
| light | {x,y,z} | {−3, 7, 3} | dirección de la luz: bandas y sombra dura |
| cam | {a,b,dolly,follow} | … | pose de entrada, pose alta (se cruza al abrir la caja), dolly continuo y cuánto sube la mirada con la tapa |
| beat | {bpm,offset,subdiv} | 120, 0, 2 | rejilla de BeatSnap para `lidPop`, `robotPop`, `accent`, `wave`, `label` (null = no pegar) |
| timings | s | words .15 · rumble .85 · lidPop 1.5 · lidLand 2.2 · robotPop 2.25 · robotSettle/accent 2.75 · wave 3.25–4.55 · label 3.5 · blink 5.1 · total 6.5 | |

## SFX sugerido
- `rumble` (0.85–1.4 s): traqueteo de cartón corto, sube de volumen.
- `lidPop` (1.5 s): pop de corcho; whoosh mientras gira; `lidLand` (2.2 s): toc de cartón con un rebote.
- `robotPop` (2.25 s): boing de resorte; el golpe visible de `back.out(1.6)` cae en 1/(1.6+1) ≈ 38 % de 0.5 s → 2.44 s.
- `robotSettle` (2.75 s): clonc metálico suave + «pip» de la antena; `accent`: ding corto.
- `wave` (3.25 s): chirrido de servo; `label`: click + ticks cada 0.035 s; `blink` (5.1 s): bip.

## Trampas
- **La línea no es un casco por pieza.** El casco invertido contornea cada primitiva y donde dos se tocan salen dos
  líneas pegadas. Aquí: pase de ids `{obj, sub, profundidad}` (FloatType) a 2× y un shader que pinta tinta si a ≤ r px
  hay otro OBJETO delante (disco = esquinas redondas), con r mayor hacia abajo-derecha; dentro del mismo objeto sólo
  línea interior delgada y de un solo lado (la pieza de `sub` mayor pinta sobre la otra). Luego 2×2 → 1× (antialias, no blur).
- Contacto (caja sobre mesa, tapa sobre mesa): las profundidades casi iguales no dan «delante»; la regla de rango
  (`curObj` mayor) pone una sola línea del lado del de abajo.
- La sombra dura en tinta se funde con el contorno: va en gris de la paleta sobre la mesa clara; en el piso oscuro,
  un tono apenas más hondo que el piso.
- Color en targets lineales (HalfFloat) y `colorspace_fragment` sólo en el pase final; si no, los colores salen corridos.
- `MeshToonMaterial` con luces físicas (r155+): luz directa en `Math.PI` para que la banda 1.0 dé el color exacto.
- Caja hueca = fondo + 4 paredes (mismo `sub`) + forro interior de otro tono (otro `sub` → línea fina en el borde).
- Los lazos del moño no deben asomar por debajo de la tapa: al voltearse se ven.
- Build UMD `three@0.160.0` (`window.THREE`), que es donde el adaptador `three` busca el `DefaultLoadingManager`.
- El canvas se dibuja desde el evento `hf-seek` y desde un tween de reloj; ambos llaman `renderAt(t)` puro.
- Cuadro 0: cuarto, mesa, caja cerrada y primer renglón del titular (miniatura completa).
- El relleno también va redondo: `roundedSlab` (ExtrudeGeometry de un rectángulo de esquinas redondas con bisel compensado);
  con BoxGeometry la silueta sale redonda pero el relleno queda en pico.
- La tapa no gira donde pueda rozar: sube en vertical (parábola) hasta que su radio de voltereta (medido de la geometría,
  con moño) libra el borde de la caja y la cabeza del robot más el contorno; gira 2π sobre su centro sólo arriba de esa
  altura y baja cuando su planta ya no pisa la de la caja. El temblor inclina caja y tapa juntas (`shake`).
- Las cintas de la tapa son UNA pieza (mismo `sub`) y no pasan por debajo: si no, al voltear se ve el cruce con línea y
  parpadeo de profundidad.
