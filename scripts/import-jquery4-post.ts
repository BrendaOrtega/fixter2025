import { db } from "../app/.server/db";

const postContent = `### TLDR: Después de casi 10 años sin una major release, jQuery 4.0.0 finalmente llegó el 17 de enero de 2026, trayendo modernizaciones importantes, eliminación de código legacy y mejor rendimiento.

El 14 de enero de 2006, John Resig presentó jQuery en BarCamp NYC. Veinte años después, jQuery sigue siendo una de las bibliotecas más utilizadas en la web. Con más del 77% de los sitios web usándola según W3Techs, jQuery demuestra que su legado continúa.

jQuery 4.0 representa un paso importante hacia la modernización, eliminando soporte para navegadores obsoletos y adoptando características modernas de JavaScript.

## Cambios en Soporte de Navegadores

El cambio más significativo es la eliminación de soporte para navegadores antiguos:

- **Internet Explorer 10 y anteriores**: Finalmente eliminados
- **Edge Legacy** (versión no-Chromium): Ya no soportado
- **iOS < 11**: Eliminado
- **Firefox < 65**: Eliminado
- **Android Browser nativo**: Ya no soportado

> **Nota importante**: IE 11 todavía está soportado en jQuery 4.0, pero será eliminado en jQuery 5.0

Esto permite que el código sea más limpio y eficiente, sin necesidad de workarounds para navegadores antiguos.

## Breaking Changes Importantes

### Orden de eventos focus/blur

Uno de los cambios más técnicos es el orden de los eventos \`focus\` y \`blur\`. Anteriormente, jQuery tenía un comportamiento particular para estos eventos. Ahora sigue estrictamente la especificación W3C:

\`\`\`javascript
// El orden ahora es consistente con la especificación:
// 1. focusout en el elemento que pierde focus
// 2. focusin en el elemento que gana focus
// 3. blur en el elemento que pierde focus
// 4. focus en el elemento que gana focus
\`\`\`

### APIs deprecadas eliminadas

Varias APIs que habían sido marcadas como deprecadas finalmente fueron removidas:

- \`jQuery.cssNumber\`
- \`jQuery.cssProps\`
- \`jQuery.isArray()\` (usar \`Array.isArray()\`)
- \`jQuery.parseJSON()\` (usar \`JSON.parse()\`)
- \`jQuery.isNumeric()\`
- \`jQuery.isFunction()\` (usar \`typeof fn === 'function'\`)
- \`jQuery.isWindow()\`
- \`jQuery.camelCase()\`
- \`jQuery.type()\`
- \`jQuery.now()\` (usar \`Date.now()\`)
- \`jQuery.proxy()\` (usar \`Function.prototype.bind()\`)

### Parámetros internos removidos

Algunos parámetros que eran de uso interno fueron eliminados:

\`\`\`javascript
// Antes (con parámetros internos)
$element.trigger("click", [param1, param2]);

// Ahora (solo datos de evento estándar)
$element.trigger("click");
\`\`\`

---

🎬 **¿Te está sirviendo este contenido?** Tenemos más tutoriales y explicaciones en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Mejoras de Performance

### Minificador en Rust

jQuery 4.0 utiliza un nuevo minificador escrito en Rust, que produce archivos más pequeños y se ejecuta más rápido durante el build.

### Build Slim más pequeño

La versión "slim" (sin AJAX ni effects) ahora pesa aproximadamente **19.5kb gzipped**, haciéndola más atractiva para proyectos que no necesitan todas las funcionalidades.

\`\`\`bash
# Comparación de tamaños (gzipped)
jQuery 3.7.1 slim: ~24kb
jQuery 4.0.0 slim: ~19.5kb
\`\`\`

## JavaScript Moderno

### ES Modules Nativos

jQuery 4.0 ahora soporta ES Modules de forma nativa:

\`\`\`javascript
// Importar jQuery como ES Module
import $ from "jquery";

// O importar solo lo que necesitas
import { ajax } from "jquery";
\`\`\`

### Promises en lugar de Deferreds

La versión slim ahora usa Promises nativas en lugar de los Deferreds de jQuery:

\`\`\`javascript
// Las animaciones retornan Promises nativas
$element.fadeIn(400).promise()
  .then(() => console.log("Animación completada"));
\`\`\`

### Arrow Functions y Sintaxis Moderna

El código interno de jQuery ahora usa arrow functions, template literals y otras características modernas de ES6+.

### FormData en $.ajax

Ahora puedes pasar \`FormData\` directamente a \`$.ajax()\`:

\`\`\`javascript
const formData = new FormData(document.querySelector("#miForm"));

$.ajax({
  url: "/api/upload",
  method: "POST",
  data: formData,
  processData: false,
  contentType: false
});
\`\`\`

## Cómo Actualizar

### Migración directa

Una gran noticia: **puedes actualizar directamente desde jQuery 1.9+ a 4.x** sin necesidad de pasar por la versión 3.x.

\`\`\`bash
# Con npm
npm install jquery@4.0.0

# Con yarn
yarn add jquery@4.0.0
\`\`\`

### jQuery Migrate

Para facilitar la transición, existe \`jquery-migrate\` que te ayuda a identificar código deprecado:

\`\`\`html
<script src="https://code.jquery.com/jquery-4.0.0.min.js"></script>
<script src="https://code.jquery.com/jquery-migrate-4.0.0.min.js"></script>
\`\`\`

Esto mostrará advertencias en la consola cuando uses APIs deprecadas o eliminadas.

## ¿Sigue siendo relevante jQuery?

Aunque frameworks como React, Vue y Svelte dominan el desarrollo moderno, jQuery sigue siendo extremadamente útil para:

- **Sites existentes**: Millones de sitios ya lo usan
- **WordPress**: Incluido por defecto
- **Prototipado rápido**: Menos setup que un framework completo
- **Manipulación del DOM simple**: Para scripts pequeños
- **Plugins existentes**: Enorme ecosistema

jQuery 4.0 demuestra que la biblioteca sigue evolucionando y adaptándose a los estándares modernos de la web.

## Recursos Oficiales

- [Anuncio oficial de jQuery 4.0.0](https://blog.jquery.com/2024/02/06/jquery-4-0-0-beta/)
- [Guía de migración](https://jquery.com/upgrade-guide/4.0/)
- [Repositorio en GitHub](https://github.com/jquery/jquery)

Abrazo. Blissmo. 🤓`;

async function main() {
  const slug = "jquery-4-novedades-2026";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  const postData = {
    title: "jQuery 4.0 ya está aquí: todo lo que necesitas saber",
    body: postContent.trim(),
    published: true,
    authorName: "Héctorbliss",
    authorAt: "@hectorbliss",
    photoUrl: "https://i.imgur.com/TaDTihr.png",
    authorAtLink: "https://www.hectorbliss.com",
    coverImage:
      "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=1200&h=630&fit=crop",
    metaImage:
      "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=1200&h=630&fit=crop",
    tags: ["jquery", "javascript", "webdev", "frontend"],
    mainTag: "javascript",
  };

  if (existing) {
    console.log("Post ya existe, actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: postData,
    });
    console.log("Post actualizado:", post.id);
  } else {
    console.log("Creando nuevo post...");
    const post = await db.post.create({
      data: {
        slug,
        ...postData,
      },
    });
    console.log("Post creado:", post.id);
  }

  await db.$disconnect();
}

main().catch(console.error);
