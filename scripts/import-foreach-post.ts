import { db } from "../app/.server/db";

const postContent = `El método \`forEach()\` del Array, ejecuta la función que le provees una vez por cada elemento en el array.([Mdn docs](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach)).

Basicamente, el método \`forEach\` es una de las mejores maneras para usar un ciclo en un array, es mucho más simple que usar un \`for()\`. Lo que lo diferencia de otros métodos es que \`forEach()\` no devuelve nada (return) lo que lo hace más "barato".

### Sintaxis

Veamos la sintaxis de \`forEach\` y después hagamos un ejemplo:
\`\`\`jsx
forEach(function(element, index, array){/* ... */});
\`\`\`
Podemos observar que el método \`forEach\` toma una función \`callback\` que a su vez toma tres parámetros, los cuales son:

\`element\` - El elemento en el que estás iterando

\`index\` - El índice actual de cada elemento

\`array\` - El array al cual pertenece cada elemento


> 👀 ¡Ojo!, El \`element\` es el parámetro mas importante y requerido, los otros dos son opcionales.

### Hagamos un ejemplo
Veamos cómo es que el método \`forEach\` funciona 👇🏼

\`\`\`jsx
const names = ['Luis','Laura','Sonia','Brenda','Mario'];

names.forEach(name=>console.log(name));

// Luis
// Laura
// Sonia
// Brenda
// Mario
\`\`\`
De este ejemplo podemos observar, que hemos creado un array de nombres. Y para obtener cada uno de los nombres de forma individual, hemos utilizado el método \`forEach\`.

Veamos que ha sucedido aquí:

1. Tomamos el array de nombres, el cual está en la variable \`names\`.
2. Le agregamos el método \`forEach\` a este array.
3. Obtenemos cada uno de los nombres en el \`callback\`
4. Lo mostramos en consola

## Conclusión

Felicidades por llegar al final de este artículo. 🎉 Espero que si has comenzado tu camino como programador(a), este artículo te sirva de referencia.

Abrazo. Bliss.`;

async function main() {
  const slug = "te-explico-el-metodo-foreach-2023";

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

  // Crear el post con la fecha original (17 Febrero 2023)
  const post = await db.post.create({
    data: {
      slug,
      title: "Te explico el método forEach",
      body: postContent.trim(),
      published: true,

      // Imágenes
      coverImage: "https://i.imgur.com/kU9FkCZ.png",
      metaImage: "https://i.imgur.com/kU9FkCZ.png",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Clasificación
      mainTag: "JavaScript",
      tags: ["loops", "javascript", "arrays"],
      category: ["js"],

      // Fecha original del post (17 Febrero 2023)
      createdAt: new Date(1676649025304),
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
