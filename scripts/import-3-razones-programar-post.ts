import { db } from "../app/.server/db";

const postContent = `
¿Estás pensando en cambiar de carrera o aprender algo nuevo? Aquí te comparto tres razones por las que aprender a programar puede ser una de las mejores decisiones que tomes.

## 1. Demanda laboral en constante crecimiento

El mercado de desarrolladores de software sigue creciendo año tras año. Las empresas de todos los sectores necesitan talento técnico, y la oferta no alcanza a cubrir la demanda.

Esto significa que como programador tendrás:
- **Más oportunidades de empleo** que en muchas otras profesiones
- **Mejores salarios** debido a la escasez de talento
- **Flexibilidad geográfica** para trabajar de forma remota

## 2. Puedes empezar sin título universitario

A diferencia de otras profesiones, en programación lo que importa es lo que sabes hacer, no dónde lo aprendiste.

Muchos desarrolladores exitosos son autodidactas o tomaron cursos en línea. Lo que los empleadores buscan es:
- Tu portafolio de proyectos
- Tu capacidad de resolver problemas
- Tu habilidad para aprender tecnologías nuevas

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## 3. Es una habilidad transferible

Aprender a programar no solo te abre puertas como desarrollador. También te da una ventaja en casi cualquier industria:

- **Marketing**: Automatización, análisis de datos, SEO técnico
- **Emprendimiento**: Puedes construir tu propio producto
- **Finanzas**: Análisis cuantitativo, automatización de reportes
- **Cualquier área**: Entender cómo funciona la tecnología te hace más valioso

## ¿Por dónde empezar?

Si nunca has programado, te recomiendo empezar con **JavaScript**. Es el lenguaje de la web, tiene una curva de aprendizaje accesible y te permite crear proyectos visibles desde el primer día.

No necesitas una computadora cara ni software especial. Con un navegador y un editor de texto gratuito como VS Code puedes comenzar hoy mismo.

Abrazo. Bliss.
`;

async function main() {
  const slug = "3-razones-aprender-a-programar";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("Post ya existe, actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title:
          "3 razones de por qué deberías aprender a programar en 2023 y cambiar de carrera",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.hectorbliss.com",
        coverImage: "https://i.imgur.com/JBNc7HC.png",
        metaImage: "https://i.imgur.com/JBNc7HC.png",
        tags: ["programacion", "javascript", "web", "carrera"],
        mainTag: "programacion",
      },
    });
    console.log("Post actualizado:", post.id);
  } else {
    console.log("Creando nuevo post...");
    const post = await db.post.create({
      data: {
        slug,
        title:
          "3 razones de por qué deberías aprender a programar en 2023 y cambiar de carrera",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.hectorbliss.com",
        coverImage: "https://i.imgur.com/JBNc7HC.png",
        metaImage: "https://i.imgur.com/JBNc7HC.png",
        tags: ["programacion", "javascript", "web", "carrera"],
        mainTag: "programacion",
      },
    });
    console.log("Post creado:", post.id);
  }

  await db.$disconnect();
}

main().catch(console.error);
