import { db } from "../app/.server/db";

async function repackageAiSdkCourse() {
  const newTitle = "IA aplicada con React";

  const newSummary = `Es solo un nuevo hook, como los que ya conoces. useState = useEffect = useChat.
El React de siempre, pero ahora con IA.
Sin relleno y sin necesitar de Python, puro TS.`;

  const newDescription = `# Tu React + AI en media hora

## El problema

¿Cada tutorial de AI es Python?
¿Sientes que es "otro mundo"?

useChat es un hook. **Como useState. Como useEffect.**

Tu React de siempre, ahora con AI.

---

## Lo que construyes

| # | Resultado |
|---|-----------|
| 1 | Tu primer chat inteligente |
| 2 | Streaming que se siente instantáneo |
| 3 | Tools: el modelo ejecuta acciones |
| 4 | Archivos en el contexto |
| 5 | Embeddings: búsqueda semántica |
| 6 | BONUS: Deploy con Hono |

---

## Por qué 30 minutos

- **Sin relleno** - Cada minuto cuenta
- **3 lecciones gratis** - Prueba antes de comprar
- **Código que funciona** - No teoría
- **Tu stack** - React + TypeScript

---

## Requisitos

- Sabes React (hooks básicos)
- Conoces TypeScript
- Quieres agregar AI a tu app

No necesitas Python. No necesitas PhD.`;

  const newLevel = "Para devs React";

  console.log("Actualizando curso AI SDK con nuevo packaging...\n");

  const result = await db.course.update({
    where: { slug: "ai-sdk" },
    data: {
      title: newTitle,
      summary: newSummary,
      description: newDescription,
      level: newLevel,
      duration: "30",
    },
  });

  console.log("✅ Curso actualizado exitosamente\n");
  console.log("📌 Título:", result.title);
  console.log("📝 Summary:", result.summary);
  console.log("📊 Nivel:", result.level);
  console.log("⏱️  Duración:", result.duration, "min");
  console.log("\n🔗 Verifica en: /cursos/ai-sdk/detalle");
}

repackageAiSdkCourse()
  .catch(console.error)
  .finally(() => process.exit(0));
