---
name: echo-smear
description: |
  Estela automática que escala con la velocidad: copias del objeto desfasadas en el tiempo que sólo aparecen
  cuando se mueve rápido (el Echo de After Effects con operador Maximum). Se pega a cualquier tween ya armado
  con una línea; es el default para entradas y salidas rápidas de objetos o tarjetas.
triggers:
  - "que el objeto deje estela cuando se mueve rápido"
  - "smear automático en la entrada de la tarjeta"
  - "motion blur sin blur"
  - "que el giro rápido se vea con estela"
origin: componente `echo-smear` del registro HyperFrames 0.8.212 (fixter2025/videos/hyperframes-0812/registry-smear-screen/echo-smear), 28 oct 2026
---

# echo-smear

Un sobre menta cruza al buzón (anticipación, cruce con estela, frenón con `back.out`), flota lento y nítido, gira,
sale disparado arriba, regresa desde abajo y cierra con zigzag. 1080×1920, 8 s.

## Cuándo usarla
- Entradas, salidas y cruces rápidos de cualquier objeto, tarjeta o texto: cero trabajo por cuadro.
- Giros rápidos en su lugar (la estela suaviza los bordes con `edgeSpacing`).
- Como sustituto de motion blur en piezas de caricatura plana: no usa blur ni glow ni gradiente.

## Cuándo NO (contención)
- Plano heroico donde importa la animación a mano (estirado del objeto, múltiplos separados, anticipación
  exagerada): usar `smear-dash`.
- Cambios de contenido (un contador, un morph): la copia es la pose pasada, no un re-render; no se embarran.
- Elementos dentro de un `<svg>`: se adjunta al `<svg>` completo, no a sus hijos (los salta con un aviso).
- Piezas largas con muchos objetos: obliga a la captura por screenshot (render más lento) y cada copia es DOM.

## Cómo aplicarla
1. Copiar `recipe.html`. El componente va pegado completo en el primer `<script>` (no editar).
2. Armar toda la timeline primero; **después** de todos los tweens y antes de registrar:
   `attachEchoSmear(PARAMS.target, tl, {...})`, luego `window.__timelines["main"] = tl`.
3. Para instalarlo en otro proyecto: `npx -y hyperframes@0.8.212 add echo-smear` y pegar el snippet de
   `compositions/components/echo-smear.html` en la composición.
4. Render: `npx -y hyperframes@0.8.212 render . -o echo-smear.mp4`.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| `target` | selector / Element / array | `"#env"` | lo que se embarra |
| `length` | % | 100 | cuánto del recorrido del último cuadro cubre la estela |
| `threshold` | px/cuadro | 40 | velocidad mínima para que aparezca |
| `maxEchoes` | int | 60 (demo 40) | tope de copias por cuadro; también el costo en DOM |
| `countMult` | número | 1 | multiplica las copias; subirlo si se ven escalones |
| `edgeSpacing` | px | 1.5 | separación máxima del borde entre copias en giros; 0 = conteo exacto de AE |
| `measurePoint` | `[x, y]` | centro | punto cuyo recorrido se mide (texto: `[0, 0.85]`) |
| `subframes` | int | 8 | muestras por cuadro al grabar la trayectoria |
| `operator` | `"maximum"` / `"normal"` | `"maximum"` | `maximum` = `mix-blend-mode: lighten` en grupo aislado |
| `callbacks` | bool | false | `true` sólo si un `onUpdate` escribe el transform |

## SFX sugerido
Whoosh corto cuando aparece la estela (el cruce de 0.65 s y la salida de 4.3 s), pop en el frenón con `back.out(3)`
(golpe en 1/4 del tween), clic metálico en la bandera del buzón (0.95 s), swish doble en el zigzag.

## Trampas
- Determinista: graba la trayectoria una vez al adjuntar y cada cuadro es función del tiempo. Render con 1 y 4
  workers: PSNR mín. 59.6 dB.
- Con `maximum` los contornos oscuros de las copias se pierden bajo el relleno claro: se lee como mancha sólida y
  plana, no como múltiplos. Si se quieren múltiplos, `smear-dash`.
- La anticipación y el frenón no los pone el componente: van en los tweens.
- Movimiento heredado de un ancestro no cuenta como del objeto: adjuntar al ancestro que se mueve.
