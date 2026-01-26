import { db } from "../app/.server/db";

const hacksContent = `
Después de meses usando Claude Code diariamente, he descubierto trucos que multiplicaron mi productividad. Estos no están en la documentación oficial, son patrones que emergen de la práctica constante.

## 1. El archivo CLAUDE.md como memoria externa

Claude Code lee automáticamente el archivo \`CLAUDE.md\` en la raíz de tu proyecto. Úsalo como una "memoria persistente":

\`\`\`markdown
# CLAUDE.md

## Reglas del proyecto
- Usar TypeScript estricto
- Componentes funcionales con hooks
- Tailwind para estilos

## Decisiones de arquitectura
- Auth con JWT, tokens en httpOnly cookies
- Prisma para ORM
- Zod para validación

## Patrones establecidos
- Fetch en server loaders, nunca en cliente
- Errores con toast, nunca alerts
\`\`\`

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## 2. Pide que lea antes de escribir

Antes de pedir cambios, haz que Claude explore:

\`\`\`
Lee el archivo auth.ts y todos los archivos que importa.
Después propón cómo añadir refresh tokens.
\`\`\`

Esto evita que invente implementaciones que no encajan con tu código existente.

## 3. Usa el modo "plan" para tareas grandes

Para refactorizaciones o features complejas:

\`\`\`
/plan Migrar de Redux a Zustand
\`\`\`

Claude primero explorará, planificará y te pedirá aprobación antes de cambiar nada. Esto evita sorpresas.

## 4. Commits atómicos con contexto

\`\`\`
Haz commit de los cambios relacionados con autenticación.
Mensaje: "feat(auth): implementar refresh tokens"
\`\`\`

Claude agrupará los cambios relevantes y creará un commit limpio.

## 5. Tests primero, implementación después

\`\`\`
Escribe tests para un hook useDebounce que:
- Debounce un valor por X ms
- Cancele al desmontar
- Permita cambiar el delay

Después implementa el hook para que pasen los tests.
\`\`\`

TDD con IA funciona sorprendentemente bien.

## 6. El patrón "como lo haría X"

\`\`\`
Implementa validación de formularios como lo haría React Hook Form.
\`\`\`

Esto le da a Claude un marco de referencia claro sin tener que explicar cada detalle.

## 7. Debugging con contexto completo

En lugar de:
\`\`\`
El login no funciona
\`\`\`

Haz:
\`\`\`
Al hacer login:
1. Veo el POST en network con status 200
2. Pero req.user es undefined en el middleware
3. El token está en localStorage

Lee el middleware de auth y el route de login.
¿Dónde se rompe el flujo?
\`\`\`

## Bonus: Combinaciones poderosas

### Para explorar un codebase nuevo:
\`\`\`
Dame un resumen de la arquitectura de este proyecto.
Enfócate en: autenticación, rutas principales, y patrones de estado.
\`\`\`

### Para refactorizar sin romper:
\`\`\`
Quiero renombrar UserContext a AuthContext.
Primero lista todos los archivos que lo usan.
Después haz los cambios garantizando que los tests siguen pasando.
\`\`\`

### Para documentar:
\`\`\`
Genera JSDoc para todas las funciones públicas en utils/
Sigue el estilo de los JSDoc que ya existen en el proyecto.
\`\`\`

## Conclusión

La clave es darle a Claude contexto suficiente y tareas específicas. No es magia, es saber comunicarse con la herramienta.

Practica estos patrones y tu velocidad de desarrollo se multiplicará.

Abrazo. bliss.
`;

async function main() {
  console.log("Importando post de 7 Hacks para Claude Code...");

  const slug = "Mis-7-Hacks-para-Claude-Code";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "Mis 7 Hacks para Claude Code",
        body: hacksContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@blissmo",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        tags: ["claude-code", "productividad", "tips", "ai", "desarrollo"],
        mainTag: "AI",
        coverImage: "https://images.unsplash.com/photo-1550439062-609e1531270e?w=1200&h=630&fit=crop",
        metaImage: "https://images.unsplash.com/photo-1550439062-609e1531270e?w=1200&h=630&fit=crop",
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
      title: "Mis 7 Hacks para Claude Code",
      body: hacksContent.trim(),
      published: true,
      authorName: "Héctorbliss",
      authorAt: "@blissmo",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",
      tags: ["claude-code", "productividad", "tips", "ai", "desarrollo"],
      mainTag: "AI",
      coverImage: "https://images.unsplash.com/photo-1550439062-609e1531270e?w=1200&h=630&fit=crop",
      metaImage: "https://images.unsplash.com/photo-1550439062-609e1531270e?w=1200&h=630&fit=crop",
      createdAt: new Date(),
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
