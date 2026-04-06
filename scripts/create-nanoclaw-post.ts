import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const body = `# Una de las grandes razones para preferir NanoClaw sobre OpenClaw

Si estás construyendo agentes de IA que viven en WhatsApp, Telegram o Slack, hay un bug invisible que puede arruinar tu experiencia de usuario sin que te des cuenta. Y la forma en que se resuelve dice mucho sobre la diferencia entre un framework serio y un proyecto abandonado.

## El Problema

### 200 mensajes en un solo prompt

Imagina esto: tu agente de WhatsApp lleva semanas funcionando perfecto. Un día reinicias el servidor (actualización, mantenimiento, lo que sea) y de pronto notas que tarda el doble en responder. Las respuestas son raras — menciona conversaciones de hace días, mezcla contextos, y el costo de tokens se dispara.

¿Qué pasó?

Cuando un agente procesa mensajes, necesita saber **dónde se quedó**. Lleva un cursor interno: "ya procesé hasta este mensaje, ahora solo necesito los nuevos". Pero cuando el servidor se reinicia, ese cursor se puede perder. Y sin cursor, el agente hace lo único que puede hacer: **pedir todos los mensajes disponibles**.

En la práctica, eso significa que tu agente recibe 200 mensajes de golpe como prompt. Conversaciones completas de días o semanas. Todo junto. Y el modelo tiene que procesarlo todo antes de responder.

Los escenarios donde esto pasa son más comunes de lo que piensas:

- El servidor se reinicia (deploy, update, crash)
- Se registra un grupo nuevo
- El estado de la base de datos se corrompe
- Un contenedor de Docker muere y se levanta otro

Lo peor es que es un **bug silencioso**. No hay error en los logs. El agente sigue funcionando — solo que más lento, más caro, y con respuestas que no tienen sentido.

## La Solución

### Cursor recovery + cap de mensajes

La solución tiene dos partes que trabajan juntas:

**Primero, recovery automático del cursor.** Si el agente no sabe dónde se quedó, busca en la base de datos su último mensaje enviado. Si encuentra uno, sabe exactamente hasta dónde ya procesó y retoma desde ahí. Sin intervención humana, sin configuración manual.

\`\`\`
Agente se reinicia
  → ¿Tengo cursor? No
  → ¿Cuál fue mi último mensaje en este grupo?
  → "Hace 3 minutos respondí a María"
  → Perfecto, solo necesito mensajes después de ese
\`\`\`

**Segundo, un cap configurable de mensajes por prompt.** Incluso si el recovery falla (grupo completamente nuevo, sin historial del bot), nunca se envían más de 10 mensajes al modelo. Ese número es configurable, pero 10 es el sweet spot: suficiente contexto para que el agente entienda la conversación, pero no tanto como para quemar tokens innecesariamente.

¿Por qué 10 y no 20 o 50? Porque en una conversación de grupo de WhatsApp, los últimos 10 mensajes casi siempre contienen todo el contexto relevante. Los mensajes anteriores son ruido — conversaciones paralelas, saludos, memes. Enviarlos al modelo no mejora la respuesta, solo la encarece.

## El Resultado

### De $2 dólares por prompt a centavos

Los números hablan solos:

- **Antes**: hasta 200 mensajes por prompt después de un restart (~$1-2 USD en tokens por respuesta)
- **Después**: máximo 10 mensajes, siempre (~$0.02-0.05 USD por respuesta)
- **Recovery automático**: el agente retoma sin intervención humana
- **Zero downtime percibido**: los usuarios no notan que hubo un restart

Pero el impacto real va más allá del ahorro. Un agente que recibe 200 mensajes de contexto **responde mal**. Se confunde con conversaciones viejas, mezcla temas, y puede responder a preguntas que ya fueron contestadas. Con 10 mensajes, el agente siempre tiene contexto fresco y relevante.

> "La diferencia entre un framework de agentes serio y un hobby project está en los edge cases que solo aparecen en producción."

## Conclusión

### Los bugs invisibles son los más caros

Este tipo de problemas nunca aparecen en desarrollo. Tu laptop no se reinicia a mitad de una conversación de WhatsApp. No tienes 200 mensajes en un grupo de prueba. Todo funciona perfecto — hasta que llegas a producción con usuarios reales.

NanoClaw tiene una comunidad activa que detecta, reporta y resuelve estos edge cases. Desarrolladores que corren agentes en producción 24/7 y se topan con los problemas que nadie previó. Cada fix viene de experiencia real, no de especulación.

Si estás evaluando frameworks para construir agentes de IA en canales de mensajería, pregúntate: ¿quién está resolviendo los problemas que todavía no conozco?

Si te interesa ver más sobre cómo construimos agentes de IA en producción, échale un ojo al [canal de YouTube](https://www.youtube.com/@fixtergeek) donde compartimos el proceso completo.

Abrazo. bliss.

<!-- author-signature -->
`;

async function main() {
  const post = await db.post.create({
    data: {
      title: "Una de las grandes razones para preferir NanoClaw sobre OpenClaw",
      slug: "nanoclaw-vs-openclaw-message-overflow",
      body,
      contentFormat: "markdown",
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",
      mainTag: "ai",
      tags: ["ai", "claude", "agentes"],
      metaImage: "/stars.png",
      published: true,
    },
  });
  console.log(`Post created: /blog/${post.slug}`);
  console.log(`ID: ${post.id}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
