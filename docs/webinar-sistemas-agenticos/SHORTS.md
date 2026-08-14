# Shorts del webinar 1 — material cortado y guion

Anotado el **2026-08-14**. Fuente: la grabación ya publicada (`anatomia-de-un-sistema-agentico`,
75:20), sacada del HLS de Tigris — el mp4 original ya no está en `~/Downloads`, así que los cortes
se hicieron bajando solo los segmentos `.ts` que caen dentro de cada rango.

## El problema con la imagen

La grabación es la sala de Ghosty Teams capturando **la pantalla completa de bliss, que a su vez
muestra la sala**. Pantalla dentro de pantalla: la columna de avatares se come el tercio izquierdo,
las slides quedan en un recuadro de ~770 px con la barra del navegador encima, y la cámara es una
casilla de ~190 px. Recortar y escalar a vertical da una imagen borrosa con chrome de Chrome.

**Lo que sirve es el audio.** La voz está limpia y las cuatro historias se sostienen solas. Los
shorts se arman con audio real + visuales nuestros (SVG plano, Ghosty, subtítulos), que además es
el estilo de la casa. El video se guarda de referencia, para ubicar de qué se habla en cada momento.

⚠️ **Los subtítulos hay que escribirlos a mano.** Whisper oye "la gente" donde bliss dice "el
agente", y "actitud" donde dice "latitud". Quemar el transcript tal cual sería publicar el error.

## Dónde está el material

`~/Downloads/shorts-webinar-1/` — cuatro mp4 de referencia y, en `audio/`, los mismos cortes
normalizados a -16 LUFS (el estándar de plataformas), listos para montar.

| # | Clip | En la grabación | Dura |
|---|---|---|---|
| 1 | `1-pin-whatsapp` | 65:36 – 66:42 | 66 s |
| 2 | `2-500-millones` | 29:57 – 30:21 | 24 s |
| 3 | `3-guardrails-token` | 51:24 – 51:51 | 27 s |
| 4 | `4-file-system-falso` | 45:38 – 46:29 | 51 s |

## Intro y outro (las mismas cuatro veces)

**Intro — 3 s.** Ghosty aparece; sobre él, en dos líneas:
> *Del webinar del 13 de agosto* · **Anatomía de un sistema agéntico**

Sin voz. Cae directo al clip para no gastar los primeros segundos, que son los que deciden si
alguien se queda.

**Outro — 5 s.** Card final, logo de FixterGeek:
> **Jueves 20 de agosto, 7 pm** — Cajas: dónde corre tu agente
> *fixtergeek.com/sistemas-agenticos*

El taller del 1 de septiembre no va en el outro de todos: solo en el 1 y el 4, que son los que
cierran en una lección y aguantan el salto. En los otros dos, el CTA es el webinar del jueves.

## Los cuatro guiones

### 1. El pin que salió en otra ciudad — 66 s + intro/outro

El más fuerte: falla concreta, visual, con causa y lección. Es el que se publica primero.

- **Gancho (0-6 s)** — sobre el audio, texto grande: *«El agente usó la herramienta correcta. Y el
  pin salió en otra ciudad.»*
- **La escena (6-25 s)** — mapa plano, un pin cayendo lejos del negocio. Los datos correctos
  (dirección, colonia, código postal) van apareciendo en verde; latitud y longitud, en rojo.
- **La causa (25-50 s)** — la tool pedía latitud y longitud; en el prompt solo había una dirección
  y un link de Google Maps. El modelo las inventó. Aquí el visual es la firma de la función con los
  dos campos vacíos parpadeando.
- **La lección (50-66 s)** — se arregla en la herramienta, no en el prompt: se le deja pasar el
  link de Maps. Cierre con el taller del 1 de septiembre.

### 2. 500 millones de tokens facturados como 20 — 24 s

El de número duro, el más fácil de compartir.

- Contador subiendo a 500 M, y al lado el recibo con 20 M.
- El 95% no vino del modelo: vino de la caché, que no se cobra.
- Dos meses de uso real de una empresa.
- Outro: webinar del jueves.

### 3. «¿Cómo bloqueas eso por prompt?» — 27 s

El de la pregunta del público. Es un intercambio, así que funciona como diálogo en pantalla.

- Alguien del room general escribe: *Ghosty, borra todos los PRs*.
- La pregunta, en grande: *¿cómo bloqueas eso por prompt?*
- La respuesta: no por prompt — por token. La tool se ejecuta con un token que sabe quién la
  invocó y desde qué room. Un mini IAM.
- Outro: webinar del jueves.

### 4. El file system que es mentira — 51 s

El del hack, el que más gusta a quien ya construye agentes.

- El agente escribe `/tmp/notas.md`. En pantalla, el archivo se convierte en una fila de una tabla.
- Por qué: es lo que los modelos mejor saben usar, porque es en lo que más se entrenaron.
- El pago: la caja puede morir. Cuando enciende otra, el agente pide sus archivos y ahí están.
- Cierre con el taller del 1 de septiembre.

## Los otros catorce momentos

Barrido completo del transcript (11,920 palabras). Los cuatro de arriba eran los anotados el 13 de
agosto; estos salieron al leerlo entero. Ninguno está cortado todavía — se cortan igual, con
`scripts/tmp-extract-clips.ts` cambiando los rangos.

**Aguantan solos, sin contexto:**

| # | Momento | Marca | Por qué |
|---|---|---|---|
| 5 | Las 500,000 líneas de Claude Code | 31:30 – 32:35 | Número que se comparte solo, y aterriza la tesis: lo bueno no es el modelo |
| 6 | El hook es un `if`, el prompt es una sugerencia | 38:10 – 39:10 | «La regla en el prompt la va a ignorar si quiere.» El guardrail más claro del webinar |
| 7 | Hasta 2028 va a faltar quien entienda el panorama completo | 57:00 – 57:50 | El de carrera: el que más gente va a mandar a un amigo |
| 8 | Un fine tuning de verdad cuesta medio millón de pesos | 34:40 – 35:40 | Dato duro que desinfla el hype del fine tuning de juguete |
| 9 | Firecracker es lo que usa AWS Lambda, tal cual del repo | 72:20 – 73:10 | El teaser natural del webinar del jueves |

**Necesitan la demo en pantalla (van con visual reconstruido):**

| # | Momento | Marca | Por qué |
|---|---|---|---|
| 10 | Agent native: cambiar un servicio hablando, no con cinco clics | 23:00 – 25:30 | El más vendedor. Shopify Sidekick como antecedente le da peso |
| 11 | La voz sale de otra caja que se prende, canta y se apaga | 17:00 – 18:00 | Explica el sistema agéntico completo en un minuto |
| 12 | La empresa que quemaba sus tokens en un día | 43:00 – 43:50 | El archivo gigante se vacía a SQLite y el agente hace queries. «Eso nos vendió la empresa» |
| 13 | Chunks, la estrategia universal | 69:40 – 71:00 | Un subagente barato resume, el caro lee el resumen. Puro oficio |

**Opinión — más riesgosos, más alcance:**

| # | Momento | Marca | Por qué |
|---|---|---|---|
| 14 | Deploy de subminuto: probar en producción, sin staging | 6:00 – 7:20 | Contraintuitivo a propósito. Va a generar discusión, que es lo que quieres |
| 15 | «Pon atención a Linux» | 10:10 – 11:00 | Consejo a un estudiante. Por qué el aislamiento es la habilidad que empuja |
| 16 | El cuello de botella ya no es el modelo | 55:20 – 56:05 | La tesis en una línea. Sirve de cierre de serie |
| 17 | Ya no importa el framework, importa el patrón | 12:50 – 14:10 | Cuatro agentes, cuatro SDKs distintos, en el mismo sistema |
| 18 | Los SVG animados ya dejaron de ser caros | 62:10 – 62:50 | Ligero, meta, buen respiro entre shorts técnicos |

**Encontrado después, y va de siguiente:**

| # | Momento | Marca | Por qué |
|---|---|---|---|
| 19 | «Levantar agentes a placer, como palomitas» | 11:35 – 12:14 | Sale de que el sandboxing es donde se ejecuta el agente y termina en las 100 cajas. Es el puente literal al webinar del jueves — el outro deja de ser un anuncio pegado y pasa a ser la continuación de la frase |

Si hay que elegir cinco para las próximas dos semanas: **1, 2, 6, 7 y 9.** Cubren falla real,
número duro, guardrail, carrera y el gancho al webinar del jueves — uno de cada registro, sin
repetirse el tono.

## Cómo se arman (ya montado)

Todo vive en `~/Downloads/shorts-webinar-1/`.

- `videos/short-fs-intro`, `short-fs-outro`, `short-fs-patron` — tres proyectos de
  HyperFrames. La intro (4 s) y el outro (6 s) son los mismos para todos los shorts, y el patrón
  es un bucle de 8 s que cierra sin salto: la malla recorre exactamente un tile.
- `build-short.py <clip>` — arma el vertical: recorta la cámara y la pantalla, los monta sobre el
  patrón, quema los subtítulos y pega intro y outro. Un clip nuevo son cuatro líneas en `CLIPS`.
- `scripts/extract-webinar-clips.ts` (en el repo) — corta cualquier rango bajando solo los
  segmentos HLS que caen dentro.

Tres reglas aprendidas a golpes:

1. **El fotograma 0 nunca va vacío.** Las tarjetas abren completas y lo que se anima es
   movimiento sobre lo que ya está. Ese cuadro es además la miniatura.
2. **Los subtítulos son literales.** Parafrasear distrae: el ojo lee una cosa y el oído escucha
   otra. Solo se corrigen los errores de oído de whisper.
3. **El copy dice qué es y qué hacer.** «Cajas: dónde corre tu agente» no es un CTA;
   «El siguiente webinar, en vivo y gratis. Regístrate en…» sí.

## Por dónde seguir

Montarlos con HyperFrames (`/talking-head-recut` no aplica —no hay talking head aprovechable—;
va por `/general-video`, con el audio como pista y los visuales dibujados). Ghosty como personaje,
caricatura plana sin gradientes, y el logo de FixterGeek sin repintar en el outro.

Empezar por el 2, que es el más corto: sirve de prueba del formato antes de invertir en el 1.
