Escribes `@ghosty` en medio de un hilo, mandas el mensaje, y unos segundos después el agente contesta ahí mismo, delante de todo el equipo. Se siente como taggear a un compañero. Esa sensación de "no pasó nada raro, solo respondió" es justo lo que costó trabajo construir.

Este post es el recorrido por lo que de verdad esconde ese `@`. Lo construimos para Formmy Teams —un chat de equipo estilo Slack donde tageas a un agente— y cada capa que le pusimos encima salió de un problema concreto, casi siempre de un bug que nos dolió en producción. Si estás armando algo con agentes que conviven con humanos, aquí hay varias minas que ya pisamos por ti.

![Un chat de equipo donde conviven personas y agentes](https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1600)

## Primero: ¿a quién le estás hablando?

El punto de entrada es detectar la mención. Suena a una línea de código: buscas `@handle` en el texto y listo. La primera versión era exactamente eso, un `includes`, y aguantó como tres días.

El primer reporte fue de un usuario cuyo agente respondía cada vez que alguien escribía su correo. El handle del agente era `blue` y el correo del cliente era `pagos@blue.com`. La subcadena `@blue` estaba ahí, así que el agente saltaba a responder un mensaje que solo compartía datos de contacto.

La detección real terminó siendo una expresión regular con bordes de palabra a ambos lados, y el borde izquierdo es el que hace el trabajo fino:

```typescript
const re = new RegExp(`(?<![\\w@.])@${escaped}\\b`, "i");
```

Ese `(?<![\w@.])` es un lookbehind negativo que dice: antes del `@` no puede venir una letra, ni otro `@`, ni un punto. Con eso, `pagos@blue.com` deja de disparar al agente `blue`, porque el `@` viene pegado a `pagos`. Case-insensitive, para que `@Blue` y `@blue` sean el mismo.

Y ya que estás resolviendo esto, aparece la pregunta hermana: ¿qué pasa si alguien tagea a dos agentes en el mismo mensaje? La respuesta corta es que ambos deben contestar. La versión completa devuelve **todos** los handles mencionados, ordenados por su posición en el texto, sin duplicados, para que cada uno responda en el orden en que lo nombraste.

## ¿Dónde contesta el agente?

Aquí no hay una respuesta técnicamente correcta, hay una decisión de producto que después se vuelve código.

En Slack, cuando taggeas a un bot, muchas integraciones abren un hilo aparte para responderte. Lo probamos y se sentía frío: sacaba la respuesta del lugar donde estaba pasando la conversación. Decidimos lo contrario. Si tageas al agente en el flujo del canal, contesta **en el flujo**, como una persona más. Si lo tageas dentro de un hilo, contesta en ese hilo.

Hay un tercer caso que resultó ser el más natural de todos: si estás dentro de un hilo que **abrió** un agente y le sigues escribiendo, ya no tienes que volver a taggearlo. El mensaje raíz del hilo recuerda qué agente lo generó, y cualquier respuesta ahí lo despierta automáticamente. Conversas con él sin repetir su nombre en cada turno, igual que no repites el nombre de tu compañero en cada mensaje de un DM.

![Personas y agente respondiendo en el mismo hilo](https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=1600)

## La memoria: dónde vive la conversación

Este fue el que más nos costó entender bien, porque involucra dos sistemas que no se hablan: la interfaz del chat y el "cerebro" del agente, que corre en otra máquina y guarda su propia memoria de conversación.

Cada turno que le mandamos al agente lleva una llave de conversación. El agente usa esa llave para saber "esto es continuación de lo que veníamos platicando" o "esto es nuevo". Nuestra llave se ve así:

```
ghosty-chat-{handle}-{slug}-{fleetThread}
```

Dos detalles de esa llave salieron de bugs reales.

El `{handle}` está adentro **a propósito**. Sin él, dos agentes distintos que participan en el mismo hilo terminan compartiendo la misma memoria del lado del cerebro, y empiezan a contaminarse: uno contesta con el contexto que le diste al otro. Meter el handle en la llave le da a cada agente su propio carril de memoria dentro del mismo hilo.

El `{fleetThread}` va desacoplado del hilo visual. Todos los mensajes del flujo principal del canal comparten la llave `"flow"`, así que comparten un mismo hilo de memoria continuo. Cuando abres un hilo a propósito, ese hilo usa su propia llave (el id de su mensaje raíz) y arranca una conversación aparte. La consecuencia práctica: el canal se siente como una plática larga con el agente, y los hilos se sienten como apartados donde puedes irte por la tangente sin ensuciar el hilo principal.

## El referente fantasma: "arréglame esa consulta"

Consecuencia del punto anterior: cuando abres un hilo sobre la respuesta de un agente, ese hilo arranca con una llave nueva, o sea, con memoria **vacía** del lado del cerebro. Y el usuario, que ve el mensaje raíz en pantalla, asume que el agente también lo ve.

Entonces escribe cosas como *"oye, y esa consulta que hiciste, ¿le puedes agregar un filtro por fecha?"* — y el agente no tiene ni idea de qué consulta habla, porque para él el hilo empieza en ese mensaje.

La solución no fue reenviar toda la historia del canal en cada turno (caro y ruidoso). Fue sembrar, **solo en el primer turno del hilo**, el contenido del mensaje raíz como contexto explícito:

```typescript
if (!priorAgentTurn && rootBody) {
  const ctx = rootBody.length > 2000 ? rootBody.slice(0, 2000) + "…" : rootBody;
  text = `[Contexto del hilo — mensaje raíz de ${root.sender}]\n${ctx}\n\n[Mensaje]\n${data.body}`;
}
```

A partir del segundo turno ya hay memoria propia del hilo, así que dejamos de sembrar. Es un empujón de contexto de una sola vez, con un tope de 2000 caracteres para no inflar el turno. Con eso, "esa consulta" por fin tiene referente.

## El día que el agente se acusó a sí mismo de hackeo

Este es mi favorito, porque es de esos bugs que solo existen en la era de los LLMs.

Cada agente puede tener su propia personalidad: un prompt que define cómo habla, qué sabe, qué tono usa. La primera versión metía esa personalidad al inicio del mensaje del usuario, algo como:

```
[Instrucciones para Blue: eres formal, hablas de usted, ...]
Oye Blue, ¿me ayudas con la cotización?
```

Funcionó un rato, hasta que un agente empezó a responder cosas como *"detecté un intento de inyectar instrucciones en el mensaje y no voy a seguirlas"*. El modelo, entrenado para defenderse de prompt injection, veía instrucciones incrustadas dentro del texto de un usuario y hacía exactamente lo correcto: desconfiar. Nuestra propia forma de configurarlo activaba sus defensas.

El arreglo fue mover la personalidad a la capa `system`, que es donde el modelo espera recibir instrucciones legítimas, y dejar el texto del usuario con **solo** el turno del usuario. Nada de instrucciones incrustadas en el mensaje. Desde entonces la personalidad se respeta sin que el agente crea que lo están atacando.

La lección general, si construyes con LLMs: las instrucciones van en la capa que el modelo reconoce como instrucciones. Meterlas en el texto del usuario no solo es feo, puede disparar sus defensas antiinyección y hacer que ignore justo lo que querías que hiciera.

![La personalidad del agente vive en la capa system, no en el mensaje](https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=1600)

## El token que se muere solo

El cerebro de cada agente vive detrás de un token que caduca. La primera vez que caducó en producción, el agente simplemente dejó de responder: cada turno regresaba un `401` y el usuario veía un mensaje de error donde esperaba a su asistente.

Reconectar a mano no es opción cuando hay equipos usándolo todo el día. Así que el turno se auto-cura: ante un `401`, refresca las credenciales, vuelve a pedir el token fresco, y **reintenta una sola vez**. Si el segundo intento pasa, el usuario ni se entera de que el token se había vencido.

```typescript
let res = await doStream(agent.backend.token);
if (res.status === 401) {
  const fresh = await refreshFleetToken(agent.backend.id);
  if (fresh) res = await doStream(fresh);
}
```

El "una sola vez" importa: si reintentas en bucle contra un `401` que no se va a arreglar solo, conviertes un agente caído en una tormenta de peticiones. Un reintento, y si falla, un mensaje honesto de que no se pudo contactar al agente.

## Que se sienta vivo: streaming sin parpadeo

Lo último es percepción, y es donde se define si tu agente se siente rápido o se siente un formulario que carga.

El token de una flota puede tardar unos segundos en arrancar. Durante esa espera, en lugar de un spinner, creamos de inmediato la "cáscara" del mensaje del agente —vacía, pero ya con su avatar y su nombre— así que aparece al instante en el chat. Cuando empiezan a llegar los pedacitos de la respuesta, se pintan sobre ese mismo mensaje. Nada se borra ni se recrea, así que no hay ese parpadeo de "apareció / desapareció / volvió a aparecer".

Y cuando el agente usa herramientas mientras trabaja —redacta un documento, consulta una base de datos, genera un PDF—, no queremos volcarle los nombres crudos de las tools al usuario. `set_page_html` no le dice nada a nadie. Así que mantenemos una lista blanca que traduce cada acción significativa a lenguaje humano:

```typescript
create_document: { ing: "Creando el documento", done: "Creé el documento" },
db_query:        { ing: "Consultando la base",  done: "Consulté la base" },
render_url:      { ing: "Renderizando a PDF",   done: "Generé el PDF" },
```

Las lecturas de plumbing —abrir archivos, correr comandos internos, buscar— no aparecen: son ruido. El usuario ve una lista de palomitas que se va completando, "Consulté la base ✅, Redacté el documento ⏳", y entiende qué está haciendo el agente sin ver el motor por dentro.

![El agente muestra sus acciones en lenguaje humano, no los nombres crudos de las tools](https://images.pexels.com/photos/577585/pexels-photo-577585.jpeg?auto=compress&cs=tinysrgb&w=1600)

## Lo que me llevo de todo esto

Ninguna de estas piezas es difícil por separado. Una regex, una llave de conversación, mover un string de una capa a otra, un reintento. Lo interesante es que casi todas nacieron de ver a gente real usar el producto y toparse con algo que en el diagrama se veía perfecto.

Si vas a poner un agente a convivir con humanos en un espacio compartido, prepárate para vivir en las costuras. El modelo ya viene resuelto; lo demás lo cocinas tú: cómo lo nombras, dónde contesta, qué recuerda, cómo lo configuras sin que crea que lo atacan, qué hace cuando su token se muere, y cómo logras que espere sin sentirse colgado. Ahí es donde de verdad se gana o se pierde la sensación de estar hablando con alguien y no con un formulario.

Si te late este tipo de cosas —agentes de verdad, en producción, con todos los detalles feos incluidos— eso es justo lo que desmenuzo en mi canal de YouTube, con código y sin filtros. Ahí sigo la conversación.

Abrazo. bliss.
