import { db } from "../app/.server/db";

const postContent = `
Cuando empecé a usar Claude Code en serio, mi \`CLAUDE.md\` tenía 12 líneas. Seis meses después tenía más de mil.

Cada problema que resolvía se convertía en una nueva sección. Cada convención del equipo, un nuevo párrafo. Cada herramienta que integrábamos, un bloque de código de referencia. El archivo se convirtió en un wiki, un diario de desarrollo, una lista de TODOs y un manual de onboarding — todo al mismo tiempo.

El resultado fue predecible: Claude empezó a ignorar las instrucciones importantes. No porque fuera incapaz, sino porque estaban enterradas entre 900 líneas de contexto irrelevante.

Un día lo borré casi todo. Lo reduje a un párrafo. Y mi productividad mejoró.

## CLAUDE.md no es documentación

Este es el error más común. Tratamos \`CLAUDE.md\` como si fuera un README, un wiki interno, o peor — un archivo de notas personales.

Pero \`CLAUDE.md\` es otra cosa. Es **la arquitectura de decisiones de tu agente**. Cada línea que agregas es una instrucción que consume tokens del contexto. Cada sección es una restricción que Claude debe procesar antes de escribir una sola línea de código.

Si tu \`CLAUDE.md\` tiene información que Claude puede descubrir leyendo tu código (la estructura de carpetas, qué framework usas, cómo se llaman tus componentes), estás desperdiciando contexto en duplicar lo que ya existe.

## Los anti-patrones que descubrí

Después de experimentar con archivos de todos los tamaños, identifiqué cuatro patrones que **no** funcionan:

### El "Diario"

\`\`\`markdown
### Actualizaciones Septiembre 12, 2025
- Se agregó FloatingPromo widget
- Se actualizó la homepage

### Actualizaciones Agosto 31, 2025
- Nueva ruta /gemini
- Navbar actualizada
\`\`\`

Este patrón convierte tu \`CLAUDE.md\` en un changelog. El problema: Claude no necesita saber *cuándo* cambiaste algo. Necesita saber *qué es verdad ahora*. Cada entrada histórica es ruido que diluye las instrucciones actuales.

### El "Wiki"

\`\`\`markdown
## Generación de PDFs
Para generar PDFs profesionales usa ReportLab:

pip3 install reportlab

### Método de Generación
from reportlab.lib.pagesizes import letter
...
\`\`\`

Cincuenta líneas explicando cómo usar una librería de Python. Claude puede leer el script directamente. Duplicar documentación técnica en \`CLAUDE.md\` no solo gasta tokens — crea el riesgo de que la copia se desincronice del código real.

### El "Cajón de sastre"

\`\`\`markdown
## TODO: Regenerar chunks de video
## TODO: Habilitar HLS en courseViewer
## TODO: Cron de backup automático
## TODO: Corregir títulos de videos
\`\`\`

Los TODOs no son instrucciones para Claude. Son recordatorios para ti. Cada TODO que agregas le dice a Claude "esto es importante", pero rara vez lo es para la tarea actual. Usa issues en GitHub o un archivo separado.

### El "Paranoico"

\`\`\`markdown
## PROHIBIDO - NUNCA EJECUTAR (CRÍTICO)

**NUNCA, BAJO NINGUNA CIRCUNSTANCIA, ejecutar estos comandos:**

prisma db push --force-reset  ← PROHIBIDO
prisma migrate reset           ← PROHIBIDO
db.dropDatabase()              ← PROHIBIDO
db.collection.drop()           ← PROHIBIDO

**Si hay conflictos con Prisma:**
1. NUNCA usar --force-reset o --accept-data-loss
2. Investigar el error específico primero
3. Preguntar al usuario antes de cualquier acción en la DB
4. Si hay índices duplicados, arreglarlos manualmente
5. En caso de duda, NO HACER NADA
\`\`\`

Veinte líneas para decir una cosa. El miedo post-trauma genera paredes de texto. Pero la redundancia no hace una instrucción más efectiva — la hace más fácil de ignorar.

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Los 4 patrones que sí funcionan

Después de reducir mi archivo de mil líneas a un párrafo, descubrí que las instrucciones efectivas comparten cuatro características.

### 1. The Safety Net — Una línea que previene catástrofes

\`\`\`markdown
**PROHIBIDO ejecutar \\\`prisma db push --force-reset\\\`, \\\`prisma migrate reset\\\`,
\\\`db.dropDatabase()\\\` o \\\`db.collection.drop()\\\`; ante conflictos, investigar
y preguntar, NUNCA usar \\\`--force-reset\\\` ni \\\`--accept-data-loss\\\`.**
\`\`\`

Una oración. Cubre todos los comandos peligrosos, la alternativa (investigar), y el principio (preguntar antes de actuar). No necesitas la historia de por qué — Claude no necesita motivación emocional para seguir instrucciones.

### 2. The Stack Declaration — Elimina ambigüedad técnica

\`\`\`markdown
React Router v7 (NUNCA Remix ni imports de remix) sobre Vite, MongoDB con
Prisma, Tailwind CSS, Stripe, Amazon SES, Motion (motion/react), deploy
en Fly.io con Docker (HOST=0.0.0.0, PORT=3000).
\`\`\`

El paréntesis \`(NUNCA Remix ni imports de remix)\` es crítico. Sin él, Claude ocasionalmente genera \`import { json } from "@remix-run/node"\` porque en su entrenamiento, React Router y Remix comparten mucha sintaxis. Una aclaración previene docenas de correcciones futuras.

### 3. The Decision Record — El POR QUÉ, no el QUÉ

\`\`\`markdown
Rutas en \\\`app/routes.ts\\\`, utilidades backend en archivos \\\`.server.tsx\\\`,
preferir componentes existentes sobre crear nuevos.
\`\`\`

No dice "así funciona React Router v7" (eso Claude ya lo sabe). Dice **qué decisiones arquitecturales hemos tomado**. La convención de \`.server.tsx\` y la preferencia por reutilizar componentes son decisiones del equipo que Claude no puede inferir del código.

### 4. The Output Contract — Cómo debe verse el resultado

\`\`\`markdown
Posts del blog: storytelling (narrativa con arco, NO listas de tips),
firma "Abrazo. Blissmo. 🤓" solo para Héctorbliss, incluir CTA al canal
de YouTube en transiciones naturales.
\`\`\`

Esto no es documentación del blog — es un **contrato de calidad**. Le dice a Claude exactamente qué formato seguir cuando genera contenido. Sin esto, cada post saldría diferente.

## El CLAUDE.md de un párrafo

Este es el archivo completo que uso hoy:

\`\`\`markdown
# FixterGeek

React Router v7 (NUNCA Remix ni imports de remix) sobre Vite, MongoDB con
Prisma, Tailwind CSS, Stripe, Amazon SES, Motion (motion/react), deploy en
Fly.io con Docker (HOST=0.0.0.0, PORT=3000). **PROHIBIDO ejecutar
\\\`prisma db push --force-reset\\\`, \\\`prisma migrate reset\\\`,
\\\`db.dropDatabase()\\\` o \\\`db.collection.drop()\\\`; ante conflictos de Prisma,
investigar y preguntar, NUNCA usar \\\`--force-reset\\\` ni \\\`--accept-data-loss\\\`.**
Rutas en \\\`app/routes.ts\\\`, utilidades backend en archivos \\\`.server.tsx\\\`,
preferir componentes existentes sobre crear nuevos. Posts del blog:
storytelling (narrativa con arco, NO listas de tips), firma "Abrazo. Blissmo. 🤓"
solo para Héctorbliss, incluir CTA al canal de YouTube en transiciones
naturales. Libros: leer prólogo primero, ejemplos en español. AI SDK v6:
usar \\\`DefaultChatTransport\\\`, \\\`sendMessage({ text })\\\`, \\\`message.parts\\\`,
\\\`status\\\` (no \\\`isLoading\\\`). Contacto: brenda@fixter.org.
\`\`\`

Cada oración tiene una función. Ninguna duplica información que Claude puede encontrar en el código. Todas son decisiones, restricciones o contratos — nunca documentación.

## CLAUDE.md para equipos

Si trabajas en equipo, Claude Code soporta tres niveles de configuración:

1. **\`~/.claude/CLAUDE.md\`** — Personal. Tus preferencias de estilo, atajos, convenciones personales.
2. **\`CLAUDE.md\` en la raíz del repo** — Proyecto. El stack, las prohibiciones, los contratos de calidad.
3. **\`CLAUDE.md\` en subdirectorios** — Módulo. Reglas específicas para un subsistema.

La regla de oro: **cada nivel solo contiene lo que no puede estar en otro nivel**. Si es una decisión del proyecto, va en el repo. Si es preferencia personal, va en tu home. Si es específico de un módulo, va en el subdirectorio.

Un buen test: si llega un desarrollador nuevo al equipo, ¿puede copiar el \`CLAUDE.md\` del repo y ser productivo inmediatamente? Si necesita leer 200 líneas de contexto histórico para entender las instrucciones, el archivo necesita una poda.

## Lo que aún no resuelvo

Seré honesto: no tengo todas las respuestas.

**¿Cuál es la longitud ideal?** No lo sé. Mi párrafo funciona para un proyecto con convenciones claras y un solo desarrollador principal. Para un equipo grande, probablemente necesites más estructura — pero sigo convencido de que menos de 50 líneas es el objetivo correcto.

**¿Dónde van los TODOs?** Los moví a GitHub Issues. Pero a veces extraño tenerlos visibles cuando Claude está trabajando. Estoy experimentando con un archivo separado \`TODO.md\` que Claude puede leer bajo demanda.

**¿Cómo mides si funciona?** No tengo métricas formales. Mi indicador informal: si Claude genera código que necesita correcciones por ignorar convenciones, el \`CLAUDE.md\` necesita ajustes. Si Claude genera código correcto pero lento (muchos tokens procesados), el archivo es demasiado largo.

## La pregunta que deberías hacerte

Abre tu \`CLAUDE.md\` ahora. Si tiene más de 50 líneas, probablemente tienes documentación disfrazada de arquitectura.

Cada línea extra es contexto que Claude procesa en cada turno. Cada sección es una decisión compitiendo por atención. El archivo más corto que capture tus restricciones reales es el archivo más efectivo.

No es minimalismo por estética — es ingeniería de contexto.

📚 Si quieres profundizar en estas técnicas y muchas más, tenemos un [libro completo sobre Claude Code](/libros/domina_claude_code) que puedes descargar gratis.

Abrazo. Blissmo. 🤓
`;

async function main() {
  console.log("Importando post de CLAUDE.md Arquitectura...");

  const slug = "CLAUDE-md-el-archivo-que-controla-como-piensa-tu-agente-de-IA";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  const postData = {
    title: "CLAUDE.md: El archivo que controla cómo piensa tu agente de IA",
    body: postContent.trim(),
    published: true,
    authorName: "Héctorbliss",
    authorAt: "@blissmo",
    photoUrl: "https://i.imgur.com/TaDTihr.png",
    authorAtLink: "https://twitter.com/HectorBlisS",
    tags: ["claude-code", "productividad", "ai", "arquitectura"],
    mainTag: "AI",
    coverImage:
      "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=1200&h=630&fit=crop",
    metaImage:
      "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=1200&h=630&fit=crop",
  };

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: postData,
    });
    console.log("✅ Post actualizado exitosamente!");
    console.log(`   ID: ${post.id}`);
    console.log(`   URL: /blog/${post.slug}`);
    return;
  }

  const post = await db.post.create({
    data: {
      slug,
      ...postData,
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
