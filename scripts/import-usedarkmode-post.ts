import { db } from "../app/.server/db";

const postContent = `Ya te he subido otros videos donde te muestro cómo usar el \`dark\` y el \`light\` mode del tema de **Tailwind**.

En estete muestro un custom Hook que cambia el nodo superior directamente y se puede reutilizar en todo el sitio.

\`\`\`jsx
import { useState } from "react";

export default function useTheme() {
  const [theme, setTheme] = useState("light");

  const toggleTeam = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    document.documentElement?.classList.remove("dark", "light");
    document.documentElement?.classList.add(newTheme);
    setTheme(newTheme);
  };

  // podemos agregar guardado en... localstorage? cookies?

  return { theme, toggleTeam };
}
\`\`\`

Puedes observar que es solo el inicio, podrías agregar localStorage o guardar el theme en una cookie.

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

\`\`\`jsx
export default function Index() {
  const { theme, toggleTeam } = useTheme();
  return (
    <div className="flex flex-col min-h-screen main dark:bg-indigo-950 max-w-sm px-4">
      <h2 className="dark:text-white">Cambia el tema</h2>
      <button
        onClick={toggleTeam}
        className="bg-blue-500 text-white texy-2xl p-4 dark:bg-indigo-500 rounded-lg"
      >
        Cambiar a {theme === "light" ? "dark" : "light"}
      </button>
    </div>
  );
}
\`\`\`

Ahora podemos usar nuestro custom Hook en cualquier parte de nuestra aplicación.

Puedes ver que el nodo superior cambia la clase entre \`light\` y \`dark\`.

## Video

<YouTube videoId="n6m8Ffvd-jA" />`;

async function main() {
  const slug = "usedarkmode-hook-con-tailwind-css-2023";

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

  // Crear el post con la fecha original (17 Agosto 2023)
  const post = await db.post.create({
    data: {
      slug,
      title: "useDarkMode Hook con Tailwind CSS",
      body: postContent.trim(),
      published: true,

      // Imágenes
      coverImage:
        "https://miro.medium.com/v2/resize:fit:679/1*vR-c2OlaAJLjK9ue5785rA.gif",
      metaImage:
        "https://miro.medium.com/v2/resize:fit:679/1*vR-c2OlaAJLjK9ue5785rA.gif",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "http://hectorbliss.com",

      // Clasificación
      mainTag: "web",
      tags: ["tailwind", "react", "hook", "hooks", "framework"],
      category: [],

      // YouTube
      youtubeLink: "https://youtu.be/n6m8Ffvd-jA",

      // Fecha original del post (17 Agosto 2023)
      createdAt: new Date(1692289033294),
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
  console.log(`  YouTube: ${post.youtubeLink}`);

  await db.$disconnect();
}

main().catch(console.error);
