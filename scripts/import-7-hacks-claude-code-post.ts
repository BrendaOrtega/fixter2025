import { db } from "../app/.server/db";

const hacksContent = `
Después de meses usando Claude Code diariamente, descubrí patrones que no están en la documentación oficial.

## 1. CLAUDE.md estratégico

Claude lee automáticamente \`CLAUDE.md\` en la raíz de tu proyecto. No pongas reglas genéricas—incluye **decisiones ya tomadas**:

\`\`\`markdown
# CLAUDE.md

## Decisiones FINALES (no cambiar)
- Auth: JWT en httpOnly cookies (NO localStorage)
- ORM: Prisma (NO TypeORM, NO Drizzle)
- Estilos: Tailwind (NO CSS modules)

## Errores comunes en este proyecto
- El middleware de auth está en /lib, no en /middleware
- Los tests usan vitest, no jest
\`\`\`

Esto evita que Claude cuestione decisiones o proponga alternativas que ya descartaste.

## 2. /compact antes de perder contexto

Cuando Claude empieza a olvidar lo que hicieron juntos:

\`\`\`
/compact
\`\`\`

Comprime la conversación a ~30% manteniendo decisiones clave y archivos modificados. Úsalo cada 20-30 interacciones en sesiones largas.

## 3. MCP servers: el multiplicador

Claude Code puede conectarse a herramientas externas via MCP. En \`~/.claude/settings.json\`:

\`\`\`json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-filesystem", "/ruta/a/docs"]
    },
    "figma": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--stdio"]
    }
  }
}
\`\`\`

Con **filesystem** Claude lee archivos fuera de tu proyecto. Con **Figma** puedes decir: "Extrae los colores del diseño y crea variables CSS". Otros MCPs útiles: GitHub, PostgreSQL, Slack.

👉 [Tutorial completo: Diseños en Figma con IA usando MCP](/blog/como-crear-disenos-en-figma-con-ia-usando-talk-to-figma-mcp)

---

📚 **¿Quieres dominar estas técnicas?** Escribí un libro completo sobre Claude Code. [Descárgalo gratis aquí](/libros/domina_claude_code).

---

## 4. Hooks para automatizar

Los hooks se configuran dentro de \`settings.json\` (no en archivo separado). Ejemplo para formatear código automáticamente:

\`\`\`json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write $FILE_PATH"
          }
        ]
      }
    ]
  }
}
\`\`\`

Eventos disponibles: \`PreToolUse\`, \`PostToolUse\`, \`UserPromptSubmit\`, \`Notification\`, y más. Usa \`/hooks\` para configurarlos interactivamente.

## 5. Subagentes para tareas paralelas

Para tareas independientes que pueden correr en paralelo:

\`\`\`
Necesito:
1. Migrar la base de datos (puede tardar)
2. Actualizar los tests
3. Regenerar los tipos

Lanza subagentes para las tareas independientes y repórtame cuando terminen.
\`\`\`

Claude lanzará agentes en paralelo. Útil para operaciones lentas como búsquedas extensas o procesamiento de múltiples archivos.

## 6. El patrón "lee → planea → ejecuta"

Para cambios grandes, fuerza este orden explícitamente:

\`\`\`
1. Lee auth.ts y todos los archivos que importa
2. Planea cómo añadir refresh tokens (muéstrame el plan, sin código)
3. Espera mi aprobación antes de escribir cualquier código
\`\`\`

Esto evita que Claude escriba código que no encaja con tu arquitectura existente.

## 7. Debugging con trazabilidad

En lugar de "el login no funciona", da contexto estructurado:

\`\`\`
Bug: El login devuelve 200 pero req.user es undefined.

Traza el flujo:
1. ¿El token se genera correctamente en /login?
2. ¿Se envía en el header Authorization?
3. ¿El middleware lo decodifica?

Lee los archivos relevantes y dime dónde se rompe.
\`\`\`

Esto guía a Claude a investigar sistemáticamente en lugar de adivinar.

---

🎬 **¿Prefieres video?** Tutoriales en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## ¿Quieres profundizar?

En el **Taller de Claude Code** cubrimos:

- Gestión de contexto en proyectos grandes
- SDK para automatización programática
- Configuración avanzada de MCP servers

👉 [Ver temario del taller](/claude)

Abrazo. bliss.
`;

async function main() {
  console.log("Importando post de 7 Hacks para Claude Code...");

  const slug = "Mis-7-Hacks-para-Claude-Code";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "Mis 7 Hacks para Claude Code",
        body: hacksContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@blissmo",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        tags: ["claude-code", "productividad", "tips", "ai", "desarrollo"],
        mainTag: "AI",
        coverImage: "https://images.unsplash.com/photo-1550439062-609e1531270e?w=1200&h=630&fit=crop",
        metaImage: "https://images.unsplash.com/photo-1550439062-609e1531270e?w=1200&h=630&fit=crop",
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
      title: "Mis 7 Hacks para Claude Code",
      body: hacksContent.trim(),
      published: true,
      authorName: "Héctorbliss",
      authorAt: "@blissmo",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",
      tags: ["claude-code", "productividad", "tips", "ai", "desarrollo"],
      mainTag: "AI",
      coverImage: "https://images.unsplash.com/photo-1550439062-609e1531270e?w=1200&h=630&fit=crop",
      metaImage: "https://images.unsplash.com/photo-1550439062-609e1531270e?w=1200&h=630&fit=crop",
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
