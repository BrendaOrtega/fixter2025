import { db } from "../app/.server/db";

const postContent = `Es momento de empezar con la práctica y elegir nuestra herramienta de diseño. ¿Qué herramientas de diseño existen? ¿Qué ventajas tiene cada una? ¿Cuál es la mejor opción? Bueno, vamos a platicar de las herramientas que hay en el mercado actualmente y lo que ofrece cada una.

## Sketch

Sketch fue el rey hace un par de años, es una aplicación de escritorio (solo para Mac) pero que también puedes usar vía web. Te permite diseñar interfaces, con un set de funcionalidades para crear vectores y componentes.

![https://i.imgur.com/g7y3SGP.gif](https://i.imgur.com/g7y3SGP.gif)

**Ventajas**

- Permite el trabajo colaborativo (varios usuarios modificando el mismo archivo al mismo tiempo)
- Incluye funcionalidades para creación de prototipos
- Permite el control de versiones
- Permite la creación de librerías de componentes
- Ofrece la visualización los estilos de los elementos en CSS
- Permite la configuración de variables y exportación de tokens
- Cuenta con plugins y extensiones
- Cuenta con una app para Iphone o ipad en la que puedes visualizar todos tus espacios de trabajo en tiempo real y probar tus prototipos

**Desventajas**

- Solo tiene un período gratuito de 30 días
- Cuesta $2,400.00 MXN al año (120 USD) o 10 USD mensuales
- Las apps (escritorio y mobile) solo funcionan en Mac/iphone/ipad

## Adobe XD

Es la aplicación de Adobe Suit para interfaces, que al igual que las otras te permite diseñar interfaces web y mobile.

![https://i.imgur.com/2FKFOcy.gif](https://i.imgur.com/2FKFOcy.gif)

**Ventajas**

- Compatibilidad con otras herramientas de Adobe
- Esta disponible para Mac y Windows
- Permite crear prototipos (hasta prototipos de voz)
- Facilita la creación de componentes avanzados y responsivos
- Permite transformaciones 3d
- Permite el control de versiones

**Desventajas**

- Período gratuito de 30 días
- No tiene versión web
- El uso versiones no actualizadas de sistema operativo puede impedir la instalación del programa
- Adobe XD se encuentra en modo mantenimiento, **solo ofrece soporte a los clientes actuales** y ya no invierte en el desarrollo de nuevas funcionalidades, por lo que es posible que sea dado de baja próximamente.

## Lunacy

Es un software de gráficos vectoriales para UI y diseño web.

![https://i.imgur.com/9bp58tM.gif](https://i.imgur.com/9bp58tM.gif)

**Ventajas**

- Tiene un plan gratuito y plan PRO de pago
- La aplicación funciona en Windows, Mac y Linux
- Es colaborativo hasta con 100 usuarios
- Tiene gráficos integrados (iconos, fotos e ilustraciones)
- Puedes trabajar de forma local y en la nube
- Es compatible con otras herramientas de diseño como Sketch o Figma
- Esta disponible en varios idiomas

**Desventajas**

- No cuenta con funcionalidades de prototipado
- No permite visualizar los estilos CSS
- No cuenta con versión web
- La herramientas de IA e historial de versiones solo esta disponible en el plan PRO

## Balsamiq

Es otro software que te permite crear wireframes de baja fidelidad y prototipos de forma rápida.

![https://i.imgur.com/3xYMe3T.gif](https://i.imgur.com/3xYMe3T.gif)

**Ventajas**

- Puedes usarlo en la web, su versión de escritorio o también la versión integrada con Google Drive
- Es colaborativo
- Te permite crear wireframes de baja fidelidad de forma rápida ya que cuenta con un ui kit muy completo
- Incluye funcionalidades para creación de prototipos

**Desventajas**

- Período gratuito de 30 días
- La suscripción web cuesta desde $12 USD mensuales con 2 proyectos, precio que aumenta progresivamente en función de cuántos proyectos quieres incluir al plan, mientras que la de escritorio $149 USD por usuario con acceso permanente.
- Funcionalidades limitadas en lo que se refiere a componentes avanzados, animados o responsivos

## Figma

Figma es un software de edición de gráficos vectorial y generación de prototipos, que también cuenta con FigJam, una herramienta para crear flujos de trabajo en equipo de forma remota a través de una pizarra virtual.

![https://i.imgur.com/r9I91WA.gif](https://i.imgur.com/r9I91WA.gif)

**Ventajas**

- Tiene un plan gratuito
- Es colaborativo
- Cuenta con llamadas de voz dentro del proyecto
- La aplicación de escritorio funciona en Mac y Windows
- Permite crear, utilizar y compartir Sistemas de Diseño
- Incluye control de versiones, creación de branches, etc
- Cuenta con funcionalidades para prototipado inteligente
- Tienes acceso a Figma y FigJam
- Cuenta con una enorme lista de plugins para agilizar el diseño de interfaces
- Permite la creación de componentes avanzados, responsivos y animados

**Desventajas**

- El plan gratuito tiene algunas funcionalidades limitadas como:3 proyectos colaborativos, permisos de edición limitados para colaboradores, y lo peor, el devmode no está incluido.
- El plan profesional cuesta $15 USD por usuario al mes
- La aplicación solo tiene funcionalidad como mirror, no para consultar los proyectos como en el caso de Sketch

Al final, la mejor herramienta que puedes usar es la mejor se adapte a tus necesidades, algunas de ellas cuentan con una versión gratuita así que puedes empezar a probarlas (sin pagar membresías) y quedarte con la que más te guste.`;

async function main() {
  const slug = "5-herramientas-para-Diseno-de-Interfaces-en-2025";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("Post ya existe, actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "5 herramientas para Diseño de Interfaces en 2025",
        body: postContent.trim(),
        published: true,
        authorName: "BrendaGo",
        authorAt: "@brendago",
        photoUrl: "https://i.imgur.com/TFQxcIu.jpg",
        authorAtLink: "https://www.linkedin.com/in/brendago",
        coverImage: "https://i.imgur.com/Df6SNDjl.png",
        metaImage: "https://i.imgur.com/Df6SNDjl.png",
        tags: ["Diseño", "Figma"],
        mainTag: "UI",
      },
    });
    console.log("Post actualizado:", post.id);
  } else {
    console.log("Creando nuevo post...");
    const post = await db.post.create({
      data: {
        slug,
        title: "5 herramientas para Diseño de Interfaces en 2025",
        body: postContent.trim(),
        published: true,
        authorName: "BrendaGo",
        authorAt: "@brendago",
        photoUrl: "https://i.imgur.com/TFQxcIu.jpg",
        authorAtLink: "https://www.linkedin.com/in/brendago",
        coverImage: "https://i.imgur.com/Df6SNDjl.png",
        metaImage: "https://i.imgur.com/Df6SNDjl.png",
        tags: ["Diseño", "Figma"],
        mainTag: "UI",
      },
    });
    console.log("Post creado:", post.id);
  }

  await db.$disconnect();
}

main().catch(console.error);
