import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const body = `Durante años, construir en la web significó elegir un bando. O te ibas con el DOM —con su texto que se selecciona, su accesibilidad gratis, su \`Ctrl+F\` que funciona, sus formularios que el navegador autocompleta— o te ibas con el \`<canvas>\`, donde tienes control absoluto sobre cada pixel pero el navegador no sabe que ahí adentro hay "texto", "un botón" o "un campo de nombre". Para el lector de pantalla, un canvas es una caja negra. Para Google, es un hueco en blanco.

Editores como Figma, Google Docs o Miro viven exactamente en esa tensión: necesitan el rendimiento y el control del canvas, pero terminan reimplementando a mano cosas que el navegador ya hace de fábrica —layout de texto multilínea, bidireccionalidad, selección, edición— porque el canvas no se las da.

Chrome está probando una salida a ese dilema. Se llama **HTML-in-Canvas API** y la idea es tan directa que cuesta creer que no existiera antes: dibujar elementos vivos del DOM *dentro* del canvas, sin perder su interactividad ni su semántica.

## La falsa elección

El truco mental para entender esto es dejar de pensar en "DOM contra canvas" y empezar a pensar en "DOM **renderizado en** canvas". El elemento sigue siendo un elemento real del documento —el navegador lo conoce, lo indexa, lo hace accesible, lo deja recibir foco y clicks— pero su representación visual la pintas tú, en una textura, cuando tú quieras y como tú quieras.

Eso significa que cosas que dabas por perdidas dentro de un canvas vuelven a funcionar solas:

- **Buscar en la página** (\`find-in-page\`) encuentra el texto.
- Los **lectores de pantalla** y herramientas de accesibilidad leen el contenido real.
- Las **extensiones** y el **autocompletado** de formularios operan normal.
- Los **crawlers** —y cada vez más, los **agentes de IA**— pueden leer e indexar lo que antes era un agujero opaco.

No es maquillaje: es el mismo árbol del DOM, solo que su pintura termina como pixeles en tu lienzo.

## Cómo se ve en código

El punto de entrada en Canvas 2D es un método nuevo: \`drawElementImage()\`. Le pasas un elemento del DOM y lo dibuja en las coordenadas que le indiques.

\`\`\`html
<canvas layoutsubtree>
  <div id="form_element">
    <label>Nombre:</label> <input type="text">
  </div>
</canvas>
\`\`\`

Fíjate en dos cosas. Primero, el atributo \`layoutsubtree\` en el \`<canvas>\`: le avisa al navegador que sus hijos no son un simple *fallback* sino contenido que va a participar del layout y que vas a dibujar. Segundo, ese \`<div>\` con un \`<input>\` adentro es un formulario de verdad, no un dibujo de un formulario.

\`\`\`javascript
const ctx = canvas.getContext('2d');

canvas.onpaint = () => {
  const transform = ctx.drawElementImage(form_element, 0, 0);
  form_element.style.transform = transform.toString();
};
\`\`\`

El callback \`onpaint\` se dispara cuando el canvas necesita repintarse. \`drawElementImage()\` te devuelve la transformación que aplicó, para que puedas alinear el elemento interactivo real encima de su versión dibujada —así el click cae donde el usuario lo ve.

## No solo 2D: también WebGL y WebGPU

Aquí es donde la cosa se pone interesante para quien trabaja con gráficos. El mismo concepto existe en las tres APIs de canvas, devolviéndote el DOM como una **textura**:

| API | Método |
|-----|--------|
| Canvas 2D | \`drawElementImage()\` |
| WebGL | \`texElementImage2D()\` |
| WebGPU | \`copyElementImageToTexture()\` |

Que un elemento del DOM se convierta en una textura de WebGL o WebGPU abre puertas que antes estaban tapiadas: poner un panel de UI con texto real y seleccionable *dentro* de una escena 3D, etiquetas legibles en una experiencia de WebXR, o el HUD de un juego que el navegador entiende como texto y no como un sprite más.

Y no es teoría aislada: **Three.js** ya expone esto mediante \`THREE.HTMLTexture\`, y **PlayCanvas** sumó soporte con su propia API de texturas. Los motores se están adelantando.

## Para quién cambia las reglas

Las aplicaciones que más sufren la falsa elección son justamente las que más ganan:

- **Editores de documentos y de diseño** (Google Docs, Figma, Miro): dejan de reimplementar layout de texto, edición y selección a mano.
- **Escenas 3D e inmersivas** (WebXR): texto e interfaces nítidas y accesibles dentro del mundo 3D.
- **Juegos**: interfaces internas con selección de texto nativa, sin trucos.

En todos los casos el patrón es el mismo: te quedas con el control de pixel del canvas y recuperas, gratis, la inteligencia que el navegador ya tenía sobre el DOM.

## El asterisco: es un origin trial

Antes de que abras tu editor con demasiado entusiasmo, la realidad: esto es **experimental**. Vive como *origin trial* en Chrome 148 a 150, y para probarlo localmente hoy necesitas activar la bandera \`chrome://flags/#canvas-draw-element\` en Chrome Canary 149 o superior.

Un origin trial significa exactamente eso: una prueba. La API puede cambiar, los nombres de los métodos pueden moverse, y nada de esto está listo para producción todavía. Pero es justo el momento en que vale la pena meter las manos —probar, romper, mandar feedback— porque las decisiones de diseño aún están abiertas. La API la firman Thomas Nattestad y Natalia Markoborodova del equipo de Chrome, y la documentación oficial está en el [blog de Chrome for Developers](https://developer.chrome.com/blog/html-in-canvas-origin-trial).

## Lo que de verdad importa

Hay APIs nuevas que solo te dan azúcar sintáctica. Esta no. HTML-in-Canvas ataca una de las divisiones más viejas y costosas de la plataforma web: la frontera entre "rico y semántico" (DOM) y "rápido y controlable" (canvas). Si se estabiliza, la cantidad de código que editores y motores 3D escriben hoy solo para *emular* lo que el navegador ya sabe hacer podría simplemente desaparecer.

Y esa es la clase de cambio que no se nota en la demo, pero se siente durante años en cada base de código que deja de pelear contra su propia plataforma.

Te dejo el video oficial del equipo de Chrome arriba para que lo veas en acción. Si te late este tipo de contenido —APIs nuevas, gráficos en la web, lo que viene— pásate por [mi canal de YouTube](https://www.youtube.com/@fixtergeek), que ahí desmenuzo estas cosas con calma.

Abrazo. bliss. 🪄
`;

async function main() {
  const post = await db.post.create({
    data: {
      title:
        "HTML dentro del canvas: Chrome quiere acabar con la falsa elección entre DOM y pixeles",
      slug: "html-en-canvas-api-origin-trial",
      body,
      contentFormat: "markdown",
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",
      mainTag: "javascript",
      tags: ["javascript", "css", "tutorial", "opinion"],
      youtubeLink: "https://www.youtube.com/watch?v=TUtKGTeFWjQ",
      metaImage:
        "https://developer.chrome.com/static/blog/html-in-canvas-origin-trial/image/thumbnail.png",
      coverImage:
        "https://developer.chrome.com/static/blog/html-in-canvas-origin-trial/image/thumbnail.png",
      published: true,
    },
  });
  console.log(`Post created: /blog/${post.slug}`);
  console.log(`ID: ${post.id}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
