import { db } from "../app/.server/db";

const postContent = `Esta es una introducción práctica a Puppeteer. Ya sea que lo necesites para construir la base de datos de tu nuevo proyecto o para que un agente AI lo use, este tutorial te va a caer de perlas.

## Primero, lo primero: ¿qué es Puppeteer?

Es una herramienta para controlar los navegadores Chrome o Firefox a través de el [protocolo DevTools](https://chromedevtools.github.io/devtools-protocol/). Se le conoce como navegadores *headless* porque se trabaja vía código, sin UI visible en absoluto (aunque se puede activar como en nuestro siguiente ejemplo). 🤯 También se le conoce como herramienta de "scraping" o "crawling". 🕷️

## Se instala re-fácil

Claro, vamos a usar \`npm\` para instalar.

\`\`\`jsx
npm i puppeteer
\`\`\`

Esta instalación descargará Chrome también. Podríamos omitir la descarga de Chrome con esta otra instalación:

\`\`\`jsx
npm i puppeteer-core
\`\`\`

Aunque para nuestro ejemplo usaremos la primera instalación. 🦚

## Hagamos el ejemplo más simple

Creamos un archivo \`.js\` para colocar nuestro código y luego ejecutarlo con *node*.

\`\`\`jsx
// import puppeteer from 'puppeteer';
const puppeteer = require("puppeteer");
// 1. Importamos (puede usar require)

const main = async () => {
  // 2. Lanzamos el navegador y abrimos una pagina en blanco
  const browser = await puppeteer.launch({
    headless: false, // queremos ver
  });
  const page = await browser.newPage();

  // 3. Hacemos que la página cargue un sitio determinado
  await page.goto("https://fixtergeek.com/blog");

  // 4. Definimos el tamaño de nuestra pantalla
  await page.setViewport({ width: 425, height: 809 });

  // 5. Seleccionamos y escribimos en el search input y esperamos un poco
  await page.locator("input[type='search']").fill("react router");
  //   await page.waitForFunction("window.innerWidth > 100");
  await delay(4000);

  // 7. Localizamos el título
  const titleNode = await page.locator("div.grid > div > a > h4").waitHandle();
  const title = await titleNode?.evaluate((el) => el.textContent);

  console.log("Este es el titulo del primer resultado:", title);
  await browser.close();
};
main();

function delay(time) {
    return new Promise(function (resolve) {
      setTimeout(resolve, time);
    });
  }
\`\`\`

Para este ejemplo simple, he lanzado el navegador como \`headless:false\`, lo que me permite mirar lo que hace el robot. 🤖

También he agregado una función \`delay\` para esperar un poco. 🕧

Ya nomás te falta correrlo, ejecuta tu archivo .js usando node:

\`\`\`jsx
node main.js
\`\`\`

> 👀 Si no tienes instalado node.js en tu compu, checa [este video](https://www.youtube.com/watch?v=ixkE4i-oDe4&list=PLBgIesA3JxkMZypJYXMSmbd2XbU0QXh1x).

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro canal de YouTube. [Suscríbete aquí](https://www.youtube.com/@fixtergeek) para no perderte ninguno.

---

## Puppeteer es una herramienta fácil de usar y muy potente, con una gran comunidad 100% open-source

¿Apoco no está re fácil? Dominar esta herramienta te puede abrir puertas a las automatizaciones del futuro cercano que los agentes de AI necesitarán, no dejes de echarle un ojo a sus [docs oficiales](https://pptr.dev/guides/what-is-puppeteer). 📘

Abrazo. Bliss. 🤓

## Enlaces relacionados

[Fixtergeek blog](https://www.fixtergeek.com/blog)

[Aprende React Router](https://www.fixtergeek.com/cursos/Introduccion-al-desarrollo-web-full-stack-con-React-Router/detalle/)

[Instala NodeJS: Video](https://www.youtube.com/watch?v=ixkE4i-oDe4&list=PLBgIesA3JxkMZypJYXMSmbd2XbU0QXh1x)

[Devtools Protocol](https://chromedevtools.github.io/devtools-protocol/)`;

async function main() {
  console.log("Importando post de Puppeteer...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug: "intro-a-puppeteer" },
  });

  if (existing) {
    console.log("⚠️  El post ya existe con ID:", existing.id);
    return;
  }

  const post = await db.post.create({
    data: {
      slug: "intro-a-puppeteer",
      title: "Intro a Puppeteer",
      body: postContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@blissito",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Imágenes
      coverImage:
        "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fcodoid.com%2Fwp-content%2Fuploads%2F2021%2F05%2FPuppeteer-Tutorial-Blog.jpg&f=1&nofb=1&ipt=dc982614bd48bacf450a39ab3395708799782b053b074780ee467d8b97082dba",
      metaImage:
        "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fcodoid.com%2Fwp-content%2Fuploads%2F2021%2F05%2FPuppeteer-Tutorial-Blog.jpg&f=1&nofb=1&ipt=dc982614bd48bacf450a39ab3395708799782b053b074780ee467d8b97082dba",

      // Video
      youtubeLink: "",

      // Clasificación
      tags: ["scraping", "crawling", "headless"],
      mainTag: "puppeteer",

      // Fecha original del post (April 24, 2025, basado en createdAt del HTML)
      createdAt: new Date(1745507604993),
      updatedAt: new Date(1745507806254),
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
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
