import { db } from "../app/.server/db";

const postContent = `Estas son las últimas noticias: **Remix** dejará de actualizarse a partir de la versión 3. 😱

Si tú como yo, también eres seguidor de la comunidad de Ryan Florence, React Router o Remix, esto que te vengo a platicar seguro te resultará muy interesante. 👂🏼🥸
![React  Router v7](https://remix.run/blog-images/posts/merging-remix-and-react-router/rr-plus-vite-is-rr-7.jpeg)

Y, por si nos los conoces, Remix y React Router son lo mismo, hoy más que nunca, la misma comunidad. Pero ahora nos referiremos a este grupo de increíbles herramientas, y su comunidad, como RR7 (React Router v7) solamente.

En el blog de Remix podrás encontrar que lo que esta comunidad dice estar construyendo: es un puente. Un puente que llevaría a los aldeanos de su comunidad, seguros, a través de la niebla del río y arribar seguros hasta las tierras de Remix, largo y empinado peregrinaje desde las laderas de React Router. Pero el plan no estaba funcionando. Los aldeanos tenían miedo de cruzar por ese puente, pero tenían aún más miedo de abandonar sus hogares y algunos se resistieron a migrar. Al ver que se creó esta confusión, al equipo de Remix se le ocurrió que Vite podría ser el héroe que los rescatara. ¿Qué tal si *mergueamos* todo en un lanzamiento \`major\` de versión? Se preguntaron. La respuesta es la combinación de sus dos herramientas estrellas en solo una, matar a Remix en la v3 para favorecer al heredero legítimo. Con esto quiero decir que Remix v3 se ha convertido en React-router v7. A partir de esta versión, Remix dejará de actualizarse y nos quedaremos únicamente con React-router v/[0-9].[0.-9].[0-9]/.

## ¿Qué tendremos en React-router v7?

!https://remix.run/blog-images/posts/merging-remix-and-react-router/rr-plus-vite-is-remix.jpeg

El equipo de Remix y React Router, planean conservar todos los *features* que los programadores consideran más valiosos y útiles. Entre ellos, podemos encontrar:

- La separación automática de código (*back/front*)
- La carga de datos simplificada con *loaders*
- \`Form Actions\` y acciones de servidor.
- Estados de carga simplificados
- *Optimistic UI* (UI sin estados de carga)
- *Renderizado* por servidor
- *Pre-renderizado* estático
- *React Server Components*

Tal vez, la razón de mayor peso, para que el equipo de Remix decidiera abandonar la marca y preferir React-router: los React Server Components. Como sabes, React Router es la librería de ruteo para React más usada del mundo. 🌎 Yo creo que, en vez de competir contra Next.js con una marca que tiene solo cuatro años, hacerlo con una que tiene más de diez años, una mejor reputación y una comunidad aún más grande, parece por fin, una mejor idea. 👏🏼

Su intención es que esos más de siete millones de proyectos basados en React Router puedan actualizarse y aventajarse de todo lo último que React tiene para ofrecer una vez que estrene su nueva versión 19. \`El equipo de React Router quiere que esta biblioteca se convierta en la nueva forma estándar de iniciar un proyecto React 19.\`

Esa es la verdadera apuesta. 🦾

## ¿Qué pasará con Remix?

![remix v3](https://i.imgur.com/WdYugFu.png)

Si tú estas utilizando Remix actualmente, incluso hasta para varios proyectos (como yo), entonces debes saber que puedes seguir empleando las *feature flags* que seguirán en desarrollo hasta que React Router v7 sea publicado. Podrás cambiar todos tus *imports* con un *codemod* (un *script*) que el equipo de Remix publicará.

\`\`\`docker
- import { Link } from \`@remix-run/react\`
+ import { Link } from \`react-router\`
\`\`\`

El equipo de Remix nos explica en su blog que la marca no desaparecerá, ellos son el equipo Remix y React Router es un proyecto Remix. Como quiera, será mejor que volvamos a hablar de React Router, incluso si no conoces la versión seis, ¿no crees que sería interesante echarnos un clavado y ver cómo funciona esa biblioteca?, ¿no crees? Si si lo crees, no dejes de decirme en los comentarios, ¿qué te gustaría ver más en este canal? Aún no hay fechas fijas o claras para el lanzamiento de React Router v7. Pero el equipo de React Router ha prometido que hacer el cambio será fácil con los *scripts* que compartirán y también que es una buena noticia con todo lo que se avecina junto con React 19 🔥

Al parecer, todo se puede sacrificar por el progreso, o por quedarse con la adopción. 🥸 Bien por el equipo de React Router apostando por el futuro sin miedo a abandonar a los débiles, heridos y ancianos, que no lograremos cruzar el puente y que seremos devorados por los lobos… ¡nah! Nomás estoy siendo dramático, yo ando re feliz con Remix siendo un *plugin* de Vite, la verdad, te dejo otro video por acá. Listo, hemos terminado. Yo soy Héctorbliss, Te mando un abrazo.

También te dejo un enlace al blog de Remix para que te enteres bien del chisme. 📺

## Enlaces relacionados

[Remix blog](https://remix.run/blog/merging-remix-and-react-router)`;

async function main() {
  const slug = "react-router-v7-o-remix-v3-2024";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("Post ya existe, actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "¿React-router v7 o Remix v3?",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "http://hectorbliss.com",
        coverImage: "https://i.imgur.com/nvs8UBe.png",
        metaImage: "https://i.imgur.com/nvs8UBe.png",
        youtubeLink: "https://youtu.be/oUqJZr3t7Ng",
        tags: ["router", "web", "remix"],
        mainTag: "Remix",
      },
    });
    console.log("Post actualizado:", post.id);
  } else {
    console.log("Creando nuevo post...");
    const post = await db.post.create({
      data: {
        slug,
        title: "¿React-router v7 o Remix v3?",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "http://hectorbliss.com",
        coverImage: "https://i.imgur.com/nvs8UBe.png",
        metaImage: "https://i.imgur.com/nvs8UBe.png",
        youtubeLink: "https://youtu.be/oUqJZr3t7Ng",
        tags: ["router", "web", "remix"],
        mainTag: "Remix",
      },
    });
    console.log("Post creado:", post.id);
  }

  await db.$disconnect();
}

main().catch(console.error);
