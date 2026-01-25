import { db } from "../app/.server/db";

const postContent = `### TLDR: Vamos a generar un HTML como primera respuesta al «request» del cliente, pero vamos a responder no con un archivo HTML, sino con pedacitos del mismo, con Streams.

En este post vamos a usar el término TTI (Time to interactive) que es una métrica de «progreso» que mide el performance del sitio web. En otras palabras: el tiempo que le tomará a un sitio web en entregar la data al cliente y que el cliente pueda interactuar con la página.

Y vamos a reducir al máximo ese TTI evitando la entrega de un archivo y en su lugar, justo como lo hacemos en [este otro post](https://fixtergeek.com/blog/generando-un-pdf-con-remix-y-fsreadfile-2023) con PDFs, pero en este caso con componentes de React. En el momento en que el cliente comience a recibir los pedacitos de datos, podrá, casi de inmediato, renderizar el contenido.

Vamos, pues, a explorar nuestra curiosidad, creando lo que se conoce como:
\`STREAMING SERVER-SIDE RENDERING\`

### ¿Cuál de todas las herramientas de React server emplearemos?
Como te imaginarás, esto es posible gracias a los componentes de servidor de React. En el caso de los strems a dos herramientas específicas:

* \`renderToPipeableStream\`
* \`renderToNodeStream\` ~~ya está deprecado~~
* \`renderToStaticNodeStream\`

[En ese video](https://youtu.be/f01dheEMMew), te muestro cómo usar el método \`renderToString\` para crear un SSR. Pero en esta ocasión no queremos trabajar con \`strings\`, sino con \`streams\`. Así que toca usar: \`renderToPipeableStream\`

### Cómo se ve un SSR vs SSSR
![SSR, server side rendering](https://i.imgur.com/3ED6og6.png)
En un SSR típico, hay que generar todo el HTML y entregarlo completo, para luego ser leído y conseguir los enlaces y el bundle.

Veamos cómo sería con streams:

![streaming server rendering](https://i.imgur.com/KG94YDh.png)
Cómo puedes notar, el tiempo de respuesta del servidor se reduce al máximo, pues en vez de entregar todo un archivo, el servidor puede devolver el primer pedacito, con el que el cliente puede comenzar a renderizar. Para luego seguir recibiendo pedacitos que continúa renderizando así, como le van llegando.

### Vamos al código
Esta es toda la app de express:

\`\`\`js
// index.js
import React from "react";
import path from "path";
import express from "express";
import { renderToPipeableStream } from "react-dom/server";
import App from "../components/App.jsx";

const PORT = 3000;

const app = express();

app.get("/favicon.ico", (req, res) => res.end());
app.use("client.js", (req, res) => res.redirect("/public/client.js"));
app.use(express.static(path.resolve(__dirname, "public")));
app.use("/build", express.static(path.resolve(__dirname, "public")));

app.get("/", (req, res) => {
  const { pipe } = renderToPipeableStream(
    <div id="root">
      <App />
    </div>,
    {
      bootstrapScripts: ["/client.js"],
      onShellReady() {
        res.setHeader("content-type", "text/html");
        res.write("<html><body><h1>Blissmo streaming</h1>");
        pipe(res);
      },
    }
  );
});

app.listen(PORT);
console.log(\`Running on: http://localhost:\${PORT}\`);
\`\`\`

Como te puedes dar cuenta en el código; el componente \`<App/>\`es enviado como streams gracias al método \`renderToPipeableStream\`. El HTML inicial es enviado al objeto de respuesta junto con los pedacitos de datos del componente \`<App/>\`.

Todos estos datos contienen información útil que nuestra app debe usar para poder renderizar el contenido correctamente, hablamos de datos como el \`<title></title>\` y las hojas de estilo \`<link/>\`. Si usáramos el método \`renderToString\` tendríamos que esperar hasta que la aplicación reciba todos los datos antes de comenzar la carga, procesar los metadatos y posteriormente hidratar.

No olvidemos llamar a \`hydrateRoot\` **en nuestro client.js**

(Revisa el [repo](https://github.com/HectorBlisS/Youtube_Streaming_Server_Rendering) con todo el proyecto)

Con esto es posible que nuestra \`<App/>\` comience la carga y el procesamiento de información de inmediato, con la posibilidad de seguir recibiendo los pedacitos de datos del componente \`<App/>\` ¿fascinante no crees?

### Esto tiene ventajas enormes, sobre todo hablando de optimización de memoria.
Además, el servidor utiliza mucha menos memoria y se mantiene mucho más responsivo, evitando casi por completo el \`bloqueo I/O\` por lo que es famoso Node.js y sus streams.

\`renderToPipeableStream\` está disponible desde la versión 16 de React (2016) pero hasta ahora está tomando mucha importancia, pues el desarrollo web está volviendo al servidor.

Otra ventaja que quiero mencionar aquí es que los streams pueden ser leídos por los \`crawlers\`. Esto significa que el SEO será interpretado perfectamente.

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

¿Qué tal?, ahora que entiendes cómo funcionan los Streams de React, ¿Te gustaría saber más sobre los experimentos que está haciendo el equipo de React con SSR?

Déjame saberlo en mi [twitter](https://twitter.com/hectorbliss).

Abrazo. Bliss.

### Enlaces relacionados

[El repo con todo el codigo funcionando](https://github.com/HectorBlisS/Youtube_Streaming_Server_Rendering)

[Entre PDFs como streams](https://fixtergeek.com/blog/generando-un-pdf-con-remix-y-fsreadfile-2023)

[Más sobre streams: Video](https://youtu.be/f01dheEMMew)

[React components sin bundle.js](https://legacy.reactjs.org/blog/2020/12/21/data-fetching-with-react-server-components.html)`;

async function main() {
  const slug = "streaming-server-side-rendering-o-renderizado-del-lado-del-servidor-con-streams-explicado-2023";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("Post ya existe, actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "Streaming Server-Side Rendering o Renderizado del lado del servidor con Streams. Explicado",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        coverImage: "https://cdn.shopify.com/s/files/1/0650/2036/2973/products/BluePurpleFuturisticModernHologram3DHowToSearchBarTechInstagramPost.png?v=1656351359",
        metaImage: "https://cdn.shopify.com/s/files/1/0650/2036/2973/products/BluePurpleFuturisticModernHologram3DHowToSearchBarTechInstagramPost.png?v=1656351359",
        youtubeLink: "https://youtu.be/ttL_wL1F17A",
        tags: ["streams", "ReactDOM/server"],
        mainTag: "React",
      },
    });
    console.log("Post actualizado:", post.id);
  } else {
    console.log("Creando nuevo post...");
    const post = await db.post.create({
      data: {
        slug,
        title: "Streaming Server-Side Rendering o Renderizado del lado del servidor con Streams. Explicado",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        coverImage: "https://cdn.shopify.com/s/files/1/0650/2036/2973/products/BluePurpleFuturisticModernHologram3DHowToSearchBarTechInstagramPost.png?v=1656351359",
        metaImage: "https://cdn.shopify.com/s/files/1/0650/2036/2973/products/BluePurpleFuturisticModernHologram3DHowToSearchBarTechInstagramPost.png?v=1656351359",
        youtubeLink: "https://youtu.be/ttL_wL1F17A",
        tags: ["streams", "ReactDOM/server"],
        mainTag: "React",
      },
    });
    console.log("Post creado:", post.id);
  }

  await db.$disconnect();
}

main().catch(console.error);
