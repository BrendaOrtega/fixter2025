import { db } from "../app/.server/db";

const fabricjsPostContent = `
El canvas de HTML es muy potente por sí solo, pero a veces se torna difícil de programar. Fabric te permite multiplicar el poder de la etiqueta canvas, porque te ayuda a administrar los elementos que colocas dentro, como objetos. Puedes modificar sus atributos e interactuar por medio de vértices, entre muchas más opciones muy potentes.

Vamos, pues, en este post, a inicializar nuestro \`canvas\` con habilidades especiales, agregar una imagen desde nuestra computadora y de paso a generar un descargable \`PNG\` desde nuestro navegador. ¡Bueno, vamos allá! 🍿

## Inicializando el proyecto

Para este proyecto vamos a utilizar únicamente un archivo: \`index.html\`

\`\`\`html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
    <script src="https://unpkg.com/fabric@5.3.0/dist/fabric.min.js"></script>
    <style>
      canvas {
        border: 4px solid #323232;
      }
    </style>
  </head>

  <body>
    <h2>Fabric.Canvas demo</h2>
    <canvas id="canvas"></canvas>
    <script>
      const canvas = new fabric.Canvas("canvas");
    </script>
  </body>
</html>
\`\`\`

Observa cómo producimos un objeto \`canvas\` a partir de la clase \`fabric.Canvas\` con una instancia, y pasando el \`id\` del nodo. También puedes no seleccionarlo y generar el nodo directamente, pero este método es el más sencillo.

Antes de pasar directo a la construcción de nuestro editor de imágenes, quiero que veas cómo ya estamos listos para agregar \`objetos\` al canvas:

\`\`\`javascript
const canvas = new fabric.Canvas("canvas");
var rect = new fabric.Rect({
  left: 100,
  top: 100,
  fill: "red",
  width: 50,
  height: 50,
});
canvas.add(rect); // Lo agregamos después de crearlo
\`\`\`

De esta forma, tienes total control del objeto que has agregado al canvas. Ahora es sumamente simple cambiarlo, rotarlo o incluso eliminarlo programáticamente. ¡Pero ahora también puedes interactuar con el elemento usando el mouse!

![Interacción con rect en canvas](https://i.imgur.com/QQTxSgC.gif)

¿Genial, no? 🤯

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Vamos ahora a permitir que el usuario agregue una imagen

Agreguemos un input de tipo \`file\` para que nuestro usuario pueda colocar una imagen en el \`canvas\`.

\`\`\`html
<h2>Fabric.Canvas demo</h2>
<input type="file" name="image" id="input" />
<canvas id="canvas"></canvas>
\`\`\`

Y de paso agregamos un listener para manipular la imagen que el usuario subió, una vez lista.

\`\`\`javascript
input.onchange = (evnt) => {
  const file = evnt.target.files[0];
  const url = URL.createObjectURL(file);
  const imgNode = new Image();
  imgNode.src = url;
  imgNode.onload = () => {
    const img = new fabric.Image(imgNode, {
      left: 100,
      top: 100,
      angle: 30,
      opacity: 1,
    });
    canvas.add(img); // esta es la magia
  };
};
\`\`\`

Pasan varias cosas aquí:

1. Dentro de \`onchange\` tomamos el archivo y generamos un objeto URL a partir de él. Antes hacíamos esto con \`FileReader\`, pero gracias a la clase \`URL\` ahora es más fácil. ✅
2. Creamos el nodo \`img\` para cargar la visualización.
3. Una vez que la imagen ha cargado, generamos una instancia con \`fabric.Image\` con ciertos atributos como la rotación.
4. Finalmente, agregamos nuestro objeto al \`canvas\`.

👀 Rotar elementos en el canvas con Fabric es inmensamente fácil y útil. Esto sería muy difícil de hacer con el canvas nativo.

![Subir y rotar imágenes](https://i.imgur.com/iCc8SVO.gif)

## Una última adición: Generar una imagen a partir del canvas

Para terminar, vamos a agregar un botón que genere nuestra imagen compuesta en formato \`PNG\` y detone una descarga.

Primero, añadimos un botón y su respectivo listener.

\`\`\`html
<button id="btn">Generar imagen</button>

<script>
btn.onclick = () => {
  const dataURL = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.download = "true";
  a.href = dataURL;
  a.click();
};
</script>
\`\`\`

Para lograrlo hay que solicitar la imagen al canvas con una pequeña configuración y posteriormente asignarla a una etiqueta \`<a>\` que nos permita detonar la descarga.

![Generar PNG desde canvas](https://i.imgur.com/WfuyPN9.gif)

💥 Lo lograste. Es hora de dejar volar tus ideas, tu creatividad y usar \`fabric\` para construir experiencias modernas en tus aplicaciones.

## Conclusión

Fabric es muy poderoso y su documentación tiene una infinidad de ejemplos y tutoriales, seguro encuentras cómo hacer aquello que necesitas para modificar imágenes dentro de tu app.

![Fabric.js en acción](https://i.imgur.com/8h6jtN1.gif)

No dejes de echarle un vistazo a su [documentación oficial](http://fabricjs.com/). 🤓

Recuerda que puedes aprender a usar canvas con puro JS [aquí](https://videogames.offers.hectorbliss.com/).

Abrazo. Blissmo. 🤓
`;

async function main() {
  console.log("Importando post de Fabric.js...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug: "fabricjs-para-manipular-y-generar-imagenes-con-canvas-2023" },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug: "fabricjs-para-manipular-y-generar-imagenes-con-canvas-2023" },
      data: {
        title: "Fabric.js para manipular y generar imágenes con canvas",
        body: fabricjsPostContent.trim(),
        published: true,
        youtubeLink: "https://youtu.be/xd5-j7_NfCM",
        authorName: "Héctorbliss",
        authorAt: "@blissmo",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        tags: ["fabric", "libreria", "html", "ejemplo", "imagenes"],
        mainTag: "Canvas",
      },
    });
    console.log("✅ Post actualizado exitosamente!");
    console.log(`   ID: ${post.id}`);
    console.log(`   URL: /blog/${post.slug}`);
    return;
  }

  // Crear el post con fechas originales
  const post = await db.post.create({
    data: {
      slug: "fabricjs-para-manipular-y-generar-imagenes-con-canvas-2023",
      title: "Fabric.js para manipular y generar imágenes con canvas",
      body: fabricjsPostContent.trim(),
      published: true,

      // YouTube
      youtubeLink: "https://youtu.be/xd5-j7_NfCM",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@blissmo",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",

      // Clasificación
      tags: ["fabric", "libreria", "html", "ejemplo", "imagenes"],
      mainTag: "Canvas",

      // Fechas originales (13 Junio 2023)
      createdAt: new Date(1686682850990),
      updatedAt: new Date(1686682850990),
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Fecha original: ${post.createdAt}`);
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
