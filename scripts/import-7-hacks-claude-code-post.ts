import { db } from "../app/.server/db";

const hacksContent = `
Estos no son los tips básicos que encuentras en cualquier tutorial. Son técnicas avanzadas que descubrí después de meses de uso intensivo.

## 1. --max-budget-usd: El seguro contra sustos

En CI/CD o tareas largas, limita cuánto puede gastar Claude:

\`\`\`bash
claude -p "Refactoriza todo el módulo de auth" --max-budget-usd 5.00
\`\`\`

Claude se detiene automáticamente si alcanza el presupuesto. **Crítico** para pipelines automatizados donde un loop infinito puede costarte cientos de dólares.

## 2. Async Hooks: Tests en background

Los hooks pueden correr **sin bloquear** a Claude. Mientras él sigue trabajando, tus tests corren en paralelo:

\`\`\`json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npm test &",
            "async": true
          }
        ]
      }
    ]
  }
}
\`\`\`

El resultado se inyecta en el siguiente turno. Claude se entera si los tests fallan sin haber esperado.

## 3. PreCompact Hook: Backup antes de olvidar

Claude comprime el contexto automáticamente. Con este hook, guardas una copia **antes** de que olvide:

\`\`\`json
{
  "hooks": {
    "PreCompact": [
      {
        "matcher": "auto",
        "hooks": [
          {
            "type": "command",
            "command": "cp ~/.claude/transcript.md ~/backups/transcript-$(date +%s).md"
          }
        ]
      }
    ]
  }
}
\`\`\`

Útil para auditoría o para recuperar contexto que Claude "olvidó".

---

📚 **¿Quieres dominar estas técnicas?** Escribí un libro completo sobre Claude Code. [Descárgalo gratis aquí](/libros/domina_claude_code).

---

## 4. --fork-session: Explorar sin miedo

¿Quieres probar un approach diferente sin perder tu progreso actual?

\`\`\`bash
claude --resume abc123 --fork-session
\`\`\`

Crea una **rama** de tu sesión. Puedes explorar una solución alternativa y si no funciona, volver al original intacto.

## 5. Agent Hooks: Verificación inteligente

En lugar de un simple comando, usa un **subagente** para verificar antes de terminar:

\`\`\`json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "agent",
            "prompt": "Verifica que todos los tests pasen y no hay errores de TypeScript. Si hay problemas, repórtalos.",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
\`\`\`

El subagente inspecciona el estado real del proyecto antes de que Claude declare "listo".

## 6. JSON Schema Output: Automatización robusta

Para scripts que consumen la salida de Claude, fuerza un schema:

\`\`\`bash
claude -p "Lista las funciones exportadas de auth.ts" \\
  --output-format json \\
  --json-schema '{"type":"object","properties":{"functions":{"type":"array","items":{"type":"string"}}},"required":["functions"]}'
\`\`\`

La salida **siempre** cumple el schema. Perfecto para pipelines donde necesitas parsear la respuesta.

## 7. Context7 MCP: Documentación actualizada

El MCP más útil que nadie menciona. Claude puede leer la documentación **actual** de cualquier librería:

\`\`\`json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@anthropic/context7-mcp"]
    }
  }
}
\`\`\`

Ahora puedes decir: "Lee la documentación actual de React Router v7 y migra este componente". Sin alucinaciones sobre APIs deprecadas.

👉 [Tutorial: Diseños en Figma con MCP](/blog/como-crear-disenos-en-figma-con-ia-usando-talk-to-figma-mcp)

---

🎬 **¿Prefieres video?** Tutoriales en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Bonus: Variables de entorno ocultas

\`\`\`bash
# Fuerza compactación más agresiva (50% en vez de 95%)
export CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50

# Ejecuta herramientas en paralelo (más rápido)
export CLAUDE_PARALLEL_TOOLS=true

# Desactiva llamadas no esenciales (ahorra tokens)
export DISABLE_NON_ESSENTIAL_MODEL_CALLS=1
\`\`\`

## ¿Quieres profundizar?

En el **Taller de Claude Code** cubrimos:

- Hooks avanzados y automatización
- SDK para integración programática
- MCPs para multiplicar capacidades

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
