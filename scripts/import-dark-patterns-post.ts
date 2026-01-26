import { db } from "../app/.server/db";

const postContent = `![Dark Patterns intro](https://i.imgur.com/pEtww6x.png)

¿Alguna vez has querido cancelar la suscripción de Apple TV o algún otro servicio de streaming? ¿Lo has logrado?

Eso es lo que llamamos un **Dark pattern** o patrón oscuro, y es el tema de hoy.

## ¿Qué es un Dark Pattern?

El término fue acuñado en 2010 por Harry Brignull, experto en UX, para dar nombre a un fenómeno que se estaba volviendo muy popular: diseñar para que el usuario haga algo que beneficia a la empresa, aunque no al usuario.

![Dark Patterns ejemplo](https://i.imgur.com/V08Lh3n.png)

## Tipos de Dark Patterns

Existen muchos tipos de dark patterns, aquí te dejo los más comunes:

### 1. Comparison prevention (Prevención de comparación)

Cuando una empresa hace difícil comparar precios o características con sus competidores. Por ejemplo, paquetes con nombres confusos que no puedes comparar fácilmente.

### 2. Confirmshaming

Hacer que la opción de "no gracias" te haga sentir culpable. Por ejemplo: "No, prefiero seguir pagando de más" en lugar de simplemente "No, gracias".

### 3. Disguised ads (Anuncios disfrazados)

Anuncios que parecen contenido o botones de navegación para que hagas clic sin darte cuenta.

### 4. Fake scarcity (Escasez falsa)

"¡Solo quedan 2 habitaciones!" cuando en realidad hay muchas más disponibles.

### 5. Fake social proof (Prueba social falsa)

Reseñas falsas o números inflados de usuarios/compradores.

### 6. Fake urgency (Urgencia falsa)

Contadores regresivos que se reinician, ofertas "por tiempo limitado" que nunca terminan.

### 7. Hard to cancel (Difícil de cancelar)

El clásico: te registras con un clic, pero para cancelar necesitas llamar, esperar, hablar con 3 personas y firmar un documento con sangre. 😡

### 8. Hidden costs (Costos ocultos)

Precios que suben misteriosamente al momento del checkout con "cargos por servicio", "impuestos" que no estaban claros, etc.

### 9. Hidden subscription (Suscripción oculta)

Pruebas gratuitas que automáticamente te cobran sin avisarte claramente.

### 10. Nagging

Pedirte una y otra y otra vez que hagas algo. "¿Quieres activar notificaciones?" NO. "¿Seguro?" SÍ. "¿De verdad?" 🤡

![Dark Patterns visual](https://i.imgur.com/tHgGrCH.png)

### 11. Obstruction (Obstrucción)

Poner obstáculos innecesarios para completar una acción que no le conviene a la empresa.

### 12. Preselección

Casillas pre-marcadas para suscribirte a newsletters, compartir datos, etc.

### 13. Trick wording (Palabras engañosas)

Usar dobles negaciones o lenguaje confuso para que aceptes cosas que no querías.

### 14. Visual interface (Interfaz visual engañosa)

Hacer que el botón de "Aceptar" sea grande y colorido, mientras que "Rechazar" es gris y pequeño.

![Dark Patterns](https://i.imgur.com/f4Rd9du.png)

## Mis experiencias (molestas) personales

Algunos ejemplos que me han molestado mucho:

- 📧 **Newsletters infinitas**: Te suscribes a una y te llegan de 5 marcas hermanas que nunca pediste
- ✈️ **Despegar.com**: Sus "ofertas" con seguros pre-seleccionados y precios que suben si regresas a buscar
- 📺 **Totalplay/Izzi/etc**: Contratar es fácil, cancelar es una odisea épica
- 💸 **Apps de "prueba gratis"**: 3 días gratis que se convierten en $499/mes si no cancelas a tiempo

## ¿Es legal?

En México, la regulación es prácticamente nula. 🤭

En Estados Unidos y Europa hay cada vez más legislación contra estas prácticas. La FTC (Federal Trade Commission) y el GDPR europeo han empezado a poner multas millonarias a empresas que usan dark patterns.

## Conclusión

Como diseñadores, tenemos una responsabilidad ética. Podemos usar nuestro conocimiento de psicología y comportamiento humano para ayudar a los usuarios... o para manipularlos.

La próxima vez que diseñes un flujo de cancelación o un formulario de suscripción, pregúntate: **¿Estoy ayudando al usuario o estoy usando dark patterns?**

## Recursos

- [Deceptive Patterns](https://www.deceptive.design/) - El sitio de Harry Brignull con ejemplos y hall of shame
- [NN Group sobre Dark Patterns](https://www.nngroup.com/articles/dark-patterns/) - Análisis profundo del tema`;

async function main() {
  const slug = "Dark-Patterns_ZiZ";

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log(`Post ya existe con slug: ${slug}`);
    console.log(`ID: ${existing.id}`);
    console.log(`Título: ${existing.title}`);
    await db.$disconnect();
    return;
  }

  // Crear el post con la fecha original (27 Mayo 2025)
  const post = await db.post.create({
    data: {
      slug,
      title: "Dark Patterns: ¿Qué son, cuáles son y cómo evitarlos?",
      body: postContent.trim(),
      published: true,

      // Imágenes
      coverImage: "https://i.imgur.com/GwCR5cQ.png",
      metaImage: "https://i.imgur.com/GwCR5cQ.png",

      // Autor (BrendaGo, no Héctorbliss)
      authorName: "BrendaGo",
      authorAt: "@brendago",
      photoUrl: "https://i.imgur.com/TFQxcIu.jpg",
      authorAtLink: "https://www.linkedin.com/in/brendago",

      // Clasificación
      mainTag: "UI",
      tags: ["UX", "Diseño"],
      category: ["design"],

      // Fecha original del post (27 Mayo 2025)
      createdAt: new Date(1748377599738),
      updatedAt: new Date(),

      isFeatured: false,
    },
  });

  console.log("Post creado exitosamente:");
  console.log(`  ID: ${post.id}`);
  console.log(`  Slug: ${post.slug}`);
  console.log(`  Título: ${post.title}`);
  console.log(`  Autor: ${post.authorName}`);
  console.log(`  URL: /blog/${post.slug}`);
  console.log(`  Fecha original: ${post.createdAt}`);
  console.log(`  Cover: ${post.coverImage}`);

  await db.$disconnect();
}

main().catch(console.error);
