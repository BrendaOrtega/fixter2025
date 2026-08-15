import { db } from "../app/.server/db";

const typescriptEventsContent = `
Uno de los retos iniciales cuando usamos TypeScript con React es conocer cómo tipar los eventos que provienen de nuestros elementos. Por ejemplo, cuando empleamos un input y queremos escribir su handler: ¿qué tipo de dato debemos usar? Eso vamos a ver en este post.

## Eventos del DOM

Cuando un handler (manejador de eventos) se ejecuta, **React le envía por argumento un evento sintético** llamado \`SyntheticEvent\`, este objeto envuelve al evento nativo del navegador y le brinda una interfaz con mayor compatibilidad.

Desde el punto de vista de TypeScript podemos usar justamente ese tipo genérico, pero tenemos opciones más específicas para los casos más comunes:

## OnChange

Este quizá es uno de los manejadores de eventos más comunes, se declara en elementos de formularios como \`inputs\`, \`checkboxes\` o \`selects\`. Para el caso de un input y empleando TypeScript, este sería un ejemplo de cómo tiparlo:

\`\`\`tsx
import { useState, ChangeEvent } from "react";

export default function App() {
  const [email, setEmail] = useState("");

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  return (
    <form>
      <input
        type="email"
        onChange={handleChange}
        value={email}
      />
    </form>
  );
}
\`\`\`

Pasamos \`<HTMLInputElement>\` para especificar que el elemento de destino (target) de nuestro evento es un \`input\`.

---

🎬 **¿Prefieres ver esto en acción?** Tenemos tutoriales de TypeScript y React en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## onSubmit

Otro manejador muy común es el \`onSubmit\` que usamos para escuchar cuando un formulario es enviado. Aquí tenemos el tipo \`FormEvent\`:

\`\`\`tsx
import { FormEvent } from "react";

export default function App() {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    console.log("Email:", formData.get("email"));
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" />
      <button type="submit">Enviar</button>
    </form>
  );
}
\`\`\`

Nota que usamos \`event.currentTarget\` en lugar de \`event.target\`. Esto es porque \`currentTarget\` siempre hace referencia al elemento donde se adjuntó el listener (el form), mientras que \`target\` puede ser cualquier elemento dentro del form que disparó el evento (como el botón).

## Para cualquier otro evento puedes usar SyntheticEvent

El tipo \`SyntheticEvent\` es un tipo genérico que engloba a todos los eventos en React. Para eventos como \`onMouseOver\`, \`onFocus\`, \`onBlur\`, etc., puedes usar los tipos específicos:

| Evento | Tipo en TypeScript |
|--------|-------------------|
| onChange | \`ChangeEvent<T>\` |
| onSubmit | \`FormEvent<T>\` |
| onClick | \`MouseEvent<T>\` |
| onKeyDown / onKeyUp | \`KeyboardEvent<T>\` |
| onFocus / onBlur | \`FocusEvent<T>\` |
| onDrag | \`DragEvent<T>\` |
| onScroll | \`UIEvent<T>\` |
| onTouchStart / onTouchEnd | \`TouchEvent<T>\` |
| Cualquier evento | \`SyntheticEvent<T>\` |

Donde \`T\` es el tipo del elemento HTML, por ejemplo \`HTMLInputElement\`, \`HTMLButtonElement\`, \`HTMLDivElement\`, etc.

## Nota sobre acceso asíncrono al evento

Si necesitas acceder a las propiedades del evento de forma asíncrona (por ejemplo, después de un \`await\` o dentro de un \`setTimeout\`), React recicla el objeto del evento por razones de rendimiento.

En versiones anteriores de React necesitabas llamar a \`e.persist()\` para conservar el evento:

\`\`\`tsx
// React 16 y anteriores
const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  e.persist(); // Evita que React recicle el evento
  setTimeout(() => {
    console.log(e.target.value); // Ahora funciona
  }, 1000);
};
\`\`\`

**A partir de React 17**, esto ya no es necesario porque React dejó de usar el pooling de eventos. Pero si guardas la referencia al valor que necesitas antes de cualquier operación asíncrona, tu código será compatible con cualquier versión:

\`\`\`tsx
const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value; // Guarda el valor
  setTimeout(() => {
    console.log(value); // Siempre funciona
  }, 1000);
};
\`\`\`

## Conclusión

Tipar eventos en React con TypeScript es sencillo una vez que conoces los tipos disponibles. Los más comunes son \`ChangeEvent\`, \`FormEvent\` y \`MouseEvent\`. Y si tienes dudas sobre qué tipo usar, \`SyntheticEvent\` siempre funciona como fallback genérico.

Abrazo. Blissmo. 🤓

### Enlaces relacionados

- [SyntheticEvent - React Docs](https://react.dev/reference/react-dom/components/common#react-event-object)
- [React TypeScript Cheatsheet - Forms and Events](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/forms_and_events)
- [DefinitelyTyped - React types](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react/index.d.ts)
`;

async function main() {
  console.log("Importando post de Tipar Eventos en React con TypeScript...");

  const slug = "como_tipar_eventos_en_react_con_typescript_edejq";

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "Cómo tipar eventos en React con TypeScript",
        body: typescriptEventsContent.trim(),
        published: true,

        // Autor
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://hectorbliss.com",

        // SEO
        coverImage:
          "https://images.ctfassets.net/23aumh6u8s0i/3auCWvEHRgMULidrkY6oQx/44b6f250f482dc75323130492e322746/TS.png",
        metaImage:
          "https://images.ctfassets.net/23aumh6u8s0i/3auCWvEHRgMULidrkY6oQx/44b6f250f482dc75323130492e322746/TS.png",

        // Video
        youtubeLink: "https://youtu.be/2nAIWZryLj0",

        // Clasificación
        tags: ["react", "frontend", "webdev"],
        mainTag: "typescript",
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
      slug,
      title: "Cómo tipar eventos en React con TypeScript",
      body: typescriptEventsContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://hectorbliss.com",

      // SEO
      coverImage:
        "https://images.ctfassets.net/23aumh6u8s0i/3auCWvEHRgMULidrkY6oQx/44b6f250f482dc75323130492e322746/TS.png",
      metaImage:
        "https://images.ctfassets.net/23aumh6u8s0i/3auCWvEHRgMULidrkY6oQx/44b6f250f482dc75323130492e322746/TS.png",

      // Video
      youtubeLink: "https://youtu.be/2nAIWZryLj0",

      // Clasificación
      tags: ["react", "frontend", "webdev"],
      mainTag: "typescript",

      // Fecha original: 2024-09-05
      createdAt: new Date(1725572322949),
      updatedAt: new Date(1725572639416),
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
