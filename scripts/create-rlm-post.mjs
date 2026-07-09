import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const body = `Cuando le pegas un documento enorme a un asistente de IA —un PDF de 300 páginas, miles de registros, un repositorio completo— pasa algo que casi nadie te explica de entrada: a partir de cierto tamaño, las respuestas empeoran. No porque el modelo "no quepa", sino porque procesar mucho texto de una sola vez diluye su atención. Los detalles que importan se pierden entre todo lo demás.

Ese fenómeno tiene nombre informal: *context rot*, la pérdida de calidad conforme crece el contexto. Y es justo el problema que ataca una propuesta reciente de Alex L. Zhang, investigador del MIT: los **Modelos de Lenguaje Recursivos** (RLM, por sus siglas en inglés).

![Túnel fractal abstracto, una metáfora de la recursión](https://images.pexels.com/photos/12891172/pexels-photo-12891172.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)

## La idea central, sin tecnicismos

Un RLM no es un modelo nuevo ni requiere reentrenar nada. Es una **forma de usar** los modelos que ya existen.

El cambio es de actitud. En lugar de meterle al modelo todo el contexto de golpe y pedirle una respuesta, el contexto se guarda como una variable dentro de un entorno de programación —un REPL de Python, una consola donde se escribe código y se ve el resultado al instante—. El modelo entonces no *lee* todo el texto: lo *manipula* con código, lo recorre, lo filtra y, cuando hace falta, se llama a sí mismo sobre los pedazos que sí importan.

Piénsalo como la diferencia entre leer un libro de mil páginas palabra por palabra para responder una pregunta, o usar el índice, buscar la sección correcta y leer solo esa. Lo segundo es más rápido y comete menos errores. El RLM le da al modelo justamente ese índice y esa lupa.

## Cómo funciona, paso a paso

El esquema que describe Zhang tiene tres piezas que conviene entender por separado:

**1. El modelo raíz casi no ve el contexto.** Recibe la pregunta del usuario y nada más. El texto gigante —que puede ser de cientos de miles o millones de tokens— vive aparte, cargado como una variable en memoria. Así su ventana de contexto "rara vez se satura", en palabras del autor.

**2. El modelo raíz escribe código para investigar.** En lugar de pedirle que lea, se le pide que programe. Puede usar expresiones regulares (patrones de búsqueda de texto, los famosos *regex*) para localizar dónde está lo relevante, cortar el contenido en trozos, o inspeccionar solo el principio para entender la estructura.

**3. Puede llamarse a sí mismo sobre los fragmentos.** Cuando un trozo necesita comprensión real y no solo búsqueda, el raíz lanza una sub-llamada a otro modelo —de ahí lo de "recursivo"— que se encarga solo de ese pedazo. En los experimentos esa recursión va a un nivel de profundidad: el raíz llama a sub-modelos, no a una cadena infinita.

![Mujer consultando un catálogo de fichas en un archivo de biblioteca](https://images.pexels.com/photos/6549375/pexels-photo-6549375.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)

## Las estrategias que el modelo inventó solo

Uno de los detalles más interesantes es que, sin instrucciones explícitas, los modelos desarrollaron patrones de trabajo bastante humanos:

- **Peeking (ojear):** mirar el inicio del contexto para entender cómo está organizado antes de decidir qué hacer.
- **Grepping (buscar):** usar regex para acotar de un vistazo qué partes del texto son candidatas.
- **Partición y mapeo:** dividir el contexto en bloques y lanzar varias sub-llamadas, una por bloque.
- **Resumen por subconjuntos:** condensar la información de cada parte antes de juntarla.
- **Resolución programática:** cuando la tarea lo permite, resolverla procesando los datos con código directo, sin gastar una sola llamada de razonamiento.

Si te dedicas a programar, reconocerás estas tácticas: son lo que harías tú frente a un archivo de log de un gigabyte. Lo notable es que el modelo llegó a ellas por su cuenta.

> El principio de fondo, según Zhang: "los modelos de lenguaje deberían decidir cómo descomponer un problema para que sea digerible para un modelo de lenguaje".

Si te interesa este tipo de temas de IA aplicada y agentes, en [el canal de YouTube de FixterGeek](https://www.youtube.com/@fixtergeek) los explicamos con calma y con código.

## Los números

La parte que convierte la idea en algo serio son los resultados. Vale la pena leerlos con cuidado, porque también muestran los límites.

En el benchmark **OOLONG**, con listas de miles de entradas:

- A **132,000 tokens** de contexto, un RLM usando GPT-5-mini obtuvo alrededor de **48 puntos**, frente a los **~14 puntos** de GPT-5 solo. Una mejora de más de **34 puntos (~114%)**, y a un costo por consulta prácticamente igual.
- A **263,000 tokens**, el RLM logró **~24 puntos** contra **~10** del modelo base: **+15 puntos (~49%)**.
- Sin la recursión (solo el REPL, sin sub-llamadas), el rendimiento cae cerca de un **10%**. La recursión aporta, pero buena parte del mérito es del entorno de código en sí.

En **BrowseComp-Plus**, con preguntas que exigen saltar entre varios documentos:

- Escalando hasta **1,000 documentos**, el RLM con GPT-5 mantuvo un desempeño **casi perfecto**, mientras que los modelos base mostraban una caída clara.
- El autor sostiene que el esquema puede manejar corpus de **10 millones de tokens o más**.

![Estructura de acero anidada y repetitiva](https://images.pexels.com/photos/7392850/pexels-photo-7392850.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)

## Lo que todavía no resuelve

Aquí es donde conviene ser honesto, porque ninguna técnica es gratis:

- **Las llamadas son bloqueantes.** Cada sub-llamada espera a que termine la anterior, y no aprovecha el *prefix caching* (un truco que abarata reusar contexto repetido). Eso encarece y ralentiza.
- **El tiempo es impredecible.** Una consulta puede tardar desde unos segundos hasta varios minutos.
- **No hay garantías firmes** de cuánto costará ni cuánto tardará una consulta dada.

En otras palabras: la idea funciona, pero los motores de inferencia actuales no están optimizados para este patrón. Es terreno fértil para mejoras de infraestructura.

![Fronda de helecho enroscada, un patrón recursivo en la naturaleza](https://images.pexels.com/photos/14144103/pexels-photo-14144103.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)

## Por qué vale la pena tenerlo en el radar

La mayoría de los agentes de IA descomponen una tarea siguiendo una lógica que un humano programó de antemano. Un RLM mueve esa decisión hacia el propio modelo: él decide cómo navegar, cortar y resumir su contexto, según lo que la pregunta concreta necesite.

Para alguien que está empezando, la lección práctica es útil incluso sin implementar nada: cuando un asistente de IA se atraganta con demasiada información, el problema no siempre es el modelo. Muchas veces es *cómo* le entregamos el contexto. Darle herramientas para buscar y filtrar, en vez de obligarlo a tragar todo de un jalón, suele rendir mejor.

Si quieres revisar la fuente original o probarlo:

- Artículo de Alex L. Zhang: [alexzhang13.github.io/blog/2025/rlm](https://alexzhang13.github.io/blog/2025/rlm/)
- Paper: [arxiv.org/abs/2512.24601](https://arxiv.org/abs/2512.24601)
- Implementación mínima: [github.com/alexzhang13/rlm-minimal](https://github.com/alexzhang13/rlm-minimal)
- Implementación lista para producción: [github.com/blissito/ghostycode](https://github.com/blissito/ghostycode)

Abrazo. bliss.
`;

const post = await db.post.upsert({
  where: { slug: "modelos-de-lenguaje-recursivos-rlm" },
  update: {
    title: "Modelos de lenguaje recursivos: cómo un LLM aprende a leer su propio contexto",
    body,
    contentFormat: "markdown",
    published: true,
    coverImage: "https://images.pexels.com/photos/30903758/pexels-photo-30903758.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    metaImage: "https://images.pexels.com/photos/30903758/pexels-photo-30903758.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=630&w=1200",
    authorName: "Héctorbliss",
    authorAt: "@hectorbliss",
    photoUrl: "https://i.imgur.com/TaDTihr.png",
    authorAtLink: "https://www.hectorbliss.com",
    mainTag: "ai",
    tags: ["ai", "agentes", "opinion"],
  },
  create: {
    title: "Modelos de lenguaje recursivos: cómo un LLM aprende a leer su propio contexto",
    slug: "modelos-de-lenguaje-recursivos-rlm",
    body,
    contentFormat: "markdown",
    published: true,
    coverImage: "https://images.pexels.com/photos/30903758/pexels-photo-30903758.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    metaImage: "https://images.pexels.com/photos/30903758/pexels-photo-30903758.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=630&w=1200",
    authorName: "Héctorbliss",
    authorAt: "@hectorbliss",
    photoUrl: "https://i.imgur.com/TaDTihr.png",
    authorAtLink: "https://www.hectorbliss.com",
    mainTag: "ai",
    tags: ["ai", "agentes", "opinion"],
  },
});

console.log("OK:", post.slug, "| published:", post.published, "| id:", post.id);
await db.$disconnect();
