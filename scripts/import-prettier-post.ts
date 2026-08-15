import { db } from "../app/.server/db";

const prettierContent = `
Si todavía formateas código manualmente o discutes con tu equipo sobre tabs vs espacios, es momento de conocer Prettier. Es la herramienta que terminó las guerras de estilo en JavaScript.

## ¿Qué es Prettier?

Prettier es un formateador de código "opinionated" (con opiniones fuertes). Lo instalas, lo configuras una vez, y nunca más piensas en formateo.

\`\`\`bash
npm install --save-dev prettier
\`\`\`

## ¿Por qué usarlo?

### 1. Termina las discusiones

Sin Prettier:
> "¿Usamos tabs o espacios?"
> "¿Punto y coma o no?"
> "¿Comillas simples o dobles?"

Con Prettier:
> "Prettier decide. Siguiente tema."

### 2. Formateo automático

\`\`\`javascript
// Antes (tu código a las 3am)
const user={name:"Juan",age:25,email:"juan@email.com",address:{city:"CDMX",country:"Mexico"}}

// Después (Prettier al guardar)
const user = {
  name: "Juan",
  age: 25,
  email: "juan@email.com",
  address: {
    city: "CDMX",
    country: "Mexico",
  },
};
\`\`\`

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Configuración mínima

Crea un archivo \`.prettierrc\`:

\`\`\`json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5"
}
\`\`\`

## Integración con VS Code

1. Instala la extensión "Prettier - Code formatter"
2. En settings.json:

\`\`\`json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
\`\`\`

Listo. Cada vez que guardes, tu código se formatea automáticamente.

## Con ESLint

Prettier y ESLint pueden chocar. La solución:

\`\`\`bash
npm install --save-dev eslint-config-prettier
\`\`\`

En tu \`.eslintrc\`:

\`\`\`json
{
  "extends": ["eslint:recommended", "prettier"]
}
\`\`\`

Esto desactiva las reglas de ESLint que Prettier ya maneja.

## Scripts útiles

En tu \`package.json\`:

\`\`\`json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
\`\`\`

- \`npm run format\`: Formatea todo el proyecto
- \`npm run format:check\`: Verifica sin modificar (útil en CI)

## Ignorar archivos

Crea \`.prettierignore\`:

\`\`\`
node_modules
dist
build
coverage
*.min.js
\`\`\`

## Pre-commit hooks

Formatea solo los archivos que van en el commit:

\`\`\`bash
npm install --save-dev husky lint-staged
\`\`\`

En \`package.json\`:

\`\`\`json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx,json,css,md}": "prettier --write"
  }
}
\`\`\`

## Lenguajes soportados

Prettier no solo es para JavaScript:

- JavaScript / TypeScript
- JSX / TSX
- JSON
- CSS / SCSS / Less
- HTML
- Markdown
- YAML
- GraphQL

## Conclusión

Prettier es de esas herramientas que instalas una vez y te olvidas. Ya no hay excusa para código mal formateado.

| Sin Prettier | Con Prettier |
|--------------|--------------|
| Discusiones de estilo | Configuración única |
| Formateo manual | Automático al guardar |
| PRs con cambios de estilo | PRs limpios |
| Código inconsistente | Código uniforme |

Instálalo hoy y tu yo del futuro te lo agradecerá.

Abrazo. Blissmo. 🤓
`;

async function main() {
  console.log("Importando post de Prettier...");

  const slug = "que-es-prettier-y-por-que-deberias-usarlo-2023";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "¿Qué es Prettier y por qué deberías usarlo?",
        body: prettierContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@blissmo",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        tags: ["prettier", "formateo", "herramientas", "javascript", "vscode"],
        mainTag: "Herramientas",
        coverImage: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=630&fit=crop",
        metaImage: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=630&fit=crop",
      },
    });
    console.log("✅ Post actualizado exitosamente!");
    console.log(`   ID: ${post.id}`);
    console.log(`   URL: /blog/${post.slug}`);
    return;
  }

  const post = await db.post.create({
    data: {
      slug,
      title: "¿Qué es Prettier y por qué deberías usarlo?",
      body: prettierContent.trim(),
      published: true,
      authorName: "Héctorbliss",
      authorAt: "@blissmo",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",
      tags: ["prettier", "formateo", "herramientas", "javascript", "vscode"],
      mainTag: "Herramientas",
      coverImage: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=630&fit=crop",
      metaImage: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=630&fit=crop",
      createdAt: new Date("2023-04-10"),
      updatedAt: new Date(),
    },
  });

  console.log("✅ Post importado exitosamente!");
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
