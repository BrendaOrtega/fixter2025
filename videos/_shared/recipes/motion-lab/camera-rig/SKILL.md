---
name: camera-rig
description: |
  Cámara virtual reutilizable en GSAP para escenas HTML/SVG por capas: `camera.to({x, y, zoom, rot, yaw}, dur, ease, at)`
  mueve cada capa según su profundidad (parallax real de cámara de agujero), con whip-pan con smear y múltiplos que
  transmuta a otra escena, zoom-punch, dolly y corte invisible. La ruta 2D para «dirección de cámara» en shorts, sin Blender.
triggers:
  - "que la cámara se mueva con parallax"
  - "push-in / dolly / paneo de cámara en el short"
  - "whip-pan que cambie de escena"
  - "zoom-punch sobre un objeto"
  - "transmutación de dirección de cámara"
origin: técnicas 8 y 9 de fixter2025/docs/motion-investigacion-oct20/3-tecnicas-de-los-mejores.md + hueco 1 de 4-auditoria-nuestro-pipeline.md, 20 oct 2026
---

# camera-rig

Un escritorio de noche en 5 capas (cielo, pared con ventana, repisa, escritorio con teléfono, primer plano). Push-in al
teléfono, paneo con parallax (la luna se mueve dentro de la ventana), whip-pan con smear que transmuta a la calle, giro
de cámara con perspectiva, zoom-punch al letrero ABIERTO y dolly-out que revela que la calle era la pantalla del teléfono.
1080×1920, 8 s.

## Cuándo usarla
- Todo short que hoy vive en un plano fijo: un movimiento de cámara por frase (push-in en la palabra clave, paneo para
  pasar de un objeto a otro, whip-pan entre ideas, zoom-punch en el remate).
- Transiciones sin cortinilla: el whip-pan y el zoom-punch SON el cambio de escena (cumplen «nunca corte seco»).
- Cierre circular: el corte invisible (`camera.set` + `camera.scene`) devuelve a la imagen de apertura transformada.

## Cuándo NO (contención)
- UI capturada o texto largo como protagonista: con parallax y zoom fuerte se deja de leer; ahí la cámara sólo empuja.
- Más de un whip por cada ~4 s: el smear cansa. Entre dos movimientos fuertes deja al menos 0.4 s casi quietos.
- Giro alrededor de un objeto de verdad (ver sus otras caras): eso es `toon-object/` (three.js), no capas planas.

## Cómo aplicarla
1. Copiar `recipe.html`. Cada capa es `{id, scene, z, w, h, art, ax?, ay?}`: `z = 1` es el plano de foco; >1 más lejos
   (se mueve menos), <1 más cerca (se mueve más y en un dolly fuerte pasa detrás de la cámara y desaparece). `ax/ay` =
   dónde vive la escena en el mundo (la calle está en `x = streetX`).
2. Dibujar el `art` con `obj(piezas, detalles)`: UNA silueta por objeto (todas las piezas en `--bg` con trazo grueso
   redondo detrás, rellenos sin trazo encima, detalles interiores delgados) y sombra dura `feDropShadow` sin blur.
3. Coreografía, como GSAP: `camera.to(target, dur, ease, at, {smear, sfx})` (cada clave interpola desde donde quedó),
   `camera.set(target, at)` (salto/corte), `camera.scene("B", at)` (qué capas se ven).
4. `camera.attach(tl, DUR)` engancha un reloj a la timeline pausada: la cámara se evalúa como función pura del tiempo
   (`camera.at(t)`), así que es seek-safe y el orden de los tweens no importa.
5. Whip-pan que transmuta: tween con `{smear: true}` de `expo.inOut` (~0.33 s) + `camera.scene("B", mitad)` + frenón
   `back.out(3)`. Los múltiplos de cada capa usan la escena de SU cuadro, así en el cuadro del cambio se ven A y B juntas.
6. Corte invisible a un objeto: la escena B a zoom 1 se dibuja también dentro de la pantalla del teléfono con
   `<use href="#B*-art">`; con `zoom = W / ancho_pantalla` centrado en ella, los dos cuadros son idénticos.
7. Render: `npx hyperframes render . -c recipe.html -o out.mp4`.

### En un short, con beat-snap
La palabra decide QUÉ movimiento va (push-in en «agente», whip en el cambio de idea); el beat decide CUÁNDO exacto:
```html
<script src="../_lib/beat-snap.js"></script>
<script>
  const words = BeatSnap.words(TRANSCRIPT), beats = BeatSnap.grid({ bpm: 112, offset: 0.21, subdiv: 2, duration: 40 });
  camera.to({ zoom: 1.3 }, 1.2, "power2.inOut", BeatSnap.wordAt(words, "agente"))
        .to({ x: SX + 110 }, 0.33, "expo.inOut", BeatSnap.wordAt(words, "pero"), { smear: true, sfx: "whoosh" });
  camera.snap({ beats, maxShift: 0.12 });      // corre cada movimiento al beat; back.out alinea su golpe y *.in su final
  BeatSnap.snapTimeline(tl, { beats });        // los demás tweens de la escena (no la cámara: el reloj va en 0)
  camera.attach(tl, DUR);                      // DESPUÉS de snap; window.__sfxCues = camera.cues() para plan.py/mix
</script>
```
Regla práctica: un push-in lento (1–1.5 s) por frase, un movimiento fuerte (whip o punch) por cambio de idea, y el
punch con `power4.in` para que su impacto (el final del tween) caiga en el beat fuerte.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | "fixtergeek" \| "easybits" | fixtergeek | colores de todo el arte |
| fps | number | 30 | cuadros de los múltiplos y velocidad del smear |
| streetX | px | 2600 | dónde vive la escena B; el whip viaja hasta ahí |
| phone | {cx, cy, w, h} | 0 / 40 / 216 / 384 | pantalla 9:16 del teléfono (destino del corte invisible) |
| punch | {x, y, zoom} | 225 / −110 / 2.7 | objeto del zoom-punch en la capa de foco de B |
| outline / detail | px | 24 / 6 | contorno exterior (mitad visible) / líneas interiores |
| shadow | px | 8 | sombra dura a escala 1 (crece con el zoom: es cámara) |
| smear | {minV, stretch, maxStretch, ghosts} | 45 / 700 / 0.45 / [0.5, 0.25] | px/cuadro desde los que hay smear, cuánto se estira la capa, opacidad de los múltiplos |
| labels | bool | true | pastilla con el nombre del movimiento |
| seed | number | 7 | estrellas, edificios y ventanas (mulberry32) |

## SFX sugerido
`window.__sfxCues` sale de los `{sfx}` de cada movimiento (con `back.out(s)` en `1/(s+1)`, con `*.in` al final):
riser suave en el push-in (0.15 s), swish en el paneo (1.5 s), whoosh en el whip (3.15 s), thud en el frenón
(~3.59 s), punch al impacto del zoom-punch (5.35 s), whoosh invertido en el dolly-out (6.3 s).

## Trampas
- La cámara NO son tweens de las capas: el parallax de un zoom no es lineal (`s = z/(z − camZ)`), así que interpolar
  por capa se desfasa. Se tween-ea el estado y cada cuadro se proyecta. Por eso `camera.snap` y no `snapTimeline`.
- `.layer svg { overflow: visible }` también pisa a un `<svg>` anidado: la pantalla del teléfono se desbordaba. Hace
  falta `.layer svg svg { overflow: hidden }`.
- El `font-weight` de una regla CSS no llega a los clones de `<use>`: el texto dentro del teléfono salía delgado y el
  corte invisible se notaba. Peso y familia van como atributos del `<text>`.
- Paths con hueco (marco de ventana) necesitan `fill-rule="evenodd"` en las dos pasadas de la silueta.
- Los múltiplos van debajo de su capa y se calculan con la escena de su propio cuadro; si hay `camera.set` entre medio
  se apagan (si no, un corte invisible dispara un smear falso).
- Una capa con `z` menor que `camZ` está detrás de la cámara: se esconde. Con el dolly-out desde zoom 5 el primer plano
  entra desde fuera del cuadro, que es justo el efecto.
