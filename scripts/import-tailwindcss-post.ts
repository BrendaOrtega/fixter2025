import { db } from "../app/.server/db";

const postContent = `## ¿Qué es Tailwind?

Tailwind es un framework de CSS creado para facilitar la construcción de diseños y páginas web, de manera rápida y eficiente. Este framework se enfoca en la utilidad de las clases, las cuales se utilizan para aplicar propiedades de estilo a los elementos HTML con justa precisión.

## ¿Por qué Tailwind es tan poderoso?

La potencia de Tailwind radica en su capacidad para simplificar el proceso de diseño y desarrollo web. Al emplear su sistema de clases, los desarrolladores pueden aplicar rápidamente estilos y efectos a los elementos sin tener que escribir CSS con código personalizado.

Además, Tailwind se enfoca en la modularidad, lo que significa que los estilos que se aplican son independientes entre sí, lo que crea una base sólida para la reutilización y la personalización.

## ¿Cómo funciona Tailwind?

Tailwind proporciona una biblioteca de clases que se centra en la funcionalidad y las utilidades de CSS. Estas clases se pueden aplicar directamente a los elementos HTML, lo que permite agregar de manera rápida y eficiente el estilo deseado sin tener que escribir CSS personalizado.

Además, Tailwind también permite la creación de estilos personalizados a través de una serie de archivos de configuración, lo que significa que los desarrolladores pueden adaptar y extender aún más el framework según sus necesidades específicas.

---
🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Las características principales de Tailwind

Tailwind ofrece una amplia variedad de características que lo hacen una herramienta indispensable para los desarrolladores web. Algunas de sus principales características incluyen:

### Diseño responsivo

Tailwind proporciona una serie de clases de diseño responsivo que permiten crear diseños óptimos para diferentes tamaños de pantalla.

### Personalización del diseño

Con los archivos de configuración, los desarrolladores pueden personalizar el diseño y adaptarlo a sus necesidades específicas.

### Anotación de diseño

Tailwind ofrece herramientas para documentar y anotar los estilos y diseños aplicados a los elementos, lo que facilita la colaboración entre los miembros del equipo de desarrollo.

### Comunidad activa

Tailwind cuenta con una comunidad de desarrolladores activa y comprometida, lo que significa que siempre hay soporte y recursos disponibles para los usuarios.

## Conclusiones

Tailwind es un framework de CSS poderoso que puede reducir significativamente el tiempo y el esfuerzo necesarios para crear diseños y páginas web. Con su sistema de clases y sus características de diseño responsivo y personalización, Tailwind puede ayudar a los desarrolladores a crear diseños modernos y escalables con más rapidez y eficiencia.

Abrazo. Bliss.`;

async function main() {
  const slug = "los-secretos-detras-del-poderoso-tailwindcss-2023";

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log(`Post ya existe con slug: ${slug}`);
    console.log(`ID: ${existing.id}`);
    console.log(`Título: ${existing.title}`);
    await db.$disconnect();
    return;
  }

  // Crear el post con la fecha original (14 Mayo 2023)
  const post = await db.post.create({
    data: {
      slug,
      title: "Los secretos detrás del poderoso TailwindCSS",
      body: postContent.trim(),
      published: true,

      // Imágenes
      coverImage: "https://i.imgur.com/vq9Xmon.png",
      metaImage: "https://i.imgur.com/vq9Xmon.png",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.tiktok.com/@hectorbliss",

      // Clasificación
      mainTag: "tailwind",
      tags: ["css", "tailwindcss", "framework", "diseño", "web"],
      category: ["css"],

      // Fecha original del post (14 Mayo 2023)
      createdAt: new Date(1684109892025),
      updatedAt: new Date(),

      isFeatured: false,
    },
  });

  console.log("Post creado exitosamente:");
  console.log(`  ID: ${post.id}`);
  console.log(`  Slug: ${post.slug}`);
  console.log(`  Título: ${post.title}`);
  console.log(`  URL: /blog/${post.slug}`);
  console.log(`  Fecha original: ${post.createdAt}`);
  console.log(`  Cover: ${post.coverImage}`);

  await db.$disconnect();
}

main().catch(console.error);
