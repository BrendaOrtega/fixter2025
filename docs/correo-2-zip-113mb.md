# Asunto

El ZIP de 113 MB que tumbó al bot

# Cuerpo

Un cliente mandó un ZIP de 113 MB por WhatsApp. El agente lo leyó completo, la API de Anthropic respondió "Prompt is too long", el turno abortó y el cliente vio ese error en su chat, en inglés, tal cual.

Los 113 MB fueron el detalle menor. Lo que faltaba era una forma de decidir qué merecía entrar al contexto. Sin esa decisión, cargar todo queda como la única política disponible.

El contexto de un agente funciona como espacio de trabajo: cabe lo que se está usando ahora. Lo demás vive afuera y se alcanza con un puntero, que es saber que algo existe y dónde está, sin tenerlo enfrente.

Ese movimiento tiene varias formas, y todas se parecen:

**El índice en vez del archivo.** `unzip -l` devuelve cuarenta y siete nombres en unas cuantas líneas. `unzip` devuelve cuarenta y siete archivos.

**La búsqueda en vez de la documentación.** Un `rg` o un `docs-search` sobre los docs instalados regresa tres coincidencias con su ruta. Abrir la documentación completa regresa cuarenta páginas para leer tres párrafos.

**El resumen en vez del historial.** La conversación vieja se comprime a sus conclusiones; cada llamada paga también todas las anteriores.

**La ruta en disco en vez del blob.** El resultado se guarda, y lo que viaja al modelo es dónde quedó.

Un agente que elige qué traer puede trabajar indefinidamente. Uno que carga todo tiene fecha de caducidad medida en mensajes.

Lo que acabas de leer es el enunciado del principio. En el taller lo aterrizamos: el protocolo completo de archivos grandes, escrito como skill, conectado al agente y probado contra un ZIP real de esos que llegan sin avisar. Y ese es uno de varios protocolos que le vamos a instalar. 📦🔍🤖

Abrazo. bliss.
