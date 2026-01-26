import { db } from "../app/.server/db";

const postContent = `React Router ya no es simplemente un router. 🌊

Ahora es un framework que puede manejar la carga de datos y las mutaciones del lado del servidor. 😎

En el pasado, habríamos tenido que configurar redux o una biblioteca de gestión de estados para hacer esto, pero ahora React Router v7 (antes Remix) lo hace súper fácil.

Echemos un vistazo a un ejemplo real de un **componente de suscripción** (Subscribtion) que estoy usando en mi sitio web para conseguir suscriptores.

\`\`\`jsx
// <Subscription />
export default function Subscription() {
  const fetcher = useFetcher<ActionData>();

  return (
    <fetcher.Form method="post" action="/api/subscribe">
      <input
        placeholder="tuemail@mail.com"
        name="email"
        type="email"
      />
      <button
        disabled={fetcher.state !== "idle"}
        type="submit"
      >
        {fetcher.state !== "idle"
          ? "Enviando..."
          : "Suscribirme"}
      </button>
      <span>
        {fetcher.data?.ok && "Bienvenido(a)!"}
      </span>
    </fetcher.Form>
  );
}
\`\`\`

Esto es lo que el buenazo de Kent C. Dodds llama «full stack components» **(componentes de pila completa)**.

Podríamos importar este componente de suscripción en **cualquier parte de nuestra aplicación** y simplemente funcionará. No necesitamos configurar nada más. No tenemos que especificar dónde obtenemos los datos o cómo los manejamos.

Si tienes experiencia con redux, sabes que esto significaría mucho código adicional, y lo peor es que tendríamos que hacer todo eso en cada componente que haga peticiones, una y otra vez. 🤦🏻

Ahora, respondamos algunas preguntas sobre este componente:

## ¿Cómo enviamos data?

Usamos \`fetcher.submit\` o \`fetcher.Form\` para enviar datos al servidor. Puedes usar FormData que es muy práctico, o puedes enviar JSON, como quieras.

Observa cómo especificamos la acción en el formulario:

\`\`\`jsx
<fetcher.Form method="post" action="/api/subscribe">
\`\`\`

Si no especificamos la acción, React Router utilizará la acción (action) de la ruta actual.

> Tip: Podemos especificar el método como \`post\`, \`put\`, \`patch\`, \`delete\`.

## ¿Cómo mostramos la carga?

Podemos monitorear el estado del fetcher con \`fetcher.state\`, esto nos va a ayudar a mostrar un estado de carga mientras esperamos la respuesta del servidor.

\`\`\`jsx
{fetcher.state !== "idle"
  ? "Enviando..."
  : "Suscribirme"}
\`\`\`

fetcher.state puede ser: "idle", "loading" o "submitting".

## ¿Cómo recibimos la respuesta?

Podemos acceder a los datos de la respuesta con \`fetcher.data\`. Éstos son los datos que devolvemos desde la acción (action).

\`\`\`jsx
{fetcher.data?.ok && "Bienvenido(a)!"}
\`\`\`

### El flujo es muy sencillo

- Usamos \`fetcher.submit\` o \`fetcher.Form\` para enviar datos al servidor.
- Usamos \`fetcher.state\` para saber el estado de la petición.
- Usamos \`fetcher.data\` para acceder a los datos de la respuesta.

### ¿Cómo se ve la action (ruta de recursos)?

\`\`\`jsx
// /api/subscribe (Resource route)
export async function action({request}:{request:Request}){
  const formData = await request.formData();
  const email = formData.get("email");
  // Guardar el email en la base de datos
  return { ok: true };
}
\`\`\`

Esto es todo lo que necesitamos para crear un componente de suscripción.

Abrazo. Bliss.

Aprende más de [React Router v7 en la documentación oficial](https://reactrouter.com/home).`;

async function main() {
  const slug = "Como-usar-fetcher_Kad";

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

  // Crear el post con la fecha original (4 Abril 2025)
  const post = await db.post.create({
    data: {
      slug,
      title: "¿Cómo usar fetcher?",
      body: postContent.trim(),
      published: true,

      // Imágenes (usa stars.png por defecto si no hay cover)
      coverImage: "",
      metaImage: "",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@blissito",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Clasificación
      mainTag: "fetcher",
      tags: ["react router", "react", "carga de datos", "redux", "framework"],
      category: ["react"],

      // Fecha original del post (4 Abril 2025)
      createdAt: new Date(1743795358193),
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

  await db.$disconnect();
}

main().catch(console.error);
