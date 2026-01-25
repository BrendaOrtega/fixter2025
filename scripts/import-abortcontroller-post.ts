import { db } from "../app/.server/db";

const postContent = `Las tareas asíncronas son el pan de cada día para un programador web. 👩🏻‍💻

Tareas asíncronas, como cuando usamos *fetch* para comunicarnos con el servidor desde el navegador. 🧖🏻‍♂️

Estas tareas pueden costar mucho tiempo o recursos y es bueno siempre poder cancelarlas. Una manera moderna de cancelar una petición \`fetch\` por ejemplo, es con la **AbortController** **API**. 💥

Esta API se introdujo en el 2017 y desde entonces podemos usar una señal para cancelar todas las promesas necesarias. ☑️

En esta entrada, te voy mostrar cómo se usa esta API y de paso te muestro cómo crear tu propio hook para usar un fetch cancelable. 🤯

## 🧩 Entendiendo las piezas

Si estás familiarizada con *fetch*, puede que sepas que le podemos pasar una señal del tipo \`AbortSignal\`. Así, si se aborta desde el controlador, la petición *fetch* se cancelará también.

\`\`\`jsx
const controller = new AbortController();
const signal = controller.signal;

fetch('https://easybits.cloud/videos/my-funny-video/hls/playlist.m3u8',
	{ signal }) // podemos pasar una señal en las opciones de fetch
	  .then(response => response.json())
	  .then(data => console.log(data))
	  .catch(err => {
	    if (err.name === 'AbortError') {
	      console.log('Si se aborta el nombre del error será AbortError ');
	    } else {
	      console.error('Cualquier otro error:', err);
	    }
	  });

// La forma de abortar, es usando el método abort de controller.
setTimeout(() => controller.abort(), 2000);
\`\`\`

Como ves, basta con pasar la señal en la configuración del *fetch*. ¡Genial! 🧞‍♂️

---
🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## 🌎 Caso real de uso

Uno de los ejemplos más comunes que encontrarás online es el de cancelar un *request* previo en caso de que una nueva letra se añada al buscador, es decir, podemos cancelar conforme se usa el teclado. ⌨️

\`\`\`jsx
// ...
const controller = useRef<AbortController>(null);

// ...

function search(query:string) {
  if (controller.current) controller.abort();
  controller.current = new AbortController();

  fetch(\`/api/search?q=\${query}\`, { signal: controller.signal })
    .then(res => res.json())
    .then(showResults)
    .catch(err => {
      if (err.name !== 'AbortError') console.error(err);
    });
}
\`\`\`

Así, podemos abortar desde cualquier parte de nuestro programa o componente UI. Mira…

## ⏏️ Otros ejemplos

Por ejemplo, si has estado creando tareas asíncronas dentro de un componente de React, podrías cancelar todos de un jalón si el componente es desmontado, dentro de un \`useEffect\`.

\`\`\`jsx
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/user', { signal: controller.signal })
    .then(res => res.json())
    .then(setUserData);

    otraLlamadaFetchPorAcá({ signal: controller.signal })

  return () => controller.abort(); // Limpiamos
}, []);
\`\`\`

Podemos compartir la señal con diferentes peticiones *fetch*, pero ten cuidado, quizá prefieras usar una señal para cada petición. 🥋

## 🎶 Algunos tips

Muchas veces queremos usar esta misma señal dentro de nuestro propio código.

Podemos colocarle un listener y hacer lo que necesitemos hacer al cancelar.

\`\`\`jsx
useEffect(() => {
	const abortHandler = ()=>{
      clearCualquierListener(signalRef.current.reason); // llamas funciones
			setState("aborted") // lo que quieras mutar...
			navigate(-1) // o puedes redireccionar
	}
	signalRef.current.addEventListener('abort', abortHandler);

  return ()=>{
     signalRef.current.removeEventListener('abort', abortHandler);
  }

},[]);

\`\`\`

## Mi parte favorita: Creando un *custom hook* 🪝

Vamos a meter todo esto a un *hook*, para poder usarlo en cualquiera de nuestros componentes, así:

\`\`\`jsx
const {data, isLoading, error, abort} = useAbortableFetch(\`/api/v1/resource\`);
\`\`\`

Para ello, vamos a colocar el *ref* que guardará la señal y un estado que guardará los datos conseguidos.

\`\`\`jsx
export const useAbortableFetch = (url: string, init?: RequestInit) => {
  const controller = useRef<AbortController>(new AbortController()).current;
  const [data, setData] = useState(null);

  const fetchData = async () => {
    const rsp = await fetch(url, { ...init, signal: controller.signal });
    // @todo could be json or text
    // const contentTypeHeader = rsp.headers.get('content-type'); // Útil
    setData(await rsp.json());
  };

  useEffect(() => {
    fetchData();
  }, []);
  return {
    data,
    abort: (reason?: string) => controller.abort(reason),
  };
};
\`\`\`

¿Serías capas de añadir los estados que hacen falta: isLoading y error?

Mientras, ahora tenemos un fetch abortable por nuestra UI, que seguro te será muy útil para ofrecer una mejor experiencia a tus usuarios. 👦🏻

### Usar AbortController y AbortSignal resulta en un código más limpio y responsivo, a la vez que más seguro y efectivo. ❇️

No te olvides de compartir mi posts en tus redes sociales si te ha sido de utilidad. 🌱

También recuerda echarle un ojo a [mi curso de React Router](https://www.fixtergeek.com/cursos/Introduccion-al-desarrollo-web-full-stack-con-React-Router/detalle/). Es gratis. 🥽

Abrazo. Bliss. 🤓

## Enlaces relacionados

[Curso de React router Gratis](https://www.fixtergeek.com/cursos/Introduccion-al-desarrollo-web-full-stack-con-React-Router/detalle/)

[AbortController docs](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)`;

async function main() {
  console.log("Importando post de AbortController & AbortSignal...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug: "AbortController-and-AbortSignal_0we" },
  });

  if (existing) {
    console.log("⚠️  El post ya existe con ID:", existing.id);
    return;
  }

  const post = await db.post.create({
    data: {
      slug: "AbortController-and-AbortSignal_0we",
      title: "AbortController & AbortSignal",
      body: postContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@blissito",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Imágenes
      coverImage:
        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop",
      metaImage:
        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop",

      // Clasificación
      tags: ["abort", "abortcontroller", "abort api", "javascript", "react"],
      mainTag: "signal",

      // Fecha original: ~Abril 2025 (timestamp: 1745435685117)
      createdAt: new Date(1745435685117),
      updatedAt: new Date(),
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Autor: ${post.authorName}`);
  console.log(`   Fecha original: ${post.createdAt.toLocaleDateString("es-MX")}`);
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
