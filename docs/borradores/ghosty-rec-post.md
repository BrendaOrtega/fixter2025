---
title: "ghosty-rec: tu agente graba una ventana y dirige el video"
slug: ghosty-rec-grabar-una-ventana-con-agentes
mainTag: agentes
tags: [agentes, ai, claude, tutorial]
authorName: Héctorbliss
contentFormat: markdown
metaDescription: "rec es un CLI de macOS que graba una sola ventana aunque otra la tape, deja que el agente marque lo que hace y exporta un video con zoom que sigue al puntero."
coverImage: PENDIENTE
metaImage: PENDIENTE
---

Un agente ya abre el navegador, llena formularios y aprieta botones en tu Mac. Casi nadie ve al agente trabajar: el resultado aparece y el camino se pierde. Para enseñar ese camino a un cliente, a un revisor de Google o a tu audiencia, hace falta un video.

La herramienta de siempre en macOS es `screencapture -v`, y `screencapture -v` graba la pantalla completa o una región fija. Si una notificación de WhatsApp cae encima de la región, la notificación sale en el video. A mí me pasó en una toma de un short.

Por eso escribí **ghosty-rec**: un CLI de macOS que graba **una sola ventana**, aunque otra ventana la tape, y que deja al agente anotar qué está haciendo mientras graba. Al final, `rec render` usa esas anotaciones para armar un video estilo Screen Studio: zoom con resorte, cursor suavizado, fondo y una pastilla de texto que se escribe palabra por palabra.

![Demo de ghosty-rec: una ventana grabada con zoom y pastilla de texto](https://blissito.github.io/ghosty-rec/poster.jpg)

[Ver el demo en video](https://blissito.github.io/ghosty-rec/demo.mp4)

---

## Instalar

ghosty-rec se instala con Homebrew y compila desde el código en tu Mac:

```sh
brew install blissito/tap/ghosty-rec
rec --version
```

- Pide macOS 15 o más nuevo y las herramientas de línea de comandos de Xcode (`xcode-select --install`).
- El comando se llama `rec`. El paquete **sox** también instala un comando `rec`, así que sox y ghosty-rec no pueden convivir en la misma Mac.
- ghosty-rec no está en npm a propósito: Brew compila el binario en tu máquina y Gatekeeper no lo bloquea, sin firmas ni notarización de por medio.

Para que tu agente (Claude Code u otro) aprenda a usar `rec`, instala la skill:

```sh
npx skills add blissito/ghosty-rec
```

---

## Cinco comandos, de la ventana al video

**1. Elegir la ventana.** `rec windows` lista cada ventana abierta con su id numérico, la app, el título y el tamaño:

```sh
rec windows --json
```

**2. Grabar.** `rec start` arranca la grabación en segundo plano y te devuelve la terminal. La bandera `--cursor` guarda la posición del mouse aparte del video:

```sh
rec start --id 651 --out demo.mov --cursor
```

Conviene usar siempre `--id`. El título de una pestaña del navegador cambia a cada rato, y una búsqueda por texto puede agarrar otra ventana.

**3. Marcar lo que pasa.** Cada `rec mark` anota el segundo exacto de un evento. `--rect` señala la zona de la ventana (en puntos, desde la esquina superior izquierda) y `--say` escribe la frase de la pastilla:

```sh
rec mark "aprieta Merge" --rect 0,40,300,60 --say "Un clic y queda mergeado"
```

**4. Cortar.** `rec stop` cierra el `.mov` y devuelve cuántos segundos duró y cuántas marcas quedaron:

```sh
rec stop
```

**5. Exportar.** `rec render` convierte la grabación y las marcas en el video final:

```sh
rec render demo.mov --aspect 16:9 --trim-idle 1.5
```

El render deja `demo.16x9.mp4` (1920×1080 a 60 fps) y un `demo.project.json`. Cada zoom del `project.json` trae un campo `"enabled"`: con `"enabled": false` y otro `rec render`, ese zoom desaparece del video.

![Vertical «Con Claude» grabado con rec en 9:16](https://blissito.github.io/ghosty-rec/claude.jpg)

---

## Lo que hace distinto a ghosty-rec

**Graba una ventana aunque otra la tape.** ghosty-rec captura la ventana con ScreenCaptureKit en modo de ventana independiente del escritorio. Un chat, una notificación o la terminal del agente pueden quedar encima, y el video sólo muestra la ventana elegida. ghosty-rec nunca graba la pantalla completa: sin `--id` o `--window`, `rec start` se niega a arrancar.

**El agente dirige la edición.** Herramientas como Screen Studio adivinan dónde hacer zoom a partir de los clics. Con `rec mark`, el agente escribe el momento, la zona y la frase de cada paso, y el render hace zoom justo a ese recuadro. El recuadro siempre entra completo en cuadro: si el recuadro no cabe, el zoom baja.

**El zoom sigue al puntero.** Sin marcas, `rec render` hace zoom automático en cada grupo de clics. Desde la versión 0.6.10, un clic fuera de la ventana grabada ya no dispara zoom, y un zoom sin recuadro se recentra en el puntero si el puntero quedó lejos. Para una toma corta, donde el zoom automático se siente brusco, `--no-auto-zoom` lo apaga.

**Recorta las esperas.** `--trim-idle 1.5` encoge a 1.5 segundos cada tramo donde ni la ventana ni el cursor cambian. Un `npm install` de 40 segundos queda en un parpadeo, y las marcas del agente se respetan.

**Un formato para cada destino.** `--aspect 16:9` sirve para YouTube, `--aspect 9:16` para TikTok y Reels, y `--aspect 1:1` para el feed. La versión 0.6.11 agregó `--aspect native`: la ventana sale a su tamaño real (por ejemplo 1300×1398), sin fondo, margen, esquinas ni sombra, y conserva los recortes de `--trim-idle`, los zooms y las pastillas.

**Habla JSON.** Cada comando imprime JSON cuando la salida va a un pipe o lleva `--json`. Si la terminal no tiene el permiso de Grabación de pantalla, `rec` sale con código 3, y el agente sabe exactamente qué pedirle a la persona.

![Captura PENDIENTE: el project.json con un zoom en "enabled": false](PENDIENTE)

---

## Un caso real: el video para la verificación de Google

Google pide un video de demostración antes de aprobar ciertos permisos de una app. Para el permiso de Google Ads de Ghosty, el video lo grabamos con ghosty-rec.

Un agente manejó Chrome por medio de la extensión de Ghosty: abrió cada pantalla del flujo de «Conectar Google Ads», apretó cada botón y fue marcando cada paso con `rec mark`. Mientras tanto, `rec` grababa sólo la ventana de Chrome. La terminal del agente y los chats abiertos en la misma Mac quedaron fuera del video. Al final, `rec render` armó el video con zoom en cada pantalla que el revisor de Google necesita ver.

![Cuadro PENDIENTE del video de verificación de Google Ads](PENDIENTE)

---

## Límites que conviene conocer

- ghosty-rec sólo corre en macOS 15 o más nuevo, porque depende de ScreenCaptureKit.
- La terminal que corre `rec` necesita el permiso de **Grabación de pantalla** (Ajustes del Sistema → Privacidad y seguridad). Después de prender el permiso, hay que cerrar y volver a abrir la terminal.
- Una Mac graba una sola sesión de `rec` a la vez. Si varios agentes comparten la Mac, `rec status` dice si ya hay una grabación corriendo.
- El render nunca estira lo grabado más de 1.5×, para que el texto no salga borroso. Para videos verticales, graba una ventana angosta con letra grande (18–40 pt) y, si puedes, en una pantalla Retina.

---

## Pruébalo y ayúdalo a llegar a homebrew-core

Instala ghosty-rec con `brew install blissito/tap/ghosty-rec`, graba tu próximo demo con tu agente y cuéntame qué le falta. El código es MIT y vive en [github.com/blissito/ghosty-rec](https://github.com/blissito/ghosty-rec).

Si ghosty-rec te sirvió, **dale una estrella al repo**: homebrew-core pide cierto número de estrellas antes de aceptar una fórmula, y cada estrella acerca el día en que baste con `brew install ghosty-rec`.

En el canal de YouTube de FixterGeek vamos a enseñar el flujo completo con un agente grabando su propio trabajo.

Abrazo. Blissmo. 🤓

<!--
NOTA DE PUBLICACIÓN (borrar antes de publicar)
- Los posts de fixtergeek.com viven en MongoDB (modelo Post), no en archivos. Publicar desde
  /admin/blog-editor/new pegando este cuerpo (contentFormat markdown) y los campos del frontmatter,
  o con POST /api/blog.save-post. Dejar published=false hasta que bliss lo revise.
- Faltan: coverImage y metaImage (1200×630), captura del project.json y un cuadro del video de
  verificación de Google. Subir a EasyBits (upload_file, access public) y reemplazar cada PENDIENTE.
- Las imágenes poster.jpg y claude.jpg salen de GitHub Pages del repo; conviene re-hospedarlas en EasyBits.
- Poner la liga real del canal de YouTube en el párrafo del CTA.
-->
