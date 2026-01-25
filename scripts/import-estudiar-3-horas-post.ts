import { db } from "../app/.server/db";

const postContent = `
Mantenerte estudiando y aprender algo nuevo cada año es un acto de madurez.

Una vez que entiendes los beneficios de mantenerte estudiando, se vuelve obvio hacerte el tiempo para estudiar y practicar, que me parece más importante aún.

Tiene mucho que ver con cómo percibes tu carrera profesional. Tu carrera profesional es lo que estás construyendo hoy, para que tu "yo" del futuro tenga más oportunidades, mejor salario, menos trabajo y más vacaciones.

Por eso quiero contarte por qué pienso que estudiar mínimo 3 horas a la semana te va a conseguir un mejor futuro.

## Descubre cómo aprendes mejor

Y no hablaré del mito de encontrar «tu forma de aprendizaje», si bien es cierto que podemos saber si leyendo, mirando, haciendo o escuchando nos va mejor en el aprendizaje, también es un mito que limita tu experiencia y la calidad del aprendizaje.

Cuando crees que aprendes solo de una manera, dejas de probar con las otras muchas y variadas formas de aprender, te dedicas solo a una forma y terminas aburrido y probablemente aprendiendo menos.

La realidad es que mientras más formas de aprendizaje combinemos, mejor serán nuestras probabilidades de aprender **bien** algo. De aprender algo con **calidad y profundidad** y no solo superficialmente.

Combínalo todo y **experimenta**, *siéntete*. Lee un libro tech, ve un video en youtube, compra un curso online, entra a un webinar, sigue un tutorial, combina, prueba y descubre qué, cómo o hasta quién y con que medio. **Encuentra la combinación de recursos que te sirva mejor para aprender.**

Una vez que lo descubras, explótala y sigue experimentando.

Pero mi mayor sugerencia sobre estudiar, es que sigas tu curiosidad, sigue a ese conejo blanco que te lleva a divagar un poco sobre temas de origen o relacionados con aquello que estás estudiando.

> No dejar de estudiar todo el año por años, es un proceso integral, casi mágico

## ¿Por qué 3 horas mínimo?

No cometas el error de pensar que si inviertes más horas seguidas es mejor, no lo es. Es como hacer ejercicio 2hrs al día, por 2 meses al año; contra hacerlo 30min al día, por 12 meses al año. Sin mencionar la condición física.

Lo que funciona mejor es hacerlo, sin interrupción, durante meses, años.

Es decir, si estudias muchas horas a diario, comenzarías a sentir pesadez y cansancio en un par de semanas. Mientras que si estudias solo 3 horas a la semana (30min al día), y no dejas de hacerlo por todo el año. Por su puesto que aprenderás más y te será muy fácil mantenerlo.

Es cuestión de preferir el largo plazo y la constancia por sobre la inversión de tiempo en una sola sesión.

Por último, si es necesario arrancarle esas horas a otras actividades, hazlo, **Netflix no va a extrañarte tanto**, sabe que ya te posee por 12 horas o más a la semana.

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## ¿Qué ventajas tiene mantenerme aprendiendo?

Las preguntas de la resistencia: ¿de qué me sirve este esfuerzo?, ¿cuál es el beneficio a corto plazo?, ¿qué voy a ganar?.

- Conforme adquieres experiencia y vas sabiendo hacer más cosas, tu abanico de opciones crece, te vuelves más creativo(a), generas más y mejores ideas, **se puede decir que te vuelves más inteligente**. Puedes acceder a mejores puestos o ascender en tu trabajo, también podrías mejorar tu negocio o comenzar nuevos. Es muy común también entrar a una startup con un ambiente emprendedor para aprender.

- El beneficio a corto plazo podría ser el empleo, pero personalmente creo que los mejores beneficios vienen a largo plazo y de formas incluso independientes de lo económico. **Tu crecimiento como profesional es importante**, expresarte con más jerga de tu oficio, proyectar autoridad. Lo que más me atrae de no dejar de estudiar, es que **soy mejor resolviendo problemas**, más rápido, incluso puedo resolver problemas más complejos. Es bueno sentirte y saberte capaz e inteligente.

- Vas a ganar estatus, prestigio, respeto, y pasta cuando seas un chingón(na) en lo que haces, no necesitarás de favores, la experiencia en tecnología, es valiosa.

Entiende esto: En este momento de la historia humana (no sé en el futuro "AI" distópico, pero en este siglo si) **mientras más sabes, más vales**.

### Estar actualizado(a) te va a conseguir un mejor futuro por el mero hecho de saber más que los demás.

**No dejar de estudiar todo el año por años, es un proceso integral, casi mágico**. Mientras más aprendas, más oportunidades con una infinidad de formas, no solo son trabajos, también saber más, te permite conocer personas interesantes e igual de conocedoras y profesionales que tú. Al mismo tiempo, tú también te vas demandando un equipo que te aporte más valor. Sin darte cuenta (o ahora si) **te vas convirtiendo en un profesional de alto rendimiento** que ahora se le busca para trabajar en proyectos interesantes y no solo reparando.

**Tu "yo" del futuro, puede ser ese profesional.** Solo debes empezar a estudiar permanentemente mínimo 3 hrs. a la semana.

No, tu educación no ha terminado, y menos en la era digital.

Abrazo. Bliss.
`;

async function main() {
  const slug = "por-que-estudiar-3-horas-a-la-semana";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("Post ya existe, actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title:
          "¿Por qué estudiar mínimo 3 horas a la semana te va a conseguir un mejor futuro?",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.hectorbliss.com",
        coverImage: "https://i.imgur.com/8A2NIo9.png",
        metaImage: "https://i.imgur.com/8A2NIo9.png",
        tags: ["carrera", "productividad", "aprendizaje", "desarrollo-profesional"],
        mainTag: "productividad",
      },
    });
    console.log("Post actualizado:", post.id);
  } else {
    console.log("Creando nuevo post...");
    const post = await db.post.create({
      data: {
        slug,
        title:
          "¿Por qué estudiar mínimo 3 horas a la semana te va a conseguir un mejor futuro?",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.hectorbliss.com",
        coverImage: "https://i.imgur.com/8A2NIo9.png",
        metaImage: "https://i.imgur.com/8A2NIo9.png",
        tags: ["carrera", "productividad", "aprendizaje", "desarrollo-profesional"],
        mainTag: "productividad",
      },
    });
    console.log("Post creado:", post.id);
  }

  await db.$disconnect();
}

main().catch(console.error);
