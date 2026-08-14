# TODO: el proxy HLS reenvía bytes en vez de redirigir a Tigris

Anotado el **2026-08-13**. Pendiente para el **2026-08-14**: *auditar primero, cambiar
después* — el cambio no se hace hasta ver la ganancia medida.

## Qué pasa hoy

`app/routes/api/hls-proxy.tsx`, rama de los `.ts`: firma el segmento, hace `fetch` y
**reenvía los bytes** por la máquina de Fly. O sea que cada byte de video que ve un alumno
sale de Fly, no de Tigris.

**Por qué se hizo así** — está en el código (~línea 135):
*"Route segments through proxy too (Safari has issues with long presigned URLs)"*.
El bucket es privado, hay que firmar, y una playlist de 450 segmentos con firmas de ~700
caracteres son ~300 KB de puras firmas.

## El cambio

Esa misma ruta ya trata los `.mp4` con **302 al presigned** (~línea 53). Aplicarlo a la rama
de los `.ts`: la línea de la playlist sigue corta (`/api/hls-proxy?path=…`) y el redirect lo
resuelve el navegador, así que el problema de Safari no regresa. Son ~10 líneas, 5 minutos.

**La ganancia esperada:** Tigris no cobra egress, Fly sí (~$0.02/GB). El tráfico de video se
va casi a cero y quedan los requests (centavos). Además la app deja de ser el cuello: hoy 30
personas viendo a la vez son 30 streams cruzando un proceso Node con `auto_stop_machines`.

**No debilita el permiso:** la firma se genera al pedir cada segmento, no vive en la playlist,
y por eso tampoco caduca a media reproducción. El costo real es un round-trip extra por
segmento.

## ⚠️ Lo que hay que verificar ANTES (es lo que tarda, ~1 hora)

1. **Medir el egress real** de la máquina de Fly por video. Sin ese dato el cambio se
   justifica solo con aritmética.
2. **Safari en iPhone** — exactamente donde se rompió el diseño anterior. Reproducir, saltar
   hacia adelante, confirmar que no se corta.
3. **Barrer los videos viejos**: los cursos que ya existen usan el mismo proxy, incluidos los
   de formato legacy. Ninguno debe depender del reenvío de bytes.

Commit propio: afecta a **todos** los videos del sitio, no solo al webinar.

Relacionado: [`docs/webinar-sistemas-agenticos/GRABACION.md`](webinar-sistemas-agenticos/GRABACION.md).
