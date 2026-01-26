import { db } from "../app/.server/db";

const postContent = `Si estás leyendo este post estoy seguro que te has enfrentado a proyectos tan grandes que la navegación entre los archivos y carpetas es una tortura y conforme vas agregando nuevas funcionalidades ese número aumenta, y la posibilidad de que muchos archivos dejen de ser usados, también; como desarrolladores este escenario es muy común.

Buscar la manera de depurar estos archivos es una tarea a la cual deberíamos dedicar un par de horas con la finalidad de mejorar tanto la navegación como el peso de nuestro proyecto, pero... ¿cómo lo hacemos?, simple, con una librería externa. A continuación, te presento un par que te serán de gran utilidad.

# [DeadFile](https://m-izadmehr.github.io/deadfile/#/)

El primer ejemplo es [deadfile](https://m-izadmehr.github.io/deadfile/#/) una librería que nos va permitir escanear el proyecto en busca de archivos que no estemos usando, ¿cómo lo hace? revisa las importaciones y busca archivos que no hayan sido importados en ningún lugar.

Basta con ejecutar el comando:

\`\`\`bash
npx deadfile path/to/entry/file # ej. npx deadfile ./src/index.js
\`\`\`

El comando necesita que le proporcionemos el \`path\` al archivo de entrada de nuestra aplicación, por ejemplo \`./src/index.js\` en un proyeto de React con el CRA o \`./src/app.js\` en un proyecto con Express, por nombrar algunos casos comunes.

Es posible excluir carpetas:

\`\`\`bash
npx deadfile ./src/index.js --exclude tests  utils/webpack
\`\`\`

Añadir múltiples archivos de entrada:

\`\`\`bash
npx deadfile ./src/index.js ./src/app.js
\`\`\`

O indicar en qué carpeta queremos hacer la búsqueda:

\`\`\`bash
npx deadfile ./src/index.js --dir /path/to/other/folder
\`\`\`

Como resultado veremos en nuestra terminal algo como esto:

![](https://github.com/M-Izadmehr/deadfile/raw/master/docs/images/screenshot.png)

> Ojo: Es posible que nos muestre archivos de configuración como archivos sin usar, seguro, son archivos que usan librerias globales o que simplemente no forman parte directa de nuestra aplicación entonces es importante leer con criterio la lista que nos brinda y decidir si efectivamente están en desuso o no, ejemplo \`tailwind.config.js\` o \`./public/favicon.ico\`.

# [Unimported](https://github.com/smeijer/unimported)

La segunda opción es [unimported](https://github.com/smeijer/unimported) con un principio similar a la herramienta anterior, pero con considerables mejoras:

- Archivos de configuración \`.unimportedrc.json\`
- Reporte de librerías sin usar

¡Sí! Ahora también podrás saber que librerías de tu proyecto no se usan en lo absoluto.

El uso de \`unimported\` es similar al anterior, basta con ejecutar:

\`\`\`bash
npx unimported path/to/entry/file # ej. npx unimported ./src/index.js
\`\`\`

Para crear el archivo de configuración, ejecutamos:

\`\`\`bash
npx unimported --init
\`\`\`

que nos va a crear un archivo de nombre \`.unimportedrc.json\` con el siguiente contenido:

\`\`\`js
{
  "ignorePatterns": [
    "**/node_modules/**",
    "**/*.tests.{js,jsx,ts,tsx}",
    "**/*.test.{js,jsx,ts,tsx}",
    "**/*.spec.{js,jsx,ts,tsx}",
    "**/tests/**",
    "**/__tests__/**",
    "**/*.d.ts"
  ],
  "ignoreUnimported": [],
  "ignoreUnused": [],
  "ignoreUnresolved": []
}
\`\`\`

Las ventajas son simples, evitar agregar toda la configuración mediante la terminal y limitarnos a ejecutar el comando básico.

Podemos configurar el \`punto de entrada (entry)\`, \`extensiones\` e ignorar librerías que no se estén usando:

\`\`\`json
{
  "entry": ["src/main.ts", "src/pages/**/*.{js,ts}"],
  "extensions": [".ts", ".js"],
  "ignorePatterns": ["**/node_modules/**", "private/**"],
  "ignoreUnresolved": ["some-npm-dependency"],
  "ignoreUnimported": ["src/i18n/locales/en.ts", "src/i18n/locales/nl.ts"],
  "ignoreUnused": ["bcrypt", "create-emotion"]
}
\`\`\`

Además, si usamos \`alias\` en nuestras importaciones tambien las podemos configurar:

\`\`\`json
{
  "aliases": {
    "@components/*": ["./components", "./components/*"]
  }
}
\`\`\`

¡En fin, una maravilla!

![](https://raw.githubusercontent.com/smeijer/unimported/master/docs/unimported.png)

## Conclusión

Eliminar archivos que no estamos usando de nuestros proyectos nos va a ayudar a mejorar la navegación dentro del proyecto mientras estemos trabajando en él y también, hay que decirlo, puede traer mejoras de \`performance\` y \`tiempo de carga\` si los archivos sin usar estaban presentes en nuestro \`build\` para producción.`;

async function main() {
  const slug = "como-eliminar-archivos-sin-usar-de-mi-proyecto-js";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("Post ya existe, actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "Cómo eliminar archivos sin usar de mi proyecto JS",
        body: postContent.trim(),
        published: true,
        authorName: "David Zavala",
        authorAt: "@DeividZavala",
        photoUrl: "https://i.imgur.com/X7m3EsR.jpg",
        authorAtLink: "https://github.com/DeividZavala",
        coverImage: "https://i.imgur.com/2a4ft5d.png",
        metaImage: "https://i.imgur.com/2a4ft5d.png",
        tags: ["javascript", "node", "herramientas"],
        mainTag: "JavaScript",
      },
    });
    console.log("Post actualizado:", post.id);
  } else {
    console.log("Creando nuevo post...");
    const post = await db.post.create({
      data: {
        slug,
        title: "Cómo eliminar archivos sin usar de mi proyecto JS",
        body: postContent.trim(),
        published: true,
        authorName: "David Zavala",
        authorAt: "@DeividZavala",
        photoUrl: "https://i.imgur.com/X7m3EsR.jpg",
        authorAtLink: "https://github.com/DeividZavala",
        coverImage: "https://i.imgur.com/2a4ft5d.png",
        metaImage: "https://i.imgur.com/2a4ft5d.png",
        tags: ["javascript", "node", "herramientas"],
        mainTag: "JavaScript",
      },
    });
    console.log("Post creado:", post.id);
  }

  await db.$disconnect();
}

main().catch(console.error);
