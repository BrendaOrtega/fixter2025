import { db } from "../app/.server/db";

const opencodePostContent = `
OpenCode es un CLI de código abierto para programación asistida por IA, lanzado por Anthropic como alternativa de código abierto a Claude Code. Si eres desarrollador y te interesa entender cómo funcionan los agentes de IA por dentro, este repositorio es una mina de oro.

## 1. Es 100% código abierto

A diferencia de otras herramientas de IA para programación, OpenCode está completamente abierto en GitHub. Puedes:

- Estudiar cómo funciona internamente
- Modificarlo para tus necesidades específicas
- Contribuir mejoras a la comunidad
- Entender los patrones de diseño de agentes de IA

\`\`\`bash
git clone https://github.com/anthropics/opencode
cd opencode
npm install
\`\`\`

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## 2. Arquitectura de agentes moderna

OpenCode implementa patrones de agentes que son el estándar de la industria:

- **Tool use**: El agente puede ejecutar herramientas como leer archivos, escribir código, ejecutar comandos
- **Context management**: Manejo inteligente del contexto para maximizar la ventana de 200K tokens
- **Multi-turn conversations**: Conversaciones de múltiples turnos con memoria persistente

\`\`\`typescript
// Ejemplo conceptual del patrón de herramientas
const tools = {
  readFile: async (path: string) => {
    return fs.readFileSync(path, 'utf-8');
  },
  writeFile: async (path: string, content: string) => {
    fs.writeFileSync(path, content);
  },
  bash: async (command: string) => {
    return execSync(command).toString();
  }
};
\`\`\`

## 3. Aprende a construir tus propios agentes

El código de OpenCode es una clase magistral sobre cómo construir agentes de IA. Puedes aprender:

- Cómo estructurar prompts de sistema efectivos
- Patrones de retry y manejo de errores
- Cómo implementar streaming de respuestas
- Gestión de estado en agentes conversacionales

## 4. Compatibilidad con múltiples modelos

Aunque está optimizado para Claude, la arquitectura de OpenCode permite trabajar con diferentes proveedores de LLM:

\`\`\`bash
# Usar con Claude (por defecto)
opencode

# Configurar para otros modelos
export OPENCODE_MODEL=gpt-4
\`\`\`

## 5. Comunidad activa y documentación excelente

El repositorio tiene:

- Documentación detallada de la API
- Ejemplos de uso para diferentes casos
- Issues bien gestionados con labels claros
- Discussions activas para preguntas y propuestas

## Cómo empezar

\`\`\`bash
# Instalar globalmente
npm install -g @anthropic/opencode

# Configurar tu API key
export ANTHROPIC_API_KEY=tu_api_key

# Ejecutar en cualquier proyecto
cd tu-proyecto
opencode
\`\`\`

## Conclusión

Si te interesa la programación asistida por IA, estudiar el código de OpenCode te dará una comprensión profunda de cómo funcionan estos sistemas. Es código de producción, mantenido por Anthropic, y representa el estado del arte en agentes de programación.

El futuro del desarrollo de software involucra herramientas como esta. Aprenderlas ahora te posiciona para aprovechar esta revolución tecnológica.

Abrazo. bliss.
`;

async function main() {
  console.log("Importando post de OpenCode...");

  const slug = "OpenCode-5-Razones-por-las-que-este-Repositorio-te-Interesa";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "OpenCode: 5 Razones por las que este Repositorio te Interesa",
        body: opencodePostContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@blissmo",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        tags: ["opencode", "claude", "ai", "opensource", "agentes"],
        mainTag: "AI",
        coverImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop",
        metaImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop",
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
      title: "OpenCode: 5 Razones por las que este Repositorio te Interesa",
      body: opencodePostContent.trim(),
      published: true,
      authorName: "Héctorbliss",
      authorAt: "@blissmo",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",
      tags: ["opencode", "claude", "ai", "opensource", "agentes"],
      mainTag: "AI",
      coverImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop",
      metaImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop",
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
