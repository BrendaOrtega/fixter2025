import { db } from "../app/.server/db";

const postContent = `Estas **NO** son las **tres** cosas más importantes que deberías saber sobre esta fabulosa biblioteca, que, ahora se ha convertido en un framework. Ni tampoco las únicas. Pero sí las que, según mi humildísima opinión, tengo que contarte sì o sí. Así que, abróchate el cinturón, porque ya vamos a despegar. 🛫

Seguramente tú, alguna vez trabajaste con \`react-router-dom\` para, sencillamente, añadir ruteo a tu *Single Page Application*. Bueno, pues entonces debes saber que esta popular biblioteca, responsable de ofrecerle ruteo a millones de aplicaciones React alrededor del mundo; y que es amada intensamente por una bastedad de desarrolladores *front end*, ahora nos ofrece un bello *pattern* para construir aplicaciones *full stack*: cliente servidor. 🥸

Aplicaciones full stack sin esfuerzo y sin tener que re-aprender React19 todavía. 😮‍💨

React Router es ahora un framework que nos sirve de puente para lograr llegar más cómodamente a React19 y así no ahogarnos en el intento de cruzar. 🌊

Por eso, en este video quiero contarte sobre tres características de React Router Framework que lo hacen una de las mejores opciones para crear aplicaciones web en 2025. Y quién sabe, tal vez también se te convierta, como lo hizo conmigo, en tu framework web favorito.

Nosotros en [fixter.org](http://fixter.org/) lo estamos usando para crear aplicaciones web instantáneas, pre-renderizadas y hasta off-line, sin que dejen de ser dinámicas y modernas. Ya migramos [fixtergeek.com](http://fixtergeek.com/) a React Router Framework por completo ¡en solo una semana! Date una vuelta por ahí si todavía no la has visto. 👀

## #1 Nuevas estrategias de renderizado

Quiero empezar con una característica de React Router Framework que me tiene a mi flipando. Me refiero a sus estrategias de renderizado. Estrategias que no nos obligan a tener que trabajar del lado del servidor si no queremos. ¡Todo lo contrario! No solo podemos mantener lo que ya teníamos en nuestra Single Page App, sino que ahora podemos incluso crear sitios web estáticos. Mira deja te explico.

\`\`\`ts
// react-router.config.ts

export default {
  ssr: false, // ¡SPA a la orden!
}
\`\`\`

Podemos crear un archivito de configuración, así como le hacen todas las herramientas cool del barrio. Y cambiar la llave \`ssr\` a \`false\`. Así, podremos quedarnos trabajando en el navegador, en el cliente, y con esto, seguir ignorando todo el ruido que la comunidad React está haciendo con respecto a mudarse al servidor. Y es que la comunidad web tiene su propio criterio, no anda ahí nomás cambiando de ideas junto con Facebook. La comunidad SPA se ha resistido arduamente al cambio y React Router está aquí para apoyar. Pues, no solo nos permite apagar por completo las opciones de servidor sino que, nos ofrece muchos beneficios y herramientas que podemos ir usando poco a poco sin nos atrevemos a dejar el \`ssr\` encendido, como: ¡el *pre-renderizado* estático! Mira:

\`\`\`ts
// react-router.config.ts

export default {
  prerender: true, // ¡Hasta la vista Astro!
}
\`\`\`

Si colocamos otra llavecita \`prerender\` en este mismo archivo de configuraciones y la encendemos. 🪄✨ La magia de los sitios web estáticos sucede. 👨🏻‍🚀

Lo que realmente quiero decir es que: ahora React Router tomará todas las rutas de nuestra aplicación, una por una a la hora de procesar el *build* de producción y creará archivos HTML estáticos, osea, pre-renderizados, para así entregar solo un archivo HTML cuando se haga una petición a la ruta. Consiguiendo con esto ¡el sitio web más veloz jamás! Pero, esto no es todo; aquí tampoco estamos obligados a convertir nuestro sitio entero en *pre-renderizado*, también podemos decir cuántas rutas y cuales. 🤯

\`\`\`ts
// react-router.config.ts

export default {
  // Esto generara archivos HTML estáticos en "build time"
  async prerender() {
    return ["/", "/contacto", "/perfil"];
  },
}
\`\`\`

La llave se puede convertir en método y podemos devolver un *array* con la lista de las rutas que queremos pre-renderizar. Así podemos seguir trabajando en un sitio web altamente dinámico, pero que ya nunca vuelve a renderizar la landing page. ✅

\`\`\`ts
export default {
  // Todas las rutas
  // (se exluyen los segmentos dynamicos: "/post/:slug")
  prerender: true,

  // O solo algúnas rutas
  prerender: ["/", "/blog", "/blog/popular-post"],

  // También podemos usar una función
  async prerender() {
    const allPosts = await getAllPostsFromDB();
    return ["/", "/blog"].concat(
      allPosts.map((post) => \`/blog/\${post.slug}\`)
    );
  },

}
\`\`\`

Pero, espérate, mejor aún; como \`prerender\` ahora es un método, pues sí, lo que te estabas imaginando, podemos consultar la base de datos en el proceso de *building* y así *pre-renderizar* todo un *blog,* por ejemplo. 🤯 Ya no necesitas de un segundo framework nomás para el contenido y el marketing de tu app. —Y yo que le traía ganas a Astro mano— 😱 Y mira que apenas vamos en el número uno.

## #2 Tipos TypeScript automáticos y auto-completado

Si también eres de los que se han resistido a emplear **TypeScript** en tus proyectos, ya sea porque no ha habido tiempo para ponerse al día con este lenguaje porque hay mucha chamba, o por cualquier otra cosa; pero, sabes de los muchos beneficios que ofrece tipar tus componentes y hasta tu API; y has visto a tus *yutubers* favoritos usar ese auto-completado mágico que les ofrece los atributos de todos sus objetos en sus programas, y solo te has quedado como el chinito. 😑 React Router tiene un regalo para ti también. Pues en lugar de juzgarnos por no saber Typescript, nos regala todos los beneficios del tipado de extremo a extremo sin obligarnos, tampoco, a ser expertos en TypeScript.

\`\`\`ts
import type { Route } from "./+types/cualquiera-de-tus-rutas";
\`\`\`

Con la importación de este tipo Route, que se genera solito: ahora podemos tipar nuestras funciones sin necesidad de definir ni *types* ni interfaces. Se genera un tipo Route para cada una de las rutas de tu app. 🤩

¡Genial! Este tipo de mágia sí que la queremos. 🪄✨

Claro que sí, todo mundo anda escribiendo *prompts* en vez de código, dejando que los robots programen por ellos; y aunque tú como yo aún nos resistimos programando con nuestras propias manos, como buenos artesanos que somos, pues, de todas formas, no está nada mal que React Router escriba los tipos por nosotros. 🖥️🤖🛩️🍹😎🏖️

👀 Será interesante ver si la comunidad de **Zod** se pone chida y aparece una herramienta que nos pueda generar los *schemas* de *parseo* desde este el \`type Route\` estaría chido ¿no? 💅🏼

\`\`\`ts
import {
  type RouteConfig,
  route,
} from "@react-router/dev/routes";

export default [
  route("blog/:slug", "./routes/blog-detail.tsx"),
] satisfies RouteConfig;
\`\`\`

Los tipos automáticos son uno de los muchos beneficios de tener un archivo de rutas que define las URLs de nuestro sitio web y dejarnos por fin de estructuras de carpetas laberínticas y limitantes. 🗂️

\`\`\`ts
import type { Route } from "./+types/product";
// tipos específicos de esta ruta, ☝🏼 generados automáticamente

export async function action(actionArgs:Route.ActionArgs){}

export function loader({ params }: Route.LoaderArgs) {
  //                     👆🏼 { slug: string }
  return { message: \`post slug: #\${params.slug}\` };
}
//                                  👇🏼 { message: string }
export default function Component({loaderData}: Route.ComponentProps) {
  return <h1>Blissmo {loaderData.message}!</h1>;
}
\`\`\`

Una vez que agreguemos un nuevo módulo de ruta en este archivo, ya tendremos disponible su \`type Route\` para tipar correctamente todas nuestras funciones y componentes.

¡Ah!, como en los buenos tiempos con Django o Rails o react-router-dom ¡pero con tipado gratis!

## #3 No más useEffect para cargar datos

La carga de datos es una de las especialidades de React Router. Por eso mató a Redux. Te dejo [aquí](https://youtu.be/88uRMb8UN-A) el video. Con React Router Framework, no solo podemos cargar datos desde el servidor, también podemos hacerlo desde el cliente o solo en el cliente. 🥷🏼

Tenemos a la mano una función llamada \`clientLoader\`. Esta función es una de las muchas que un módulo de ruta puede exportar. Como antes mencioné, un módulo de ruta es el archivo que has configurado en \`routes.ts\` para que responda a ciertos segmentos en la URL.

El \`clientLoader\`, se ejecutará únicamente en el navegador una vez que tu app ya se haya hidratado. 💦

\`\`\`ts
export async function loader() {
  // Esto corre en el server y puede tocar la DB
  return await db.tuModeloFavorito.findMany();
}

export async function clientLoader() {
  // Podemos conseguir datos desde el cliente de otras APIs o las nuestras
  const response = await fetch(...);
  return response.json()
}

// Lo devuelto por los loaders estará disponíble en un prop
export default function Component({loaderData}) {
  return <>...</>;
}
\`\`\`

Junto con esta genial herramienta hay otras que trabajan ayudándole en caso de que quieras ejecutar el \`clientLoader\` antes de hidratar tu app, y así mostrar un *fallback* con *skeletons* mientras tanto. Con esto, no solo estarán nuestros datos siempre listos desde el primer render, también sustituimos al \`useEffect\` para consultar el \`localStorage\`, por ejemplo. Y lo mejor, es que podemos controlar la *cache* del navegador para evitar peticiones al servidor. ¡Maravilloso!

La verdad, es que no me da la vida para platicártelo todo aquí en un solo video, pues también tenemos al \`clientAction\`, que nos permitirá comunicarnos con otras APIs y masajear nuestros datos desde el cliente antes de mandarlo a nuestra función \`action\` en el servidor, o evitandolo por completo.

\`\`\`ts
export async function clientAction({
  request,
  params,
  serverAction, // podemos llamar al servidor acá
}) {
  const formData = await request.formData(); // igualito que en el server
  const body = Object.fromEntries(formData);
  const response = await fetch('/api/validate',{body}); // cualquier endpoint
  return { ok: response.ok }
}
\`\`\`

¡Todos los beneficios de una SPA (Single Page Appliaction) sin tener que dejar los beneficios del servidor! 😲

Si quieres enterarte de todo lo nuevo en React Router y aprender a usarlo sin invertir demasiado tiempo, no dejes de echarle un ojo a mi nuevo curso en el que te platico todo con más detalle; además es gratis. 😇

¡Y ya está! No dejes de suscribirte. 💺

Abrazo. Blissmo. 🤓 🤓`;

async function main() {
  console.log("Importando post sobre React Router Framework...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug: "3_cosas_que_debes_saber_sobre_react_router_framework_nkyj5" },
  });

  if (existing) {
    console.log("⚠️  El post ya existe con ID:", existing.id);
    return;
  }

  const post = await db.post.create({
    data: {
      slug: "3_cosas_que_debes_saber_sobre_react_router_framework_nkyj5",
      title: "3 cosas que debes saber sobre React Router Framework",
      body: postContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://hectorbliss.com",

      // Imágenes
      coverImage: "https://i.imgur.com/N0Vihgg.png",
      metaImage: "https://i.imgur.com/rRLifnQ.png",

      // YouTube
      youtubeLink: "https://youtu.be/AYF3aUm1MSQ",

      // Clasificación
      tags: ["router", "react router", "framework", "server components"],
      mainTag: "react",

      // Fechas originales
      createdAt: new Date(1736368101146), // 2025-01-08
      updatedAt: new Date(1736396894958), // 2025-01-09
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Autor: ${post.authorName}`);
  console.log(`   Fecha original: ${post.createdAt.toLocaleDateString("es-MX")}`);
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
