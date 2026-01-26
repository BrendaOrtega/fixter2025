import { db } from "../app/.server/db";

const postContent = `En esta entrada te voy a enseñar a publicar un sitio web en una de las nubes *edge* más rápidas y convenientes que existen: Cloudflare.

Si quieres saber más sobre qué es el *edge* y cómo está cambiando la web, puedes escuchar el [episodio del *podcast*](https://podcasts.apple.com/mx/podcast/el-futuro-de-la-web-es-on-the-edge/id1438155670?i=1000612202416) sobre el *edge* o ver otro video que te dejo [acá](https://www.youtube.com/watch?v=ZUEN7XPMk3Q). Con Cloudflare puedes publicar tu sitio web, no en un solo servidor en gringolandia, sino en múltiples servidores en todo el mundo. En una red global de más de trescientas veinte ciudades, todas con una copia de tu aplicación, en más de ciento veinte países y además, no tienes que preocuparte por la infraestructura, pues tu app se ejecuta simplemente llamando a una función JS. Cien por ciento *serverless*. Por eso, vamos a crear un proyecto con Remix, que es una de las maneras más sencillas para crear un sitio web hoy en día, para luego publicarlo en el Edge de Cloudflare, ¿qué te parece el plan? Bueno, si esto te interesa, ¡pues vamos ya!

## Creando un proyecto web full stack con Remix

Existen varias maneras de crear un proyecto para Cloudflare, pero algunas de ellas puede que estén desactualizadas. Por eso, la manera más simple que encuentro para recomendarte es usar el *template* del propio equipo de Remix.

\`\`\`bash
npx create-remix@latest --template remix-run/remix/templates/cloudflare
\`\`\`

Responde las preguntas, nombra a tu proyecto \`remix-edge\` y entra en la carpeta con \`cd remix-edge\`.

Prueba tu proyecto ejecutando \`npm run dev\`. Verás que se levanta un servidor Vite.

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales de Remix y deployment en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Hagamos deploy

Una vez que hemos iniciado nuestro proyecto Remix, es momento ya de publicarlo. Cloudflare lo hace increíblemente simple. Solo corremos \`npm run deploy\`.

![Captura de pantalla](https://i.imgur.com/FZXQO2n.png)

Si observamos el script en el archivo \`package.json\` encontraremos que se ejecuta Wrangler y que se sube el cliente.

\`\`\`bash
wrangler pages deploy ./build/client
\`\`\`

> Wrangler te solicitará que inicies sesión.

Una vez que se ha subido deberías poder ver tu sitio desde una URL pública. En mi caso: [https://remix-edge.pages.dev/](https://remix-edge.pages.dev/) ¿genial no?

¡Felicidades, en cuestión de nada has publicado un sitio web full *stack*! ¿Qué se siente tener tal poder? No dejes de decirme en los comentarios si te gustaría que agregara una base de datos D1 a tu proyecto Remix.

Abrazo. Bliss.

## Enlaces relacionados

[Ejemplo en producción](http://remix-edge.pages.dev)

[Podcast sobre qué es el Edge](https://podcasts.apple.com/mx/podcast/el-futuro-de-la-web-es-on-the-edge/id1438155670?i=1000612202416)

[Video sobre Cloudflare Workers](https://www.youtube.com/watch?v=ZUEN7XPMk3Q)

[Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/#check-your-wrangler-version)`;

async function main() {
  console.log("Importando post sobre Remix en Cloudflare...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: {
      slug: "como-publicar-tu-sitio-remix-en-cloudflare-2024",
    },
  });

  if (existing) {
    console.log("⚠️  El post ya existe con ID:", existing.id);
    return;
  }

  const post = await db.post.create({
    data: {
      slug: "como-publicar-tu-sitio-remix-en-cloudflare-2024",
      title: "Cómo publicar tu sitio Remix, en Cloudflare",
      body: postContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "http://hectorbliss.com",

      // Imágenes
      coverImage: "https://i.imgur.com/FZXQO2n.png",
      metaImage: "https://i.imgur.com/FZXQO2n.png",

      // YouTube (vacío en el original)
      youtubeLink: "",

      // Clasificación
      tags: ["framework", "hosting", "deploy"],
      mainTag: "Remix",

      // Fechas originales de julio 2024
      createdAt: new Date(1720501899635), // 9 Jul 2024
      updatedAt: new Date(1720502407861), // 9 Jul 2024
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
