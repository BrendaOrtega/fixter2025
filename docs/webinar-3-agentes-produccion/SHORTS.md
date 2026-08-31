# Shorts del webinar 3 — «4 agentes en producción»

Grabación del **27 de agosto de 2026**, 98 min, con Brenda (Deník / SIIQTEC).
Publicada en `cursos/sistemas-agenticos/la-caja-donde-vive-tu-agente-de-ia-2026-08-28-0341`.

## La imagen SÍ sirve, al revés que en el webinar 1

Aquí la sala reparte cámaras a la izquierda (dos casillas de 216 px) y la pantalla
compartida a la derecha, limpia. Se recorta a vertical sin chrome de navegador:

- **Con demo** — la conversación sola, sin la columna de contactos:
  `crop=952:1060:818:10` escalado a 940 de ancho, en `y=810`.
  ⚠️ La columna de contactos lleva **teléfonos y nombres de clientes reales**
  (`+52 775 320 7057`, `+1 (437) 677-5569`). Recortarla es lo que los saca.
- **Sin demo** — sólo las dos cámaras a 520 px y el subtítulo grande al centro.
  Es el formato para los momentos de conversación, y **el único seguro cuando la
  dirección del cliente está escrita DENTRO del chat** (ver abajo).
- Cámaras: `crop=216:216:16:316` (bliss) y `crop=216:216:16:549` (Brenda).

⚠️ **Datos de clientes en pantalla, por tramo.** En el chat de Sophie se lee
«Venustiano Carranza 114, Col. Centro, Cuautepec de Hinojosa» a partir de ~24:00,
y **la vista se desplaza**, así que un difuminado fijo no sirve. Para esos tramos:
o se va a cámaras, o se recorta por debajo del mensaje.

## Cortados

| # | Momento | Marca | Estado |
|---|---|---|---|
| 1 | «Hay gente que no se da cuenta» — le hablan al bot como *hola preciosa*, *hola nena*. *"Una familiaridad que ofendería a un humano"* | 26:51 – 27:19 | ✅ `webinar-3-robot` · sólo cámaras |
| 2 | «Inteligencia de negocio, no análisis de datos, que está a punto de ser un zombie» | 49:55 – 51:52 | ✅ `webinar-3-inteligencia` |
| 3 | El agente corrige una **fórmula química** en pleno chat de ventas | 32:38 – 33:30 | ✅ `webinar-3-quimico` |

## Por cortar, en orden de prioridad

| # | Momento | Marca | Por qué |
|---|---|---|---|
| 4 | *"Se quedaron sorprendidos de que no fuera fácil de engañar"* — comprobante de otra cantidad o fecha, y lo caza | 13:02 – 13:30 | Falla concreta que el agente **no** comete. 30 s |
| 5 | El costo, con números: 680–800 pesos por 6–10 conversaciones contra ~600 por una flotilla de 12. *"Retorno de inversión absurdo"* | 37:17 – 39:12 | Responde la pregunta que todos tienen. Salió de una pregunta en vivo de YouTube. Recortable a 60 s |
| 6 | *"Es como el web development hace seis o siete años"* — el consejo de carrera | 82:07 – 82:47 | El que la gente le manda a un amigo |
| 7 | *"Lo de Lupita: ya sabe lo que siempre pido, que me atienda Lupita"* | 15:44 – 16:22 | La memoria por cliente, sin una palabra técnica |
| 8 | *"Pídele temprano la cotización para ver si mañana ya está. Eso se acabó, y muchas empresas mexicanas no lo saben"* | 44:48 – 45:11 | Cierre de venta en 25 s |
| 9 | *"Quien sabe diseñar el sistema alrededor del modelo es quien está cobrando"* | 94:02 – 94:32 | La tesis en una línea. Cierre de serie |
| 10 | *"La respuesta va a ser un gringo… un amigo me dijo: estás inventando Slack para no pagar"* | 79:57 – 80:38 | Autoconsciente y gracioso, con tesis dentro |
| 11 | *"Mis developers junior, a los que les estoy pagando un curso de GitHub…"* | 76:44 – 77:00 | Provocador a propósito. Genera discusión |
| 12 | 50 servicios dados de alta desde un PDF. *"Antes: dámelo y yo hago un script. Ahora: dáselos a Nick"* | 59:07 – 59:49 | Agent native aterrizado en un objeto |
| 13 | *"Es importante que uno no apruebe sus propios PRs, así que Ghosty tiene la capacidad de ser el autor"* | 75:29 – 75:44 | Detalle de oficio que un dev reconoce al vuelo |
| 14 | Los tres puntitos de WhatsApp: sin ellos el usuario no sabe que el agente está trabajando | 20:10 – 21:00 | Decisión de producto, contada desde la carencia |
| 15 | Meta: este webinar lo produjeron agentes. *"Seguimos solitos, Brenda y yo, pero tenemos un equipo de producción"* | 93:26 – 94:02 | Cierra el círculo de todo lo anterior |

**Si hay que elegir cinco:** 1, 2, 4, 5 y 6 — humano, opinión, técnico, dinero y
carrera, uno de cada registro y sin repetir tono.

## Cómo se arman

Un proyecto de HyperFrames por short en `videos/webinar-3-*`, todos con la misma
forma: intro 4 s → fragmento → cierre 6 s, con la malla cerrando en cascada en los
dos cortes. `mezclar.sh` pega **todo** el audio. El cuerpo se corta aparte con
ffmpeg y trae los subtítulos quemados.

Los subtítulos salen del `subtitulos.vtt` que ya vive en el HLS —no hay que
transcribir nada—, se recortan y desplazan con `cutvtt.mjs`, se pasan a ASS con
`vtt2ass.mjs` (⚠️ **con `PlayResX/Y` a 1080×1920**, o el `force_style` de ffmpeg
los escala contra 288 y salen gigantes) y se **adelantan 0.20 s**: whisper los deja
~0.1 s tarde y se leen retrasados. Sólo se corrigen errores de oído
(«la gente» → «el agente», «chat dbt» → «ChatGPT», «redicar» → «replicar»).

Las dos trampas que costaron la tarde están en las memorias
`gotcha_hyperframes_ignora_data_start_del_audio` y
`gotcha_cama_musical_con_volume_a_ojo`. En corto: **el renderizador pone toda pista
de audio en 0**, y la cama **se normaliza a −30 LUFS**, nunca con un `volume` a ojo.

## Créditos de música (CC BY, obligatorio en la descripción)

| Short | Crédito |
|---|---|
| `robot` | Música: "Chill Out" de BrunoXe — CC BY 3.0 |
| `inteligencia` | Música: "Techno Fashion" de Milestep — CC BY 3.0 |
| `quimico` | Música: "Airplane Mode (Instrumental Version)" de Josh Woodward — CC BY 3.0 |
