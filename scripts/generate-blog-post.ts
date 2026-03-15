/**
 * Generates and publishes the next blog post in the
 * "Diseñadores × MCP × IA" series using Claude API.
 *
 * Usage: npx tsx scripts/generate-blog-post.ts
 *
 * Requires: DATABASE_URL, ANTHROPIC_API_KEY in env
 */
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../app/.server/db";

const anthropic = new Anthropic();

// Posts remaining in the series (in order)
const SERIES_POSTS = [
  {
    slug: "mcp-disenadores-obsoletos",
    title:
      "Tres letras separan a los diseñadores que usan IA de los que quedarán obsoletos: MCP",
    tags: ["IA", "MCP", "diseño", "carrera", "easybits"],
    mainTag: "IA",
    prompt: `Escribe el post 3 de una serie de 5 sobre MCP para diseñadores.

**Título**: "Tres letras separan a los diseñadores que usan IA de los que quedarán obsoletos: MCP"

**Enfoque**: Por qué MCP es un parteaguas en la carrera del diseñador. No es hype — es el cambio de paradigma de "usar IA para generar" a "usar IA para ejecutar". Comparar diseñadores que solo usan IA como herramienta vs los que la conectan a su flujo real. Qué skills se devalúan, cuáles se revalorizan.

**Contexto de la serie**:
- Post 1 (ya publicado): /blog/mcp-disenadores-ia — Introdujo MCP, las 3 conexiones (Figma MCP, EasyBits MCP, Chrome MCP)
- Post 2 (ya publicado): /blog/mcp-figma-productos-disenador — Deep dive en Figma MCP y el pipeline diseño→código→publicación`,
  },
  {
    slug: "mcp-disenadores-sin-developers",
    title:
      "Por qué algunos diseñadores ya no necesitan developers (y qué es MCP)",
    tags: ["MCP", "diseño", "autonomía", "productividad", "easybits"],
    mainTag: "diseño",
    prompt: `Escribe el post 4 de una serie de 5 sobre MCP para diseñadores.

**Título**: "Por qué algunos diseñadores ya no necesitan developers (y qué es MCP)"

**Enfoque**: Casos concretos de lo que un diseñador puede hacer solo con MCP: publicar una landing, crear una presentación interactiva, auditar accesibilidad, generar documentación de design system. No es anti-developer — es sobre autonomía para proyectos donde no necesitas un equipo completo. El diseñador como creador independiente.

**Contexto de la serie**:
- Post 1: /blog/mcp-disenadores-ia — Introdujo MCP y las 3 conexiones
- Post 2: /blog/mcp-figma-productos-disenador — Pipeline Figma→código→publicación
- Post 3: /blog/mcp-disenadores-obsoletos — Por qué MCP es parteaguas en la carrera`,
  },
  {
    slug: "mcp-disenadores-publican-sin-permiso",
    title: "Diseñadores que publican sin pedir permiso a nadie. Así funciona MCP.",
    tags: ["MCP", "diseño", "publicación", "agentes", "easybits"],
    mainTag: "MCP",
    prompt: `Escribe el post 5 (final) de una serie de 5 sobre MCP para diseñadores.

**Título**: "Diseñadores que publican sin pedir permiso a nadie. Así funciona MCP."

**Enfoque**: Cierre de la serie. Resumen del viaje: de entregar archivos a publicar productos. Visión de futuro: el diseñador como orquestador de agentes. Invitación a empezar hoy. Este post debe sentirse como un manifiesto — motivacional pero con sustancia. Incluir referencias a los posts anteriores de la serie.

**Contexto de la serie**:
- Post 1: /blog/mcp-disenadores-ia — Introdujo MCP y las 3 conexiones
- Post 2: /blog/mcp-figma-productos-disenador — Pipeline Figma→código→publicación
- Post 3: /blog/mcp-disenadores-obsoletos — MCP como parteaguas en la carrera
- Post 4: /blog/mcp-disenadores-sin-developers — Autonomía del diseñador con MCP`,
  },
];

const SYSTEM_PROMPT = `Eres el escritor del blog de FixterGeek / EasyBits. Escribes en español mexicano profesional e internacional (NUNCA voseo argentino). Tono directo, cercano, sin ser informal en exceso. Usas "tú".

REGLAS ESTRICTAS:
- Estructura de caso de estudio con 4 secciones: El Problema, La Solución, El Resultado, Conclusión
- Cada sección lleva un subtítulo de una línea (### debajo del ## de sección)
- MÁXIMO 1200 palabras. Posts concisos y escaneables.
- Usa separadores --- entre secciones
- Usa emojis como bullets donde ayude (🎨 ⚡ 🌐 ✅ 🧩)
- Negritas en conceptos clave
- Listas y bullets, no párrafos largos
- NO inventes anécdotas, amigos ficticios ni aventuras falsas
- CTA a YouTube (https://youtube.com/@BlissmoHQ) entre El Problema y La Solución, de forma natural con separadores ---
- CTA a EasyBits.cloud en la Conclusión (como MCP que pueden conectar hoy, NO mezclarlo con Figma)
- Mencionar /ftc (github.com/blissito/figma-to-code) cuando sea relevante hablar de Figma MCP
- Firma al final: "Abrazo. bliss."
- NO empieces con "# Título" — el título se agrega aparte
- La audiencia son millennials mexicanos diseñadores, NO developers. Lenguaje accesible.
- EasyBits MCP es para publicar (presentaciones, docs, landing pages, storage S3). Figma MCP es para leer diseños. Son cosas DIFERENTES, no los mezcles.`;

async function main() {
  // Find next unpublished post in series
  const existingSlugs = (
    await db.post.findMany({
      where: { slug: { in: SERIES_POSTS.map((p) => p.slug) } },
      select: { slug: true },
    })
  ).map((p) => p.slug);

  const nextPost = SERIES_POSTS.find((p) => !existingSlugs.includes(p.slug));

  if (!nextPost) {
    console.log("✅ Todos los posts de la serie ya están publicados.");
    return;
  }

  console.log(`📝 Generando: "${nextPost.title}"...`);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: nextPost.prompt,
      },
    ],
  });

  const body =
    message.content[0].type === "text" ? message.content[0].text.trim() : "";

  if (!body) {
    console.error("❌ Claude no generó contenido");
    process.exit(1);
  }

  console.log(`📄 Generado (${body.split(/\s+/).length} palabras)`);

  // Save to DB
  const post = await db.post.create({
    data: {
      slug: nextPost.slug,
      title: nextPost.title,
      body,
      published: true,
      authorName: "Héctorbliss",
      authorAt: "@blissmo",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",
      tags: nextPost.tags,
      mainTag: nextPost.mainTag,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`✅ Publicado: /blog/${post.slug}`);
  console.log(`   ID: ${post.id}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
