## Una conversación de dos líneas

Todo lo que este libro construye cabe, al principio, en dos líneas de texto. Una la escribes tú y
la otra te la contesta un programa. Antes de instalar nada, de abrir un editor o de escribir una
sola función, conviene ver esas dos líneas con los ojos, porque el resto del protocolo son
variaciones de ese intercambio.

Abre una terminal. Necesitas un Agente que hable el protocolo; cualquiera del registro sirve, y
opencode es cómodo porque trae el modo integrado en un subcomando:

```sh
opencode acp
```

El cursor se queda parpadeando. El proceso arrancó y está esperando. Todavía no ha dicho nada,
porque en este protocolo el Agente nunca habla primero: espera a que el Cliente abra la
conversación. Y en este momento el Cliente eres tú.

Pega esto y da Enter:

```json
{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":1,"clientCapabilities":{"fs":{"readTextFile":false,"writeTextFile":false},"terminal":false}}}
```

La respuesta llega en una sola línea, larga. Con un poco de aire se ve así:

```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "result": {
    "protocolVersion": 1,
    "agentCapabilities": {
      "loadSession": true,
      "promptCapabilities": { "image": true, "audio": false, "embeddedContext": true },
      "mcpCapabilities": { "http": true, "sse": false }
    },
    "agentInfo": { "name": "opencode", "title": "OpenCode", "version": "…" },
    "authMethods": []
  }
}
```

Los valores exactos dependen del Agente y de su versión; la forma es siempre la misma. Acabas de
hablar el Agent Client Protocol sin una sola línea de código. Lo que sigue en este capítulo es
entender cada pedazo de esas dos líneas, porque cada uno tiene una razón de existir y cada uno se
puede romper.

## El tubo

Fíjate en cómo viajó el mensaje: por la entrada estándar del proceso, y la respuesta salió por su
salida estándar. Sin puerto, sin dirección, sin socket. El Cliente arranca al Agente como
subproceso y le habla por `stdin`; el Agente contesta por `stdout`. Cuando el Cliente cierra el
tubo, el Agente muere. En su forma básica el protocolo no pide más infraestructura que ésa.

Si has usado el Language Server Protocol —el que hace que tu editor subraye errores de
TypeScript—, la idea te suena: también arranca un subproceso y le habla por `stdin`. Hay una
diferencia práctica que te va a ahorrar una tarde de depuración. LSP antepone a cada mensaje una
cabecera `Content-Length:` con el número de bytes. ACP no: cada mensaje es **un JSON en una sola
línea, terminado en salto de línea**. Para leerlo basta partir por `\n`. Para escribirlo hay que
asegurarse de que el JSON no traiga saltos de línea adentro, que es lo que `JSON.stringify` hace
por defecto. Si alguna vez mandas un mensaje "bonito", con indentación, el Agente va a recibir
media línea, intentar parsearla, y contestar un error de análisis con `id: null`, porque no pudo
ni leer el identificador.

Queda un canal más, y es el que se olvida: `stderr`. Es del Agente para sus propios registros. Un
Cliente bien portado lo captura y lo enseña en un panel de diagnóstico, y nunca lo mezcla con
`stdout`, que es donde viven los mensajes. Un Agente bien portado no imprime jamás en `stdout`
nada que no sea un mensaje del protocolo: un `console.log` de depuración en el lugar equivocado y
el Cliente recibe una línea que no es JSON y se le cae la conexión. Cuando escribas a Ghosty en el
capítulo 7, esa va a ser la primera regla: **`stdout` es sagrado**.

## El sobre

El mensaje que escribiste sigue el formato JSON-RPC 2.0. Son cuatro campos y vale la pena
distinguirlos porque de ellos depende cómo se emparejan preguntas con respuestas cuando hay
muchas en vuelo.

`jsonrpc` siempre vale `"2.0"`. Es la versión del sobre, no del protocolo; nunca cambia.

`method` es el nombre de lo que pides. En ACP los nombres tienen forma de ruta:
`initialize`, `session/new`, `fs/read_text_file`. La barra separa el área del verbo, y esa
convención es la que te va a permitir, en el capítulo 10, reconocer de un vistazo qué es estándar
y qué es un invento del Agente con el que hablas.

`params` es el objeto con los argumentos. Cada método define los suyos.

`id` es el que importa. Es un número o una cadena que tú eliges, y la respuesta trae **el mismo
`id`**. Con él emparejas cada respuesta con su pregunta, en el orden que sea. Mandaste tres
peticiones con `id` 4, 5 y 6; la 6 puede llegar antes que la 4, y no pasa nada porque el `id` te
dice cuál es cuál. Un Cliente real guarda un mapa de `id` a promesa pendiente, y cada línea que
entra resuelve la promesa que le toca.

Hay un segundo tipo de mensaje que se parece a éste pero **no trae `id`**: la notificación. Es un
aviso que no espera respuesta. `session/update`, el chorro de progreso que vas a ver en el
capítulo 3, es una notificación: el Agente te cuenta qué está haciendo y no se detiene a esperar
que le contestes. Si un mensaje sin `id` llega y no lo reconoces, el protocolo dice que lo
ignores. Si llega uno con `id` y no lo reconoces, contestas "método no encontrado" con ese mismo
`id`, para que quien preguntó no se quede colgado.

La respuesta a una petición trae el `id` y una de dos cosas: `result` si salió bien, o `error` si
no. Nunca las dos.

## Lo que se negocia

Ahora los `params` del `initialize`, que son la parte con contenido. Es una negociación en el
sentido literal: cada lado dice lo que sabe hacer, y a partir de ahí ambos saben qué pueden
pedirle al otro.

### La versión

`protocolVersion` es un entero. Hoy es `1`. La regla de la spec es corta: si el Agente soporta la
versión que pediste, contesta esa misma; si no, contesta la más reciente que soporte, y entonces
eres tú quien decide si puedes hablar en esa o cierras la conexión. Un Cliente que ignora ese
campo de la respuesta y sigue adelante va a fallar más tarde, en algún método que cambió de forma,
con un error que no se parece en nada a "versión incompatible".

### Lo que ofrece el Cliente

`clientCapabilities` es la lista de lo que el Agente puede pedirte. En la petición de arriba
pusiste todo en `false` a propósito: estabas en una terminal, sin nada que ofrecer.

`fs.readTextFile` y `fs.writeTextFile` habilitan, cada uno, un método: `fs/read_text_file` y
`fs/write_text_file`. Si los pones en `true`, el Agente va a pedirte leer y escribir archivos, y tú
tienes que contestar. Es la vía por la que el Agente ve el archivo **como está en tu editor, sin
guardar**, y no como está en disco; ese detalle es el motivo de que existan estos métodos en vez
de que el Agente abra los archivos por su cuenta.

`terminal` es un solo booleano y habilita la familia completa: `terminal/create`,
`terminal/output`, `terminal/wait_for_exit`, `terminal/kill` y `terminal/release`. Todo o nada.

### Lo que ofrece el Agente

`agentCapabilities` viene en la respuesta y te dice qué le puedes pedir tú.

`loadSession` te dice si existe `session/load`: si puedes retomar una conversación de otro día. El
capítulo 9 vive de este booleano.

`promptCapabilities` describe qué tipos de contenido acepta el Agente dentro de una instrucción,
además de texto: `image`, `audio` y `embeddedContext`, que es la manera de adjuntar un archivo
completo en el cuerpo del mensaje. Si mandas una imagen a un Agente que declaró `image: false`, el
error es tuyo, y el protocolo te dio la manera de saberlo antes.

`mcpCapabilities` dice por qué transportes acepta servidores MCP: `http` y `sse`. Lo vas a usar en
el capítulo 8 y ahí se entiende por qué importa.

`authMethods` es una lista de formas de autenticarse. Si viene vacía, como arriba, no hace falta
nada más y puedes abrir una sesión. Si trae algo, el Agente espera que llames `authenticate` con
uno de esos métodos antes de `session/new`; si no lo haces, `session/new` contesta un error de
autenticación requerida. La lista lleva un `id` por método y una descripción que puedes mostrarle
al usuario tal cual.

`agentInfo` y `clientInfo` son tarjetas de presentación: `name` para máquinas, `title` para
personas, `version` para cuando algo falla y hay que preguntar "¿con cuál hablabas?". Ninguno es
obligatorio; ambos son gratis y valen mucho en un reporte de error.

## Lo que pasa cuando mientes

Las capacidades son promesas, y el protocolo no tiene manera de verificarlas. Decir que sabes hacer
algo que no sabes hacer produce fallas que no apuntan al lugar donde está el error, y por eso
merecen un apartado.

El caso más instructivo es `terminal: true`. Es tentador ponerlo desde el primer día, "para
después". Lo que ocurre es que el Agente, en cuanto necesita correr un comando, te manda un
`terminal/create` y se queda esperando. Tu Cliente no tiene implementado ese método, así que
contesta "método no encontrado", o peor, no contesta. Del lado del Agente, la herramienta de shell
termina en estado `failed`. Lee bien lo que ves: el Agente te informa de un fallo en **su**
herramienta, con un mensaje sobre un comando que no pudo correr. Todo apunta al Agente y a la
consola de la caja. El error estaba en tu `initialize`, cinco minutos antes. Con `write` y `edit`
no pasa nada, porque ésos no pasan por la terminal, así que el Agente funciona a medias y la
sospecha tarda más en llegar al lugar correcto.

La versión del protocolo tiene su propia forma de venganza. Si el Agente contesta `protocolVersion:
2` y tú lo ignoras, la conversación continúa. Los métodos que no cambiaron funcionan y los que sí
cambiaron fallan uno por uno, cada uno con su propio error de forma, como si fueran problemas
distintos.

Y está la mentira por omisión: no leer `promptCapabilities` y mandar lo que sea. Un Agente
decente rechaza el bloque que no entiende; uno menos cuidadoso lo descarta en silencio y contesta
como si nunca hubieras adjuntado la imagen.

La lección para el Cliente: declara sólo lo que ya implementaste, lee lo que el Agente declara y
guárdalo, porque lo vas a consultar en cada método que sigue. La lección para el Agente, que
aplicarás en Ghosty: declara con precisión, y cuando el Cliente te pida algo que no anunció,
contesta con un error claro en vez de intentar adivinar.

## Las mismas dos líneas, ahora en código

Hasta aquí el Cliente fuiste tú con la terminal. Vale la pena ver lo mismo en unas cuantas líneas
de Node, sin dependencias, porque es el esqueleto sobre el que crecen los siguientes capítulos.
Lo que sigue arranca el Agente, manda `initialize`, espera la respuesta y la imprime.

```ts
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

// El Agente es un subproceso: le hablamos por stdin y lo leemos por stdout.
const agent = spawn("opencode", ["acp"], { stdio: ["pipe", "pipe", "inherit"] });

// Respuestas pendientes, por id. Cada línea que entra resuelve la suya.
let nextId = 0;
const pending = new Map<number, (result: unknown) => void>();

// Un mensaje por línea: sin Content-Length, sin indentación.
const lines = createInterface({ input: agent.stdout });
lines.on("line", (line) => {
  const message = JSON.parse(line);
  if (message.id !== undefined && pending.has(message.id)) {
    pending.get(message.id)!(message.error ?? message.result);
    pending.delete(message.id);
  }
  // Las notificaciones (sin id) se ignoran por ahora; el capítulo 3 las escucha.
});

function request(method: string, params: unknown) {
  const id = nextId++;
  agent.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return new Promise((resolve) => pending.set(id, resolve));
}

const result = await request("initialize", {
  protocolVersion: 1,
  // Sólo lo que este Cliente ya sabe hacer: nada todavía.
  clientCapabilities: {
    fs: { readTextFile: false, writeTextFile: false },
    terminal: false,
  },
  clientInfo: { name: "libro-acp", title: "Cliente del libro", version: "0.1.0" },
});

console.log(JSON.stringify(result, null, 2));
agent.stdin.end(); // cerrar el tubo termina al Agente
```

Tres detalles que ya están decididos ahí y que se mantienen en todo el libro. `stderr` va con
`inherit`, para que los registros del Agente aparezcan en tu terminal y no se mezclen con los
mensajes. El mapa `pending` es la implementación mínima del emparejamiento por `id`. Y las
notificaciones caen al vacío a propósito: cuando llegue el momento de escucharlas, ese `if` se
convierte en un despachador, y nada más cambia.

Corre el archivo. Vas a ver la misma respuesta que pegaste a mano, con el mismo `id: 0`. Guarda
`agentCapabilities` en algún lado, porque en el capítulo siguiente abres una sesión, y para eso
necesitas saber qué acepta el Agente que tienes enfrente.
