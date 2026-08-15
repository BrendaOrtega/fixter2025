import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const body = `Andrew Ng publicó esta semana su **AI Engineering Skills Map**. Lo que me hizo leerlo
con calma no fue la lista —son cuatro habilidades— sino cómo la armó: análisis de más de
**10,000 vacantes**, decenas de entrevistas estructuradas con expertos, contratantes y
reclutadores, encuestas y datos públicos. Él describe el proceso como correr un clustering
sobre un montón de datos de empleo para ver qué se repite, no solo hoy sino en el futuro
cercano.

En un año donde todo el mundo tiene una opinión sobre qué aprender, un mapa hecho con datos
de contratación real vale más que la mayoría de los hilos que vas a leer hoy.

Te traduzco las cuatro y me detengo en lo que se pierde cuando se lee en diagonal.

![Programando con un agente](https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=1200)

## 1. Construir y desplegar aplicaciones de IA

La diferencia entre una aplicación con IA y una sin ella es que la primera tiene **salidas
impredecibles**. Le mandas un prompt a un modelo y no sabes qué te va a devolver. El software
tradicional se comporta de forma mucho más previsible.

Ng dice que quien domina esto entiende los bloques —modelos, ingeniería de contexto, RAG,
flujos agénticos, machine learning— y, sobre todo, **sabe usar técnicas estadísticas para
medir, dirigir y gobernar** ese comportamiento. La habilidad central que nombra es una que casi
nadie presume: llevar ciclos disciplinados de evals y análisis de error.

Vale la pena subrayarlo porque no es lo que se vende afuera. El mercado premia el prompt
bonito; el mapa dice que lo escaso es saber por qué falló.

Un caso que me tocó hace poco lo pinta bien. Un agente en WhatsApp le mandó a un cliente el pin
de la ubicación del negocio. Usó la herramienta correcta, con la dirección correcta, y el pin
apareció en otra ciudad. La función que dibujaba el punto exigía latitud y longitud, y en el
contexto del agente solo había una dirección y un link de Google Maps. Como el dato no estaba
en ningún lado, el modelo lo inventó.

Ningún prompt arregla eso. Se arregla mirando la traza después del hecho, entendiendo que el
error fue semántico y no del modelo, y cambiando la herramienta para que acepte el link. Eso es
un eval en el sentido estricto: un postmortem con ojo humano.

## 2. Fundamentos de ingeniería de software

Cuando entiendes cómo funciona el software de verdad, construyes mejor. Ng lo plantea en
términos de compromisos: costo, escalabilidad, confiabilidad, velocidad, seguridad, privacidad.

Su punto es que entender los fundamentos te permite **reconocer que esos compromisos existen**,
que es distinto a saber resolverlos. Y de ahí sale la frase que más me gustó del texto: los
fundamentos te dan el lenguaje preciso para dirigir a un agente de código.

Lo dice con un contraste que conviene leer despacio: quien programa a puro vibe sin conocer los
compromisos deja que el agente los tome por él, y el agente suele tomarlos mal, porque nadie le
dio el contexto para elegir bien. El problema no es el agente. Es que la persona no sabía qué
contexto darle.

## 3. Usar agentes de código

Aquí es donde el texto se pone específico, y es la parte que yo recortaría y pegaría en la
pared:

- Manejar el contexto del agente.
- Decidir entre planear y ejecutar.
- Darle verificadores o evals para que **cierre solo el ciclo**, sin que estés de niñera.
- Trabajar con una especificación clara, y saber cuándo no vale la pena escribirla.
- Orquestar varios agentes trabajando juntos.
- Evitar accidentes, como que un agente te toque la base de datos de producción.

Y remata con algo que casi nadie pone en una lista de habilidades: como el campo cambia rápido,
usar agentes con destreza incluye **tener una rutina para probar herramientas nuevas** y
cambiar tu forma de trabajar cuando aparece una práctica mejor.

Lo del contexto tiene consecuencias que se miden en pesos. En una prueba de dos meses con una
empresa se consumieron 500 millones de tokens, y solo se facturaron 20 millones. El ahorro no
vino del modelo: vino de aprovechar la caché, que no se cobra. Saber eso es exactamente el tipo
de compromiso del que habla el punto anterior.

![El mapa de habilidades](DIAGRAMA_AQUI)

## 4. Dar forma al build

Si le das una especificación clara, un agente de código cada vez la cumple mejor. Entonces el
trabajo del ingeniero se corre hacia decidir **qué debe estar en esa especificación**.

Ng lo dice sin rodeos: ya no esperes que te den un diseño perfecto al pixel para que solo lo
implementes. La ingeniería con IA pide sentido de producto, entender el contexto de negocio y
las metas del cliente, para participar en darle forma al trabajo.

Y viene con una oportunidad: puedes tomar más responsabilidad y más agencia que antes.
Identificar problemas interesantes y ejecutarlos. Para eso hace falta saber empujar proyectos:
cuándo construir un MVP rápido y llevárselo a usuarios, y cuándo ir despacio para construir con
cuidado.

## Lo que se pierde al leerlo rápido

Hay una decisión de vocabulario en el texto que casi nadie va a notar y que a mí me parece la
parte más importante.

Ng habla de **habilidades** de ingeniería de IA, no del puesto de "AI Engineer". Y explica por
qué: hoy todos los desarrolladores necesitan saber trabajar con la nube, y solo unos pocos
tienen el título de "ingeniero de nube". Su apuesta es que va a pasar lo mismo aquí. Full-stack,
data, DevOps, machine learning: todos van a necesitar estas habilidades.

Eso cambia cómo lees el mapa. No es la descripción de un puesto al que te vas a cambiar. Es la
capa que se le está sumando al trabajo que ya haces.

## Qué haría yo con esto esta semana

Tres cosas concretas, en orden de qué tan rápido se sienten:

**Guarda una traza completa de algo que falló** y léela entera. No el error: la conversación,
qué herramienta se llamó, con qué argumentos. La mayoría de las fallas en producción son
semánticas y solo se ven así.

**Dale un verificador a tu agente.** Puede ser tan simple como un script que corra los tests o
que valide el formato de salida. La diferencia entre un agente que te interrumpe cada dos
minutos y uno que trabaja solo casi siempre es esa.

**Escribe la especificación antes que el código**, aunque sean seis renglones. Si no la puedes
escribir, tampoco la ibas a poder explicar, y el agente lo iba a resolver a su manera.

Si te interesa ver esto en sistemas corriendo y no en abstracto, en el canal de YouTube he
estado subiendo cómo armo estas piezas —agentes, herramientas, cajas— y ahí es más fácil de
seguir que en un texto: [youtube.com/@fixtergeek](https://www.youtube.com/@fixtergeek).

El mapa completo lo va a ir desarrollando en los próximos posts. Vale la pena seguirlo, aunque
solo sea para tener un criterio propio con qué filtrar el ruido.

Abrazo. bliss.
`;

const post = await db.post.create({
  data: {
    title: "Las cuatro habilidades de ingeniería con IA, según 10,000 vacantes",
    slug: "mapa-habilidades-ingenieria-ia-andrew-ng",
    body,
    contentFormat: "markdown",
    authorName: "Héctorbliss",
    authorAt: "@hectorbliss",
    photoUrl: "https://i.imgur.com/TaDTihr.png",
    authorAtLink: "https://www.hectorbliss.com",
    mainTag: "ai",
    tags: ["ai", "carrera", "agentes", "opinion"],
    // Borrador: falta el diagrama, que va de portada y a media lectura.
    published: false,
  },
});

console.log("creado:", post.slug, post.id);
process.exit(0);
