import { db } from "../app/.server/db";

const postContent = `# React 19

El 15 de febrero de este 2024, el equipo de **React** quiso emocionarnos con grandes noticias, pero la reacción que han obtenido, de una gran parte de la comunidad web, no es la que esperaban; más que excitación, las novedades han provocado cierta confusión. 🤨

Esto me recuerda un poco lo que pasó en la comunidad de Angular… 🅰️

Por eso en esta entrada, vamos a analizar juntos y de rapidito (para poder volver al trabajo en menos de 10 minutos) los 3 grandes cambios que **React** 19 está preparando y agregaremos un poquito de contexto también. Hoy te voy a hablar de:

- El nuevo compilador de React (**React Compiler**)
- Las nuevas acciones del servidor (**Actions**)
- Y también te hablaré de algunos de los nuevos sabores que trae **React**

Así que si ya estás listo para que te presente a **React** **19**, vamos pues, no perdamos tiempo, ella muere por conocerte. 🔥😳

## #1 ¿Qué significa que React ahora tenga un compilador?

El compilador de **React** nació como una investigación, sin embargo hoy en día es usado en producción por \`Instagram.com\`. El equipo de **React** también ha anunciado que pronto liberará el código de esta herramienta como *open source*. Mi nerd interior está muy emocionado por esto. 🤓👀

Si nunca terminaste de entender cómo usar **\`memo, useMemo\` o \`useCallback\`**, ¡no te preocupes! En **React** 19 ya no serán necesarios. Pues el equipo de **React** considera que estas herramientas mal empleadas pueden crear escenarios donde **React** *re-renderizará* innecesariamente o demasiado, además de añadir complejidad a nuestro código. La visión actual que tiene el equipo de **React**, es de \`un **React** que *re-renderiza* solo las partes específicas de la página, solo las que necesitan cambiar, pero sin necesitar indicaciones del programador\`, un *re-render* más inteligente pues. Pero a la vez, **React** quiere conservar su modelo actual: "*UI como una simple función JS de estado.*" **React** no quiere volverse difícil de adoptar, quiere seguir siendo *beginner-friendly*. Por esa razón **React** quiere encargarse de las optimizaciones del *render* por ti, quiere quitarte esa tarea de las manos por medio de un **compilador**. 🤖

> 🤖 Sí, Te van a sustituir por un robot. 🤖🤖🤖 O por muchos, te remplazarán, nos encerrarán… 🤖😱🤖

Este compilador respetará las reglas de **JavaScript**, pero se asegurará de que tu código cumpla con las reglas de **React** también. El **compilador** se asegurará de que uses **React** correctamente… no te quitará la mirada de encima… 🤖😰

Es curioso que el equipo de **React** se aseguró de mencionar en su blog que los developers siempre podrán romper estas reglas un poco. 🤓

Yo me pregunto si esta nueva idea nos llevará a un mundo donde la compilación triunfa sobre la interpretación… como sea, el equipo de **React** ha prometido compartir más sobre el compilador, más adelante; seguro la comunidad web no dejará de hablar de esto. 🤓

## #2 Nuevas Actions de React

Si no has visto algunas de las novedades que **Next13** tiene, te dejo un [video](https://youtu.be/y-Wxv8_lzmw) al respecto, pues la mayoría de sus novedades se basan en lo nuevo y disruptivo que **React** nos ofrece, esto es así porque **React** ha concentrado esfuerzos en desarrollar, ya no solo herramientas para desarrolladores web, también para creadores de librerías y frameworks, por eso nos invita a probar las novedades de su nueva **API** usando un framework como **Remix** o **Next**. ✅

Así que no tengas miedo de invertir tiempo en [aprender Remix](https://fixtergeek.com/courses/Intro-a-las-aplicaciones-Fullstack-con-React-y-Remix/detail). ⬅️

Las **Actions** de React, te permiten pasar funciones a elementos del DOM, como a un \`<form />\`.

\`\`\`jsx
<form action={search}>
  <input name="query" type="search" />
  <button type="submit">Buscar</button>
</form>
\`\`\`

Esta acción puede ser asíncrona; la función puede definirse tanto en el cliente como en el servidor con la directiva \`"use server"\`.

No vamos a profundizar en este tema el día de hoy, lo dejaremos para una nueva entrada específica en el futuro cercano, por ahora debemos seguir hablando del resto de los cambios, pero te dejo [un enlace a un video sobre actions](https://youtu.be/ae09drTayFY).

Muy bien, pues para terminar: vamos a mencionar algunos de los nuevos sabores que también incluirá **React** 19.

## #3 Nuevos features

**React** 19 podría convertirse en la siguiente versión "Major" de **React**. Esto significa varias cosas; primero: que esperan que sea incompatible con la versión anterior en algunos *features* específicos como el **Asset Loading: del que te hablaré en un momento**. Y segundo: React 19 promete estar listo para producción e incluir las baterías. 🪫🔋 🥳

Algunas de estas baterías son:

- **Directives**: \`"use client"\` y \`"use server"\` serán usados por el nuevo compilador para crear aplicaciones **React** \`full-stack\`.
    - Lo que hará el \`bundler\` del nuevo compilador es crear un POST endpoint cuando encuentre un \`"use server"\` o creará una etiqueta \`<script>\` si encuentra un \`"use client"\`, permitiéndonos crear código \`cliente/servidor\` relacionado directamente. Incluso comparan este comportamiento con las Islas de **Astro**. 🏝️🤯
- **Document Metadata**: Ahora podremos renderizar \`<title>\`, \`<meta>\` y \`<link>\` en cualquier parte del **JSX** del componente. Además prometen que funcionará incluso en un *app* 100% del cliente. ✅
- **Asset Loading**: React ahora también controlará la carga de los recursos que vengan de \`<style>\`, \`<link>\` o \`<script>\`. Además de darnos dos controles \`preload\` y \`preinit\` para controlar las cargas nosotros mismos(as). 🌉

El equipo de **React** comenta que todos estos *features* trabajan juntos, No tendría sentido liberar los **React Server Components** sin integrar también las **Actions**. Pero también nos dicen que ya todo está listo para el lanzamiento. 🚀 🤩

> **👀 React** utiliza un método de adopción de *features* según se desarrollan llamado: [React Canaries](https://react.dev/blog/2023/05/03/react-canaries), de esa forma puedes adoptar *features* estables individuales, si quisieras probar hoy mismo. 🤯

Y así como así, ahora estás enterada(o) de forma general, superficial y entretenida de lo que React se trae entre manos. Si aún no haz comenzado con **React**, te dejo un enlace a mi curso.

¡Corre, antes de que **React** 19 se estrene! 🏃🏻

Abrazo. Bliss. 🤓

## Enlaces relacionados

[Un video sobre Actions](https://youtu.be/ae09drTayFY)

[Aprende Remix](https://fixtergeek.com/courses/Intro-a-las-aplicaciones-Fullstack-con-React-y-Remix/detail)

[React Canaries](https://react.dev/blog/2023/05/03/react-canaries)

[Next 13](https://youtu.be/y-Wxv8_lzmw)`;

async function main() {
  const slug = "en-que-consiste-react-19-2024";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("Post ya existe, actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "¿En qué consiste React 19?",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "http://hectorbliss.com",
        coverImage: "https://i.imgur.com/687HrP7.png",
        metaImage: "https://i.imgur.com/687HrP7.png",
        youtubeLink: "https://youtu.be/x6rjQg3bh3k",
        tags: ["react", "javascript", "frontend"],
        mainTag: "React",
      },
    });
    console.log("Post actualizado:", post.id);
  } else {
    console.log("Creando nuevo post...");
    const post = await db.post.create({
      data: {
        slug,
        title: "¿En qué consiste React 19?",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "http://hectorbliss.com",
        coverImage: "https://i.imgur.com/687HrP7.png",
        metaImage: "https://i.imgur.com/687HrP7.png",
        youtubeLink: "https://youtu.be/x6rjQg3bh3k",
        tags: ["react", "javascript", "frontend"],
        mainTag: "React",
      },
    });
    console.log("Post creado:", post.id);
  }

  await db.$disconnect();
}

main().catch(console.error);
