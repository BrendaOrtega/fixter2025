import { db } from "../app/.server/db";

const postContent = `Hay muchos conceptos que cuando aprendemos diseño se nos pasan por alto o simplemente no conocemos, y uno de estos temas son las leyes de UX. Aquí les dejo 10 leyes que les ayudarán a mejorar la experiencia de usuario en sus productos digitales.

## 1. Ley de Jakob

> Los usuarios prefieren que un sitio funcione igual que todos los demás sitios que ellos ya conocen.

Considera los modelos mentales preexistentes de los usuarios; puedes simplificar el proceso de aprendizaje de tu sitio o aplicación haciendo que tu interfaz funcione de manera familiar.

## 2. Ley de Fitts

> El tiempo requerido para alcanzar un objetivo con un movimiento rápido es una función de la distancia hacia el objetivo y el tamaño del objetivo.

Los botones deben ser lo suficientemente grandes para que los usuarios puedan distinguirlos y seleccionarlos con precisión. También puedes configurar los paddings, márgenes y touch targets para que sean más accesibles.

![Touch accurate](https://i.imgur.com/e9RLdJ8.png)

## 3. Ley de Hicks

> El tiempo que lleva tomar una decisión aumenta con el número y la complejidad de las opciones.

Limita el número de opciones en pantalla, ofrece recomendaciones, usa la segmentación de información y contenidos, trata de no simplificar la interfaz al punto de abstraerla.

![Prices card](https://i.imgur.com/SWfEgJN.png)

## 4. Ley de Miller

> La persona promedio solo puede mantener hasta 7 (más o menos 2) elementos en su memoria de trabajo.

Agrupa el contenido, divide la información en fragmentos más pequeños que ayuden al usuario a procesar, comprender y memorizar fácilmente.

![Ley de Miller](https://i.imgur.com/ZXoCgO3.png)

## 5. Ley de Postel

> Sé conservador en lo que haces y liberal en lo que aceptas de los demás.

Se puede aplicar en formularios, donde al usuario le damos libertad del formato que quiera usar y nosotros usamos máscaras que nos permitan aceptar el mismo tipo de dato.

## 6. Regla Peak-End

> Las personas juzgan una experiencia en gran medida en función de cómo se sintieron en su punto máximo y al final, en lugar de la suma total o el promedio de cada momento de la experiencia.

Asegúrate de que tus puntos de dolor e interacción sean los mejores posibles para que tu usuario siempre tenga un buen recuerdo del uso de tu aplicación.

![Disney 404](https://i.imgur.com/pwlHAIH.png)

## 7. Efecto Estético-Usabilidad

> Los usuarios a menudo perciben el diseño estéticamente agradable como un diseño más útil.

Recuerda que tener un sitio más atractivo permite proyectar más confianza a los usuarios, cuidar mucho la UI definitivamente puede hacer diferencia.

![Beautiful website](https://i.imgur.com/y2jrO42.jpg)

## 8. Efecto Von Restorff

> Cuando hay varios objetos similares presentes, es más probable que se recuerde el que difiere del resto.

En el diseño de interfaces a esto también le podemos llamar jerarquía visual, podemos usarlo para resaltar los CTA u otros elementos importantes.

## 9. Ley de Tesler

> También conocida como la Ley de la Conservación de la Complejidad, establece que para cualquier sistema existe una cierta cantidad de complejidad que no se puede reducir.

Como diseñadores en ocasiones se puede abstraer demasiado los componentes haciendo que los usuarios tengan una mala experiencia.

## 10. Umbral de Doherty

> La productividad aumenta cuando una computadora y sus usuarios interactúan a un ritmo (<400ms) que garantiza que ninguno tiene que esperar por el otro.

Asegúrate de que el rendimiento de tu página o aplicación sea bueno, esto impactará directamente en la experiencia de usuario. Algunas alternativas que te pueden ayudar: usar animaciones, loaders, spinners, etc.

Listo, estas fueron las 10 leyes y el resumen de cada una, si quieres profundizar puedes revisar la página oficial: [Laws of UX](https://lawsofux.com/)

🤓`;

async function main() {
  const slug = "10-leyes-para-una-mejor-experiencia-de-usuario-2023";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  // Fechas originales del post
  const createdAt = new Date(1684109095188); // 15 mayo 2023
  const updatedAt = new Date(1685119366523); // 26 mayo 2023

  if (existing) {
    console.log("Post ya existe, actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "10 Leyes para una mejor experiencia de usuario",
        body: postContent.trim(),
        published: true,
        authorName: "Brenda Go",
        authorAt: "@brenda-ort",
        photoUrl: "https://i.imgur.com/TFQxcIu.jpg",
        authorAtLink: "https://www.linkedin.com/in/brendago/",
        coverImage: "https://i.imgur.com/9oB1qKe.png",
        metaImage: "https://i.imgur.com/9oB1qKe.png",
        tags: [],
        mainTag: "Diseño",
        updatedAt,
      },
    });
    console.log("Post actualizado:", post.id);
  } else {
    console.log("Creando nuevo post...");
    const post = await db.post.create({
      data: {
        slug,
        title: "10 Leyes para una mejor experiencia de usuario",
        body: postContent.trim(),
        published: true,
        authorName: "Brenda Go",
        authorAt: "@brenda-ort",
        photoUrl: "https://i.imgur.com/TFQxcIu.jpg",
        authorAtLink: "https://www.linkedin.com/in/brendago/",
        coverImage: "https://i.imgur.com/9oB1qKe.png",
        metaImage: "https://i.imgur.com/9oB1qKe.png",
        tags: [],
        mainTag: "Diseño",
        createdAt,
        updatedAt,
      },
    });
    console.log("Post creado:", post.id);
  }

  await db.$disconnect();
}

main().catch(console.error);
