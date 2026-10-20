# 5 · Estilo de línea para la caricatura plana (20-oct-2026)

Pregunta de bliss, al revisar `on-twos`, `squash-hop`, `smear-dash` y `toon-object` de
`~/ghosty-reel/skills/motion-lab/`: «el toon está pobre: líneas que se enciman, no suficientemente
gruesas ni redondeadas como de pincel; si no hay referencia, prefiero estilos completamente referenciados».

**Veredicto:** el problema no es el grosor, es la **construcción**. Cada pieza (tapa, caja, cinta,
etiqueta) traía su propio `stroke` de 5 a 7 px, todas del mismo grosor y encima del relleno: donde dos
piezas se tocan salen dos líneas pegadas (14 px de tinta) y nada separa la silueta del detalle. Además el
squash escala el `stroke` (con `scaleX 1.28 / scaleY 0.76` los verticales engordan y los horizontales
adelgazan) y la sombra dura de color tinta se funde con el contorno. Se arregla con cuatro reglas de
construcción (sección 3) y se probó sobre `squash-hop` (sección 4).

## 1. Estilos de referencia: quién usa contorno y cuál es su gramática

| Referencia | ¿Contorno? | Gramática medible / documentada | Fuente |
|---|---|---|---|
| **Rubber hose: Fleischer, Felix de Bill Nolan → *Cuphead* (Studio MDHR, 2017)** | Sí, tinta negra gruesa | Entintado a mano cuadro por cuadro, animado «en unos», fondos de acuarela; extremidades como mangueras sin codos ni rodillas → curvas largas, terminales redondas, grueso-delgado del pincel. El entintado a mano da un *boil* leve natural | [ACMI: Cuphead, Inspiration from the Inkwell](https://www.acmi.net.au/works/100277--cuphead-zoetrope-large/), [Inverse: animación de Cuphead](https://www.inverse.com/article/36647-xbox-one-cuphead-animation), [Variety/AOL: Dave Wasson, *The Cuphead Show!*](https://www.aol.com/news/cuphead-show-brings-golden-age-160017228.html) |
| **Open Peeps / Open Doodles (Pablo Stanley)** | Sí, pincel negro de grosor variable | Biblioteca vectorial «hecha a mano», piezas tipo bloque (cuerpo, cara, pelo); trazos con *taper* y relleno plano; CC0, se puede abrir y medir | [openpeeps.com](https://www.openpeeps.com/) |
| ***Hilda* (Luke Pearson; animación de Mercury Filmworks para Netflix)** | Sí, oscuro y suave | Color plano amplio, líneas redondeadas y pocas; fiel al cómic. Ninguna fuente pública documenta grosores: **medir sobre cuadros antes de copiar** | [It's Nice That](https://itsnicethat.com/news/luke-pearson-netflix-hilda-animation-150618), [xsmultimedia](https://xsmultimedia.com/2022/03/21/this-animated-series-is-a-mixture-of-2d-animation-and-modern-minimalist-art-style/) |
| **Notion (Roman Muradov, director de arte)** | Sí, sólo línea de tinta, casi sin color | Pincel y plumilla, blanco y negro; caso de estudio en su clase de Skillshare | [Skillshare: Brand Illustration](https://www.skillshare.com/en/classes/Brand-Illustration-Create-Unforgettable-Stylized-Brand-Imagery/1636459821), [Wildness: The Art of Roman Muradov](https://readwildness.com/40/muradov-feature) |
| ***Ed, Edd n Eddy* (a.k.a. Cartoon)** | Sí, uniforme | *Line boil* **a propósito**: cada cuadro se redibuja un poco distinto y el contorno tiembla | (fuentes de baja calidad; tomarlo como referencia visual, no técnica) |
| ***Gravity Falls* y casi toda la TV** | Sí, delgado y uniforme («línea muerta») | La línea de grosor constante es la norma de la TV animada | [Finding Dee: In DEEfense of Line Weights](https://findingdee.substack.com/p/in-deefense-of-line-weights) |
| **Slack 2017 (Alice Lee)** | **No** (sin contorno negro) | Formas orgánicas imperfectas, línea gestual mínima, paleta primaria; referencias Charley Harper y Mary Blair | [byalicelee.com/slack](https://www.byalicelee.com/slack) |
| **Headspace** | **No** | Personajes de formas redondas; algunas piezas usan degradado suave | [Kimp: marca Headspace](https://www.kimp.io/headspace-brand/) |
| **Kurzgesagt** | **No** | Formas vectoriales planas + degradados y *glow*: **vetado dos veces** por la regla de marca (sin gradiente ni glow) | — |
| **Duolingo** | **No** | Formas geométricas redondeadas con sombra plana | [Duolingo design hub](https://blog.duolingo.com/hub/design/) |

La regla de grosores sale de la enseñanza clásica, no de un estudio: **el personaje lleva el contorno más
pesado frente a su entorno; las líneas interiores son más ligeras; el peso extra va del lado contrario a
la luz; la línea más pesada guía el ojo** ([Proko: How to Draw with Line Weight](https://proko.com/course-lesson/how-to-draw-with-line-weight/notes),
[Proko: Hierarchy of Importance](https://proko.com/course-lesson/demo-hierarchy-of-importance-line-weight/notes),
[Studio Matrx: line and shape](https://www.studiomatrx.org/students/design-drawing/line-and-shape)).

## 2. Cómo se logra en SVG + GSAP renderizado cuadro a cuadro

| Técnica | Sirve | Notas medidas |
|---|---|---|
| **Silueta unida detrás del relleno**: todas las piezas con `stroke = 2 × contorno` en un grupo DETRÁS, luego los rellenos sin `stroke` encima | **Sí, es la base** | Los trazos de las piezas se suman en un solo contorno exterior (unión gratis, sin calcular booleanas); el relleno tapa la mitad interior. Cero líneas encimadas |
| `paint-order: stroke` | Sí, para un objeto de una sola forma | Mismo efecto en un solo elemento; no une varias piezas |
| `stroke-linejoin: round` + `stroke-linecap: round` | Siempre | Esquinas y puntas de pincel |
| `vector-effect="non-scaling-stroke"` | **Sí, obligatorio con squash** | El contorno conserva su grosor en pantalla aunque GSAP escale el grupo |
| Peso del lado de la sombra: una segunda copia de la silueta corrida `(2, 3)` | Sí | Contorno 9 px arriba-izquierda y ~12 px abajo-derecha, sin calcular offsets |
| Interiores recortados con `clip-path` a la silueta | Sí | La línea interior llega al borde y se funde con el contorno (unión «soldada») |
| **perfect-freehand** 1.2.3 (Steve Ruiz, MIT, el motor de tldraw) | **Sí, horneado** | `getStroke(points, {size, thinning, smoothing, streamline:0, simulatePressure:false, last:true, start/end:{taper}})` → polígono → `d`. Se hornea en Node (`bake-brush.mjs`) y se pega el `d`: determinista, sin JS en el render, no hierve. [repo](https://github.com/steveruizok/perfect-freehand) |
| **rough.js** 4.6.6 (MIT) | No para la marca | Por defecto `roughness 1`, `bowing 1` y **dibuja cada línea dos veces** (`disableMultiStroke: false`): es exactamente «líneas que se enciman», y el relleno por defecto es *hachure*. Con `seed`, `disableMultiStroke`, `fillStyle: 'solid'` y `roughness ≤ 0.5` queda limpio pero se lee boceto, no pincel. `factory-cute` lo usa: ahí está el origen del look sucio |
| Contorno por filtro `feMorphology dilate` | No | Probado (`morph-vs-stroke.png`): el núcleo es **cuadrado**, así que achata círculos y deja puntas cuadradas; además rasteriza el filtro en cada cuadro (costo proporcional a área × radio, no medido aquí). El trazo detrás sale redondo y gratis |
| Blur, glow, degradados | Prohibidos | Regla de marca |

**Que no hierva:** con trazos horneados y `non-scaling-stroke` no hay nada que cambie entre cuadros. Para un
*boil* **a propósito**: hornear 3 variantes del mismo trazo con jitter de ±0.6 px (semilla mulberry32) y
alternarlas en el reloj de 12 fps de `on-twos` (una variante cada 2 cuadros a 24, o cada 2.5 a 30). Nunca
recalcular perfect-freehand en vivo con `simulatePressure`: la presión depende de la velocidad y hierve sin
querer.

## 3. Guía práctica

**Grosores** (`h` = alto del objeto protagonista en pantalla; contorno ≈ 6 % de `h`, con tope):

| Línea | 1280×720 (h ≈ 150–250 px) | 1080×1920 (h ≈ 300–500 px) | Proporción |
|---|---|---|---|
| Contorno exterior del protagonista (visible) | 8–10 px (stroke 16–20 detrás) | 12–15 px (stroke 24–30) | 1 |
| Peso extra del lado de la sombra | +2–3 px | +3–4 px | +30 % |
| Interiores (unión de piezas, pliegues) | 4–5 px | 6–7 px | 0.45–0.5 |
| Detalle (texto falso, brillo, arruga) | 3 px con *taper* | 4–5 px | 0.33 |
| Entorno (piso, marco, nubes, tarjetas) | 5–6 px | 8–9 px | 0.6; nunca más grueso que el personaje |
| Sombra dura | 8 px, color `--muted`, no tinta | 12 px (proporcional; confirmar con bliss) | — |

**Reglas de construcción de un objeto o personaje:**
1. **Una sola silueta exterior.** Piezas en `<defs>` → grupo detrás con `stroke 2×` + `linejoin round` →
   rellenos sin `stroke` encima. Nunca un `stroke` por pieza.
2. **Interiores más delgados y soldados:** de pincel (perfect-freehand horneado) y recortados a la silueta.
   Si dos piezas se tocan, una sola línea interior marca la unión.
3. **Sub-objetos** (etiqueta, ojo, botón) llevan su propio contorno a peso **interior**, no exterior.
4. **Radios generosos:** `rx` ≥ 8 % del lado; la silueta debe tener una forma que se lea en negro sólido
   (la tapa que sobresale de la caja es lo que la hace caja).
5. **Squash = `non-scaling-stroke`** en todos los contornos; los trazos de pincel son rellenos y se
   deforman poco (aceptable).
6. **La sombra dura no es tinta**: en tinta se funde con el contorno y se lee como un contorno de 20 px.
7. Peso extra abajo-derecha (luz arriba-izquierda) con la copia corrida de la silueta.

**Estilo de la casa: tres referencias**
1. **Rubber hose / *Cuphead*** para la **calidad de la línea**: tinta negra gruesa, terminales redondas,
   grueso-delgado. Es el contorno de pincel más reconocible y documentado; encaja con «contorno grueso».
2. **Open Peeps (Pablo Stanley, CC0)** para el **pincel interior**: trazos de grosor variable con *taper*
   sobre relleno plano, abiertos para medirlos y copiarlos sin problema de licencia.
3. ***Hilda*** para el **color y la limpieza**: color plano amplio, pocas líneas, todas redondeadas, sin
   textura. Es la prueba de que contorno oscuro + plano no tiene que verse retro.

Por qué no las demás: Slack, Headspace, Duolingo y Kurzgesagt no usan contorno (Kurzgesagt además usa
glow y degradado); Notion es sólo línea; la línea uniforme de *Gravity Falls* es justo lo que bliss
llamó pobre; *Ed, Edd n Eddy* sólo como referencia del *boil* intencional.

## 4. Prueba: un cuadro de `squash-hop`

Copia en el scratchpad (el repo no se tocó):
`/private/tmp/claude-501/-Users-bliss-ghosty-studio/9471ce6c-87c0-48d9-a499-1a3a880dea9c/scratchpad/linea/`
— `despues.html` (receta rehecha), `bake-brush.mjs` (hornea los trazos con perfect-freehand),
`antes-despues.png` (reposo a 0.2 s y squash a 1.06 s, recorte ×3) y `morph-vs-stroke.png`.

Cambios: silueta unida de tapa + caja (la tapa sobresale 10 px), contorno de 9 px con peso abajo-derecha,
cinta, unión de tapa y flecha como pincel horneado de 4.5–5.5 px recortados a la silueta, etiqueta con
contorno interior de 4.5 px, `non-scaling-stroke`, sombra dura y sombra del piso en `--muted`, piso a 5 px.
Resultado: ya no hay líneas dobles en la unión de tapa y cinta, el contorno es el mismo en reposo y en
squash (antes los verticales engordaban), y la sombra se lee como sombra y no como contorno. Para
llevarlo a la receta: actualizar `squash-hop`, `on-twos` y `smear-dash` con las reglas 1–7 y anotar la
tabla de grosores en el `MOLDE.md` de motion-lab.
