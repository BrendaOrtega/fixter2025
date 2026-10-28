---
name: squash-hop
description: |
  Objeto que salta con anticipación, squash & stretch (volumen ~constante) y overshoot al asentarse; su sombra
  elíptica en el piso se encoge al subir y crece al caer, y su sombra dura `8px` se aleja con la altura.
  Exporta los instantes de SFX (`window.__sfxCues`).
triggers:
  - "que la caja salte con rebote"
  - "squash and stretch"
  - "objeto que brinca con sombra en el piso"
  - "salto con anticipación y aterrizaje"
origin: técnicas 2, 3 y 4 de fixter2025/docs/motion-investigacion-oct20/3-tecnicas-de-los-mejores.md, 20 oct 2026
---

# squash-hop

Un paquete brinca tres veces de marca en marca: se agacha, se estira al despegar, cae acelerando, se aplasta
un cuadro al tocar el piso y se asienta con `back.out`.

## Cuándo usarla
- Entradas de objetos concretos (paquete, taza, teléfono, Ghosty) que deben «pesar».
- Contar pasos/etapas: un salto por etapa, con `stops` en las marcas.

## Cuándo NO (contención)
- Texto o logos de marca: el squash deforma la letra (y el logo de Ghosty/FixterGeek no se altera).
- Más de 3–4 saltos seguidos cansa; para listas usar `stacked-boxes` o `tilt-list`.

## Cómo aplicarla
1. Copiar `recipe.html`, cambiar el SVG de `#body` (dibujado con la base en `y = 0`, centrado en `x = 0`).
2. Editar `stops`, `height` y tiempos en `PARAMS`; `data-duration` ≥ `start + saltos·(anticip+rise+fall+settle+gap)`.
3. Leer `window.__sfxCues` (o la tabla de abajo) para montar los SFX.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | "fixtergeek" \| "easybits" | fixtergeek | variables de color |
| groundY | px | 540 | línea de contacto |
| stops | px[] | 300, 527, 753, 980 | x de cada aterrizaje (n−1 saltos) |
| height | px | 230 | altura del salto |
| start / gap | s | 0.35 / 0.08 | primer salto / pausa entre saltos |
| anticip / rise / fall / settle | s | 0.14 / 0.32 / 0.24 / 0.4 | fases del salto |
| settleEase | number | 2.5 | `s` de `back.out(s)` al asentarse |
| squash | {land, anticip, launch, fall} | [1.28,.76] [1.22,.8] [.84,1.2] [.88,1.14] | [scaleX, scaleY] de cada fase |
| floorShMin | number | 0.45 | escala de la sombra del piso en lo más alto |
| shOffset | {rest, air, squash} | 8 / 18 / 3 | desfase de la sombra dura del objeto |
| label | bool | true | pastilla con la regla del golpe |

## SFX sugerido (instantes del preview, en `window.__sfxCues`)
- `whoosh` al despegar: `t0 + anticip` → 0.49, 1.67, 2.85 s.
- `thud` en el **contacto**: fin de la caída `power3.in` (`t0 + anticip + rise + fall`) → **1.05, 2.23, 3.41 s**.
  Es el cuadro del squash fuerte; no va al final del `back.out`.
- `boing` en el rebote: el `back.out(s)` cruza el valor final en `1/(s+1)` del tween → `contacto + settle/(s+1)`
  = +0.114 s → 1.164, 2.344, 3.524 s. Con `back.out(s)` el golpe va en `1/(s+1)`, no al final.
- Alternar dos `thud` distintos; nunca el mismo dos veces seguidas.

## Trampas
- La sombra del piso se pegaba a la línea del suelo y se veía como raya: el piso arranca 44 px arriba del
  contacto (se ve un poco desde arriba) para que la elipse caiga entera sobre él.
- El squash va con `svgOrigin: "0 0"` en la base del dibujo; con el pivote al centro el objeto se hunde en el piso.
- La x avanza lineal durante subida + caída (`ease: "none"`) y la y lleva `sine.out` / `power3.in`: así sale el arco.
  Con la misma ease en x y y el salto parece en diagonal.
- La sombra dura es `<use href="#body">` con `--sh`: hereda el squash; su desfase se anima aparte.

## Línea (guía `fixter2025/docs/motion-investigacion-oct20/5-estilo-de-linea.md`)
- Silueta UNIDA (`#silShape`: tapa + caja) trazada a 18 px DETRÁS del relleno → contorno de 9 px sin líneas dobles;
  copia corrida `(2, 3)` = peso extra abajo-derecha.
- Cinta, unión tapa/caja y flecha: pincel horneado con perfect-freehand (`linea/bake-brush.mjs`) y recortado a la
  silueta (`#silClip`); etiqueta = sub-objeto con contorno interior de 4.5 px.
- `vector-effect="non-scaling-stroke"` en todo contorno: el squash no engorda los verticales.
- Sombra dura y sombra del piso en `--muted`, nunca en tinta (en tinta se lee como un contorno de 20 px).
