import { db } from "../app/.server/db";

const updatedBody = `La espera ha terminado. Después de años de desarrollo, **jQuery 4** finalmente está aquí, trayendo consigo una modernización significativa de la biblioteca JavaScript más utilizada en la historia de la web.

## Cambios principales

### 1. Eliminación de métodos deprecados

jQuery 4 elimina los métodos de conveniencia que fueron marcados como deprecados en versiones anteriores:

- \`.click()\`, \`.dblclick()\`
- \`.keypress()\`, \`.keydown()\`, \`.keyup()\`
- \`.mouseenter()\`, \`.mouseleave()\`, \`.hover()\`
- \`.focus()\`, \`.blur()\`
- \`.submit()\`, \`.change()\`

Ahora debes usar \`.on()\` para todos los eventos:

\`\`\`javascript
// ❌ jQuery 3.x (ya no funciona en v4)
$("#boton").click(function() { ... });

// ✅ jQuery 4
$("#boton").on("click", function() { ... });
\`\`\`

### 2. Promesas nativas con async/await

Una de las mejoras más significativas es el soporte nativo de Promesas en los métodos AJAX, permitiendo usar \`async/await\`:

\`\`\`javascript
// ❌ jQuery 3.x - Callbacks
$.get("/api/datos", function(data) {
    console.log(data);
});

// ✅ jQuery 4 - async/await
const data = await $.get("/api/datos");
console.log(data);
\`\`\`

### 3. Uso de \`e.key\` en lugar de \`e.which\`

El evento \`e.which\` ha sido eliminado. Ahora debes usar \`e.key\` para detectar teclas:

\`\`\`javascript
// ❌ jQuery 3.x
$(input).on("keypress", (e) => {
    if (e.which === 13) { /* Enter */ }
});

// ✅ jQuery 4
$(input).on("keypress", (e) => {
    if (e.key === "Enter") { /* Enter */ }
});
\`\`\`

## Ejemplo práctico completo

Aquí hay un ejemplo que demuestra la sintaxis moderna de jQuery 4:

\`\`\`javascript
// jQuery 4 - Sintaxis moderna con Promises nativas
const $nombre = $("#nombre");
const $resultado = $("#resultado");
const $saludar = $("#saludar");

async function obtenerSaludo() {
    const nombre = $nombre.val() || "mundo";

    try {
        const data = await $.get(\`/api/saludo/\${nombre}\`);
        $resultado.text(data.texto);
    } catch (error) {
        $resultado.text("Error al obtener saludo");
    }
}

$saludar.on("click", obtenerSaludo);

$nombre.on("keypress", (e) => {
    if (e.key === "Enter") obtenerSaludo();
});
\`\`\`

## Tabla comparativa: jQuery 3.x vs jQuery 4

| Característica | jQuery 3.x | jQuery 4 |
|----------------|------------|----------|
| Métodos de evento | \`.click()\`, \`.keypress()\`, etc. | Solo \`.on()\` |
| AJAX | Callbacks, Deferred | Promesas nativas, async/await |
| Detección de teclas | \`e.which\`, \`e.keyCode\` | \`e.key\` |
| Soporte IE | IE 9+ | Sin soporte para IE |
| Tamaño | ~87 KB minificado | ~68 KB minificado |

---

🎬 **¿Quieres más contenido de desarrollo web?** Suscríbete a nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Conclusión

jQuery 4 representa un paso importante hacia la modernización, eliminando código legacy y adoptando estándares modernos de JavaScript. Si bien los cambios pueden requerir actualizaciones en tu código existente, los beneficios en términos de rendimiento y compatibilidad con JavaScript moderno hacen que la migración valga la pena.

Si te interesa aprender más sobre desarrollo web moderno, en [FixterGeek](/) tenemos cursos de React, TypeScript y herramientas de IA para desarrolladores.

Abrazo. bliss.

### Recursos

- [Documentación oficial de jQuery](https://jquery.com/)
- [Guía de migración a jQuery 4](https://jquery.com/upgrade-guide/4.0/)`;

async function main() {
  console.log("Actualizando post de jQuery 4...");

  const post = await db.post.update({
    where: { slug: "jquery-4-lo-que-necesitas-saber" },
    data: { body: updatedBody },
  });

  console.log("✅ Post actualizado!");
  console.log(`   URL: /blog/${post.slug}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
