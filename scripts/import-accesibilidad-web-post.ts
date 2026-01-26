import { db } from "../app/.server/db";

const accesibilidadWebPostContent = `
La accesibilidad web se basa en hacer el diseño y desarrollo de las páginas web, accesibles para las personas, independientemente de si tienen alguna discapacidad o no.

La accesibilidad es un tema increíblemente importante y muchas veces subestimado, o quizá no hemos escuchado mucho sobre este tema. Pero lo cierto es que, debemos pensar en tener la web accesible para todos.

De acuerdo a las Pautas de Accesibilidad de Contenido Web [(WCAG)](https://www.w3.org/WAI/standards-guidelines/wcag/es) existen 4 principios con los que debe contar el contenido web:

1. **Perceptible:** Que la información presentada, sea presentada de manera que pueda percibir.
2. **Operable:** El usuario puede manejar la navegación.
3. **Comprensible:** La información y el manejo de la interfaz debe ser comprensible.
4. **Robusto:** Que el contenido sea lo suficientemente robusto para ser interpretado de forma fiable por una amplia variedad de agentes de usuario, incluidas las tecnologías de apoyo.

![Principios de accesibilidad web](https://firebasestorage.googleapis.com/v0/b/camp-92fe8.appspot.com/o/external%2Fprinciples.png?alt=media&token=7b3f63e1-fe94-4cc3-be2b-b0b2b4a45af9)

Aquí te dejo algunos tips para poder tener una página accesible:

## 1. Añade texto alternativo a las imágenes

El atributo alt se utiliza en el tag de imagen, sirve para que el navegador muestre un texto alternativo cuando la imagen no pueda mostrase, es un atributo obligatorio.

Este atributo permite que personas con discapacidad visual, que utilizan un lector de pantalla, puedan interpretar el contenido de las imágenes.

\`\`\`html
<img src="image.jpg" alt="Descripción de mi imagen" />
\`\`\`

## 2. Usa correctamente los encabezados

Gracias a los encabezados, podemos jerarquizar la información dentro de nuestras páginas y facilitar la navegación de personas con discapacidad visual.

Se recomienda usar solo un \`<h1>\` por página, esto nos ayuda a que los lectores de pantalla puedan conocer el tema central de la página.

También debemos tomar en cuenta que no deben existir saltos de encabezados, es decir, después de un \`<h1>\`, no puede ir un \`<h3>\`, el siguiente debe ser \`<h2>\`.

\`\`\`html
<h1>Título principal de la página</h1>
<h2>Subtítulo</h2>
<h3>Sección dentro del subtítulo</h3>
\`\`\`

## 3. El contenido debe de ser accesible por medio del teclado

Esto es muy importante para aquellas personas que no pueden usar el ratón y necesitan navegar por la página usando el teclado. Cuando se presiona la tecla TAB la página hace foco sobre el siguiente elemento o botón, al presionar ENTER puede seleccionar un elemento o activar un botón.

Para hacer esto, podemos utilizar el atributo \`tabindex\` y la pseudo clase \`:focus\`.

\`\`\`html
<button tabindex="1">Primer botón</button>
<button tabindex="2">Segundo botón</button>
\`\`\`

\`\`\`css
button:focus {
  outline: 2px solid blue;
  background-color: #e0e0e0;
}
\`\`\`

## 4. El contraste entre el texto y el fondo debe ser significativo

Según las pautas internacionales de accesibilidad, el contraste entre el color del texto y el fondo debe tener una relación de \`4.5:1\` para textos pequeños y \`3:1\` para textos grandes.

Existen herramientas para revisar el contraste, como:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Contrast Ratio](https://contrast-ratio.com/)

![Ejemplo de contraste](https://firebasestorage.googleapis.com/v0/b/camp-92fe8.appspot.com/o/external%2Fcontrast.png?alt=media&token=a1234567-1234-1234-1234-123456789abc)

## 5. Formularios que funcionan con lectores de pantalla

Para hacer los formularios accesibles, debemos conectar cada \`<label>\` con su \`<input>\` correspondiente usando el atributo \`for\` y el \`id\`.

\`\`\`html
<form>
  <label for="nombre">Nombre:</label>
  <input type="text" id="nombre" name="nombre" />

  <label for="email">Correo electrónico:</label>
  <input type="email" id="email" name="email" />

  <button type="submit">Enviar</button>
</form>
\`\`\`

Esto permite que cuando el lector de pantalla llegue al campo, lea la etiqueta asociada y el usuario sepa qué información debe ingresar.

---

## Conclusión

Según la [OMS](https://www.who.int/es/news-room/fact-sheets/detail/disability-and-health), más de mil millones de personas viven con algún tipo de discapacidad, esto representa el 15% de la población mundial.

La accesibilidad web no es solo una buena práctica, es una responsabilidad que tenemos como desarrolladores para crear una web más inclusiva para todos.

¿Tienes algún tip adicional sobre accesibilidad? ¡Compártelo en los comentarios!

## Enlaces relacionados

- [WCAG - Pautas de Accesibilidad](https://www.w3.org/WAI/standards-guidelines/wcag/es)
- [WebAIM - Recursos de Accesibilidad](https://webaim.org/)
- [MDN - Accesibilidad](https://developer.mozilla.org/es/docs/Web/Accessibility)
`;

async function main() {
  console.log("Verificando si el post ya existe...");

  const slug = "cansado_de_que_tu_web_no_pase_los_test_de_accesibilidad";

  // Verificar por slug específico
  const existingBySlug = await db.post.findUnique({
    where: { slug },
  });

  if (existingBySlug) {
    console.log(`⚠️  El post ya existe con slug '${slug}'`);
    console.log(`   ID: ${existingBySlug.id}`);
    console.log(`   URL: /blog/${existingBySlug.slug}`);
    return;
  }

  // Verificar por título
  const title = "¿Cansado de que tu web no pase los test de accesibilidad?";
  const existingByTitle = await db.post.findFirst({
    where: { title },
  });

  if (existingByTitle) {
    console.log("⚠️  Ya existe un post con el mismo título:");
    console.log(`   Slug existente: ${existingByTitle.slug}`);
    console.log(`   URL: /blog/${existingByTitle.slug}`);
    return;
  }

  console.log("Creando post de Accesibilidad Web...");

  const post = await db.post.create({
    data: {
      slug,
      title,
      body: accesibilidadWebPostContent.trim(),
      published: true,

      // Imágenes
      coverImage:
        "https://firebasestorage.googleapis.com/v0/b/camp-92fe8.appspot.com/o/external%2Fcover.png?alt=media&token=cecd8dba-f7f0-4904-983a-60953ffc271f",
      metaImage:
        "https://firebasestorage.googleapis.com/v0/b/fixter-67253.appspot.com/o/assets%2Fblog%2Fmeta_image_blog.png?alt=media&token=2c95d66d-4993-49fe-937a-19eb27e1d5a4",

      // YouTube (vacío)
      youtubeLink: "",

      // Autor: Brenda Ortega
      authorName: "Brenda Ortega",
      authorAt: "@brenda-ort",
      photoUrl: "https://i.imgur.com/TFQxcIu.jpg",
      authorAtLink: null,

      // Clasificación
      tags: ["accesibilidad", "html", "css", "ux"],
      mainTag: "Accesibilidad",

      // Fecha original: 24 Abril 2022
      createdAt: new Date(1650780000000),
    },
  });

  console.log("✅ Post creado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   URL: /blog/${post.slug}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
