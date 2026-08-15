import { db } from "../app/.server/db";

const htmlPostContent = `
Si estas explorando el mundo del desarrollo web, seguramente has escuchado el término HTML **(HyperText Markup Language)**, y seguramente alguna vez has escuchado que \`es un lenguaje de programación\` pero ¡hey!

![meme no es cierto, no hagas caso no es cierto](https://i.imgur.com/d0rzb9V.jpg)

\`HTML es un lenguaje de marcado\`, con el cual puedes crear la estructura base de una página web mediante pequeñas etiquetas llamadas etiquetas de marcado.

\`Con solo HTML podrías crear tu propio sitio web\`, aunque suele combinarse con CSS para estilizar el sitio (tamaños, colores, animaciones) y con JavaScript para agregar funcionalidades avanzadas (validaciones, cambios de estado, interacción, etc).

Remontándonos a su historia, \`HTML fue creado en 1980 por Tim Berners-Lee\`, y ha ido actualizándose con los años, por lo que actualmente usamos HTML5, la última versión del lenguaje, la cual tiene algunas sustanciales mejoras como... que nos permite incluir elementos multimedia como videos o audios e incluso crear videojuegos (pero hablaremos de sus diferencias en otro post).

Cuando creas un archivo HTML debes seguir esta estructura para que sea interpretado correctamente por el navegador:

![ejemplo de archivo html](https://i.imgur.com/wKnumim.png)

Pero ¿Qué representa cada una de estas etiquetas?

![ejemplo de uso de etiquetas html](https://i.imgur.com/o1aHLHw.png)

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

Ahora, ya que tenemos la estructura de nuestro archivo HTML, podemos hacer uso del resto de las etiquetas de marcado dentro de nuestra etiqueta body.

Revisemos rápidamente las 32 etiquetas de HTML5 más utilizadas:

![etiquetas html](https://i.imgur.com/fn0IR6R.png)

Cada una de estas etiquetas tiene algunas características predefinidas como márgenes, paddings, anchos, altos, etc, pero son características que puedes modificar utilizando CSS.

Sabemos que aprender tantas etiquetas no es fácil, pero es solo cuestión de práctica. ¿Quieres practicar ahora? Te dejo este link en donde podrás visualizar la estructura básica de un archivo HTML y un par de etiquetas, así que solo empieza a agregar las tuyas [Practicar ahora](https://codepen.io/fixtergeek/pen/gOvVdWj?editors=1000)

Abrazo. Blissmo. 🤓
`;

async function main() {
  console.log("Importando post de HTML básico...");

  const post = await db.post.create({
    data: {
      slug: "aprende-en-5-minutos-que-es-html-y-cuando-utilizar-cada-una-de-sus-etiquetas",
      title:
        "Aprende en 5 minutos qué es HTML y cuando utilizar cada una de sus etiquetas",
      body: htmlPostContent.trim(),
      published: true,

      // Autor original
      authorName: "Brenda Ortega",
      authorAt: "@brenda-ort",
      photoUrl: "https://i.imgur.com/TFQxcIu.jpg",
      authorAtLink: "https://www.linkedin.com/feed/",

      // Clasificación
      tags: ["html", "html5", "web", "principiantes"],
      mainTag: "HTML5",

      // Imágenes para SEO/OG
      coverImage: "https://i.imgur.com/iy1cPxg.jpg",
      metaImage: "https://i.imgur.com/JEuR5WQ.png",

      // Fecha original (Junio 2022)
      createdAt: new Date(1656115290608),
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
