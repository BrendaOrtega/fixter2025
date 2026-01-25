import { db } from "../app/.server/db";

const postContent = `
En este video te muestro el código que usamos para Fixtergeek.com en producción.

Usamos Google OAuth2 directamente usando fetch.  🧠
También usamos cookies y tokens para crear magic link y enviarlos por correo. 🪄

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

Abrazo. Bliss. 🤓
`;

async function main() {
  const slug = "asi-hacemos-login-en-fixtergeek";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("Post ya existe, actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "Así hacemos login en Fixtergeek.com",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@blissito",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.hectorbliss.com",
        coverImage: "https://i.imgur.com/lzGAHXv.png",
        metaImage: "https://i.imgur.com/lzGAHXv.png",
        youtubeLink: "https://youtu.be/NBx95W7vQH8",
        tags: ["react", "google", "web", "router", "login"],
        mainTag: "login",
      },
    });
    console.log("Post actualizado:", post.id);
  } else {
    console.log("Creando nuevo post...");
    const post = await db.post.create({
      data: {
        slug,
        title: "Así hacemos login en Fixtergeek.com",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@blissito",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.hectorbliss.com",
        coverImage: "https://i.imgur.com/lzGAHXv.png",
        metaImage: "https://i.imgur.com/lzGAHXv.png",
        youtubeLink: "https://youtu.be/NBx95W7vQH8",
        tags: ["react", "google", "web", "router", "login"],
        mainTag: "login",
      },
    });
    console.log("Post creado:", post.id);
  }

  await db.$disconnect();
}

main().catch(console.error);
