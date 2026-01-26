import { db } from "../app/.server/db";

const postContent = `Agregar clases de Tailwind de forma condicional, es un reto interesante, pues no podemos generarlas en el cliente, ya que no existirán en nuestro bundle.

Tomemos como ejemplo este switch, que hecho completamente en Tailwind, lo puedes encontrar en [este Replit](https://replit.com/@blissito/tailwind-switch).

![switch](https://i.imgur.com/czWaVJ8.gif)

Para que al hacer click el switch se mueva, y se pongan en verde sus partes, debemos manipular las clases de Tailwind de este componente. ¿Cómo? Te presento 2 formas:

## 1. Usando backticks

Al interpolar una cadena de texto (string), podemos usar un ternario para intercambiar la clase entre dos distintas.

\`\`\`jsx
<div className={\`\${isActive ? "bg-green-500" : "bg-slate-500"}\`} />
\`\`\`

Gracias a que las clases que usamos ya están escritas en el código, Tailwind va a incluirlas en el bundle, lo que nos permite usarlas de esta forma, y funciona muy bien, aunque la sintaxis no es muy bonita. 😬

## 2. Usando clsx

\`clsx\` es una librería que nos ayuda a construir los \`classNames\` de nuestros elementos, de una forma más ordenada, y menos verbosa.

Solo instálala con:
\`\`\`bash
npm i clsx
\`\`\`

Puedes ver el [paquete de npm aquí](https://www.npmjs.com/package/clsx).

Lo que realmente está haciendo [clsx](https://www.npmjs.com/package/clsx) es combinar cadenas de texto (strings) para generar tu propiedad \`className\` para tus \`divs\`.

\`clsx\` toma tus argumentos, que pueden tener una gran variedad de formas:

\`\`\`javascript
clsx('hola','perro',true && 'como','estas');
// => 'hola perro como estas'

clsx({hola:true,perro:false});
// => 'hola'

clsx({hola:true},{perro:false});
// => 'hola'

clsx('hola',true && 'perro',false && 'gato');
// => 'hola perro'

clsx(['hola','perro']);
// => 'hola perro'
\`\`\`

Y las combina en un solo string que puedes añadir a tus elementos:

\`\`\`jsx
<div className={clsx('font-bold',isActive && 'text-green-500')} />
\`\`\`

Mucho más legible, ¿no crees?

De hecho, \`clsx\` es el reemplazo moderno, de una librería más vieja llamada \`classnames\`.

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Ejemplo: Hagamos un switch

Ya que conoces las 2 formas de añadir clases de Tailwind dinámicamente, hagamos funcionar este switch:

\`\`\`jsx
import clsx from 'clsx';
import { useState } from 'react';

export const TailwindSwitch = () => {
  const [isActive, setIsActive] = useState(false);

  return (
    <button
      onClick={() => setIsActive(!isActive)}
      className={clsx(
        'h-7 w-14 rounded-full p-1 transition-all',
        isActive ? 'bg-green-500' : 'bg-slate-300'
      )}
    >
      <div
        className={clsx(
          'h-full aspect-square rounded-full bg-white transition-all',
          isActive && 'translate-x-7'
        )}
      />
    </button>
  );
};
\`\`\`

El resultado:

![switch animado](https://i.imgur.com/czWaVJ8.gif)

Puedes agregar más clases y tener un mejor switch, pero ya captas la idea, ¿no?

## Conclusión

Ahora tienes 2 formas de agregar estilos de Tailwind de forma condicional. ¡Úsalas en tu siguiente proyecto!

Abrazo. Bliss.

## Video

Te dejo un video donde explico esto mismo:

<YouTube videoId="1Za0jqI8cOA" />

## Posts relacionados

- [Formas de centrar un div](<https://www.fixtergeek.com/blog/3-formas-de-centrar-un-div-con-tailwind-css-2023>)
`;

async function main() {
  const slug = "2-formas-de-usar-utilidades-tailwind-dinamicamente-2023";

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

  // Crear el post con la fecha original (18 Abril 2023)
  const post = await db.post.create({
    data: {
      slug,
      title: "2 formas de usar utilidades Tailwind, dinámicamente.",
      body: postContent.trim(),
      published: true,

      // Imágenes
      coverImage:
        "https://www.atsistemas.com/dam/jcr:20b575da-1767-43dc-b18f-4f2a9f722877/1375-775-tailwind-css.png",
      metaImage:
        "https://www.atsistemas.com/dam/jcr:20b575da-1767-43dc-b18f-4f2a9f722877/1375-775-tailwind-css.png",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",

      // Clasificación
      mainTag: "Tailwindcss",
      tags: ["estilos", "css", "utilidades", "tailwind"],
      category: ["estilos", "nextjs", "css", "html"],

      // Fecha original del post (18 Abril 2023)
      createdAt: new Date(1681857715961),
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
