# Short pendiente, sacado del webinar 0

Anotado el **2026-08-13**. Material fuente: la grabación completa
(`docs/webinar-sistemas-agenticos/GRABACION.md`) y su transcripción, ya hecha con whisper.

⚠️ **La transcripción hay que rehacerla por trozos de 10 min.** De una sola pasada whisper se
atora en un bucle de silencio y declara mudo todo el video después del minuto 6 — el audio
está en -21 dB de punta a punta, verificado con `volumedetect`.

## Los cuatro momentos que aguantan un short (por fuerza, no por orden)

1. **El pin de WhatsApp que salió en otra ciudad.** Un cliente pidió la dirección del negocio.
   El agente usó la herramienta correcta, con los datos correctos… y el pin apareció en otro
   lado. La tool exigía latitud y longitud que no estaban en ningún lado, así que el modelo
   **las inventó**. Es el mejor: falla concreta, visual, y termina en una lección
   (la calidad de la herramienta es lo que evita el error, no el prompt).
2. **500 millones de tokens facturados como 20.** Dos meses de uso real de una empresa, y el
   ahorro vino de la caché, no del modelo. Número duro y verificable.
3. **«¿Cómo bloqueas eso por prompt?»** Alguien en el room general pide *borra todos los PRs*.
   La respuesta es que por prompt no se bloquea: se bloquea por token de ejecución, que sabe
   quién invocó y desde dónde. Los guardrails son código, no instrucciones.
4. **El file system que es mentira.** El agente cree que escribe archivos; en realidad son
   filas de una base de datos. Por eso la caja puede morir y él sigue encontrando sus cosas.

## Formato

HyperFrames (`/hyperframes`), vertical. Del video hay frames aprovechables — los demos en
vivo de Ghosty Teams y de Deník ya están grabados a 1080p.

Cierre obligado: el taller del 1 de septiembre y el siguiente webinar (jueves, sobre cajas y
Firecracker).
