import { db } from "../app/.server/db";

const postContent = `Puedes invertir mucho tiempo en mejorar tus habilidades en programación, convertirte en el mejor a la hora de tirar líneas de código, en el más rápido, en el más versado en los temas que te competen.

Pero, si no sabes comunicar todo lo que sabes en una charla casual, con un entrevistador, por ejemplo, te va a costar mucho trabajo ganar ($) lo que realmente mereces.

Si piensas que ganas menos de lo que en realidad deberías o si te ha costado mucho trabajo, tener buenas entrevistas de trabajo y las pocas que has hecho no han salido muy bien. Quiero que sepas que a mí también me pasó. Olvidaba todo cuando entraba a la entrevista, mis manos temblaban y hasta se me olvidó como pronunciar las palabras más simples.

"Estas son las varabales, digo varbables, digo, variables, hay perdón es que estoy muy nervioso". 😓🥵

Si este también has sido tú, estas 2 maneras simples de mejorar tus entrevistas de trabajo te van a caer de maravilla, yo me obsesioné con mejorar mis entrevistas y poniendo en práctica estas 2 cosas me volví un maestro de la entrevista de trabajo como programador.

## Primera manera de mejorar una entrevista de trabajo

La primera manera de mejorar tus entrevistas y comunicar correctamente de lo que eres capaz sin que tu cuerpo se haga gelatina, es restándole importancia.

Por más simple que parezca, cuando colocas altas expectativas en conseguir cierto empleo, lo convierte en algo muy estresante y pierdes el enfoque. Por ejemplo, puedes leer en todo internet esas guías de "cómo conseguir el empleo de tu vida en Google/Facebook/Amazon/RiotGames", pero cuando estás en tus primeras búsquedas de empleo, conseguir el **"empleo de tu vida"** es poco realista y esto agrega una carga cognitiva que no necesitas, haciéndolo todo más difícil.

Mejor relájate, réstale importancia, algún día podrías trabajar en un gigante tecnológico, pero por ahora aplica a startups que tengan buena salud aunque no sean unicornios e imagina que de todas formas te van a rechazar.

Sí, no se trata de ser pesimista, pero sí de entender que no es la única entrevista que harás, y que siempre habrá más opciones.
Esto te permite tomarla un poco menos en serio, pero no por ello dejarás de comportarte de forma profesional.

---
🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Segunda manera de mejorar una entrevista

Otra manera obvia, pero que en mi caso menospreciaba, era investigar a profundidad a la empresa que me entrevista.

No cometas el error de aplicar a decenas de vacantes sin saber realmente si son un buen "fit" para tí. Cuando aplicas a muchas empresas a la vez y recibes muchas citas para entrevistas, puedes cometer el error de llegar a la entrevista sin saber con qué empresa es, incluso desconocer por completo a qué se dedica la empresa o las tecnologías que utiliza la vacante. 😣 Esto te hace dudar dentro de la entrevista, merma tu credibilidad y profesionalismo, nunca lo hagas.

Las mejores entrevistas que yo he tenido, han sido aquellas en las que me tomé el tiempo para investigar a la empresa, descubrir qué tencnologías usan y por qué, incluso leer algunos post de su blog para aprender más sobre su negocio. Me gusta poder hacer preguntas inteligentes cuando me dicen si tengo preguntas para ellos, hago preguntas incluso sobre temas no relacionados con la programación, como su modelo de negocio o la visión de la empresa.

Conocer más que superficialmente a la empresa que me entrevista, siempre me ha traído los mejores resultados, sobre todo porque **demostrar este nivel de interés como programador, es muy poco común.**

### Entendiendo y dominando estas 2 maneras simples de mejorar una entrevista de trabajo, estás listo para agregar el más poderoso hack.

Una vez que estás relajado, utilizando la primera manera, te permites incluso disfrutar de la entrevista. Y como estás bien preparado, entendiendo el negocio de la empresa y su stack , aplicando la segunda manera, puedes hacer preguntas muy inteligentes e incluso interesantes (cuidado de no ser demasiado perspicaz).

Pero el plus una vez teniendo todo esto en su lugar es **mostrar un poco tu personalidad**.

Cuando veas una buena oportunidad para contar algo sobre ti, intenta contar sobre algo que te apasione e **intenta contarlo con cierta emoción**.

A los seres humanos no nos gusta trabajar con robots, nos gusta trabajar con otros seres humanos y compartir cosas, gustos, parecernos. Cuando te permites mostrar un poco de ti, puedes romper el hielo y caerle bien al entrevistador (lo cual es muy importante, realmente). No tengas miedo, de mostrarte como eres, **siempre sin perder tu perfil profesional claro está**.

Esto, a pesar de ser un par de maneras simples de mejorar tus entrevistas, requieren de cierta práctica, pero con el tiempo, seguro también te vuelves un hacker del tech interview.

Abrazo. Bliss.`;

async function main() {
  console.log(
    "Importando post de 2 maneras de mejorar entrevistas de trabajo..."
  );

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug: "2-maneras-muy-simples-de-mejorar-tus-entrevistas-de-trabajo-2022" },
  });

  if (existing) {
    console.log("⚠️  El post ya existe con ID:", existing.id);
    return;
  }

  const post = await db.post.create({
    data: {
      slug: "2-maneras-muy-simples-de-mejorar-tus-entrevistas-de-trabajo-2022",
      title: "2 maneras muy simples de mejorar tus entrevistas de trabajo.",
      body: postContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",

      // Imágenes
      coverImage: "https://i.imgur.com/GecgFfw.jpg",
      metaImage: "https://i.imgur.com/E8xW8Cb.png",

      // Clasificación
      tags: ["hacks", "consejos"],
      mainTag: "Principiante",

      // Fecha original: 22 Diciembre 2022 (timestamp: 1671729077471)
      createdAt: new Date(1671729077471),
      updatedAt: new Date(),
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Autor: ${post.authorName}`);
  console.log(
    `   Fecha original: ${post.createdAt.toLocaleDateString("es-MX")}`
  );
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
