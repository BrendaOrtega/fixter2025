import { db } from "../app/.server/db";

const signalsContent = `
Antes de empezar te digo que solo voy a darte 4 pedacitos de información que creo son suficientes, pero además te daré ejemplos de código que puedes ejecutar tú mismo, para que puedas aprender lo más pronto posible.

## Pedacito #1: ¿Qué es una señal?

Una señal es un objeto (como todo en JavaScript). Pero este objeto tiene un \`value\`, este valor, puede ser observado en espera de cambios.

**Una característica importante de las señales es que** no están confinadas a un componente, las señales son independientes y pueden compartir su \`value\` a través de diferentes niveles y componentes sin tener que detonar un «re-render» de todo el árbol como con \`Context\`. Sí, las señales pueden sustituir por completo a \`Context\`.

**En resumen:**, una señal es un tipo de estado, que no está atado a ningún componente, actualizando específicamente el UI necesario sin el costoso re-renderizado.

## Pedacito #2: effect vs signal

Hagamos un pequeño experimento. Este es un componente que cualquiera de nosotros escribiríamos:

\`\`\`jsx
import * as React from 'react';

export default function App() {
  console.log('Re-renderizando');
  const [state, set] = React.useState(0);

  const handleClick = () => {
    set(state + 1);
  };

  return (
    <div>
      <h1>Hello Blissmo!</h1>
      <p>¡Let's use signals!</p>
      <h1>Estado: {state}</h1>
      <button onClick={handleClick}>Súmale 1</button>
    </div>
  );
}
\`\`\`

![re-rendering with state](https://i.imgur.com/hd3gfjt.gif)

Este es el componente más normal del mundo, ¿cierto? Esto es lo que tenemos siempre en nuestros componentes. Bueno, pues cada que presionamos el clic, el componente se vuelve a renderizar por completo, puedes hacer la prueba tú mismo.

> 👀 [Aquí](https://stackblitz.com/edit/stackblitz-starters-m8ibea?description=React%20%20%20TypeScript%20starter%20project&file=src/App.tsx&title=React%20Starter) puedes experimentar con el código en tiempo real.

### Vamos a hacer otro ejemplo, ahora con \`useEffect\`.

Supongamos que queremos tener un contador en nuestro componente. Escribiríamos algo así:

\`\`\`jsx
import * as React from 'react';

export default function App() {
  const [state, set] = React.useState(0);

  React.useEffect(() => {
    setInterval(()=>set(state + 1), 1000);
  }, []);

  return (
    <div>
      <h1>Hello blissmo!</h1>
      <p>
        El tiempo vuela. 💸 ¡No vendas tu tiempo!
        <br />
        Mejor vuela con él.
      </p>
      <h1>Time: {state}</h1>
    </div>
  );
}
\`\`\`

Si pruebas este código [aquí](https://stackblitz.com/edit/stackblitz-starters-kqw2xt?file=src/App.tsx) te darás cuenta de que el valor está congelado. Esto porque \`state\` ha quedado guardado en memoria y cada que el intervalo se repite, el valor de \`state\` es el mismo, pues está «memoizado».

Si agregamos la eliminación del intervalo podríamos evitar este congelamiento.

\`\`\`jsx
import * as React from 'react';

export default function App() {
  console.log('Re-render');
  const [state, set] = React.useState(0);
  const interval = React.useRef<null | ReturnType<typeof setInterval>>();

  React.useEffect(() => {
    interval.current = setInterval(() => set(state + 1), 1000);
    return () => clearInterval(interval.current);
  }, [state]);

  return (
    <div>
      <h1>Hello blissmo!</h1>
      <p>
        El tiempo vuela 💸, ¡no vendas tu tiempo!
        <br />
        Mejor vuela con él.
      </p>
      <h1>Time: {state}</h1>
    </div>
  );
}
\`\`\`

![useEffect interval](https://i.imgur.com/viGxgVk.gif)

Pero de nuevo, estamos re-renderizando y peor aún, estamos reconstruyendo el intervalo cada vez.

¡Estos cambios ahora están tomando incluso más de un segundo en cambiar! Estamos haciendo trabajar mucho a este componente. 😰

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales de React en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Pedacito #3: Opciones en señales

Vamos a intentar resolver este problema de renderizado (que no sabíamos que teníamos, pues así es como React funciona) con señales.

Existen muchas opciones para trabajar con estados con herramientas conocidas como Redux, Rematch, Zustand o incluso con estrategias novedosas como la atómica con Recoil o Jotai.

Pero a mí me encanta lo simple, por eso, vamos a analizar la que me parece más simple y elegante y que no requiere ningún tipo de configuración especial para usarla ya mismo con nuestros proyectos React.

Estoy hablando de \`@preact/signals-react\`

Instalación:
\`npm i @preact/signals-react\`

### Las Preact signals son una forma de expresar un estado.

Este estado se asegura de que nuestra app se mantenga rápida sin importar cuan compleja pueda ser. Las señales de Preact son mi recomendación porque no solo están construidas sobre los fundamentos de que Ryan Carniato muy amablemente nos explica en su [blog](https://dev.to/this-is-learning/the-evolution-of-signals-in-javascript-8ob), también están especialmente optimizadas para trabajar sobre el \`Virtual Dom\`.

## Pedacito #4: Resolviendo el problema

Vamos, pues, a instalar e implementar \`signals\` en nuestro ejemplo y ver si podemos evitar el re-renderizado y de paso optimizar nuestra app.

Comenzamos instalando \`npm i @preact/signals\`

\`\`\`jsx
import * as React from 'react';
import { signal } from '@preact/signals-react';

const count = signal(0);

export default function App() {
  console.log('re-render');
  const handleClick = () => count.value++;

  return (
    <div>
      <h1>Hello Blissmo!</h1>
      <p>Valor de la señal: {count}</p>
      <button onClick={handleClick}>Súmale 1</button>
    </div>
  );
}
\`\`\`

Hay que notar un par de cosas aquí. La primera es que la señal se importa desde la biblioteca \`@preact/signals-react\` que es un paquete independiente de Preact y no necesitamos tener instalado \`preact\`. Lo segundo es que declaramos nuestra señal fuera del componente, con esto sabemos que podríamos tener esta señal en cualquier otro archivo y compartirlo con toda nuestra app.

Por último, podemos observar que hemos resuelto nuestro problema, pues nuestro componente ya no renderiza cada que el valor del estado se actualiza. 🎉 Mira cómo funciona en vivo [aquí](https://stackblitz.com/edit/stackblitz-starters-n23lda?file=src/App.tsx)

![signals implemented](https://i.imgur.com/LLqTuIr.gif)

## Conclusión

Yo creo que el equipo de React no tarda en publicar su propia implementación de \`signals\`, pues ya todo mundo tiene la suya propia (Angular, Qwik, Solid, Vue, Svelte etc.) menos React.

Pero por ahora Preact que nació desde el principio como una alternativa «más simple y ligera» a React, nos salva el día, incluso te recomendaría que le echaras un ojo 👀 a la documentación, quién sabe, igual y te migras por completo a Preact una vez conociendo su filosofía.

¿Te gustaría saber más de Preact en mi blog?

**Algo que me encanta de las señales de Preact es:** que las puedes usar sin llamar al atributo \`value\` como es necesario con otras herramientas. Puedes simplemente usar \`<p>{count}</p>\` en vez de \`<p>{count.value}</p>\`

Mientras tanto, ya puedes utilizar este nuevo conocimiento en tu día a día, es hora de sustituir \`useState\` por \`signal\`. 🤯

Abrazo. bliss.

### Enlaces relacionados

- [Introducing signals](https://dev.to/this-is-learning/the-evolution-of-signals-in-javascript-8ob)
- [Preact signals](https://preactjs.com/blog/introducing-signals/)
`;

async function main() {
  console.log("Importando post de Señales en React...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: {
      slug: "por-que-todo-mundo-esta-loco-por-las-senales-y-como-usarlas-en-react-2023",
    },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug: existing.slug },
      data: {
        title:
          "¿Por qué todo mundo está loco por las señales, y cómo usarlas en React?",
        body: signalsContent.trim(),
        published: true,

        // Autor
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "http://hectorbliss.com",

        // SEO
        coverImage:
          "https://i0.wp.com/www.imsasafety.org/wp-content/uploads/2023/04/Traffic-Signal-Tech-I-scaled.jpg?w=1080&ssl=1",
        metaImage:
          "https://i0.wp.com/www.imsasafety.org/wp-content/uploads/2023/04/Traffic-Signal-Tech-I-scaled.jpg?w=1080&ssl=1",

        // Clasificación
        tags: ["preact", "solid", "effects", "useEffect", "state", "management"],
        mainTag: "web",
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
      slug: "por-que-todo-mundo-esta-loco-por-las-senales-y-como-usarlas-en-react-2023",
      title:
        "¿Por qué todo mundo está loco por las señales, y cómo usarlas en React?",
      body: signalsContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "http://hectorbliss.com",

      // SEO
      coverImage:
        "https://i0.wp.com/www.imsasafety.org/wp-content/uploads/2023/04/Traffic-Signal-Tech-I-scaled.jpg?w=1080&ssl=1",
      metaImage:
        "https://i0.wp.com/www.imsasafety.org/wp-content/uploads/2023/04/Traffic-Signal-Tech-I-scaled.jpg?w=1080&ssl=1",

      // Clasificación
      tags: ["preact", "solid", "effects", "useEffect", "state", "management"],
      mainTag: "web",

      // Fecha original: Jun 14, 2023
      createdAt: new Date(1686754201183),
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
