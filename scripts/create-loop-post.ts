import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const body = `*5 de julio de 2026*

---

Casi todos usamos Claude Code igual: escribes algo, responde, escribes lo siguiente. Un turno, una respuesta, y tu atención pegada a la terminal. El agente solo avanza mientras tú estás ahí para empujarlo.

\`/loop\` rompe eso. Es un slash command que ya viene incluido y que convierte a Claude Code de "asistente que responde cuando le hablas" a "proceso que sigue trabajando aunque no estés". La mayoría ni sabe que existe. Vamos a desarmarlo.

![Terminal con código corriendo en bucle](https://images.pexels.com/photos/270557/pexels-photo-270557.jpeg?auto=compress&cs=tinysrgb&w=1200)
*Foto en [Pexels](https://www.pexels.com)*

---

## Dos modos que parecen uno

**Modo intervalo.** Le das un tiempo y una tarea, y las repite en ese ritmo:

\`\`\`bash
/loop 5m revisa si el deploy ya terminó y avísame
/loop 10m /babysit-prs
\`\`\`

Cada cinco o diez minutos vuelve a ejecutar esa instrucción. Sirve para vigilar algo que cambia solo: un CI, un deploy en Fly, una cola de trabajos.

**Modo autónomo.** Si invocas \`/loop\` **sin intervalo y sin prompt**, ya no le pides que repita una tarea fija — le dices *"tú marca el ritmo y sigue moviendo lo que ya empezamos"*. Deja de ser cronómetro y se vuelve administrador de tu trabajo en curso: se pregunta *¿qué quedó a medias? ¿hay un PR esperando? ¿algún check en rojo?*, lo atiende, y se programa el siguiente despertar. El modo intervalo hace **la misma cosa**; el autónomo decide **qué hacer** en cada ciclo.

---

## Un mayordomo, no un emprendedor

En modo autónomo, Claude Code es un **steward**: hace avanzar lo que tú pusiste en marcha, no inventa tareas. La distinción es deliberada — la confianza de dejarlo suelto se pierde rapidísimo si empieza a tomar decisiones grandes solo.

Por eso sigue una jerarquía: primero la conversación actual (implementación a medias, un "ahorita también hago X" pendiente, tests saltados), luego el PR de la rama —CI en rojo, comentarios de review sin resolver, rama atrás de main—. Un flake lo reencola; un comentario lo atiende, hace push y resuelve el hilo. Y si no hay nada que mover, lo dice en una línea y se detiene.

![Persona revisando código en varias pantallas](https://images.pexels.com/photos/256502/pexels-photo-256502.jpeg?auto=compress&cs=tinysrgb&w=1200)
*Foto en [Pexels](https://www.pexels.com)*

Su regla es la reversibilidad: para lo que se deshace fácil (editar local, correr tests) toma su mejor decisión y avanza; para lo irreversible (push, borrar, mandar algo afuera) si tiene duda, espera un ciclo. Esperar cuesta poco; equivocarse en algo que no se deshace, mucho.

---

## El truco que casi nadie conoce: el ritmo

Aquí se separa quien usa \`/loop\` de quien lo *exprime*. En modo autónomo el agente elige cuánto esperar entre ciclos, y detrás de esa decisión hay un detalle precioso: el **caché de prompts** de la API dura cinco minutos.

- **Menos de 5 min** (60–270 s): el caché sigue caliente, el siguiente despertar es rápido y barato. Ideal para vigilar algo externo que cambia pronto.
- **5 min a 1 hora** (300–3600 s): pagas caché frío. Solo tiene sentido si de verdad no hay razón para revisar antes.

Regla contraintuitiva: **nunca elijas 300 segundos exactos** — pagas el caché frío sin amortizarlo. O bajas a 270 y te quedas en caché, o te vas a 1200+ y ese caché frío te compra una espera mucho más larga. No pienses en minutos redondos; piensa en ventanas de caché. En vacío, un loop bien pensado ronda los **20-30 minutos** por ciclo.

---

## Recetas para exprimirlo

![Tablero de datos y monitoreo en tiempo real](https://images.pexels.com/photos/17483871/pexels-photo-17483871.png?auto=compress&cs=tinysrgb&w=1200)
*Foto en [Pexels](https://www.pexels.com)*

**Niñera de PRs.** Abres el PR, corres \`/loop\` y te vas. Mientras no estás, atiende comentarios de review que se resuelven solos, diagnostica checks que fallan, reencola flakes y rebasa la rama. Regresas a un PR listo para merge humano.

**Centinela de deploy.** \`/loop 3m revisa el último deploy en Fly y si falló jala los logs y dime la causa\`. Dejas de refrescar el dashboard.

**Barrido en tiempo muerto.** Con el CI verde y los hilos limpios, usa el hueco para cazar bugs o simplificar código antes de que un reviewer lo note.

Para pararlo, solo interrúmpelo: deja de programarse el siguiente despertar y se acaba. Ojo: no es para tareas de una sola vez —eso córrelo directo—; \`/loop\` es para lo recurrente o lo que se auto-marca el ritmo.

---

El valor no es que el agente trabaje "solo" en abstracto. Es que el trabajo avanza en los huecos donde antes se detenía: mientras duermes, en una junta, esperando un build de veinte minutos. Un PR que amanece listo en vez de esperándote.

En el [canal de YouTube](https://www.youtube.com/@fixtergeek) compartimos más patrones para sacarle jugo a los agentes en el trabajo real. Si te late, suscríbete.

Abrazo. bliss.
`;

async function main() {
  const post = await db.post.create({
    data: {
      title: "El comando que no duerme: cómo exprimir /loop en Claude Code",
      slug: "exprimir-loop-claude-code",
      body,
      contentFormat: "markdown",
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",
      mainTag: "ai",
      tags: ["ai", "claude", "agentes", "tutorial"],
      metaImage:
        "https://images.pexels.com/photos/270557/pexels-photo-270557.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
      published: true,
    },
  });
  console.log(`Post created: /blog/${post.slug}`);
  console.log(`ID: ${post.id}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
