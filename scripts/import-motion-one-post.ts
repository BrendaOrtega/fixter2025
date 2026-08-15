import { db } from "../app/.server/db";

const motionOneContent = `
¿Recuerdas que animate de CSS aún no puede animar propiedades individuales de transform como **scale** o **rotate**?

Pues [Motion One](https://motion.dev/) lo resuelve.

## ¿Qué es Motion One?

Es una biblioteca de animación que usa la API nativa del browser, es **pequeñísima** (solo 2.5kb), **fácil de usar** y tiene **zero dependencies**.

Es el sucesor espiritual de Popmotion, y viene del mismo creador de **Framer Motion** (Matt Perry).

## ¿Cómo se instala?

Con npm:

\`\`\`bash
npm install motion
\`\`\`

## ¿Cómo se usa?

Tienes que importar la función \`animate\` y pasarle el elemento que quieres animar junto con las propiedades:

\`\`\`javascript
import { animate } from "motion"

animate(
  ".box",
  { rotate: 180, scale: 2 },
  { duration: 1 }
)
\`\`\`

Así de simple. La función acepta selectores CSS, elementos del DOM, o arrays de elementos.

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales de animaciones en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Animación con spring

Si quieres ese efecto "bouncy" tan popular, puedes usar la función \`spring\`:

\`\`\`javascript
import { animate, spring } from "motion"

animate(
  ".box",
  { scale: [1, 1.5, 1] },
  { easing: spring() }
)
\`\`\`

El spring automáticamente calcula la duración basándose en la física del resorte.

## Ejemplo interactivo

Aquí un ejemplo donde la caja reacciona al click:

\`\`\`javascript
import { animate, spring } from "motion"

const box = document.querySelector(".box")

box.addEventListener("click", () => {
  animate(
    box,
    {
      rotate: [0, 360],
      borderRadius: ["0%", "50%", "0%"]
    },
    {
      duration: 0.8,
      easing: spring({ stiffness: 200, damping: 10 })
    }
  )
})
\`\`\`

## Más herramientas

Motion One también incluye:

- **stagger**: Para animar elementos en secuencia con delay
- **glide**: Para animaciones con momentum (como scroll)
- **timeline**: Para secuencias de animación complejas
- **inView**: Para detectar cuando un elemento entra al viewport

## ¿Y con React?

Si usas React, Motion One tiene un paquete específico:

\`\`\`bash
npm install @motionone/react
\`\`\`

Aunque honestamente, para React yo prefiero usar **Framer Motion** directamente ya que tiene mejor integración con el ciclo de vida de React.

## Recursos

- [Documentación oficial](https://motion.dev/docs)
- [Examples](https://motion.dev/examples)
- [GitHub](https://github.com/motiondivision/motion)

Si quieres aprender más sobre animaciones web, también tenemos un curso completo de animaciones con React y Motion en FixterGeek.

Abrazo. Blissmo. 🤓
`;

async function main() {
  console.log("Importando post de Motion One...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: {
      slug: "motion-one-es-la-unica-biblioteca-de-animaciones-que-necesitaras-aprender-2023",
    },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug: existing.slug },
      data: {
        title:
          "Motion One es la única biblioteca de animaciones que necesitarás aprender",
        body: motionOneContent.trim(),
        published: true,

        // Autor
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "http://hectorbliss.com",

        // SEO
        coverImage: "https://motion.dev/social/share.png",
        metaImage: "https://motion.dev/social/share.png",

        // Video
        youtubeLink: "https://youtu.be/7GMbh35v4i0",

        // Clasificación
        tags: [
          "animaciones",
          "css",
          "js",
          "react",
          "javascript",
          "motion",
          "framer",
          "motionone",
        ],
        mainTag: "web",
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
      slug: "motion-one-es-la-unica-biblioteca-de-animaciones-que-necesitaras-aprender-2023",
      title:
        "Motion One es la única biblioteca de animaciones que necesitarás aprender",
      body: motionOneContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "http://hectorbliss.com",

      // SEO
      coverImage: "https://motion.dev/social/share.png",
      metaImage: "https://motion.dev/social/share.png",

      // Video
      youtubeLink: "https://youtu.be/7GMbh35v4i0",

      // Clasificación
      tags: [
        "animaciones",
        "css",
        "js",
        "react",
        "javascript",
        "motion",
        "framer",
        "motionone",
      ],
      mainTag: "web",

      // Fecha original
      createdAt: new Date(1692290078282), // Aug 17, 2023
    },
  });

  console.log("✅ Post creado exitosamente!");
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
