import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const body = `# xhigh effort en Opus 4.7: cuándo pagar por pensar más

Opus 4.7 te deja mover un dial llamado **reasoning effort** — cuánto chain-of-thought interno ejecuta el modelo antes de responderte. La escala va \`low → medium → high → xhigh\`, y cada salto aproximadamente duplica el presupuesto de pensamiento privado que gasta antes de emitir la primera palabra.

La mayoría de la gente lo trata como un interruptor binario: "lo más listo posible, siempre". Y ahí empieza el problema.

## El dial no controla calidad, controla profundidad

La intuición natural es: más effort = modelo más listo = mejor respuesta. Es falsa. Lo que \`xhigh\` hace es darle al modelo más espacio para razonar sobre el problema que le pusiste enfrente. Si el problema es plano, más razonamiento no lo hace más correcto — solo más adornado.

La analogía que me quedó después de meses usándolo en Fixtergeek, Formmy y MentorIA: el effort es como el tamaño del martillo. Más grande no es mejor; es más grande. Si el clavo es chico, te estorba.

![Calibrar la herramienta](https://images.pexels.com/photos/6192326/pexels-photo-6192326.jpeg)

En la práctica esto significa que hay un tipo concreto de error que comete la gente: usar \`xhigh\` para tareas mecánicas. Renombrar una variable en tres archivos con \`xhigh\` tarda lo mismo que refactorizar un módulo entero con \`xhigh\`, porque el modelo pagó el mismo overhead de razonar sobre algo que no lo necesitaba. El output es idéntico al que te hubiera dado \`medium\`. La única diferencia tangible es que esperaste 8 segundos por nada.

Y hay un error al revés, menos visible pero más caro: usar \`low\` o \`medium\` para problemas que sí requieren profundidad. Un debugging de race condition resuelto con \`medium\` te devuelve una respuesta segura de sí misma que omite el caso que sí rompe en producción. El modelo no tuvo el presupuesto mental para considerar el estado compartido en el camino B. Te da la primera explicación coherente que encuentra, y tú la tomas como verdad.

## Cuándo sí conviene pagar por xhigh

La heurística que uso — afinada a golpes:

**\`xhigh\` cuando la tarea cumple dos de tres:**

El espacio de soluciones es grande. Hay múltiples enfoques válidos y el modelo tiene que elegir — refactors arquitectónicos, diseño de APIs, estrategias de migración.

Un error silencioso cuesta caro. Migraciones de DB que no se pueden revertir, lógica de cobro, código de seguridad, cualquier cosa donde "funciona aparentemente" es peor que "falla ruidosamente".

La respuesta depende de sintetizar mucho contexto simultáneo. Más de cinco archivos interactuando, múltiples sistemas, debugging donde el bug vive en la costura entre dos componentes.

Si cumple los tres, \`xhigh\` sin dudar. Si cumple uno, \`high\` probablemente basta.

![Profundidad vs ancho](https://images.pexels.com/photos/8566526/pexels-photo-8566526.jpeg)

## Cuándo NO conviene, aunque la tentación sea real

\`high\` es el default correcto para trabajo de ingeniería serio. Escribir features nuevas, debugging normal, revisiones de código, explicaciones técnicas. Es el sweet spot donde el razonamiento es sólido y la latencia todavía no se siente.

\`medium\` es el nivel correcto para tareas mecánicas donde ya sabes qué hacer y solo quieres que lo ejecute: aplicar un patrón conocido, escribir tests para código claro, renombrar, formatear, convertir de un formato a otro.

\`low\` para conversación. Preguntas rápidas, confirmaciones, búsquedas en el codebase, "¿dónde está definido X?". El razonamiento profundo es counterproductivo cuando la respuesta es un file path.

El error que más me cuesta es usar \`xhigh\` "por si acaso". En un loop agéntico con 20 pasos, \`xhigh\` vs \`high\` agrega minutos enteros de espera al total sin cambiar el resultado final. El tiempo del modelo es tu tiempo, y los loops lo amplifican.

## La calibración cambia cosas concretas

Cuando dejé de usar \`xhigh\` como default y empecé a calibrar por tarea, tres cosas se movieron:

La latencia promedio bajó visiblemente al degradar tareas mecánicas a \`medium\`. Nada cambió del modelo; cambió qué le estaba pidiendo. La percepción de "Claude responde rápido" subió sin tocar infraestructura.

Los refactors innecesarios bajaron. \`xhigh\` tiene una tendencia sutil a "mejorar" código que no le pediste mejorar — ve oportunidades de abstracción, patrones que aplicar, cleanup que hacer. En \`medium\` se queda más cerca de lo que le pediste, menos cerca de lo que imagina que deberías querer. Eso es deseable la mayor parte del tiempo.

El debugging de casos realmente duros mejoró. Reservar \`xhigh\` para race conditions, queries N+1 escondidos y bugs de estado compartido me dio respuestas más rigurosas, no solo más largas. El modelo usa el presupuesto extra cuando el problema lo justifica.

![Calibrar por tarea](https://images.pexels.com/photos/8294846/pexels-photo-8294846.jpeg)

## El criterio final

Antes de subir el dial, pregúntate: ¿el problema es realmente duro, o solo es largo? Si la respuesta es "largo", \`medium\` o \`high\` bastan. Si la respuesta es "duro" — múltiples caminos, stakes altos, contexto amplio — ahí \`xhigh\` sí gana su costo.

Y cuando dudes, baja un escalón. Opus 4.7 en \`high\` sigue siendo brutal, y la velocidad recuperada la vas a usar en la siguiente iteración, que casi siempre es más valiosa que una respuesta 10% más pulida.

Si te interesa ver cómo aplico estos niveles en proyectos reales — Claude Code en producción, loops agénticos, refactors de React Router v7 — pásate por el [canal de YouTube](https://www.youtube.com/@fixtergeek). Los casos donde se nota la diferencia los grabo en vivo.

Abrazo. bliss.

<!-- author-signature -->
`;

async function main() {
  const post = await db.post.update({
    where: { slug: "xhigh-effort-opus-4-7-cuando-pagar-por-pensar-mas" },
    data: { body },
  });
  console.log(`Post updated: /blog/${post.slug}`);
  console.log(`ID: ${post.id}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
