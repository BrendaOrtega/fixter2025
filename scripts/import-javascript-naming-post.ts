import { db } from "../app/.server/db";

const javascriptNamingPostContent = `
Si llegaste hasta aquí es porque tú, como muchos, pensaste que **JavaScript** era el nombre oficial del lenguaje de programación más usado en la web. Déjame decirte algo: no lo es.

En este post te explico por qué deberías dejar de llamarle JavaScript y empezar a usar el nombre correcto: **ECMAScript**.

## 1. El nombre más confuso del ecosistema web

Cuando Brendan Eich creó el lenguaje en 1995 para Netscape, originalmente se llamaba **Mocha**, luego **LiveScript**. Pero en un movimiento de marketing, Netscape decidió cambiarle el nombre a **JavaScript** para aprovechar el hype de Java en ese momento.

El problema es que **Java y JavaScript no tienen nada que ver**. Son lenguajes completamente diferentes con filosofías distintas:

- Java es tipado estáticamente, JavaScript es dinámico
- Java es compilado, JavaScript es interpretado
- Java usa clases tradicionales, JavaScript usa prototipos

La famosa frase de Jeremy Keith lo resume mejor:

> "Java is to JavaScript as ham is to hamster."

(Java es a JavaScript lo que jamón es a hámster)

## 2. El nombre es propiedad de Oracle

Aquí viene lo interesante. El nombre "JavaScript" es una **marca registrada**. Originalmente pertenecía a Sun Microsystems (los creadores de Java), y cuando Oracle compró Sun en 2010, también adquirió los derechos del nombre.

Esto significa que técnicamente, Oracle podría demandar a cualquiera que use el nombre "JavaScript" de manera comercial sin su permiso. Por eso el estándar oficial nunca pudo llamarse JavaScript.

---

🎬 **¿Quieres profundizar más en JavaScript moderno?** Tenemos tutoriales prácticos en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## 3. El nombre no es el lenguaje: ECMAScript

Cuando se necesitó estandarizar el lenguaje, se acudió a **ECMA International** (European Computer Manufacturers Association), una organización de estándares.

El comité **TC39** (Technical Committee 39) es el encargado de definir y evolucionar el estándar del lenguaje. Y el estándar oficial se llama **ECMAScript**.

- **ECMAScript 1** (1997): Primera versión del estándar
- **ECMAScript 3** (1999): La versión que dominó por años
- **ECMAScript 5** (2009): Modo estricto, JSON nativo
- **ECMAScript 2015** (ES6): El gran salto con clases, arrow functions, promises, etc.
- **ECMAScript 2016-2024**: Actualizaciones anuales con nuevas features

Cuando escuchas "ES6", "ES2015", "ES2020", se refieren a versiones específicas del estándar ECMAScript.

## 4. Consejo extra: No uses "JS6", "ES8" o "ES10"

Desde 2015, el comité TC39 decidió usar el año en lugar de números de versión. Así que:

| Incorrecto | Correcto |
|------------|----------|
| ES6 | ECMAScript 2015 |
| ES7 | ECMAScript 2016 |
| ES8 | ECMAScript 2017 |
| ES9 | ECMAScript 2018 |
| ES10 | ECMAScript 2019 |

Aunque "ES6" se sigue usando coloquialmente, lo correcto es decir "ECMAScript 2015" o simplemente "ES2015".

## ¿Entonces qué debo decir?

En la práctica, todos seguimos diciendo "JavaScript" porque es el nombre popular. Pero ahora sabes que:

1. **JavaScript** es solo un nombre comercial (marca registrada de Oracle)
2. **ECMAScript** es el nombre oficial del estándar
3. **TC39** es el comité que define el lenguaje
4. Los navegadores implementan el estándar ECMAScript

Cuando quieras sonar más técnico o preciso, usa **ECMAScript**. Cuando quieras que todos te entiendan, usa **JavaScript**. Pero nunca olvides que son lo mismo.

## Recursos adicionales

- [TC39 - Ecma International](https://tc39.es/)
- [ECMAScript Proposals](https://github.com/tc39/proposals)
- [ECMA-262 Specification](https://www.ecma-international.org/publications-and-standards/standards/ecma-262/)

Abrazo. Blissmo. 🤓
`;

async function main() {
  console.log("Importando post de JavaScript/ECMAScript...");

  const slug = "por-que-ya-no-deberias-llamarle-javascript-2023";
  const title = "¿Por qué ya no deberías llamarle JavaScript?";

  // Verificar si ya existe por slug o título
  const existingBySlug = await db.post.findUnique({
    where: { slug },
  });

  const existingByTitle = await db.post.findUnique({
    where: { title },
  });

  const existing = existingBySlug || existingByTitle;

  if (existing) {
    console.log("⚠️  El post ya existe (ID: " + existing.id + "). Actualizando...");
    const post = await db.post.update({
      where: { id: existing.id },
      data: {
        slug,
        title,
        body: javascriptNamingPostContent.trim(),
        published: true,
        coverImage: "https://images.unsplash.com/photo-1543966888-7c1dc482a810?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1206&q=80",
        metaImage: "https://images.unsplash.com/photo-1543966888-7c1dc482a810?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1206&q=80",
        youtubeLink: "",
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        tags: ["javascript", "ecmascript", "webdev", "frontend"],
        mainTag: "javascript",
        createdAt: new Date("2023-03-15T12:00:00Z"),
        updatedAt: new Date(),
      },
    });
    console.log("✅ Post actualizado exitosamente!");
    console.log(`   ID: ${post.id}`);
    console.log(`   Slug: ${post.slug}`);
    console.log(`   Fecha original: ${post.createdAt.toLocaleDateString("es-MX")}`);
    console.log(`   URL: /blog/${post.slug}`);
    return;
  }

  const post = await db.post.create({
    data: {
      slug,
      title,
      body: javascriptNamingPostContent.trim(),
      published: true,

      // Imágenes
      coverImage: "https://images.unsplash.com/photo-1543966888-7c1dc482a810?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1206&q=80",
      metaImage: "https://images.unsplash.com/photo-1543966888-7c1dc482a810?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1206&q=80",

      // YouTube
      youtubeLink: "",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",

      // Clasificación
      tags: ["javascript", "ecmascript", "webdev", "frontend"],
      mainTag: "javascript",

      // Fecha aproximada: Marzo 2023
      createdAt: new Date("2023-03-15T12:00:00Z"),
      updatedAt: new Date(),
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
    console.error("❌ Error creando post:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
