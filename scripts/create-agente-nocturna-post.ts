import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const body = `*5 de julio de 2026*

---

La fantasía es sencilla: le dejas una feature a Claude Code antes de dormir y amaneces con el trabajo hecho. La realidad, cuando lo intentas sin preparación, es que a las 3am el agente se topó con una decisión, te hizo una pregunta, y se quedó ahí congelado esperando una respuesta que no llegó hasta las 8. Ocho horas de agente parado.

Lo que detiene a un agente de noche son exactamente dos cosas: **los permisos** y **las preguntas**. Quita esas dos y el resto es afinar el encargo.

![Escritorio de programación en la madrugada](https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=1200)
*Foto en [Pexels](https://www.pexels.com)*

---

## Los permisos: quítale el freno

Cada vez que el agente quiere editar un archivo o correr un comando, normalmente se detiene a pedirte confirmación. Multiplícalo por una noche entera de trabajo y tienes cientos de pausas. Arranca la sesión sin ese freno:

\`\`\`bash
claude --dangerously-skip-permissions
\`\`\`

El nombre asusta a propósito. No lo corras sobre tu máquina principal con acceso a producción; hazlo en una rama, un worktree, o mejor un contenedor donde el peor caso sea perder trabajo desechable, no borrar algo real.

---

## Las preguntas: el verdadero asesino nocturno

Aquí está lo que casi nadie configura. Quitar permisos no basta: el agente todavía puede detenerse a **preguntarte** cuando se topa con una decisión ambigua. Y una pregunta a las 3am es una noche perdida. La solución es una instrucción explícita en el prompt:

> Trabaja de forma autónoma hasta terminar. **Nunca me preguntes nada.** Si te topas con una decisión ambigua, elige la opción más razonable, anótala en \`DECISIONS.md\` con tu justificación, y sigue. No te detengas a esperar confirmación.

Ese \`DECISIONS.md\` es la pieza clave. No estás pidiéndole que adivine y ya — le das un lugar donde registrar cada bifurcación que resolvió solo. En la mañana lees ese archivo y ves exactamente qué decidió y por qué. Si algo no te late, lo corriges. El agente nunca se detuvo, y tú no perdiste el control.

![Notas y decisiones de arquitectura](https://images.pexels.com/photos/577585/pexels-photo-577585.jpeg?auto=compress&cs=tinysrgb&w=1200)
*Foto en [Pexels](https://www.pexels.com)*

---

## Dale un "terminado" que se pueda verificar

Un agente sin criterio claro de fin o se detiene demasiado pronto, o divaga. No le des solo la feature; dale una condición de éxito que él mismo pueda comprobar:

> No termines hasta que \`npm test\` y el build pasen en verde. Si algo falla, arréglalo y vuelve a correrlos.

Con eso, el agente entra en un ciclo de auto-corrección: escribe, prueba, ve el error, corrige, vuelve a probar — sin ti. La diferencia entre un agente que "hizo algo" y uno que "dejó la feature funcionando" casi siempre está en esta sola instrucción.

---

## La red de seguridad para la mañana

Que trabaje solo no significa trabajar a ciegas. Dos cosas que te salvan al despertar:

**Aíslalo.** Que trabaje en una rama o un \`git worktree\` aparte. Amaneces revisando un diff limpio, no cambios mezclados con lo tuyo.

**Que deje rastro.** Pídele que escriba avance en un \`PROGRESS.md\` después de cada paso. Si algo salió mal a mitad de la noche, ese archivo te dice hasta dónde llegó y qué intentó.

Y si quieres que además sea resiliente a atorones, combínalo con \`/loop\`: el agente se auto-marca el ritmo, retoma trabajo pendiente y se recupera solo en lugar de quedarse esperando.

![Código verde pasando tests en pantalla](https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=1200)
*Foto en [Pexels](https://www.pexels.com)*

---

## El encargo completo

Juntando todo, el prompt con el que lo dejas trabajando se ve así:

\`\`\`bash
claude --dangerously-skip-permissions "Implementa <feature> siguiendo PLAN.md.
Trabaja toda la noche sin parar. Nunca preguntes: ante duda, decide y
registra en DECISIONS.md con tu justificación. No termines hasta que
'npm test' y el build pasen. Escribe avance en PROGRESS.md tras cada paso."
\`\`\`

En la mañana tu ritual son tres archivos: el \`diff\` de la rama, \`DECISIONS.md\` para ver qué resolvió solo, y \`PROGRESS.md\` por si algo quedó a medias. Revisas, ajustas lo que no te lató, y mergeas.

El truco no es dejar un agente "suelto y a ver qué pasa". Es diseñar el encargo para que ni los permisos ni las preguntas lo detengan, y para que amanezcas con trabajo que puedes revisar en cinco minutos en vez de reconstruir.

En el [canal de YouTube](https://www.youtube.com/@fixtergeek) compartimos más de estos flujos con agentes en el trabajo real. Si te late, suscríbete.

Abrazo. bliss.
`;

async function main() {
  const post = await db.post.create({
    data: {
      title: "Cómo dejar un agente programando mientras duermes (sin que se atore a las 3am)",
      slug: "dejar-agente-programando-mientras-duermes",
      body,
      contentFormat: "markdown",
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",
      mainTag: "ai",
      tags: ["ai", "claude", "agentes", "tutorial"],
      metaImage:
        "https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
      published: true,
    },
  });
  console.log(`Post created: /blog/${post.slug}`);
  console.log(`ID: ${post.id}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
