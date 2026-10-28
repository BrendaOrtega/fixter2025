---
name: on-twos
description: |
  Personaje u objeto que cambia de pose «a dos» (12 fps, poses escalonadas) mientras la cámara y el
  fondo se mueven fluidos a la fps del render (30/60). El look de animación a mano / stop-motion.
triggers:
  - "que el personaje se mueva a 12 fps y la cámara fluida"
  - "look de animación a mano / stop motion"
  - "animar a dos (on twos)"
  - "robot caminando con el fondo pasando"
origin: técnica 5 de fixter2025/docs/motion-investigacion-oct20/3-tecnicas-de-los-mejores.md, 20 oct 2026
---

# on-twos

Un robot de perfil camina hacia la derecha (el mundo se va a la izquierda) y saluda sin dejar de caminar;
sus poses saltan cada 1/12 s mientras nubes y cerros pasan con parallax continuo y la cámara hace un dolly
suave. El pie apoyado se queda pegado al piso: el ciclo de paso sale de la velocidad del piso.

## Cuándo usarla
- Personajes (Ghosty, robots, mascotas) que deben sentirse dibujados, no interpolados por computadora.
- Escenas donde conviven personaje + cámara: el contraste de cadencias es el efecto.

## Cuándo NO (contención)
- UI, texto o charts: a 12 fps se ven trabados, no artesanales. Ésos van continuos.
- Si todo va a 12 fps (cámara incluida) se pierde el truco y parece un video con cuadros caídos.

## Cómo aplicarla
1. Copiar `recipe.html`, cambiar el SVG del personaje y editar `PARAMS`.
2. Todo lo del personaje va en la timeline `ch` (eases normales); la cámara y el fondo van en `tl`.
3. El truco: un tween de reloj en `tl` hace `ch.seek(floor(t·charFps)/charFps)` en su `onUpdate`. Todas las
   partes del personaje cambian de pose en el MISMO cuadro (con `steps(n)` por tween se desfasan).
4. Caminata: piernas por IK de dos huesos (rodilla hacia adelante) en `drawPose(t)`. El pie apoyado retrocede
   lineal a `v = pan.near / DUR` px/s, igual que el piso; `stepPeriod = round(stride / (v·duty) · charFps) / charFps`
   (cuadros enteros, las poses se repiten idénticas) y el recorrido real es `S = v·duty·stepPeriod`. Bob por medio
   ciclo: contacto → bajada (abajo) → paso → subida (arriba); brazos en contrafase (el cercano va con la pierna lejana).
5. Línea (guía `fixter2025/docs/motion-investigacion-oct20/5-estilo-de-linea.md`): cada grupo de piezas que se tocan
   se pinta con dos `<use class="ol">` detrás (silueta en `--bg` con trazo de 18 px, 34 px en piernas; una corrida
   (2.5, 3) = peso abajo-derecha) y encima los rellenos sin trazo: UNA silueta exterior redondeada, sin dobles líneas.
   Interiores (`.dt`/`.dl`) a 4 px; entorno a 6 px; sombra dura en `--muted`, separada del contorno.
   Piernas: apoyada = IK (casi estirada); en el aire = ángulos interpolados de despegue a contacto + doblez de
   rodilla. Muslo ≤ ~35° de la vertical con los defaults (lo fija `stride`).
6. Render: `npx hyperframes render . -c recipe.html -o out.mp4` (`-f 60` para cámara a 60).

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | "fixtergeek" \| "easybits" | fixtergeek | variables `--bg --ink --accent --accent2 --muted` |
| charFps | number | 12 | cadencia del personaje (15 = dos exactos a 30 fps) |
| camFps | number | 30 | sólo el texto de la pastilla |
| label | bool | true | pastilla «personaje 12 fps · cámara 30 fps» |
| pan | {far, mid, near} px | 160 / 320 / 900 | recorrido de cada capa (parallax); `near` = piso y fija la velocidad del pie |
| stride | px | 124 | recorrido objetivo del pie apoyado (se ajusta a la rejilla; con los defaults → ciclo 1.0 s = 12 poses, S ≈ 124) |
| duty | 0–1 | 0.55 | fracción del ciclo con el pie en el piso (>0.5 = doble apoyo: caminata) |
| bob | px | 4 | bajada extra tras el contacto (el sube-y-baja grande sale solo: la cadera nunca queda más lejos del pie apoyado que la pierna casi estirada) |
| kneeFlex | ° | 50 | doblez de rodilla en el aire (el pie sube solo; espinilla nunca horizontal) |
| armSwing | ° | 16 | vaivén de brazos |
| groundOnTwos | bool | true | piso y postes a charFps junto al personaje (sin esto el pie patina hasta v/charFps px entre poses) |
| camZoom | number | 1.06 | dolly de la cámara (`sine.inOut`) |
| wave | {at, times, upper, fore, swing, turn} | 2.4 / 3 / −142 / −162 / 20 / −8 | saludo con el brazo LEJANO (detrás del torso): sube por detrás del hombro y la manopla asoma sobre la cabeza junto a la antena, ±swing° alrededor del codo, N vaivenes; el cercano sigue caminando; turn = visor a 3/4 |
| ARM (constante) | px | 64 / 64 | largo de brazo y antebrazo, fijo en todos los cuadros (sin estirar) |
| blinkAt | s | 1.5 | parpadeo |

## SFX sugerido
- Pasos: `tap` suave en cada contacto de pie (cada `stepPeriod/2`, contacto en `t = k·stepPeriod/2`, alternando dos samples), alineado al
  cuadro de 12 fps (`floor(t·12)/12`), no al tiempo continuo.
- Ojos «^»: `blip` corto en `wave.at + 0.08`.
- Saludo: `pop` en `wave.at + 0.25/(2+1)` ≈ +0.08 s (el brazo sube con `back.out(2)`).

## Trampas
- A 30 fps, 12 fps sostiene 3-2-3-2 cuadros (medido sobre el mp4: cambia en los cuadros 2, 4, 7, 9, 12…). Si se
  nota el vaivén, usar `charFps: 15`.
- `ch.seek(0)` sobre una timeline que ya está en 0 no pinta: el cuadro 0 salía con las piernas rectas. Se fuerza
  con `ch.seek(0.001).seek(0)`.
- El zoom de la cámara también escala al personaje: es correcto (es cámara), pero al medir la cadencia recorta
  una zona que no cruce el zoom o compara antes de que arranque.
- La sombra dura es un `<use>` del personaje con `--sh: var(--bg)`: cada forma pinta `fill:var(--sh, color)`,
  así el clon hereda las poses sin duplicar tweens.
- «Camina al revés» (20 oct): la v1 tenía el robot de frente con piernas en péndulo simétrico; el pie apoyado
  no acompañaba al piso y se leía como moonwalk. El personaje mira hacia donde avanza (el mundo va al lado contrario)
  y el pie apoyado se mueve a la velocidad del piso, si no, patina.
- Con el piso fluido a 30 fps y el personaje a 12 el pie patina hasta `v/charFps` px (≈19 px) dentro de cada pose:
  por eso la capa de contacto (piso, postes) va en la misma rejilla y lo fluido son cámara, nubes y cerros.
- v7 (20 oct): la v6 estiró el mismo brazo (telescópico) y bliss la rechazó: «saluda con la OTRA mano». Saluda el
  brazo lejano, por detrás; largos fijos 64/64 (con 42/46 la mano no alcanza a pasar la cabeza). Chequeo automático
  (`scratchpad/on-twos-v7/check.mjs`): largos ±1 px en 120 cuadros, brazo cercano sin tocar visor ni pantalla del
  pecho, manopla del saludo sin tocar el visor y 15–29 px sobre la cabeza.
- v6 (rechazada): el brazo salía del hombro de atrás y cruzaba el torso hasta la
  barbilla (abrazo/rascarse). El saludo nace del hombro delantero, sube por FUERA del contorno y la manopla queda sobre
  la cabeza; el brazo es procedural (`.ar`, grosor `calc(26px + --ow)` para que la silueta crezca con el estiramiento).
  Chequeo automático por cuadro (puppeteer): brazo + contorno contra el bbox del torso y del visor, 0 cruces en el
  saludo; con `fore` 170 y hombro en 54 la manopla tocaba el visor al menearse hacia atrás.
- v4 (20 oct): con cadera fija la rodilla trasera se doblaba hasta quedar horizontal (se leía hincado). La altura de
  cadera sale del compás de la pierna apoyada (`hipAt`) y el pie en el aire se mueve por ángulos, no por IK.
- El brazo cercano cruzaba la pantalla del pecho: hombro atrás (x −18) al caminar y pantalla al frente del torso;
  al saludar el hombro se adelanta.
- Cara blanca con ojito, boca y «nariz» de color se leía como payaso (bliss, 20 oct): la cabeza es un casco de
  color sólido con pantalla-visor `--bg` y dos LED redondeados en `--accent` que parpadean a dos y se vuelven «^»
  al saludar (`#eyesOpen`/`#eyesHappy`). Sin mejillas, nariz ni círculos en la nuca (se leen como segundo ojo).
- La pasada de contorno es un `<use>` del grupo con variables CSS (`--fc --oc --ow --lc --lw`): hereda las poses
  sin duplicar tweens, igual que la sombra con `--sh`.
