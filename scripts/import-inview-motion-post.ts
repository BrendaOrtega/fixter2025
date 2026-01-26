import { db } from "../app/.server/db";

const inViewContent = `
# Detectar si un elemento está a la vista nunca fue tan fácil

Utilizar la **API** de "**Intersection Observer**" del navegador directamente, es divertido, puedes escribir tus propios **Hooks** para trabajar con él, pero en este canal te he hablado de **Motion One**, una biblioteca que vale la pena descubrir, te dejo [un video](https://youtu.be/7GMbh35v4i0?si=z2OjXWVGqmVUDRC1) por si quieres saber más, Motion One simplifica al máximo el uso de esta **API**.

Siempre es útil detectar si un elemento entra en pantalla para animarlo a él o a otros elementos, y no siempre quieres recordar cómo usar el API de bajo nivel, a veces no quieres trabajar en una pequeña animación días enteros ¿verdad?

Por eso hoy te voy a enseñar una manera sencillísima para animar elementos cuando entran en la vista, así es, usando **Motion One**.

## Analizando el código que tenemos

Vamos a ayudarnos esta vez de un proyecto ya inicializado en **StackBlitz** que además puedes clonar y modificar directamente, todo en tu navegador; y sin instalar nada; abre de una vez el enlace que te [dejo aquí](https://stackblitz.com/edit/vite-react-tailwindcss-8aa8vj?file=src%2Fcomponents.jsx).

Para no utilizar archivos **CSS** en este proyecto vamos a ayudarnos de **Tailwind CSS**.

¡Pues comencemos ya!

Vamos a mirar el componente \`App.jsx\`, encontraremos que tenemos apilados un pequeño grupo de componentes \`<Section>\`, justo para conseguir algo de _scroll_.

\`\`\`jsx
// App.jsx

import { Card, Section } from './components';

export default function App() {
  return (
    <>
      <Section title="Primer blissmo" />
      <Section
        title="Segundo blissmo"
        className="bg-gradient-to-r from-yellow-500 to-red-500"
      />
      <Section title="Tercer blissmo" className="bg-indigo-500">
        <Card />
      </Section>
      <Section
        title="Cuarto blissmo"
        className="bg-gradient-to-b from-green-500 to-blue-500"
      />
    </>
  );
}

\`\`\`

Notaras también que existe un componente \`<Card>\` dentro de una sección. Este componente es el componente que queremos animar. Todos estos componentes viven en un solo archivo \`components.jsx\`. Veamos que contiene.

## Leyendo components.jsx

Aquí podemos encontrar los dos componentes que se usan en \`App.jsx\`

\`\`\`jsx
// components.jsx

import { useEffect } from 'react';
// También estamos utilizando, tailwind-merge para unir clases
import { twMerge } from 'tailwind-merge';

export function Section({ title, className, children }) {
  return (
    <div className={twMerge('h-80 bg-blue-500 overflow-hidden', className)}>
      <h2 className="text-white text-center pt-12 pb-20">{title}</h2>
      {children}
    </div>
  );
}

export function Card() {
    // aquí es donde sucede la magia
  useEffect(() => {
    // Aqui va la animación que veremos en un momento
  }, []);

    // Toma nota de los ids de los elementos que animaremos
  return (
    <div className="relative mx-auto max-w-xs px-8">
      <div
        className={twMerge(
          'absolute -top-9  left-0 rounded-2xl bg-gradient-to-b from-pink-500 to-red-400 w-full h-32'
        )}
        id="backdrop"
      />
      <button
        id="text"
        className="block bg-gray-800 text-white rounded-lg p-4 mx-auto relative hover:bg-gray-900"
      >
        <h2 className="text-center">Comparte en tus redes</h2>
      </button>
    </div>
  );
}

\`\`\`

Ahora vamos a importar las 3 herramientas de Motion One que utilizaremos para nuestra animación.

## Creando la animación

Vamos a utilizar \`animate\`, que es la herramienta principal, pero para detectar que el elemento ha entrado en pantalla, vamos a utilizar \`inView\` y de paso, como nos gustan las animaciones de resorte, vamos a importar \`spring\`.

\`\`\`jsx
import { inView, animate, spring } from 'motion';

\`\`\`

Dentro del \`useEffect\` que hemos colocado en el componente \`<Card>\` escribiremos nuestro código, esto porque es código que corre en el navegador y sabemos que \`useEffect\` solo se ejecuta una vez que el componente se ha montado.

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales de animaciones web en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

\`\`\`jsx
// inView nos permite detectar cuando un elemento ha entrado en pantalla
// podemos pasar el identificador del nodo o el nodo mismo.
inView('#text', () => {
  // detonaremos la animación en el elemento backdrop
  animate('#backdrop', { scale: 3 }, { delay: 0.3 });
  // de paso animamos el elemento con el texto
  animate(
    '#text',
    { rotate: -2, scale: 1.3 },
    { delay: 0.4, easing: spring() }
  );
  // si no devolvemos un callback la animación se detonaría una sola vez
  // devolviendo este callback, podemos revertir la animación
  return () => {
    animate('#text', { rotate: 0, scale: 1 });
    animate('#backdrop', { scale: 1 }, { delay: 0.3, easing: spring() });
  };
});

\`\`\`

Observa un par de cosas, estamos escribiendo no solo la animación de entrada, también la de salida en el return de \`inView\`. Esto asegura que la animación se repetirá cuando el elemento vuelva a entrar en la vista.

Por último observa que estamos pasando el tercer parámetro a animate que es la configuración para poder agregar \`delay\` y también la curva(_easing_) con \`spring()\`.

Cuando hacemos scroll y el texto es vivible, nuestra animación se detona con un delay de 300 ms, y cuando sale de la vista, podemos ver que las animaciones que pusimos en el callback, se detonan, dime, ¿podría ser más fácil?

> Recuerda que puedes utilizar refs en vez de ids, es solo que a mi me gusta la simplicidad de pasar un \`string\`.

### Esta es una manera de crear animaciones legibles y portables, pero lo mejor es que son super optimizadas.

Las animaciones han sido un reto todos estos años, pero herramientas como **Motion One** las hacen accesibles para programadores web de todos los niveles, no creo que quieras quedarte atrás, así que no dejes de agregar detalles a tus sitios web y checar mis cursos en [fixtergeek](https://fixtergeek.com).

Abrazo. bliss.
`;

async function main() {
  console.log("Importando post de inView de Motion One...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: {
      slug: "usando-inview-de-motion-one-para-animar-elementos-que-entran-en-pantalla-2023",
    },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug: existing.slug },
      data: {
        title:
          "Usando inView de Motion One para animar elementos que entran en pantalla",
        body: inViewContent.trim(),
        published: true,

        // Autor
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.facebook.com/blissito",

        // SEO
        coverImage: "https://i.imgur.com/L4EmvDhh.png",
        metaImage: "https://i.imgur.com/L4EmvDhh.png",

        // Video
        youtubeLink: "https://youtu.be/6-qu3UWaBx4",

        // Clasificación
        tags: ["react", "js", "programacion", "animaciones", "motion", "javascript"],
        mainTag: "JavaScript",
      },
    });

    console.log("✅ Post actualizado exitosamente!");
    console.log(`   ID: ${post.id}`);
    console.log(`   Slug: ${post.slug}`);
    console.log(`   URL: /blog/${post.slug}`);
    return;
  }

  const post = await db.post.create({
    data: {
      slug: "usando-inview-de-motion-one-para-animar-elementos-que-entran-en-pantalla-2023",
      title:
        "Usando inView de Motion One para animar elementos que entran en pantalla",
      body: inViewContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.facebook.com/blissito",

      // SEO
      coverImage: "https://i.imgur.com/L4EmvDhh.png",
      metaImage: "https://i.imgur.com/L4EmvDhh.png",

      // Video
      youtubeLink: "https://youtu.be/6-qu3UWaBx4",

      // Clasificación
      tags: ["react", "js", "programacion", "animaciones", "motion", "javascript"],
      mainTag: "JavaScript",

      // Fecha original
      createdAt: new Date(1694208646159), // Sept 8, 2023
    },
  });

  console.log("✅ Post creado exitosamente!");
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
