Esta mañana le solté a uno de mis agentes un manual de identidad de 126 páginas —un PDF pesado, casi puro escaneo— con una instrucción de dos líneas. Veinte minutos después había extraído los colores institucionales con sus Pantone, las reglas tipográficas, las restricciones del logotipo y hasta el teléfono del área de gobierno que autoriza el uso de esa identidad. Y tomó una decisión que nadie le dictó: dejó intacta la marca activa del workspace, porque el manual era de un cliente.

Lo que me interesa contarte es el **cómo**. El agente escribió programas: inspeccionó el PDF con comandos, vio que su lector estándar se atragantaba con el escaneo, cambió de estrategia por su cuenta, y llamó a la plataforma únicamente para guardar el resultado. A ese patrón se le llama **code-mode**, y si estás construyendo agentes en 2026, es la decisión de arquitectura más importante que tienes enfrente. Tiene apenas dos años de historia y vale la pena conocerla completa, porque cada capítulo resuelve un problema que te vas a topar.

![Grabado de San Jerónimo trabajando concentrado en su estudio, rodeado de sus herramientas](https://www.ghosty.studio/blog-covers/jeronimo.webp)

*El agente en su estudio: trabaja con sus propias herramientas y sólo levanta la pluma para lo que importa. [St. Jerome in his Study, Durero, 1514 — Cleveland Museum of Art (CC0)](https://clevelandart.org/art/1972.29)*

## El problema con las tool calls

La forma canónica de darle capacidades a un LLM: le describes 50 funciones en el system prompt y el modelo emite un JSON — `{"tool": "send_email", "args": {...}}` — cada vez que quiere actuar. Funciona, y cobra dos impuestos que crecen con la ambición del sistema:

1. **Cada herramienta descrita engorda el contexto de cada turno**, la uses o no.
2. **Cada paso intermedio pasa por el modelo.** Si hay que leer 40 filas y sumarlas, las 40 filas viajan al contexto aunque sólo importe el total.

Kenton Varda, de Cloudflare, lo dijo con una imagen difícil de mejorar: pedirle a un LLM que domine las tool calls es como pedirle a Shakespeare un curso intensivo de mandarín para escribir una obra en chino. Puede. Pero su lengua materna — la que aprendió de millones de repositorios — es el código.

![Grabado del taller de un alquimista en pleno caos: hornos, alambiques y humo por todas partes](https://www.ghosty.studio/blog-covers/alquimista-galle.webp)

*Mucho aparato, mucho humo, poco oro. [Alchemist, Philip Galle, 1558 — Cleveland Museum of Art (CC0)](https://clevelandart.org/art/1964.479)*

## 2024: el paper que lo midió

La idea tiene partida de nacimiento académica: [**CodeAct**](https://github.com/xingyaoww/code-act) (Wang et al., ICML 2024) propuso consolidar todas las acciones del agente en un solo espacio: **código Python ejecutable**. En vez de elegir entre 50 tools, el agente escribe un programa; el programa compone, itera y maneja errores. Contra tool calls en JSON, midieron **hasta 20 puntos más de tasa de éxito**, con menos turnos por tarea.

Hugging Face lo productizó en [**smolagents**](https://huggingface.co/docs/smolagents/index), donde el agente default es un `CodeAgent` que escribe Python.

![Mezzotinta de un alquimista arrodillado ante un matraz que irradia luz en su laboratorio oscuro](https://www.ghosty.studio/blog-covers/alquimista-fosforo.webp)

*La alquimia se volvió química el día que alguien empezó a medir. [The Alchymist Discovers Phosphorus, William Pether, 1775 — Cleveland Museum of Art (CC0)](https://clevelandart.org/art/1995.2)*

## 2025: Cloudflare le pone nombre y Anthropic le pone filesystem

En septiembre de 2025, Cloudflare publicó [**"Code Mode"**](https://blog.cloudflare.com/code-mode/): en vez de conectar los servidores MCP como tools, los convierte en una API TypeScript y deja que el modelo escriba código contra ella. El resultado que reportó la comunidad: [hasta 81% menos tokens](https://workos.com/blog/cloudflare-code-mode-cuts-token-usage-by-81) en tareas por lotes, porque los datos intermedios dejan de pasar por el contexto — viven en variables.

En noviembre llegó la versión de Anthropic — [**"Code execution with MCP"**](https://www.anthropic.com/engineering/code-execution-with-mcp) — con un giro elegante: las herramientas se presentan como **archivos en el filesystem** del agente. Un índice chico siempre visible; el detalle de cada módulo se lee sólo cuando se necesita. El agente descubre sus capacidades igual que tú descubres una librería: abriendo el archivo.

Hasta aquí la historia publicada. Ahora el capítulo que nos tocó escribir a nosotros.

## Code-mode para un equipo, no para una persona

En [Ghosty](https://ghosty.studio) cada agente corre en su propia caja aislada con un SDK descubrible por filesystem — un índice y módulos (`web`, `render`, `db`, `image`, `connectors`…) que el agente importa desde sus propios scripts. Es la arquitectura del post de Anthropic corriendo en producción. Y como el SDK vive en la caja y no en el modelo, los tres cerebros que ofrecemos (Claude, Codex y DeepSeek) usan exactamente las mismas herramientas. El cerebro se volvió commodity; el arnés es donde vive el valor.

Los posts de Cloudflare y Anthropic comparten un supuesto silencioso: un solo usuario. Un dev, su agente, sus llaves. En un producto multi-tenant ese supuesto se rompe feo — un agente que puede escribir código puede escribirle a la API lo que sea, y "lo que sea" incluye los datos de otro tenant.

Nuestra respuesta fue un **pase firmado por turno**. Cada turno recibe un token efímero que lleva firmado quién lo invocó, de qué workspace y hacia qué conversación puede escribir. Las herramientas de plataforma —crear un formulario, escribir en la memoria del equipo, abrir un PR— viven en el servidor, y cada llamada valida ese pase. El agente escribe todo el código que quiera dentro de su caja; el radio de daño lo delimita la firma. De regalo: agregar una herramienta nueva es editar un archivo del servidor — segundos de deploy, cero rebuild de cajas, y los tres cerebros la ven al instante.

![Grabado renacentista del taller de un grabador: varios artesanos trabajan planchas de cobre en la misma mesa](https://www.ghosty.studio/blog-covers/taller-grabador.webp)

*Un taller, muchas manos — y cada plancha firmada por la suya. [Sculptura in Aes, Stradanus, c. 1591 — Cleveland Museum of Art (CC0)](https://clevelandart.org/art/2019.33)*

## El resultado, esta mañana

Con esas piezas armadas, la **memoria del workspace** que estrenamos hoy costó una mañana de trabajo. Sueltas un documento; el agente lo lee en su caja —OCR incluido si hace falta— y guarda notas cortas con título, ligadas al documento del que salieron. Conocimiento destilado, con su fuente citada. Cualquier agente del equipo, en cualquier conversación, ve el índice de esa memoria y lee la nota completa sólo cuando la necesita — otra vez el patrón del filesystem: índice barato siempre, detalle bajo demanda. Y el equipo la cura desde la interfaz, porque una memoria que nadie puede podar acaba llena de mentiras con autoridad.

El manual de 126 páginas quedó en 5 notas y una marca nueva lista en el selector, sin activarse sola. La libertad del código dentro de la caja; la autoridad de la firma fuera de ella.

La idea lleva dos años acumulando evidencia — el paper, smolagents, Cloudflare, Anthropic. El trabajo pendiente era llevarla del playground del desarrollador solitario al lugar donde trabaja un equipo real, y en eso andamos. Si quieres verlo con tus manos, entra a [Ghosty Teams](https://ghosty.studio), abre la Memoria de tu workspace y suéltale el manual de marca de un cliente: mira a tu agente destilarlo en conocimiento que todo tu equipo hereda.

Y si este tipo de arquitectura te prende —agentes en producción, con sus decisiones feas y sus números reales— en [mi canal de YouTube](https://www.youtube.com/@BlissmoHQ) desmenuzo estas piezas con código y sin filtros.

Abrazo. bliss.
