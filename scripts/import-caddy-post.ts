import { db } from "../app/.server/db";

const postContent = `¡Hola! En este post, quiero compartir mi experiencia aprendiendo sobre \`Caddy Server\` y cómo puede ayudarnos a solucionar un problema común en el desarrollo de aplicaciones web.

Si eres un desarrollador web, es posible que hayas encontrado situaciones en las que necesitas integrar una herramienta como un inicio de sesión con Facebook o un procesador de pagos en tu aplicación. En estos casos, es probable que la herramienta solicite que el sitio desde donde se hacen las peticiones esté bajo \`https\`. Aunque esto es una medida de seguridad importante, en un entorno de desarrollo, no siempre es fácil configurar todo lo que conlleva.

Es ahí donde entra en juego \`Caddy Server\`. Caddy Server es un servidor web que nos permite configurar fácilmente nuestro sitio para que se ejecute en \`https\` en un entorno de desarrollo. Una de las características más poderosas de Caddy Server es su capacidad para actuar como un \`reverse proxy\`.

Un \`reverse proxy\` es un servidor que actúa como intermediario entre el cliente y el servidor. Cuando un cliente realiza una solicitud a nuestro sitio, el \`reverse proxy\` la recibe y luego la reenvía al servidor adecuado. Luego, cuando el servidor responde, el \`reverse proxy\` envía la respuesta de vuelta al cliente. La principal ventaja de usar un \`reverse proxy\` es que podemos configurar múltiples servidores y aplicaciones para que funcionen juntos de manera más eficiente.

Además, hay varias ventajas de usar \`Caddy Server\` como nuestro \`reverse proxy\`. En primer lugar, es fácil de configurar y se integra perfectamente con nuestras aplicaciones existentes. En segundo lugar, Caddy Server utiliza automáticamente **Let's Encrypt** para generar certificados **SSL**, lo que significa que podemos configurar \`https\` en nuestro sitio con solo unas pocas líneas de código. Por último, \`Caddy Server\` también tiene una interfaz de usuario web para que podamos configurar nuestro servidor sin tener que editar manualmente el archivo de configuración.

---
🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

Ahora que conocemos los beneficios de usar \`Caddy Server\` como nuestro \`reverse proxy\`, veamos cómo podemos instalarlo en Mac usando brew. En primer lugar, debemos asegurarnos de tener brew instalado. Luego, podemos ejecutar el siguiente comando en la terminal para instalar \`Caddy Server\`:

\`\`\`bash
brew install caddy
\`\`\`
¡Y listo! Ahora tenemos \`Caddy Server\` instalado en nuestro Mac y estamos listos para configurar nuestro \`reverse proxy\`. Para hacerlo, simplemente necesitamos editar/crear el archivo **Caddyfile** en la raíz de nuestro proyecto. Aquí hay un ejemplo de cómo se vería un archivo de configuración básico:

\`\`\`css
fixter.localhost {
  reverse_proxy 127.0.0.1:8080
}
\`\`\`
Este archivo configura un nombre de host personalizado **"fixter.localhost"** para que se conecte a nuestro servidor web en **"127.0.0.1:8080"**. Ahora podemos ejecutar el servidor de \`Caddy\` desde la terminal con el siguiente comando:

\`\`\`bash
caddy run
\`\`\`
> **Importante** Asegurate de tener corriendo tu servidor local (127.0.0.1:8080 o localhost:8080)

Si todo ha ido bien, podrás visitar "https://fixter.localhost" en tu navegador y ver que tu aplicación funciona correctamente.

![ejemplo](https://i.imgur.com/UX6tCw8.png)

Usar \`Caddy Server\` para configurar un proxy inverso para tu servidor web es una solución simple y fácil de implementar. Además, \`Caddy Server\` es una herramienta de código abierto con una documentación muy completa en su sitio web oficial: [https://caddyserver.com/docs/](https://caddyserver.com/docs/)`;

async function main() {
  console.log("Importando post sobre Caddy Server...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: {
      slug: "configurando-caddy-server-el-secreto-para-facilmente-usar-https-y-reverse-proxy-en-tus-proyectos-web-2023",
    },
  });

  if (existing) {
    console.log("⚠️  El post ya existe con ID:", existing.id);
    return;
  }

  const post = await db.post.create({
    data: {
      slug: "configurando-caddy-server-el-secreto-para-facilmente-usar-https-y-reverse-proxy-en-tus-proyectos-web-2023",
      title:
        "Configurando Caddy Server: El secreto para fácilmente usar https y reverse proxy en tus proyectos web",
      body: postContent.trim(),
      published: true,

      // Autor
      authorName: "David Zavala",
      authorAt: "@DeividZavala",
      photoUrl: "https://i.imgur.com/X7m3EsR.jpg",
      authorAtLink: "https://github.com/DeividZavala",

      // Imágenes
      coverImage:
        "https://www.booleanworld.com/wp-content/uploads/2017/05/image4219.png",
      metaImage:
        "https://www.booleanworld.com/wp-content/uploads/2017/05/image4219.png",

      // YouTube (vacío en el original)
      youtubeLink: "",

      // Clasificación
      tags: ["caddy", "https", "reverse-proxy", "ssl", "desarrollo"],
      mainTag: "caddy",

      // Fechas originales de 2023
      createdAt: new Date(1682536857047), // April 26, 2023
      updatedAt: new Date(1684108310863), // May 15, 2023
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Autor: ${post.authorName}`);
  console.log(
    `   Fecha original: ${post.createdAt.toLocaleDateString("es-MX")}`
  );
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
