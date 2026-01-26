import { db } from "../app/.server/db";

const postContent = `Las tendencias web convergen en una cosa: usar la memoria *cache* en beneficio del cliente.

Usar la memoria caché del navegador nos permite ofrecer una increíble experiencia a nuestros usuarios, además de que convierte nuestro sitio web en casi instantáneo, lo que poco a poco se vuelve lo normal en internet. Podemos decir que los usuarios ya no quieren esperar, por eso una de las principales inversiones domésticas del *millenial*, es en su internet de banda ancha. 😬

Pero manipular esta memoria caché del navegador nunca había sido tan simple como lo es hoy en día con **Remix**. 💿

Esta memoria caché es manejada de forma invisible por muchos *frameworks* y bibliotecas (*libraries*) como **React-Query**, **Redux-Query** o cualquiera de las otras muchas que terminan en \`-query\`.

Pero con **Remix**, podemos manipular esta memoria chaché en el cliente también. 🎉

**Remix** puede utilizarse con cualquiera de las herramientas que he mencionado antes, para explotar la caché del cliente: yo he utilizado [SWR](https://swr.vercel.app/) por ejemplo. Aunque siempre con dudas, pues esta sensación de: "**quedarme cerca de lo nativo de la web"** que me sembró **Remix**, me recuerda evitar las abstracciones todo lo que pueda, mientras no termine de entender la herramienta nativa. Y con **Remix**, uno se siente cerca de la plataforma. \`#useThePlatform\`

Pero con los nuevos \`clientLoaders\` de **Remix**, manejar la memoria caché es cuestión de agregar una función a nuestra ruta. El modelo mental también es muy simple, pues solo hay que pensar nuestros datos como una pequeña copia de lo que nuestro ya conocido y amado \`loader\` *function* nos entrega.

Mira, vamos a analizar lo que **Ryan** ha publicado recientemente en **Youtube**.

## El ejemplo de Ryan

[En su ejemplo](https://youtu.be/MrDhjB5ucHI?si=5rnhTkPQ8TTLmuhX), Ryan Florence, coautor de **Remix**, hace el consumo de una lista de películas. 🍿

El video no tiene desperdicio, como siempre Ryan divaga un poco, lo cual me hace recordar que me dedico a programar porque lo disfruto, no solo porque "me da trabajo". Es una pequeña y casi invisible diferencia que cambia toda tu carrera. 😉

Cada que la página se vuelve a montar al volver del detalle de la película, el \`loader\` entrega una lista con nuevos elementos, nunca es la misma.

Aquí es donde Ryan escribe el \`clientLoader\`. Esta no es más que una función, incluso emplea la sintaxis de toda la vida, Ryan nos muestra que lo único que debemos escribir es una pequeña condición para usar la memoria *cache*, si existe, o de lo contrario, asignarla. Ryan también nos va a explicar en este video que **Remix** nos previene de almacenar la caché en el primer rénder, esto como estrategia para tener datos más frescos. Pero siempre podemos modificar este comportamiento con el parámetro: \`clientLoader.hydrate=true\`.

> 👀 Si no hay una función \`loader\` pero si una \`clientLoader\`, el \`clientLoader\` será llamado al hidratar, como \`hydrate=true\`.

## Analicemos la sintaxis un poco más

Esta función se une a las otras que, como ya sabemos, **Remix** nos permite exportar del archivo de la ruta. Esta función correrá únicamente en el cliente y controlará de donde vienen los datos que la función \`loader\` entrega al componente React del cliente. Así que, no cambia nuestra forma de trabajar; solo agrega más placer. 🍆😳

\`\`\`jsx
let cache
export async function clientLoader({serverLoader}){
    if(cache) return { mortys: cache }

    const loaderData = await serverLoader()
    const mortys = await loaderData.mortys
    cache = mortys
    return {mortys}
}
\`\`\`

Nuestra función \`clientLoader\` recibe también \`params\` y \`request\`, pero algo más también. Recibe una función \`serverLoader\` que le permite conseguir los datos de \`loader\` si fuere necesario. La simplicidad de **Remix** está siempre presente, como con el uso de esa variable \`cache\` que nos va a funcionar de almacenamiento. Si aún no hay datos en esa variable, llamamos a la función \`serverLoader\` y "esperamos la *data"*. 🤓

La ponemos en nuestra caché y devolvemos los \`mortys\`.

Ahora, es posible evitar la llamada al *loader* si el cliente ya tiene una copia de los datos, todo completamente administrado por **Remix**. ¿Genialmente simple no crees? 🍿

### Remix no deja de competir, y por dos frentes, del lado de los *frameworks* SSR y también en las trincheras de la memoria caché en el navegador.

Cada que utilizo **Remix**, me cuesta más trabajo volver a mi empleo (no usamos Remix 😮‍💨).

¿Y tú, Cómo vas a utilizar los nuevos \`clientLoaders\` de **Remix**? Cuéntame aquí o en mis redes sociales.

Abrazo. Bliss. 🤓

## Enlaces relacionados

[Video de Ryan](https://youtu.be/MrDhjB5ucHI?si=5rnhTkPQ8TTLmuhX)

[SWR](https://swr.vercel.app/)`;

async function main() {
  const slug = "que-es-y-como-se-usa-la-funcion-clientloader-de-remix-2024";

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

  // Crear el post con la fecha original (23 Enero 2024)
  const post = await db.post.create({
    data: {
      slug,
      title: "¿Qué es y cómo se usa la función clientLoader de Remix?",
      body: postContent.trim(),
      published: true,

      // Imágenes
      coverImage: "https://i.imgur.com/tJynEIWh.png",
      metaImage: "https://i.imgur.com/tJynEIWh.png",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@blissito",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.facebook.com/blissito",

      // Clasificación
      mainTag: "Remix",
      tags: ["loaders", "cache", "functions", "frameworks", "remix"],
      category: ["clientLoader"],

      // Fecha original del post (23 Enero 2024)
      createdAt: new Date(1706023488452),
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
