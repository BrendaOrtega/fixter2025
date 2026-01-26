import { db } from "../app/.server/db";

const postContent = `**Remix** elimina por completo la necesidad de manejar un estado en el cliente (*Client State Management*).

Manteniendo la interfaz sincronizada con un estado persistente que vive solo en el servidor, **usando la base de datos como estado**. Eliminando por completo la necesidad de mantener un estado en el cliente (el navegador). 🤯

**Remix** define su propuesta como el **Fullstack Data Flow**. Este flujo está compuesto por tres etapas:

1. La función \`loader\` de una ruta, es la encargada de **proveer los datos** a la interfaz del cliente.
2. Los formularios **HTML** hacen **POST** con los datos, a la función \`action\` de la ruta.
3. Los datos que entrega el \`loader\` en la página son revalidados **automáticamente**.

![fullstack data flow](https://remix.run/blog-images/posts/remix-data-flow/loader-action-component.png)

En **Remix**, las rutas son solo un archivo dentro de la carpeta \`/routes\`.

Estos archivos pueden exportar varias funciones que **Remix** utilizará según el nombre que posean:

\`\`\`jsx
// routes/perfil.tsx

export async function loader() {
  // Provee datos al componente
}

export default function Page() {
  // Renderiza el UI del cliente
}

export async function action() {
  // Realiza mutaciones capturando los métodos
  // POST, PUT, PATCH y DELETE del protocolo HTTP y REST
}
\`\`\`

## 🧵 Función loader de la ruta

Los archivos de rutas pueden exportar una función asíncrona llamada \`loader\`.

Esta función se encarga de conseguir los datos que la interfaz necesita, ya sea desde una *API*, una base de datos o *cookies* del navegador.

Cuando un usuario visita la página, esta función loader es ejecutada primero, **cargando los datos y luego, se renderiza el maquetado con estos datos**. 😯

\`\`\`jsx
// routes/perfil.tsx

import type { LoaderArgs } from "@remix-run/node"; // or cloudflare/deno
import { json } from "@remix-run/node"; // or cloudflare/deno

export async function loader({ request }: LoaderArgs) {
  const user = await getUserFromDB(request); // Acceso a la DB
  return json({
    displayName: user.displayName,
    email: user.email,
  });
}
\`\`\`

Esto asegura que **los datos están listos para ser usados por la interfaz**, evitando con esto el consumo de una *API* desde el cliente. 🤯

## 🧱 El componente de la ruta

Este componente debe ser exportado como *default*, pues será el componente que se muestra cuando la página se abre en el navegador. Los datos que el \`loader\` ha conseguido previamente, están disponibles en el *Hook* \`useLoaderData()\`.

\`\`\`jsx
// routes/perfil.tsx

import { useLoaderData } from "@remix-run/react";

// ...

export default function Component() {
  const user = useLoaderData<typeof loader>(); // type safety
  return (
    <Form action="/account">
      <h1>Editar usuario: {user.displayName}</h1>

      <input
        name="displayName"
        defaultValue={user.displayName}
      />
      <input name="email" defaultValue={user.email} />

      <button type="submit">Actualizar</button>
    </Form>
  );
}
\`\`\`

De esta forma se consigue que el primer render (*first meaningful paint*) sea una página **HTML** pre-renderizada que además es prácticamente instantánea.🔥

También conseguimos con el generic: \`<typeof loader>\` tipado seguro de punto a punto, sacándole el máximo provecho a nuestro **TypeScript**. ✅

## Función action de la ruta 🚦

Cuando a un Formulario se le hace *submit*, la función \`action\` es ejecutada.

\`\`\`jsx
// routes/perfil.tsx

import type {
  ActionArgs,
} from "@remix-run/node";

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const user = await getUserFromDB(request); // Acceso a la DB

  await updateUser(user.id, {
    email: formData.get("email"),
    displayName: formData.get("displayName"),
  });

  return json({ ok: true });
}
\`\`\`

**Remix** envía los datos del formulario a la función action. Una vez que la función action ha terminado su ejecución, la función loader es revalidada, para conseguir el nuevo estado del servidor. De esta manera, el componente no tiene que encargarse de mantener actualizado ningún estado local.

¿Genial no? 😎

> ⚠️ Es importante notar que los atributos *name* de los *inputs* **HTML,** serán las llaves en el *formData*.

### Así, la interfaz del cliente siempre está sincronizada con el estado del servidor sin tener que ocuparnos de ello.

Ya no hace falta mantener ningún estado en el cliente, pues **Remix** se encarga de revalidar los datos que se están usando en el componente de **React** y de actualizarlos una vez que el \`action\` ha terminado.

Una vez que pruebas construir una página con **Remix**, quedas enganchado(a) a su simplicidad, y todo te parece posible, tu imaginación comienza a volar, y lo mejor es que te puedes concentrar en crear buenas experiencias para tus usuarios; en vez de perder el tiempo manteniendo dos o más repos y múltiples servidores, solo tienes que construir una aplicación *Fullstack* con **Remix**.

Abrazo.

Bliss. 🤓

## Enlaces relacionados
[Remix Docs](https://remix.run/docs/en/main/discussion/data-flow)`;

async function main() {
  const slug = "que-es-el-fullstack-data-flow-2023";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("Post ya existe, actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "¿Qué es el Fullstack Data Flow?",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.facebook.com/blissito",
        coverImage: "https://i.imgur.com/juAF5cm.png",
        metaImage: "https://i.imgur.com/juAF5cm.png",
        youtubeLink: "",
        tags: ["diseño", "web", "remix", "react", "javascript", "typescript"],
        mainTag: "Remix",
      },
    });
    console.log("Post actualizado:", post.id);
  } else {
    console.log("Creando nuevo post...");
    const post = await db.post.create({
      data: {
        slug,
        title: "¿Qué es el Fullstack Data Flow?",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.facebook.com/blissito",
        coverImage: "https://i.imgur.com/juAF5cm.png",
        metaImage: "https://i.imgur.com/juAF5cm.png",
        youtubeLink: "",
        tags: ["diseño", "web", "remix", "react", "javascript", "typescript"],
        mainTag: "Remix",
      },
    });
    console.log("Post creado:", post.id);
  }

  await db.$disconnect();
}

main().catch(console.error);
