import { db } from "../app/.server/db";

const workflowPatternsContent = `
Los agentes de IA no son magia, son patrones de diseño bien ejecutados. Después de construir varios sistemas agénticos, estos son los patrones fundamentales que todo desarrollador debería conocer.

## 1. ReAct (Reason + Act)

El patrón más básico y poderoso. El agente alterna entre razonar y actuar.

\`\`\`
Pensamiento: Necesito encontrar el archivo de configuración
Acción: Buscar archivos con nombre "config"
Observación: Encontré config.ts y config.json
Pensamiento: config.ts parece ser el principal
Acción: Leer config.ts
Observación: [contenido del archivo]
Pensamiento: Ahora puedo responder la pregunta
\`\`\`

### Implementación conceptual:

\`\`\`typescript
async function reactLoop(task: string) {
  let context = task;

  while (true) {
    const thought = await llm.think(context);

    if (thought.isComplete) {
      return thought.answer;
    }

    const action = await llm.decideAction(thought);
    const observation = await executeAction(action);

    context += \`
      Pensamiento: \${thought.reasoning}
      Acción: \${action.name}
      Observación: \${observation}
    \`;
  }
}
\`\`\`

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## 2. Chain of Thought (CoT)

Forzar al modelo a razonar paso a paso antes de responder.

\`\`\`typescript
const prompt = \`
Problema: El usuario quiere migrar de REST a GraphQL.

Piensa paso a paso:
1. ¿Cuáles son los endpoints actuales?
2. ¿Qué queries y mutations necesitamos?
3. ¿Cómo mapeamos los tipos?
4. ¿Cuál es el plan de migración?

Ahora responde:
\`;
\`\`\`

## 3. Tool Use (Function Calling)

El agente tiene acceso a herramientas que puede invocar.

\`\`\`typescript
const tools = [
  {
    name: "readFile",
    description: "Lee el contenido de un archivo",
    parameters: { path: "string" },
  },
  {
    name: "writeFile",
    description: "Escribe contenido a un archivo",
    parameters: { path: "string", content: "string" },
  },
  {
    name: "runCommand",
    description: "Ejecuta un comando de terminal",
    parameters: { command: "string" },
  },
];

// El LLM decide qué herramienta usar
const decision = await llm.chat({
  messages: [{ role: "user", content: "Añade TypeScript al proyecto" }],
  tools,
});

// decision.tool_calls = [
//   { name: "runCommand", arguments: { command: "npm install typescript" } }
// ]
\`\`\`

## 4. Reflexion

El agente evalúa su propio trabajo y mejora iterativamente.

\`\`\`typescript
async function reflexionLoop(task: string) {
  let attempt = await agent.execute(task);

  for (let i = 0; i < 3; i++) {
    const critique = await agent.evaluate(attempt);

    if (critique.isGood) {
      return attempt;
    }

    attempt = await agent.improve(attempt, critique.feedback);
  }

  return attempt;
}
\`\`\`

## 5. Multi-Agent

Múltiples agentes especializados colaborando.

\`\`\`typescript
const architect = new Agent({
  role: "Diseña la arquitectura y delega tareas",
  tools: ["createPlan", "assignTask"],
});

const coder = new Agent({
  role: "Implementa código según especificaciones",
  tools: ["readFile", "writeFile"],
});

const reviewer = new Agent({
  role: "Revisa código y sugiere mejoras",
  tools: ["readFile", "runTests"],
});

// Flujo de trabajo
const plan = await architect.createPlan(task);
const implementation = await coder.implement(plan);
const review = await reviewer.review(implementation);
\`\`\`

## 6. Planning + Execution

Separar la planificación de la ejecución.

\`\`\`typescript
// Fase 1: Plan
const plan = await planner.createPlan(\`
  Objetivo: Añadir autenticación OAuth
  Restricciones: Usar NextAuth, mantener sesiones existentes
\`);

// plan = [
//   { step: 1, action: "Instalar next-auth" },
//   { step: 2, action: "Crear [...nextauth].ts" },
//   { step: 3, action: "Configurar providers" },
//   { step: 4, action: "Actualizar middleware" },
// ]

// Fase 2: Aprobación del usuario
await showPlanToUser(plan);
const approved = await waitForApproval();

// Fase 3: Ejecución
if (approved) {
  for (const step of plan) {
    await executor.execute(step);
  }
}
\`\`\`

## Cuándo usar cada patrón

| Patrón | Caso de uso |
|--------|-------------|
| ReAct | Tareas exploratorias, debugging |
| CoT | Razonamiento complejo |
| Tool Use | Integración con sistemas externos |
| Reflexion | Generación de código, escritura |
| Multi-Agent | Sistemas complejos, especialización |
| Plan+Execute | Tareas con riesgo, user-in-the-loop |

## Conclusión

Los agentes de IA son combinaciones de estos patrones fundamentales. Entenderlos te permite:

1. Diseñar sistemas más robustos
2. Debuggear cuando algo falla
3. Optimizar costos (menos llamadas al LLM)
4. Crear experiencias predecibles

El futuro del desarrollo incluye orquestar estos patrones. Empieza a experimentar con ellos hoy.

Abrazo. Blissmo. 🤓
`;

async function main() {
  console.log("Importando post de Agent Workflow Patterns...");

  const slug = "Agent-Workflow-Patterns-Patrones-para-Agentes-IA";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "Agent Workflow Patterns: Patrones para Agentes IA",
        body: workflowPatternsContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@blissmo",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        tags: ["agentes", "ia", "patrones", "llm", "arquitectura"],
        mainTag: "AI",
        coverImage: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&h=630&fit=crop",
        metaImage: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&h=630&fit=crop",
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
      title: "Agent Workflow Patterns: Patrones para Agentes IA",
      body: workflowPatternsContent.trim(),
      published: true,
      authorName: "Héctorbliss",
      authorAt: "@blissmo",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",
      tags: ["agentes", "ia", "patrones", "llm", "arquitectura"],
      mainTag: "AI",
      coverImage: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&h=630&fit=crop",
      metaImage: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&h=630&fit=crop",
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
