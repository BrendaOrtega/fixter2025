import { db } from "../app/.server/db";

const aiAgentsPostContent = `
He estado leyendo un poquito sobre los agentes inteligentes que vende OpenAI, Character.ai, o Retell. Sin mucha intención, la verdad, pues me da algo de pereza perseguir la burbuja. Sin embargo, quisiera entender mejor cómo traerme los beneficios (si existiesen) a **EasyBits.cloud,** para que nuestros usuarios puedan beneficiarse; y pues bueno, en esta entrada quiero platicarte un poco sobre lo que son los "agentes de voz" que es justo el caso de uso que quiero explorar para **EasyBits.cloud**. 😎

Así que, tráete las palomitas que te voy a explicar esta wea. 🍿

## ¿Qué se puede hacer con agentes AI de voz?

Se pueden programar flujos, flujos de conversación, sí, podemos hacer que el agente hable, que nos escuche, que nos subtitule, que nos traduzca, todo en tiempo real. 😱 Pero, no solo eso, también podemos hacer que reciba una llamada y enviar nuestra propia voz a una función LLM (Large Language Model). ☎️

> 👀 Un LLM es solo un algoritmo de inteligencia artificial, uno que aplica la técnica de las redes neuronales para procesar una bastedad de parámetros que le permiten entender mejor el lenguaje humano mientras aprende de él. 🧠

Estos agentes se pueden usar con RAG (Retrieval Augmented Generation), lo que es algo innovador dentro del universo del NLP (Natural Language Processing) pues, le da acceso a mucha más información, lo que le trae contexto y, como sabes, el contexto de un asunto es importante no solo para la máquina. 👏🏼

![](https://i.imgur.com/R3PFexW.png)

Claro que, lo que más me gusta de estos agentes, es que, les podemos dar acceso a un ecosistema fecundo y en expansión de *plug-ins* open-source. Además de que estos agentes pueden comunicarse directamente con el código del *frontend* sin tener que pasar por un servidor. 🪄

## Tipos de agentes de voz

Como lo que yo quiero construir para mi app necesitará de lo que se llama "un pipeline de voz", mi investigación me ha llevado a descubrir que existen dos tipos de agentes de voz de los que me puedo ayudar. Uno es el \`MultimodalAgent\` y el otro es el \`VoicePipelineAgent\`. Las diferencias entre ellos son mínimas pero importantes, veamos. 👁️

- El agente multimodal o \`MultimodalAgent\` usa el modelo de OpenAI con su API de tiempo real que puede procesar audio directamente (sin necesidad de convertirlo primero a texto, STT) y también puede generar respuestas de audio, lo que produce un discurso que suena natural (natural-sounding speech). 👄

![](https://docs.livekit.io/images/agents/multimodal-agent-overview.svg)

- El otro, el \`VoicePipelineAgent\`, puede utilizar cualquier modelo STT (Speech to Text), LLM o TTS (Text to Speech). Lo que provee de un control granular sobre el flujo de la conversación, es decir, que se puede modificar el texto devuelto por el LLM. 📝

![](https://docs.livekit.io/images/agents/pipeline-agent-overview.svg)

---

🎬 **¿Te interesa aprender más sobre AI y desarrollo?** Tenemos más contenido sobre inteligencia artificial en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

Planeo construir uno de cada uno para poder experimentar mejor, pues mi plan es emplear WebRTC para crear mis flujos y administrar la comunicación entre mi app y las APIs inteligentes y así poder integrarlos a una video-llamada. 📺

Todavía tengo mucho trabajo por delante, pues he de lidiar con el ruido, que a diferencia del ser humano que lo puede ignorar con facilidad, los robots sufren mucho, no escuchan bien y no entienden lo que se les dijo. ¿Verdad Siri? 🌬️

## No necesitas un curso, solo un proyecto.

Ya lo decía Isaac Asimov en un momento en el que internet aún no nacía:

> "Ser autodidacta es, estoy convencido, el único tipo de educación que existe." - Isaac Asimov

Si a ti también te interesa aprender rápido cómo emplear herramientas de AI sin tener que tomar una maestría (te puedes leer decenas de libros y te saldría más barato que una maestría) lo mejor es que construyas un robot. 🤖

La burbuja 🫧 es tan grande que hay muchísima información libre en la web, si te acercas a comunidades *open source* como [Pion](https://github.com/pion), puedes aprender mientras construyes. Algo que podría recomendarte si te estás embarcando en el mundo de "el empleo de AI", que, a mi parecer, es muy diferente del que te venden allá afuera para "trabajar en AI" con Python por ejemplo, yo prefiero recomendarte que aprendas Go, un lenguaje empleado ampliamente en la web y que te permitirá trabajar con WebRTC y LLMs con mucha más confianza y con aplicaciones más prácticas.

## Puras promesas

Por lo mientras, si esto te parece algo interesante, yo seguiré compartiendo contigo mis aprendizajes, así como mi progreso. 🤓

Cuando la app esté en beta para un demo, seguro que te lo haré saber por medio de nuestra lista de correo. No dejes de suscribirte. 😜

Abrazo. Bliss. 🤓

## Enlaces relacionados

- [Suscríbete](https://www.fixtergeek.com/subscribe/)
- [Pion](https://github.com/pion)
`;

async function main() {
  console.log("Creando post de AI Agents...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug: "que-es-un-agente-ai" },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug: "que-es-un-agente-ai" },
      data: {
        title: "¿Qué es un agente AI?",
        body: aiAgentsPostContent.trim(),
        published: true,
        coverImage: "https://i.imgur.com/R3PFexW.png",
        metaImage: "https://i.imgur.com/R3PFexW.png",
        youtubeLink: "",
        authorName: "Héctorbliss",
        authorAt: "@blissito",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.hectorbliss.com",
        tags: ["ai", "openai", "llm", "ai-agent", "go", "webrtc"],
        mainTag: "ai",
      },
    });
    console.log("✅ Post actualizado exitosamente!");
    console.log(`   ID: ${post.id}`);
    console.log(`   URL: /blog/${post.slug}`);
    return;
  }

  const post = await db.post.create({
    data: {
      slug: "que-es-un-agente-ai",
      title: "¿Qué es un agente AI?",
      body: aiAgentsPostContent.trim(),
      published: true,

      // Imágenes
      coverImage: "https://i.imgur.com/R3PFexW.png",
      metaImage: "https://i.imgur.com/R3PFexW.png",

      // YouTube (vacío según el plan)
      youtubeLink: "",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@blissito",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Clasificación
      tags: ["ai", "openai", "llm", "ai-agent", "go", "webrtc"],
      mainTag: "ai",
    },
  });

  console.log("✅ Post creado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   URL: /blog/${post.slug}`);
}

main()
  .catch((e) => {
    console.error("❌ Error creando post:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
