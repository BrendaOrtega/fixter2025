# TODO: ¿a dónde debe llevar la card de `/cursos`?

Anotado el **2026-08-13**, al publicar el primer webinar dentro del curso
`sistemas-agenticos`.

## La pregunta

Hoy la card de "Diseño de sistemas agénticos" lleva a la **landing de venta**
(`/sistemas-agenticos`), porque el curso trae `landingUrl` y `CourseCard` lo respeta. Desde
esta noche el curso ya tiene contenido gratis adentro —el webinar 0, desbloqueable con
correo—, así que hay que decidir si la card debe caer en el **viewer** en vez de la landing.

Las tres opciones, con lo que cuesta cada una:

| Opción | Cómo | Qué se gana / se pierde |
|---|---|---|
| Dejarla en la landing | nada | Conserva el embudo de venta del taller de septiembre. Quien llega no ve que ya hay algo gratis hasta que baja al bloque del webinar |
| Mandarla al viewer | `landingUrl = "/cursos/sistemas-agenticos/viewer"` — un campo, cero código | Entra directo al valor. La landing de venta se queda sin entrada desde el catálogo |
| Las dos | landingUrl al viewer + CTA de venta **dentro** del viewer | Lo mejor de ambas, pero hay que meter el bloque de venta al viewer |

**No decidir es decidir**: hoy está en la primera por omisión, no por elección.

⚠️ **Y esto no es solo de este curso.** La misma pregunta aplica a cualquier curso de paga
que tenga una lección gratis: el catálogo no distingue "tiene contenido abierto" de "es puro
escaparate".

## Dos cosas feas de la card, de paso

- Dice **"1 lecciones"** — falta el singular.
- Dice **"1 lecciones | 8 horas"**: las 8 horas son del *taller* (`Course.duration`), pero la
  única lección que existe dura 1h15. Juntos en la misma línea se leen como una contradicción.
  Hay que decidir si `duration` describe el curso vendido o el material publicado.
