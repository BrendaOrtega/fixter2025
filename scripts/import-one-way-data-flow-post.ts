import { db } from "../app/.server/db";

const oneWayDataFlowContent = `
# ¿Qué es One-Way data flow en React?

Nop, no tiene que ver con el **flow** **bellacoso** que te hace "perrar" hasta el piso. 👯‍♀️🪩 No. 👨🏼‍🎤

![bellacoso](https://i.ytimg.com/vi/oNv6_RXS0dc/maxresdefault.jpg)

Es más una forma de diseñar jerarquías de nodos o árboles de componentes en **React** y sobre la comunicación entre ellos, se trata más de **limitar el flujo y la mutación de los datos** que vienen del servidor en un solo nivel, el del padre. 👨🏻

> ¿Se es inclusivo si se dijese: "El estado debe vivir en el componente madre" 🤔

Hace un par de años, yo no terminaba de entender este concepto, era tan obvio que no me hacía sentido, no lograba entender por qué era importante. Claro, le pasamos \`props\` a los componentes hijos, ahí está, eso es el *one-way data flow* ¿no?

Pero ahora, después de mucho código de principiante y de escribir muchísimos componentes que nomás no hayan por donde comunicarse con su padre (como tu amiga, que se quedó esperando que su papá volviera de comprar cigarros 🚬).

Hoy en día mis componentes favoritos son los componentes "*dumb*" o "*presentacionales*" **que no tienen por qué estar al pendiente de nada**, solo de mostrar sus \`props\` (datos) más frescos.
**Deben ser como televisiones** que reciben los datos de la señal, los interpretan y los muestran, nunca los modifican. 📺 👀 Fíjate, las TV también tienen un estado interno y local (el canal actual y la cantidad de canales) y eso no lo ponen en un estado global en Redux **¿verdad juanito? 😫**

En esta entrada, me dispongo a explicarte por qué pienso que el **OWDF** (*One-way data flow*) se trata más de una forma de pensar y un patrón de diseño, que solo pasar \`props\`.

Justo por eso hoy en día la documentación de **React** toca este tema con el titulo: "[pensando en React](https://react.dev/learn/thinking-in-react)". 🧠

Vamos a ver si te puedo ayudar a visualizar mejor. 🤓 🖼️

## Pensando en React

Imaginemos un árbol de componentes de solo 2 niveles. Un padre \`<Container>\` y tres pequeños y saludables hijitos: \`<Title>\`, \`<Avatar>\` y \`<Subscribe>\`. \`<Container>\` y su familia son muy felices aunque él es un padre estricto. \`<Container>\` sabe muy bien cómo utilizar \`fetch\` para adquirir datos desde el servidor, es un componente muy bien conectado y no le representa esfuerzo conseguir recursos para su familia, así ninguno de sus hijos tiene que trabajar para conseguir los recursos que necesitan. \`<Avatar />\` es creativa y le encantan las imágenes, pero aún es muy pequeña. Mientras que \`<Title>\` es el mayor de todos, siempre preocupado por quedar bien. \`<Subscribe>\` es el más inquieto de los tres, es muy extrovertido y le gusta conocer personas nuevas, pero regularmente se mete en problemas. Todos ellos conforman este ejemplo.

![árbol de componentes](https://i.morioh.com/201022/2f6459ee.webp)

El último problema en el que \`<Subscribe>\` se metió, es que descubrió sus props. Ya le brotó pelo en todo el cuerpo y también descubrió un \`<input>\` que es parte de su \`JSX\`. Lo anduvo explorando a pesar de que su papá le dijo que jamás se tocará ahí. Pero buscándole, \`<Subscribe>\` encontró algunos \`props\` que puede utilizar: \`value\` y \`onChange\`, pero no sabe cómo usarlos, así que se puso a buscar por internet.

\`<Subscribe>\` buscó bastante, y encontró mucho ruido sobre estados globales: **Redux**, **Xstate**, **Zustand**, **Jotai** y también encontró mucha paja sobre **Context**. Pero toda esa *info* le parece abrumadora y prefiere simplemente implementar un estado local y jugar con el \`onChange\`, así que decide preguntarle a su amigo alcohólico: \`useState()\`. Este amigo, es muy amable, pues le proporciona lo que necesita para actualizarse: un valor con el estado actual y una función \`setter\` para poder actualizarlo.

## Intentos chafas

\`<Subscribe>\` emocionado, se pone a teclear y termina con algo como esto:

\`\`\`jsx
export default function Subscribe() {
  const [email, setEmail] = useState('');

  const handleChange = (event) => {
    setEmail(event.target.value);
  };

  return (
    <form>
      <input
        type="email"
        value={email}
        onChange={handleChange}
        placeholder="tu@email.com"
      />
      <button type="submit">Suscribirse</button>
    </form>
  );
}
\`\`\`

Y funciona, ¡claro que sí! El input se actualiza cada que escribe en él. Pero hay un problema: **\`<Container>\` no tiene idea de qué está pasando con ese email**. Y lo necesita, porque él es quien tiene el poder de hacer \`fetch\` al servidor.

\`<Subscribe>\` piensa: "¿Y si le paso el email a mi papá?" Pero, ¿cómo? Los datos fluyen hacia abajo (de padre a hijo), no hacia arriba. 🤔

Entonces \`<Subscribe>\` tiene una idea "brillante": **Redux**. "Voy a poner el email en un estado global y mi papá lo podrá leer desde ahí".

**¡NO! ¡ALTO AHÍ!** 🛑

Esto es exactamente lo que **NO** debemos hacer. No necesitamos un estado global para comunicar un padre con su hijo directo. Es como usar un megáfono para hablarle a alguien que está a tu lado.

## La solución: One-way data flow

La solución es simple: **el estado debe vivir en el padre**.

\`<Container>\` es quien debe tener el estado del email, y pasárselo a \`<Subscribe>\` como prop, junto con la función para actualizarlo:

\`\`\`jsx
// Container.jsx - El padre
export default function Container() {
  const [email, setEmail] = useState('');
  const [user, setUser] = useState(null);

  const handleSubscribe = async () => {
    const response = await fetch('/api/subscribe', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    setUser(data);
  };

  return (
    <div>
      <Title name={user?.name} />
      <Avatar src={user?.avatar} />
      <Subscribe
        email={email}
        onChange={setEmail}
        onSubmit={handleSubscribe}
      />
    </div>
  );
}
\`\`\`

\`\`\`jsx
// Subscribe.jsx - El hijo (ahora "tonto" y feliz)
export default function Subscribe({ email, onChange, onSubmit }) {
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit();
    }}>
      <input
        type="email"
        value={email}
        onChange={(e) => onChange(e.target.value)}
        placeholder="tu@email.com"
      />
      <button type="submit">Suscribirse</button>
    </form>
  );
}
\`\`\`

¿Ves la diferencia? Ahora:

- **El estado vive en \`<Container>\`** (el padre)
- **Los datos fluyen hacia abajo** mediante props
- **Los eventos fluyen hacia arriba** mediante callbacks (\`onChange\`, \`onSubmit\`)
- **\`<Subscribe>\` es un componente "tonto"** que solo muestra lo que le dan y avisa cuando algo pasa

Este es el **flujo de datos unidireccional**. Los datos siempre van en una dirección: de padre a hijo. Y los hijos comunican cambios hacia arriba mediante funciones callback.

## ¿Y si necesito acceder al DOM?

A veces necesitas acceder directamente al input, por ejemplo para hacer \`focus()\`. Para esto usamos \`ref\` con \`forwardRef\`:

\`\`\`jsx
// Subscribe.jsx con forwardRef
import { forwardRef } from 'react';

const Subscribe = forwardRef(function Subscribe({ email, onChange, onSubmit }, ref) {
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit();
    }}>
      <input
        ref={ref}
        type="email"
        value={email}
        onChange={(e) => onChange(e.target.value)}
        placeholder="tu@email.com"
      />
      <button type="submit">Suscribirse</button>
    </form>
  );
});

export default Subscribe;
\`\`\`

\`\`\`jsx
// Container.jsx usando la ref
export default function Container() {
  const [email, setEmail] = useState('');
  const inputRef = useRef(null);

  const handleFocus = () => {
    inputRef.current?.focus();
  };

  return (
    <div>
      <button onClick={handleFocus}>Enfocar input</button>
      <Subscribe
        ref={inputRef}
        email={email}
        onChange={setEmail}
        onSubmit={() => console.log('Enviando:', email)}
      />
    </div>
  );
}
\`\`\`

## Ejemplo más complejo: Composición

Imaginemos que ahora \`<Subscribe>\` tiene un hermano: \`<UserInfo>\` que muestra el email actual. ¿Cómo compartimos el estado entre hermanos?

**Respuesta**: Lo "elevamos" al padre común.

\`\`\`jsx
// Container.jsx
export default function Container() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = async () => {
    await fetch('/api/subscribe', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    setIsSubscribed(true);
  };

  return (
    <div>
      <UserInfo email={email} isSubscribed={isSubscribed} />
      <Subscribe
        email={email}
        onChange={setEmail}
        onSubmit={handleSubscribe}
        disabled={isSubscribed}
      />
    </div>
  );
}
\`\`\`

\`\`\`jsx
// UserInfo.jsx - Otro componente "tonto"
export default function UserInfo({ email, isSubscribed }) {
  if (!email) return null;

  return (
    <div>
      <p>Email: {email}</p>
      {isSubscribed && <span>✅ Suscrito</span>}
    </div>
  );
}
\`\`\`

Ambos hermanos (\`<Subscribe>\` y \`<UserInfo>\`) reciben lo que necesitan del padre. **Ninguno tiene que preguntarle al otro**. El padre es la **fuente de la verdad**.

## Resumen

El **flujo de datos unidireccional** es un patrón de diseño donde:

1. **El estado vive en el componente más alto que lo necesite**
2. **Los datos fluyen hacia abajo** (de padre a hijo) mediante \`props\`
3. **Los eventos fluyen hacia arriba** mediante funciones callback
4. **Los hijos son "tontos"**: solo muestran props y disparan eventos

Este patrón hace que tu código sea:

- **Predecible**: Siempre sabes de dónde vienen los datos
- **Debuggeable**: Es fácil rastrear cambios de estado
- **Mantenible**: Los componentes son independientes y reutilizables

No necesitas Redux, Zustand, ni Context para comunicar padres con hijos directos. Usa esas herramientas cuando realmente las necesites (estado compartido entre componentes muy lejanos en el árbol).

---

🎬 **¿Quieres ver más sobre patrones de React?** Tenemos tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

Abrazo. Bliss. 🤓
`;

async function main() {
  console.log("Importando post de One-Way Data Flow...");

  const slug = "flujo-de-datos-unidireccional-one-way-data-flow-2024";
  const title = "Flujo de datos unidireccional (one-way data flow)";

  // Verificar si ya existe
  const existingBySlug = await db.post.findUnique({
    where: { slug },
  });

  const existingByTitle = await db.post.findUnique({
    where: { title },
  });

  const existing = existingBySlug || existingByTitle;

  if (existing) {
    console.log("⚠️  El post ya existe (ID: " + existing.id + "). Actualizando...");
    const post = await db.post.update({
      where: { id: existing.id },
      data: {
        slug,
        title,
        body: oneWayDataFlowContent.trim(),
        published: true,
        coverImage: "https://i.imgur.com/RO9PAmw.png",
        metaImage: "https://i.imgur.com/RO9PAmw.png",
        youtubeLink: "",
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        tags: ["hooks", "functions", "data", "principios", "fundamentos"],
        mainTag: "React",
      },
    });
    console.log("✅ Post actualizado exitosamente!");
    console.log(`   ID: ${post.id}`);
    console.log(`   Slug: ${post.slug}`);
    console.log(`   URL: /blog/${post.slug}`);
    return;
  }

  const post = await db.post.create({
    data: {
      slug,
      title,
      body: oneWayDataFlowContent.trim(),
      published: true,

      // Imágenes
      coverImage: "https://i.imgur.com/RO9PAmw.png",
      metaImage: "https://i.imgur.com/RO9PAmw.png",

      // YouTube (vacío)
      youtubeLink: "",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",

      // Clasificación
      tags: ["hooks", "functions", "data", "principios", "fundamentos"],
      mainTag: "React",

      // Fechas originales
      createdAt: new Date(1677775444090), // 2 marzo 2023
      updatedAt: new Date(1705785634531), // 20 enero 2024
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   URL: /blog/${post.slug}`);
}

main()
  .catch((e) => {
    console.error("❌ Error creando post:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
