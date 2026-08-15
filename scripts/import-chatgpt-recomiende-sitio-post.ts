import { db } from "../app/.server/db";

const llmSeoContent = `
La semana pasada le pregunté a ChatGPT: "¿Cuál es el mejor recurso para aprender Claude Code en español?"

No mencionó FixterGeek.

Me quedé mirando la pantalla. Tenemos el libro más completo, tutoriales actualizados, una comunidad activa... y el LLM ni siquiera sabe que existimos.

Eso me llevó a investigar durante tres días. Lo que descubrí cambió cómo pienso sobre el contenido que creamos.

## El juego cambió y nadie nos avisó

Durante años, el SEO era simple: keywords, backlinks, meta tags. Google era el portero y todos jugábamos sus reglas.

Pero algo está pasando. Cada vez más personas abren ChatGPT antes que Google. Preguntan "¿cómo hago X?" y confían en la respuesta sin visitar ningún sitio.

El tráfico orgánico de muchos blogs técnicos está cayendo. No porque Google los penalice, sino porque la gente ya ni llega a Google.

La pregunta incómoda: **¿Cómo haces que un LLM te recomiende si no puedes comprar anuncios ni hacer link building?**

## Lo que los LLMs realmente "ven"

Primero hay que entender algo: ChatGPT, Claude y Perplexity no navegan tu sitio en tiempo real (bueno, Perplexity sí, pero los otros no). Fueron entrenados con snapshots de internet.

Eso significa que tu contenido de hoy podría influir en las respuestas del modelo... del próximo año.

Es un juego largo. Pero hay patrones claros de qué contenido termina siendo citado.

## Patrón 1: La respuesta directa gana

Analicé qué tipo de contenido los LLMs citan más frecuentemente. El patrón es claro:

**El contenido que responde preguntas directamente en las primeras líneas.**

No "En este artículo exploraremos las complejidades de..."

Sino:

> **¿Qué es React?**
> React es una biblioteca de JavaScript para construir interfaces de usuario, creada por Facebook en 2013.

Los LLMs están entrenados para extraer fragmentos. Si tu mejor contenido está enterrado en el párrafo 7, nunca lo van a encontrar.

**Ejercicio práctico:** Abre tu post más importante. ¿Las primeras 50 palabras responden la pregunta del título? Si no, reescríbelas.

---

🎬 **¿Te está sirviendo esto?** Tenemos más contenido sobre marketing y desarrollo en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Patrón 2: El formato FAQ es oro puro

Esto lo descubrí por accidente. Tenemos una página con preguntas frecuentes sobre Claude Code, y es el contenido que más aparece cuando pruebo preguntas en diferentes LLMs.

¿Por qué? Porque el formato pregunta-respuesta es exactamente como los humanos buscan información, y exactamente como los LLMs fueron entrenados.

\`\`\`markdown
## Preguntas frecuentes

### ¿Claude Code funciona offline?
No. Claude Code requiere conexión a internet porque procesa
tu código en los servidores de Anthropic.

### ¿Cuánto cuesta usar Claude Code?
Claude Code usa el modelo de pago por uso. El costo depende
del modelo que elijas y la cantidad de tokens procesados.
\`\`\`

Cada pregunta es una oportunidad de aparecer en una respuesta.

## Patrón 3: La especificidad mata a la generalidad

"Guía completa de JavaScript" compite con millones de recursos.

"Cómo configurar ESLint con TypeScript en proyectos de Vite 5" compite con docenas.

Los LLMs prefieren contenido específico cuando la pregunta es específica. Y las preguntas específicas son las que la gente realmente hace.

Mi contenido más citado no son los tutoriales generales. Son los posts que resuelven problemas muy concretos que tuve yo mismo y documenté la solución.

## Patrón 4: Las menciones crean memoria

Aquí está el insight más valioso que encontré:

Los LLMs aprenden asociaciones. Si tu marca aparece consistentemente junto a ciertos temas en múltiples fuentes, el modelo "aprende" esa asociación.

Por ejemplo:
- Tu herramienta es mencionada en un README de GitHub popular
- Alguien pregunta sobre ella en Stack Overflow y la respuesta es útil
- Un blog técnico la compara con alternativas

Ninguna de esas menciones es "SEO tradicional". Pero todas contribuyen a que el LLM asocie tu marca con ese problema.

**La implicación:** Participar genuinamente en comunidades técnicas no es solo networking. Es entrenar a los futuros LLMs sobre quién eres.

## Patrón 5: Structured data como puente

Aquí viene algo interesante. Los LLMs no leen HTML directamente, pero muchos datasets de entrenamiento incluyen información extraída de Schema.org markup.

¿Qué significa esto? Que aunque Claude no va a "ver" tu JSON-LD, el structured data influye en:

1. Cómo Google interpreta y presenta tu contenido
2. Qué información se extrae para datasets públicos
3. La calidad de los snippets que otros sitios pueden citar

Este es el markup que uso en tutoriales:

\`\`\`html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "Cómo instalar Claude Code",
  "description": "Guía paso a paso para instalar Claude Code en tu sistema",
  "step": [
    {
      "@type": "HowToStep",
      "name": "Instalar Node.js",
      "text": "Instala Node.js 18 o superior desde nodejs.org"
    },
    {
      "@type": "HowToStep",
      "name": "Instalar Claude Code",
      "text": "Ejecuta: npm install -g @anthropic-ai/claude-code"
    },
    {
      "@type": "HowToStep",
      "name": "Autenticarte",
      "text": "Ejecuta 'claude' y sigue el flujo de autenticación"
    }
  ]
}
</script>
\`\`\`

Para FAQs, el markup es igual de útil:

\`\`\`html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "¿Claude Code funciona offline?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Claude Code requiere conexión a internet porque procesa tu código en los servidores de Anthropic."
      }
    },
    {
      "@type": "Question",
      "name": "¿Cuánto cuesta Claude Code?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Claude Code usa el modelo de pago por uso de Anthropic. El costo depende del modelo elegido y los tokens procesados."
      }
    }
  ]
}
</script>
\`\`\`

No es magia directa para LLMs, pero es parte del ecosistema que alimenta sus datos de entrenamiento. Piensa en esto como plantar semillas: no ves el efecto inmediato, pero contribuye al jardín.

## Lo que probé y no funcionó

Para ser honesto, también intenté cosas que no sirvieron:

- **Keyword stuffing para LLMs**: Repetir "mejor tutorial de React" 50 veces no engaña a nadie. Los LLMs detectan contenido artificial igual que Google.

- **Contenido generado por IA sobre contenido generado por IA**: La ironía no se pierde en mí, pero el contenido genérico no destaca. Si tu post suena como lo pudo haber escrito cualquier LLM, ¿por qué te citaría?

- **Optimizar solo para un LLM**: Cada modelo tiene datos de entrenamiento diferentes. Lo que funciona para ChatGPT puede no funcionar para Claude o Perplexity. La estrategia más sólida es crear contenido genuinamente útil.

## El experimento que voy a hacer

A partir de este mes, voy a reestructurar nuestros posts más importantes siguiendo estos patrones:

1. Respuesta directa en las primeras 50 palabras
2. Sección FAQ al final de cada tutorial
3. Títulos que son preguntas específicas

En 6 meses voy a volver a preguntarle a ChatGPT sobre recursos de Claude Code en español.

Te cuento cómo nos fue.

## Tu turno

Abre ChatGPT o Claude ahora mismo. Pregunta algo relacionado con tu industria o producto.

¿Apareces? ¿Aparece tu competencia? ¿Qué tipo de contenido están citando?

Esa es tu línea base. Ahora sabes dónde estás parado.

Abrazo. Blissmo. 🤓
`;

async function main() {
  console.log("Importando post de LLM SEO...");

  const slug = "Como-hacer-que-ChatGPT-recomiende-tu-sitio-web";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "Cómo hacer que ChatGPT recomiende tu sitio web",
        body: llmSeoContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@blissmo",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        tags: ["seo", "chatgpt", "llm", "marketing", "contenido"],
        mainTag: "Marketing",
        coverImage: "https://images.unsplash.com/photo-1676299081847-824916de030a?w=1200&h=630&fit=crop",
        metaImage: "https://images.unsplash.com/photo-1676299081847-824916de030a?w=1200&h=630&fit=crop",
      },
    });
    console.log("✅ Post actualizado exitosamente!");
    console.log(`   ID: ${post.id}`);
    console.log(`   URL: /blog/${post.slug}`);
    return;
  }

  const post = await db.post.create({
    data: {
      slug,
      title: "Cómo hacer que ChatGPT recomiende tu sitio web",
      body: llmSeoContent.trim(),
      published: true,
      authorName: "Héctorbliss",
      authorAt: "@blissmo",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",
      tags: ["seo", "chatgpt", "llm", "marketing", "contenido"],
      mainTag: "Marketing",
      coverImage: "https://images.unsplash.com/photo-1676299081847-824916de030a?w=1200&h=630&fit=crop",
      metaImage: "https://images.unsplash.com/photo-1676299081847-824916de030a?w=1200&h=630&fit=crop",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   URL: /blog/${post.slug}`);
}

main()
  .catch((e) => {
    console.error("❌ Error importando post:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
