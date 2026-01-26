import { db } from "../app/.server/db";

const postContent = `Me gustan las TVs viejas. Me gusta su redondez. Les puedo conectar mi consola nintendo con cables RGBA y hasta puedo conectarles mi Atari por el puerto coaxial. Sí, tengo este gusto raro por lo viejo; es como si estuviera tan rezagado que apenas le voy viendo la belleza a la tecnología análoga de hace más de 50 años. Soy de la generación a la que le daba mucho miedo que una greñuda saliera de la TV mientras esta producía ruido blanco o "white noise". Por eso, y por esta maldita nostalgia, hoy te voy a enseñar cómo generar ruido blanco con un poquitito de JavaScript. Vamos a escribir menos de treinta líneas de código para convertir nuestro navegador en un portal maligno por donde se te puede meter la greñuda… 💇🏿‍♀️

## Preparando el codepen

Vamos a trabajar en [codepen.io](http://codepen.io) para más fácil, así puedes compartir tu creación con todo el mundo, con tus amigos o enseñárselo a tu abuela para que la tortures con la dulzura de la nostalgia.

\`\`\`jsx
<canvas />
\`\`\`

En la pestaña del **HTML** solo vamos a colocar una etiqueta auto-contenida, claro, para el *canvas*.

\`\`\`jsx
body{
  margin:0;
  overflow:hidden;
}
\`\`\`

Para el **CSS** tenemos solo un selector que nos ayuda a quitar el margen y a no mostrar barras de *scroll*, así nuestro efecto se sentirá mejor.

Bueno, ya estamos list@s para lo chido.

## Recorriendo pixeles

Aquí es donde comienza la magia, vamos a revolver los pixeles del *canvas* con un algoritmo mágico. Usaremos un método del contexto del *canvas* que se llama \`getImageData()\` que nos devolverá los datos de los píxeles subyacentes. Pero ya llegaremos ahí, primero vamos a declarar nuestras constantes y una función llamada: \`whiteNoise\`; bonito nombre ¿qué, no? ⬜️

\`\`\`jsx
const theCanvas = document.querySelector("canvas");
const width = innerWidth;
const height = innerHeight;

function whiteNoise() {
    const canvas = Object.assign(theCanvas, {width, height});
    const ctx = canvas.getContext('2d');
}
\`\`\`

Vamos a usar las medidas del propio *viewPort*, así que las metemos en variables que podamos reutilizar. ¿Ya viste que bonito se puede crear un \`<canvas />\` local con \`Object.assign\`? ¡Chulada! 🫦

> Recuerda que en el mundo de JS, todo es un objeto.

Teniendo el contexto a la mano (\`ctx\`), es momento de pintar todo de negro para luego modificar esos píxeles.

\`\`\`jsx
    ctx.fillRect(0, 0, width, height);
    const p = ctx.getImageData(0, 0, width, height); // ✨
\`\`\`

\`p\` ahora es una cajita de pixelitos, como legos a los que les cambiaremos los colores.

\`\`\`jsx
    requestAnimationFrame(function draw(){
      for (var i = 0; i < p.data.length; i++) {
        p.data[i++] = p.data[i++] = p.data[i++] = Math.random() * 255; // 🪄
      }
      ctx.putImageData(p, 0, 0); // 🎩
      requestAnimationFrame(draw); // 🔁
    });
\`\`\`

Esta es la función \`draw\`, la que se encargará de cambiar todos los píxeles del *canvas* con un loop. Aquí es donde realmente sucede el revoltijo, el truco de magia, la prestidigitación.

Una vez modificados y revueltos los píxeles, los volvemos a meter a la cajita con el método \`putImageData()\`. Y claro, solicitamos un \`animationFrame\` nuevo, para repetir perpetuamente. ♾️

\`\`\`jsx
const theCanvas = document.querySelector("canvas")

function whiteNoise() {
    const width = innerWidth;
    const height = innerHeight;
    const canvas = Object.assign(theCanvas, {width, height});
    const ctx = canvas.getContext('2d');

    ctx.fillRect(0, 0, width, height);
    const p = ctx.getImageData(0, 0, width, height); // ✨

    requestAnimationFrame(function draw(){
      for (var i = 0; i < p.data.length; i++) {
        p.data[i++] = p.data[i++] = p.data[i++] = Math.random() * 255; // 🪄
      }
      ctx.putImageData(p, 0, 0); // 🎩
      requestAnimationFrame(draw); // 🔁
    });

    // in case you want to send it to a WebRTC Peer. 🤓
    return canvas.captureStream();
  }

whiteNoise()
\`\`\`

Y, ya por último, devolvemos el \`mediaStream\` que el *canvas* entrega en su método \`captureStream()\`. Esto nomás por si quisiéramos enviarlo por la red con **WebRTC,** por ejemplo. Más adelante intentaré subir un ejemplo de lo que podríamos hacer con ese \`mediaStream\`. 🤓

¡Y ya está! Al final del archivo invocaremos a la función \`whiteNoise\` para que todo comience. Por ahora no nos interesa lo que devuelve, pero sí lo que dibuja. ¡Genial! ¿No lo crees? 🤯

Abrazo. Bliss.

## Enlaces relacionados

[Codepen](https://codepen.io/H-ctor-BlisS-the-animator/full/QwWaWOK)

[Checa mi tutorial para construir Tetris](https://www.fixtergeek.com/cursos/construye-tetris-solo-con-javascript/viewer?videoSlug=Creando-la-estructura-del-proyecto)`;

async function main() {
  console.log("Importando post de White Noise...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug: "White-Noise" },
  });

  if (existing) {
    console.log("⚠️  El post ya existe con ID:", existing.id);
    return;
  }

  const post = await db.post.create({
    data: {
      slug: "White-Noise",
      title: "White Noise",
      body: postContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@blissito",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Imágenes
      coverImage: "https://i.imgur.com/5Nfbb1j.gif",
      metaImage: "https://i.imgur.com/5Nfbb1j.gif",

      // Clasificación
      tags: ["js", "html", "ruido", "efecto", "animacion", "noise"],
      mainTag: "canvas",

      // YouTube
      youtubeLink: "https://youtu.be/oOzHzuFuyAE",

      // Fecha original: 14 Marzo 2025 (timestamp: 1741964918181)
      createdAt: new Date(1741964918181),
      updatedAt: new Date(),
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Autor: ${post.authorName}`);
  console.log(`   Fecha original: ${post.createdAt.toLocaleDateString("es-MX")}`);
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
