import { db } from "../app/.server/db";

const subagentesContent = `
Claude Code viene con subagentes especializados que puedes invocar para tareas específicas. Después de usarlos extensivamente, estos son los 3 que más impacto tienen en mi flujo de trabajo.

## 1. Task Agent (El explorador)

El Task Agent es tu aliado para explorar codebases grandes sin saturar el contexto principal.

### Cuándo usarlo:

\`\`\`
Usa un agente para encontrar todos los lugares donde
se usa el hook useAuth y cómo se implementa.
\`\`\`

Claude spawneará un subagente que explorará el código y te dará un resumen sin gastar tokens de tu conversación principal.

### Ventajas:
- **Contexto limpio**: El subagente tiene su propio contexto
- **Exploración profunda**: Puede leer muchos archivos sin abrumarte
- **Resultados resumidos**: Te devuelve solo lo relevante

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## 2. Plan Agent (El arquitecto)

Este agente planifica antes de ejecutar. Úsalo para tareas que requieren múltiples pasos.

### Cómo invocarlo:

\`\`\`
/plan Migrar la autenticación de NextAuth a Auth.js v5
\`\`\`

### Lo que hace:
1. Explora el código actual
2. Identifica todos los archivos afectados
3. Propone un plan paso a paso
4. Espera tu aprobación antes de cambiar nada

### Ejemplo de output:

\`\`\`markdown
## Plan: Migración a Auth.js v5

### Archivos a modificar:
- /lib/auth.ts (configuración principal)
- /app/api/auth/[...nextauth]/route.ts (rutas)
- /middleware.ts (protección de rutas)

### Pasos:
1. Actualizar dependencias
2. Migrar configuración de providers
3. Actualizar callbacks
4. Ajustar middleware
5. Verificar sesiones

¿Procedo con el plan?
\`\`\`

## 3. Bash Agent (El ejecutor)

Para cuando necesitas ejecutar comandos sin salir de la conversación.

### Ejemplos prácticos:

\`\`\`
Ejecuta los tests y dime cuáles fallan
\`\`\`

\`\`\`
Revisa el git log de los últimos 5 commits
y explícame qué cambios hubo
\`\`\`

\`\`\`
Verifica que las dependencias estén actualizadas
y sugiere cuáles actualizar
\`\`\`

### Seguridad:
Claude te pedirá confirmación antes de ejecutar comandos que modifiquen archivos o tengan efectos secundarios.

## Patrones combinados

### Explorar → Planificar → Ejecutar

\`\`\`
1. Primero, usa un agente para entender cómo funciona
   el sistema de pagos actual.

2. Después, planifica cómo añadir soporte para
   suscripciones mensuales.

3. Finalmente, implementa el plan y corre los tests.
\`\`\`

### Debugging sistemático

\`\`\`
Usa un agente para:
1. Encontrar todos los console.log en producción
2. Listarlos con su ubicación
3. Sugerir cuáles eliminar

Después elimínalos y verifica que los tests pasen.
\`\`\`

## Cuándo NO usar subagentes

- **Tareas simples**: Para editar un archivo pequeño, es más directo
- **Cambios quirúrgicos**: Si sabes exactamente qué cambiar
- **Interacciones rápidas**: Preguntas simples sobre código

## Conclusión

Los subagentes de Claude Code son como tener un equipo de especialistas:

- **Task Agent**: Tu investigador
- **Plan Agent**: Tu arquitecto
- **Bash Agent**: Tu DevOps

Aprende a delegarles trabajo y multiplica tu productividad.

Abrazo. bliss.
`;

async function main() {
  console.log("Importando post de Subagentes de Claude Code...");

  const slug = "Los-3-Subagentes-Esenciales-de-Claude-Code";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "Los 3 Subagentes Esenciales de Claude Code",
        body: subagentesContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@blissmo",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        tags: ["claude-code", "subagentes", "productividad", "ai"],
        mainTag: "AI",
        coverImage: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=1200&h=630&fit=crop",
        metaImage: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=1200&h=630&fit=crop",
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
      title: "Los 3 Subagentes Esenciales de Claude Code",
      body: subagentesContent.trim(),
      published: true,
      authorName: "Héctorbliss",
      authorAt: "@blissmo",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",
      tags: ["claude-code", "subagentes", "productividad", "ai"],
      mainTag: "AI",
      coverImage: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=1200&h=630&fit=crop",
      metaImage: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=1200&h=630&fit=crop",
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
