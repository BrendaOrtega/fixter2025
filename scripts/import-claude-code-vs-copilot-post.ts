import { db } from "../app/.server/db";

const comparisonPostContent = `
La batalla por ser tu copiloto de programación con IA está más intensa que nunca. Vamos a comparar las tres opciones más populares: Claude Code, GitHub Copilot y Cursor. Spoiler: cada uno tiene su lugar, pero hay un claro ganador para ciertos casos de uso.

## Comparación rápida

| Característica | Claude Code | GitHub Copilot | Cursor |
|---------------|-------------|----------------|--------|
| Tipo | CLI + Agente autónomo | Extensión IDE | IDE completo |
| Modelo | Claude Sonnet 4 / Opus 4.5 | GPT-4 / Claude | Claude / GPT-4 |
| Contexto | 200K tokens | ~8K tokens | ~128K tokens |
| Ejecución de código | ✅ Sí | ❌ No | ✅ Sí |
| Edición multi-archivo | ✅ Excelente | ⚠️ Limitado | ✅ Bueno |
| Precio | Pago por uso | $10/mes | $20/mes |

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Claude Code: El agente autónomo

Claude Code es fundamentalmente diferente. No es solo autocompletado, es un agente que puede:

- **Ejecutar comandos** en tu terminal
- **Leer y escribir archivos** de forma autónoma
- **Navegar tu codebase** completo
- **Crear commits** y PRs

\`\`\`bash
# Instalación
npm install -g @anthropic-ai/claude-code

# Uso básico
claude "Refactoriza el módulo de autenticación para usar JWT"
\`\`\`

**Ideal para:** Tareas complejas que requieren múltiples pasos, refactorizaciones grandes, exploración de codebases nuevos.

## GitHub Copilot: El autocompletado inteligente

Copilot brilla en lo que hace: sugerencias de código en tiempo real mientras escribes.

\`\`\`javascript
// Escribes un comentario...
// Función que valida un email

// Copilot sugiere automáticamente:
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
\`\`\`

**Ventajas:**
- Integración perfecta con VS Code y otros IDEs
- Sugerencias instantáneas sin interrumpir el flujo
- Funciona offline con modelos más pequeños

**Ideal para:** Escritura de código nuevo, boilerplate, funciones pequeñas.

## Cursor: El IDE con IA integrada

Cursor es un fork de VS Code con IA profundamente integrada. Ofrece:

- **Composer**: Para tareas multi-archivo
- **Chat contextual**: Con acceso a tu codebase completo
- **Tab autocomplete**: Similar a Copilot pero más potente

\`\`\`bash
# Cursor se instala como aplicación
# Disponible en cursor.so
\`\`\`

**Ideal para:** Desarrolladores que quieren una experiencia "todo en uno" sin configurar extensiones.

## ¿Cuándo usar cada uno?

### Usa Claude Code cuando:
- Necesitas refactorizar código en múltiples archivos
- Quieres que la IA ejecute comandos por ti (tests, builds, deploys)
- Estás explorando un codebase nuevo
- Necesitas contexto de 200K tokens

### Usa Copilot cuando:
- Escribes código nuevo línea por línea
- Quieres sugerencias sin salir de tu editor
- El presupuesto importa ($10/mes es más accesible)
- Trabajas con lenguajes bien soportados

### Usa Cursor cuando:
- Quieres un IDE completo con IA
- Prefieres no configurar extensiones
- Valoras la experiencia integrada
- Trabajas principalmente en un solo proyecto

## Mi stack personal

Uso los tres, cada uno para su propósito:

1. **Claude Code** para tareas grandes: "Migra este proyecto de React Query a TanStack Query"
2. **Copilot** activo en VS Code para el día a día
3. **Cursor** cuando necesito explorar código con chat contextual

## Conclusión

No hay un ganador absoluto. La herramienta correcta depende de la tarea:

- **Autocompletado rápido** → Copilot
- **Tareas autónomas complejas** → Claude Code
- **Experiencia integrada** → Cursor

Lo inteligente es dominar las tres y usar cada una en su contexto óptimo. El desarrollador del futuro no elige una herramienta, sabe cuándo usar cada una.

Abrazo. bliss.
`;

async function main() {
  console.log("Importando post de Claude Code vs Copilot vs Cursor...");

  const slug = "Claude-Code-vs-GitHub-Copilot-vs-Cursor-Cual-Elegir";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "Claude Code vs GitHub Copilot vs Cursor: ¿Cuál Elegir?",
        body: comparisonPostContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@blissmo",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        tags: ["claude-code", "copilot", "cursor", "ai", "productividad"],
        mainTag: "AI",
        coverImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop",
        metaImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop",
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
      title: "Claude Code vs GitHub Copilot vs Cursor: ¿Cuál Elegir?",
      body: comparisonPostContent.trim(),
      published: true,
      authorName: "Héctorbliss",
      authorAt: "@blissmo",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",
      tags: ["claude-code", "copilot", "cursor", "ai", "productividad"],
      mainTag: "AI",
      coverImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop",
      metaImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop",
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
