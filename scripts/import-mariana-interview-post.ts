import { db } from "../app/.server/db";

const postContent = `
Este es el primer post de una serie de entrevistas a developers **chid@s**. En este espacio podemos descubrir como es el día a día de una persona que se dedica al desarrollo de software, algunas de sus luchas y sus sueños.

Hoy les presento a **Mariana López**, quien actualmente trabaja como desarrolladora frontend y que amablemente nos ha regalado algunas palabras.

![Mariana López](https://i.imgur.com/3L1xtQy.png)

## 1. ¿Cuál es tu nombre y de dónde eres?

**Mariana López**, soy de la Ciudad de México.

## 2. Cuéntanos un poco sobre ti

Soy **desarrolladora frontend** en [Konfío](https://konfio.mx/), una fintech mexicana. También hago **freelance** y me gusta participar en proyectos de **impacto social**.

Estudié Ingeniería en Sistemas Computacionales en el IPN (ESCOM). Antes de dedicarme al desarrollo web trabajé en testing de software y desarrollo de aplicaciones móviles.

## 3. ¿Contribuyes a algún proyecto de open source software?

Actualmente no contribuyo a ningún proyecto de open source, pero me gustaría hacerlo pronto. Es algo que tengo en mi lista de pendientes.

## 4. ¿Tienes alguna historia curiosa relacionada con el desarrollo de software?

Una vez, en un hackathon, mi equipo y yo desarrollamos una app en 24 horas sin dormir. Al final ganamos el segundo lugar, pero lo más memorable fue que al presentar, el demo falló justo en la parte más importante. Afortunadamente los jueces fueron comprensivos y nos dejaron explicar lo que debía pasar.

## 5. ¿Cómo balanceas tu vida personal y profesional?

Es algo con lo que todavía lucho. Trato de **establecer horarios claros** y respetar mi tiempo de descanso. También me ayuda mucho hacer ejercicio y tener hobbies fuera de la computadora, como leer y cocinar.

Lo más difícil es desconectarme mentalmente del trabajo, especialmente cuando hay deadlines cercanos.

---

🎬 **¿Te interesa conocer más historias de developers?** Tenemos más contenido inspirador en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## 6. ¿Cuál ha sido la parte más difícil de ser developer?

El **síndrome del impostor** es real. A veces sientes que no sabes lo suficiente o que los demás son mejores que tú. También es difícil mantenerse actualizado con tantas tecnologías nuevas que salen constantemente.

Otra cosa difícil es lidiar con código legacy o con proyectos mal documentados.

## 7. ¿Qué has descubierto sobre ti misma desde que empezaste tu carrera como developer?

He descubierto que me gusta más el **frontend** que el backend. También aprendí que soy más resiliente de lo que pensaba. Los errores y los bugs ya no me frustran tanto como antes; ahora los veo como parte del proceso.

También descubrí que me gusta **enseñar** y compartir lo que sé con otros.

## 8. ¿Qué le recomendarías a alguien que apenas comienza en el desarrollo de software?

- **No tengas miedo de preguntar**. Todos empezamos sin saber nada.
- **Practica mucho**. La teoría está bien, pero la práctica es lo que realmente te enseña.
- **Construye proyectos personales**. No importa si son pequeños, lo importante es aplicar lo que aprendes.
- **Encuentra una comunidad**. Tener personas con quienes compartir dudas y logros hace mucho más llevadero el camino.
- **Sé paciente contigo mismo**. Aprender a programar toma tiempo.

## Contacto

Puedes encontrar a Mariana en:
- **LinkedIn**: [linkedin.com/in/mariana-lopez](https://www.linkedin.com/in/mariana-l%C3%B3pez-dev/)
- **GitHub**: [github.com/marianalopez](https://github.com/marianalopez)
- **Email**: mariana@example.com

---

Gracias Mariana por compartir tu experiencia con nosotros. Espero que esta entrevista inspire a más personas a seguir su camino en el desarrollo de software.

Si te gustó este formato y quieres que entrevistemos a alguien más, déjanos saber en los comentarios o escríbenos a **brenda@fixter.org**.

Abrazo. bliss.
`;

async function main() {
  console.log("Importando post: Entrevista | Mariana López...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug: "entrevista-mariana-lopez" },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug: "entrevista-mariana-lopez" },
      data: {
        title: "Entrevista | Mariana López",
        body: postContent.trim(),
        published: true,
        coverImage: "https://i.imgur.com/3L1xtQy.png",
        metaImage: "https://i.imgur.com/3L1xtQy.png",
        youtubeLink: "",
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.hectorbliss.com",
        mainTag: "entrevistas",
        tags: ["entrevistas", "frontend", "developers", "carrera"],
      },
    });
    console.log("✅ Post actualizado exitosamente!");
    console.log(`   ID: ${post.id}`);
    console.log(`   Slug: ${post.slug}`);
    console.log(`   URL: /blog/${post.slug}`);
    return;
  }

  const post = await db.post.create({
    data: {
      slug: "entrevista-mariana-lopez",
      title: "Entrevista | Mariana López",
      body: postContent.trim(),
      published: true,

      // Imágenes
      coverImage: "https://i.imgur.com/3L1xtQy.png",
      metaImage: "https://i.imgur.com/3L1xtQy.png",
      youtubeLink: "",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Clasificación
      mainTag: "entrevistas",
      tags: ["entrevistas", "frontend", "developers", "carrera"],
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
