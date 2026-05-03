import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const body = `# xhigh effort en Opus 4.7: cuándo pagar por pensar más

![Razonamiento extendido](https://images.pexels.com/photos/8849295/pexels-photo-8849295.jpeg)

Claude Opus 4.7 tiene un dial que la mayoría usa mal: el **reasoning effort**. Va de \`low\` a \`xhigh\` (extra high), y controla cuánto chain-of-thought interno ejecuta el modelo antes de responder. Poner el dial al máximo suena a "lo más inteligente posible", pero en la práctica es una decisión económica por tarea — no una de calidad.

Este es el criterio que me quedó después de meses usándolo en proyectos reales.

## El Problema

### No todo problema merece el modelo más pensante que tengas a la mano

Pediste a Claude que refactorizara un módulo grande. Tardó 8 segundos en empezar a responder y el output fue impecable. Bien. Después le pediste renombrar una variable en tres archivos. Tardó otros 8 segundos. Mal.

![Latencia innecesaria](https://images.pexels.com/photos/6192326/pexels-photo-6192326.jpeg)

Ese es el síntoma de usar \`xhigh\` cuando no toca: latencia pagada sin retorno. Y al revés — usar \`low\` en un debugging de race condition te devuelve una respuesta segura de sí misma que omite el caso que sí rompe en producción.

El problema no es el modelo. Es que la mayoría de la gente trata el **reasoning effort** como un dial binario ("lo más listo posible, siempre") cuando en realidad es una decisión económica por tarea.

Lo que complica más:

- La diferencia entre \`high\` y \`xhigh\` es invisible hasta que no lo es — en el 80% de las tareas ambos producen el mismo output.
- El costo no solo es tokens facturados; es latencia percibida, que en un loop agéntico se acumula brutalmente.
- No hay un manual oficial de "usa xhigh cuando X". Toca calibrar.

## La Solución

### Tratar el effort como un presupuesto, no como una calidad

\`xhigh\` en Opus 4.7 es el nivel máximo de chain-of-thought interno: el modelo ejecuta más pasos de razonamiento privados antes de emitir output. La escala va \`low → medium → high → xhigh\`, y cada salto aproximadamente duplica el thinking budget.

![Calibrar el effort](https://images.pexels.com/photos/8566526/pexels-photo-8566526.jpeg)

La heurística que uso — afinada tras meses de usar Claude Code en proyectos reales como Fixtergeek, Formmy y MentorIA:

**Usa \`xhigh\` cuando la tarea cumple dos de tres:**
1. El espacio de soluciones es grande (múltiples enfoques válidos, hay que elegir).
2. Un error silencioso cuesta caro (migraciones de DB, lógica de pagos, seguridad).
3. La respuesta depende de sintetizar mucho contexto simultáneo (más de 5 archivos, múltiples sistemas).

**Usa \`high\` por defecto** para trabajo de ingeniería serio — escribir features, debugging normal, revisiones de código. Es el sweet spot: razonamiento sólido sin la penalización de latencia.

**Usa \`medium\` para tareas mecánicas** — aplicar un patrón conocido, escribir tests para código que ya está claro, renombrar, formatear.

**Usa \`low\` para conversación** — preguntas rápidas, confirmaciones, búsquedas en el codebase.

El error más común es usar \`xhigh\` "por si acaso". En un loop agéntico con 20 pasos, \`xhigh\` vs \`high\` puede agregar varios minutos de espera sin cambiar el resultado final. El tiempo del modelo es tu tiempo.

> "No uses el martillo más pesado que tengas. Usa el que pesa lo justo para el clavo que tienes enfrente."

## El Resultado

### En mi flujo diario, la calibración cambió tres cosas concretas

![Resultado de calibrar](https://images.pexels.com/photos/8386437/pexels-photo-8386437.jpeg)

- **Latencia promedio bajó ~40%** al degradar tareas mecánicas de \`xhigh\` a \`medium\`. La percepción de "Claude responde rápido" subió aunque el modelo sea el mismo.
- **Menos refactors innecesarios.** \`xhigh\` tiende a "mejorar" código que no le pediste mejorar — en \`medium\` se queda más cerca de lo que le pediste y menos cerca de lo que imagina que deberías querer.
- **Mejor debugging en casos realmente duros.** Reservar \`xhigh\` para race conditions, queries N+1 escondidos y bugs de estado compartido dio pruebas más rigurosas, no solo respuestas más largas.

La regla que me quedó: **el effort no es calidad, es profundidad**. Y más profundidad en un problema plano solo te da respuestas más adornadas, no más correctas.

> "xhigh es un bisturí, no un default."

## Conclusión

### Pensar más no siempre es pensar mejor

La tentación de poner siempre el dial al máximo es humana — queremos "lo mejor". Pero en modelos de razonamiento, "lo mejor" depende del problema. Un coach que se toma 30 segundos en responder "¿cómo estás?" no es más sabio, es más lento.

Calibra tu effort como calibras cualquier otro recurso: por ROI. Y cuando dudes, baja un escalón — Opus 4.7 en \`high\` sigue siendo brutal.

Si quieres ver cómo aplico estos niveles en proyectos reales (Claude Code en producción, loops agénticos, refactors de React Router v7), pásate por el [canal de YouTube](https://www.youtube.com/@fixtergeek) — ahí subo los casos donde se ve la diferencia en vivo.

Abrazo. bliss.

<!-- author-signature -->
`;

async function main() {
  const post = await db.post.create({
    data: {
      title: "xhigh effort en Opus 4.7: cuándo pagar por pensar más",
      slug: "xhigh-effort-opus-4-7-cuando-pagar-por-pensar-mas",
      body,
      contentFormat: "markdown",
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",
      mainTag: "ai",
      tags: ["ai", "claude", "opinion"],
      metaImage: "https://images.pexels.com/photos/8849295/pexels-photo-8849295.jpeg",
      coverImage: "https://images.pexels.com/photos/8849295/pexels-photo-8849295.jpeg",
      published: true,
    },
  });
  console.log(`Post created: /blog/${post.slug}`);
  console.log(`ID: ${post.id}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
