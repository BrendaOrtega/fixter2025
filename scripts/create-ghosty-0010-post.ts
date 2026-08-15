import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const body = `*9 de julio de 2026*

---

Ghosty Code llegó a la versión 0.0.10 y el titular cabe en una línea: puedes correr **GLM-5.2** sin salir de tu terminal. Pegas el token de tu Coding Plan de Z.AI y el modelo responde directo contra \`api.z.ai\`. Un comando y listo.

Pero el comando es la parte fácil. Lo que costó trabajo —y lo que a la larga importa más— fue lograr que GLM corra a su **máxima inteligencia**, no en modo tibio. Eso significó portar un provider entero desde nuestro upstream y perseguir bugs uno por uno hasta que el caché y el razonamiento quedaran a la altura de lo que ya teníamos con DeepSeek. Este post es ese detrás de cámaras.

![Programando en la terminal de madrugada](https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=1200)
*Foto en [Pexels](https://www.pexels.com)*

---

## Lo que puedes hacer hoy mismo

Si solo quieres empezar, son dos caminos.

Por línea de comandos:

\`\`\`bash
ghosty auth set --provider zai --api-key "tu-token-del-coding-plan"
\`\`\`

O al arrancar Ghosty: el wizard de inicio ahora tiene un paso dedicado a GLM. Pegas tu key ahí mismo y quedas en GLM-5.2 sin más configuración. Cero fricción, cero editar archivos a mano.

Y si prefieres no atarte a un solo proveedor, GLM también entra por **OpenRouter**. Tres variantes disponibles:

\`\`\`
z-ai/glm-5.2
z-ai/glm-5.1
z-ai/glm-5-turbo
\`\`\`

Ese es el uso. Ahora lo interesante.

---

## Portar un provider no es copiar y pegar

Ghosty Code parte de un upstream que ya tenía su forma de hablar con los modelos. Meter GLM directo desde Z.AI no fue agregar una URL nueva y cruzar los dedos: fue tocar cerca de **40 sitios** distintos del código donde el provider deja huella —autenticación, formato de mensajes, manejo de streaming, conteo de tokens, la forma en que se arma cada petición.

![Código en pantalla](https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=1200)
*Foto en [Pexels](https://www.pexels.com)*

El criterio durante todo el proceso fue la **paridad**: que GLM se sintiera tan bien integrado como DeepSeek, sin asteriscos ni "funciona pero...". Y ahí es donde aparece el detalle que separa una integración decente de una buena: el caché.

---

## El caché: por qué un turno arrastra al siguiente

Las APIs de estos modelos cachean el prefijo de la conversación. Si el arranque de tu petición es idéntico al de la anterior, el modelo no vuelve a procesarlo desde cero: reusa lo que ya calculó. Eso se llama **prefix-cache**, y es la diferencia entre respuestas rápidas y baratas contra respuestas lentas y caras.

El problema es que GLM devuelve su razonamiento en un campo aparte, \`reasoning_content\`. Si en el siguiente turno no reconstruyes ese contenido tal cual estaba, el prefijo deja de coincidir y el caché se rompe turno a turno. Pierdes justo la ventaja que hace rendir al modelo.

La solución fue preservar el \`reasoning_content\` a lo largo de la conversación mediante \`clear_thinking\`, de modo que el prefijo pegue igual que con DeepSeek. Con eso GLM-5.2 corre a su máxima capacidad, no a media máquina.

![Pantallas de trabajo con datos](https://images.pexels.com/photos/11035471/pexels-photo-11035471.jpeg?auto=compress&cs=tinysrgb&w=1200)
*Foto en [Pexels](https://www.pexels.com)*

---

## El pensamiento, en su lugar

Había un bug visible que arrastramos hasta cazarlo: el pensamiento del modelo se derramaba dentro de la respuesta. Veías el razonamiento mezclado con la contestación final, como si el modelo pensara en voz alta encima de lo que te quería decir.

Ya no. En 0.0.10 el razonamiento se muestra **como razonamiento** —separado, identificable— y la respuesta queda limpia. Y un detalle que se agradece cuando trabajas en español: si tu interfaz está en \`es-419\`, el modelo ahora **piensa en español**. Antes razonaba en inglés aunque le hablaras en español; ahora el pensamiento va en tu idioma.

---

## Los detalles pequeños que se sienten

Dos ajustes que no salen en el titular pero que notas al primer uso:

- **Razonamiento en español** cuando tu locale es \`es-419\`. Leer el pensamiento del modelo en el mismo idioma en el que programas cambia cómo lo revisas.
- **Notificaciones apagadas por default.** Se acabaron los pings de "Script Editor" sonando en cada turno. Si las quieres, las prendes tú; el silencio ya no es algo que tengas que ir a desactivar.

![Espacio de trabajo con código](https://images.pexels.com/photos/270557/pexels-photo-270557.jpeg?auto=compress&cs=tinysrgb&w=1200)
*Foto en [Pexels](https://www.pexels.com)*

---

## El punto de fondo: elige tu modelo

Detrás de todo esto hay una postura sobre cómo debe funcionar una herramienta de código con agentes: sin candados. Con Ghosty Code corres **DeepSeek**, corres **GLM-5.2** directo de Z.AI, o entras por **OpenRouter** y eliges de un catálogo abierto. El día que salga algo mejor, lo enchufas.

Esa flexibilidad es la que justifica el trabajo de portar un provider bien —caché, razonamiento, paridad completa— en lugar de dejarlo a medias. Un modelo mal integrado te ata a él por inercia; uno bien integrado te deja libre para cambiarlo.

Ghosty Code se instala con:

\`\`\`bash
npm install -g ghostycode
\`\`\`

El comando es \`ghosty\`, la configuración vive en \`~/.ghosty/config.toml\`, y el código está abierto en [github.com/blissito/ghostycode](https://github.com/blissito/ghostycode).

---

En el [canal de YouTube](https://www.youtube.com/@fixtergeek) mostramos cómo usamos estas herramientas en trabajo real —incluido Ghosty corriendo distintos modelos según la tarea. Si te late el detrás de cámaras, suscríbete.

Abrazo. Blissmo. 🤓
`;

async function main() {
  const post = await db.post.create({
    data: {
      title: "Ghosty Code 0.0.10: GLM-5.2 sin salir de tu terminal",
      slug: "ghosty-code-0010-glm-5-2",
      body,
      contentFormat: "markdown",
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",
      mainTag: "ai",
      tags: ["ai", "agentes", "tutorial"],
      metaImage:
        "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
      published: true,
    },
  });
  console.log(`Post created: /blog/${post.slug}`);
  console.log(`ID: ${post.id}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
