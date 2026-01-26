import { db } from "../app/.server/db";

const createReactAppPostContent = `
En 2016, Facebook lanzó **create-react-app** (CRA) y fue una bendición. Antes de CRA, configurar un proyecto de React era una pesadilla: Webpack, Babel, loaders, plugins... un dolor de cabeza que alejaba a muchos desarrolladores del ecosistema.

CRA llegó con una promesa simple: \`npx create-react-app mi-app\` y listo. Sin configuración. Sin dolores de cabeza. **Zero config**.

Pero han pasado 6 años, y el panorama ha cambiado drásticamente. Es hora de hablar de por qué **deberías dejar de usar create-react-app** en 2022 (y más allá).

## El problema con CRA en 2022

### 1. Es lento. Muy lento.

Si has trabajado con CRA en un proyecto mediano-grande, sabes de lo que hablo. El tiempo de inicio del servidor de desarrollo puede tomar **30 segundos o más**. Cada cambio en el código puede tardar varios segundos en reflejarse.

¿Por qué? CRA usa Webpack bajo el capó, y Webpack necesita empaquetar todo tu código antes de servirlo. En proyectos grandes, esto se vuelve insostenible.

### 2. Problemas con polyfills

Con CRA 5 (que usa Webpack 5), se eliminaron los polyfills automáticos para módulos de Node.js. Si tu proyecto o alguna dependencia usa \`crypto\`, \`stream\`, \`buffer\`, etc., te encontrarás con errores crípticos:

\`\`\`
BREAKING CHANGE: webpack < 5 used to include polyfills for node.js core modules by default.
\`\`\`

La "solución" oficial es configurar manualmente los fallbacks, lo cual rompe la promesa de "zero config".

### 3. Configuración limitada

CRA te obliga a hacer \`eject\` si necesitas personalizar la configuración de Webpack. Y una vez que haces eject, **no hay vuelta atrás**. Tu proyecto se llena de archivos de configuración que ahora son tu responsabilidad mantener.

Sí, existen herramientas como \`craco\` o \`react-app-rewired\`, pero son parches sobre una herramienta que no fue diseñada para ser extensible.

### 4. Sin Server-Side Rendering

CRA genera aplicaciones puramente client-side. En 2022, esto es una limitación seria:

- **SEO deficiente**: Los motores de búsqueda tienen dificultades indexando SPAs
- **Rendimiento percibido**: El usuario ve una pantalla en blanco mientras se descarga y ejecuta el JavaScript
- **Sin data fetching en el servidor**: Todo el fetching ocurre en el cliente

## La era de los frameworks híbridos

El futuro del desarrollo web está en frameworks que combinan lo mejor de ambos mundos: la interactividad de React con el rendimiento del server-side rendering.

### Next.js

El framework más popular de React. Ofrece:
- Server-Side Rendering (SSR)
- Static Site Generation (SSG)
- Incremental Static Regeneration (ISR)
- API Routes
- Optimización automática de imágenes

\`\`\`bash
npx create-next-app@latest mi-app
\`\`\`

### Remix

El nuevo jugador que está revolucionando cómo pensamos sobre las aplicaciones web:
- Nested routing con data loading
- Manejo de errores granular
- Formularios progresivamente mejorados
- Mejor experiencia de desarrollo

\`\`\`bash
npx create-remix@latest mi-app
\`\`\`

## Alternativas para SPAs puras

Si realmente necesitas una SPA sin server-side rendering, también hay mejores opciones que CRA:

### Vite

**Mi recomendación número uno**. Vite es increíblemente rápido porque:
- Usa ES modules nativos durante el desarrollo
- Solo empaqueta lo que necesitas, cuando lo necesitas
- Hot Module Replacement (HMR) instantáneo

\`\`\`bash
npm create vite@latest mi-app -- --template react
\`\`\`

El servidor de desarrollo inicia en **milisegundos**, no segundos. Los cambios se reflejan instantáneamente. Es una experiencia de desarrollo completamente diferente.

### Parcel

Zero config como CRA, pero moderno y rápido:

\`\`\`bash
npm init -y
npm install parcel react react-dom
\`\`\`

Parcel detecta automáticamente qué necesitas y lo configura por ti.

## Conclusión

Create-react-app cumplió su propósito. Democratizó el desarrollo con React y eliminó la barrera de entrada. Pero el ecosistema ha evolucionado, y seguir usando CRA en 2022 es atarse a una herramienta que no ha podido mantenerse al día.

**Mi recomendación:**

- **¿Necesitas SSR/SEO?** → Next.js o Remix
- **¿SPA simple y rápida?** → Vite
- **¿Zero config absoluto?** → Parcel

El equipo de React mismo ha reconocido esto. En la documentación oficial, ya no recomiendan CRA para nuevos proyectos. Es hora de seguir adelante.

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

Un abrazo. Bliss.
`;

async function main() {
  console.log("Importando post '¡Ya no uses create-react-app!, por favor.'...");

  const slug = "ya-no-uses-create-react-app-por-favor-2022";

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "¡Ya no uses create-react-app!, por favor.",
        body: createReactAppPostContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "http://hectorbliss.com",
        coverImage: "https://i.imgur.com/HO7kme6.png",
        metaImage: "https://i.imgur.com/HO7kme6.png",
        tags: ["desarrolloweb", "vite", "parcel", "remix", "next", "create-react-app", "react"],
        mainTag: "web",
      },
    });
    console.log("✅ Post actualizado exitosamente!");
    console.log(`   ID: ${post.id}`);
    console.log(`   URL: /blog/${post.slug}`);
    return;
  }

  // Crear el post con fechas originales (11 Diciembre 2022)
  const post = await db.post.create({
    data: {
      slug,
      title: "¡Ya no uses create-react-app!, por favor.",
      body: createReactAppPostContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "http://hectorbliss.com",

      // Imágenes
      coverImage: "https://i.imgur.com/HO7kme6.png",
      metaImage: "https://i.imgur.com/HO7kme6.png",

      // Clasificación
      tags: ["desarrolloweb", "vite", "parcel", "remix", "next", "create-react-app", "react"],
      mainTag: "web",

      // Fechas originales (11 Diciembre 2022)
      createdAt: new Date(1670782012036),
      updatedAt: new Date(1670782012036),
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Fecha original: ${post.createdAt}`);
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
