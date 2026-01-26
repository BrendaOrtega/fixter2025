import { db } from "../app/.server/db";

const llmSeoContent = `
Los motores de búsqueda ya no son la única forma de descubrir contenido. ChatGPT, Claude, Perplexity y otros LLMs están respondiendo preguntas y recomendando recursos. ¿Cómo haces que tu sitio aparezca en sus respuestas?

## El cambio de paradigma

Antes: Los usuarios buscan en Google → Tu SEO los trae
Ahora: Los usuarios preguntan a un LLM → El LLM decide qué recomendar

La buena noticia: hay formas de influir en lo que los LLMs recomiendan.

## 1. Contenido estructurado y claro

Los LLMs procesan texto. Si tu contenido está bien estructurado, es más probable que lo entiendan y recomienden.

\`\`\`markdown
# Título claro y descriptivo

## Sección con heading relevante

Párrafo introductorio que responde la pregunta principal.

### Subsección específica

Contenido detallado con ejemplos...
\`\`\`

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## 2. Responde preguntas directamente

Los LLMs están entrenados con contenido que responde preguntas claras.

**Malo:**
> "En este artículo exploraremos las complejidades de..."

**Bueno:**
> "¿Qué es React? React es una biblioteca de JavaScript para construir interfaces de usuario."

## 3. Usa el formato FAQ

El formato pregunta-respuesta es oro para los LLMs:

\`\`\`markdown
## Preguntas frecuentes

### ¿Cuánto cuesta Claude Code?
Claude Code usa el modelo de pago por uso de Anthropic...

### ¿Funciona offline?
No, Claude Code requiere conexión a internet...

### ¿Qué lenguajes soporta?
Soporta todos los lenguajes de programación...
\`\`\`

## 4. Schema.org markup

Aunque los LLMs no leen directamente el HTML, muchos son entrenados con datos que incluyen structured data.

\`\`\`html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "Cómo instalar Claude Code",
  "step": [
    {
      "@type": "HowToStep",
      "text": "Instala Node.js 18 o superior"
    },
    {
      "@type": "HowToStep",
      "text": "Ejecuta npm install -g @anthropic-ai/claude-code"
    }
  ]
}
</script>
\`\`\`

## 5. Menciones y autoridad

Los LLMs aprenden de múltiples fuentes. Si tu sitio es mencionado en:

- Documentación oficial
- GitHub READMEs populares
- Artículos técnicos citados
- Stack Overflow

Es más probable que el LLM lo recuerde y recomiende.

## 6. Contenido único y valioso

Lo mismo que funciona para SEO tradicional:

- **Original**: No copies contenido de otros
- **Profundo**: Ve más allá de lo superficial
- **Actualizado**: Mantén fechas recientes
- **Práctico**: Incluye código que funcione

## 7. Optimiza para fragmentos

Los LLMs extraen fragmentos para sus respuestas. Haz que tus primeras líneas sean la mejor respuesta posible:

\`\`\`markdown
## ¿Qué es Tailwind CSS?

Tailwind CSS es un framework de CSS utility-first que permite
construir diseños personalizados directamente en el HTML usando
clases predefinidas como \`flex\`, \`pt-4\`, y \`text-center\`.
\`\`\`

## 8. Herramientas específicas

### Para ChatGPT Plugins/GPTs:
- Crea un GPT personalizado que cite tu sitio
- Ofrece una API que los GPTs puedan consumir

### Para Perplexity:
- Tu contenido debe ser indexable
- Respuestas concisas al inicio

### Para Claude:
- Claude no navega web, pero es entrenado con contenido público
- La calidad del contenido es lo que importa

## Métricas a seguir

No hay "LLM Analytics" todavía, pero puedes:

1. Buscar tu marca en ChatGPT/Claude/Perplexity
2. Preguntar "¿Qué es [tu producto]?" y ver qué responde
3. Monitorear tráfico de referral inusual

## Conclusión

El "LLM SEO" está en sus inicios, pero los principios son claros:

1. Contenido estructurado y claro
2. Respuestas directas a preguntas
3. Autoridad y menciones
4. Contenido único y actualizado

No esperes a que esto se vuelva competitivo. Empieza hoy.

Abrazo. bliss.
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
