import { db } from "../app/.server/db";

const postContent = `Podemos crear conexiones y comunicarnos con servidores usando JavaScript gracias a la Fetch API.

La Fetch API está implementada en prácticamente cualquier contexto desde el que se pueda necesitar solicitar un recurso (tanto navegadores como servidores).

Fetch sustituye al viejo conocido AJAX. (**A**synchronous **J**avaScript **A**nd **X**ML) para hacer peticiones a través de la red, como hacer \`submit\` de un formulario, cargar información del usuario o conectarnos a servicios externos.

El método \`fetch()\` es moderno y muy flexible, está disponible de forma global y simplifica la comunicación entre servidores inmensamente.

Sintaxis:
\`\`\`jsx
const promise = fetch(url, [options])
\`\`\`
**url** - La URL a la que se hace la petición

**options** - Parámetros opcionales: method, headers etc.

Las opciones son opcionales, si no se entregan, \`fetch\` hará una petición GET, descargando el contenido de \`url\`.

Al ejecutar \`fetch()\` el navegador inicia la petición y devuelve una promesa que se usará posteriormente para solicitar el resultado.

## Un par de promesas

Normalmente, cuando utilizamos \`fetch\`, debemos trabajar con dos promesas. Primero la promesa devuelta por \`fetch\`, que se resuelve con un objeto \`Response\` que contienen \`headers\` que indican el estado de la petición.

En este punto podemos consultar estas \`headers\` o el \`status\` para saber si ha sido exitoso, pero aún no tenemos el \`body\`.

> 👀 Es importante decir que las respuestas de error que fetch pueda conseguir (404, 500 etc.)  no causan un error. Mientras que la falta de conexión HTTP o los problemas de red causarán un \`reject\` en la promesa.

Las propiedades que tenemos disponibles en la respuesta (Response) son:
* \`status\` - HTTP código de estatus, e.g. 200.
* \`ok\` - boolean, \`true\` si el código de estatus es 200-299.
* \`statusText\` - El mensaje correspondiente al estatus (\`OK\` para \`200\`)
* [Mira todos aquí](https://developer.mozilla.org/en-US/docs/Web/API/Response)

## Veamos un ejemplo:

\`\`\`jsx
const response = await fetch(url)
if(response.ok){ // true si el status es 200-299
	// Obtenemos el cuerpo (body) como un objeto json
	const json = await response.json();
}else{
	console.error("Error HTTP",response.status);
}
\`\`\`
Cómo vemos el body se obtiene a partir de una segunda promesa. \`.json()\`

## El body
Podemos obtener el body de una respuesta \`Response\` de varias formas:
* \`response.text()\` - Lee la respuesta y la devuelve en formato de texto
* \`response.json()\` - Hace parse de la respuesta en formato JSON
* \`response.formData()\` - Devuelve la respuesta como un objeto \`FormData\`
* \`response.blob()\` - Devuelve la respuesta como un \`Blob\` (un tipo de dato binario, usado para trabajar con archivos)
* \`response.arrayBuffer()\` - Devuelve la respuesta como un \`ArrayBuffer\` (conjunto de datos binarios)

## Veamos otro ejemplo

---
🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

\`\`\`jsx
const url = "https://api.github.com/users/hectorbliss";
const response = await fetch(url);
const data = await response.json();
alert(data.login) // Mi nombre de usuario
\`\`\`
Esta sintaxis necesita que te encuentres dentro de un \`scope\` (función) \`async\`. Pero podemos usar también la sintaxis de las promesas:
\`\`\`jsx
fetch(url)
	.then(response=>response.json())
	.then(data=>alert(data.login)) // Mi nombre de usuario
\`\`\`
Emplea la que prefieras. 🧠

## Hagamos un tercer ejemplo con blob

\`\`\`jsx
let response = await fetch('/assets/blissmo.svg');

let blob = await response.blob(); // Objeto blob

// Preparamos un nodo para mostrar la imagen
let img = document.createElement('img');
document.body.append(img);
// Creamos una URL a partir del objeto blob con la clase URL
img.src = URL.createObjectURL(blob);
\`\`\`
Para hacer esto, debemos estar seguros(as) de que el servidor responde con una imagen.

> 👀 Es importante decir que solo se puede ejecutar un método para el \`body\` ya sea \`.json()\`, \`.blob()\`, \`.formData()\` etc. Pues una vez que el body es procesado por cualquiera de estos métodos, ya no estará más disponíble. Podemos saber si ya ha sido procesado con \`res.bodyUsed\`
\`\`\`jsx
let json =  await response.json();  // el body de la respuesta ha sido procesado.
let formData =  await response.formData();  // Esto fallará
\`\`\`

Ahora veamos que nos encontramos en las headers.

## Headers en el Request
Para pasarle headers propias a nuestra petición, podemos hacer uso de las opciones, específicamente de la opción \`headers\`
\`\`\`jsx
fetch("googleapis.com",{
	headers: {
		Authentication: 'Bearer token'
	}
})
\`\`\`
Hay una lista de \`headers\` que podemos usar y otras que no están permitidas, dependiendo el entorno de ejecución.
Estas limitaciones regularmente no están presentes en entornos de servidor.
Algunas headers que podemos usar:
-   \`Cache-Control\`
-   \`Content-Language\`
-   \`Content-Length\`
-   \`Content-Type\`
-    \`Accept\`
-   \`Accept-Language\`
-   \`Content-Language\`
-   \`Content-Type\`

Si quieres saber más sobre \`headers\` te dejo el [enlace a la documentación](https://developer.mozilla.org/en-US/docs/Web/API/Headers)

## Headers en la respuesta
Las \`headers\`(cabeceras) en la respuesta (Response) son iterables, pues vienen en un formato \`Map-like\` que no es exactamente un map, pero fundamentalmente funciona igual.

Así que podemos obtener los valores individuales también.

\`\`\`jsx
const res = await fetch(url)
// Una sola header
console.log(res.headers.get('Content-Type')); // application/json; charset=utf-8

// Todas las headers
res.headers.forEach(h=>console.log(h))
\`\`\`

> 👀 Puedes obtener las llaves también usando un \`for of\`
\`for(let [key,val] of res.headers){}\`

## POST
La petición post no es menos popular o útil que la petición GET que es la petición por default de \`fetch()\`. Para poder hacer una petición POST debemos configurar las opciones un poco:

\`\`\`jsx
const user = {
	id:777,
	name:'hectorbliss',
	youtube: '@blissito',
	email: 'fixtergeek@gmail.com',
};

const res = await (\`users/\${user.id}/update\`, {
	method:'POST',
	headers: {
		"Content-Type":"application/json;charset=utf-8"
	},
	body: JSON.stringify(user)
});

const parsedBody = await res.json();

\`\`\`
Cuando hacemos una petición POST es importante poner atención al tipo de contenido que debemos definir \`Content-Type\`. Por ejemplo para texto el valor sería \`text/html; charset=utf-8\` o cuando enviamos un \`FormData\` sería \`multipart/form-data;\`.

## Ejemplo Avanzado: Subiendo una imagen
En este ejemplo tenemos un simple formulario que acepta un archivo de imagen y lo pasa a una función que lo enviará al servidor con \`fetch\` empleando \`formData\`.

\`\`\`html
<form id="form" onsubmit="handleSubmit()">
  <input type="file" accept="image/*" name="image" />
  <input type="submit" />
</form>
<p style="color:red" id="message"></p>

<script>
  const handleSubmit = async (evnt) => {
    event.preventDefault();
    const res = await fetch("www.urldetuservidor.com/files/uplaod", {
      method: 'post',
      body: new FormData(form),
      headers: {
        'content-type': 'multipart/form-data'
      }
    })
    if (res.ok) {
      message.textContent = "Archivo enviado"
    } else {
      message.textContent = "Error de servidor " + res.status
    }
  }
</script>
\`\`\`
¿No es tan difícil verdad? Yo creo que ya estás lista(o) para usar \`fetch\` por tu cuenta. 🤯

## A modo de resumen
El uso más típico de \`fetch\` es a través de dos peticiones que devuelven promesas. Podemos utilizar \`await\`.
\`\`\`jsx
const res = await fetch(url,options);
const transformedBody = await res.json(); // .text(), .blob() etc.
\`\`\`
También podemos usar una sintaxis sin \`await\`
\`\`\`jsx
fetch(url,options)
	.then(res=>res.formData())
	.then(formData=>{/* haz algo con el form data */})
\`\`\`
### Propiedades de la respuesta (Response):

-   \`response.status\`  – código HTTP de la respuesta
-   \`response.ok\`  –  \`true\`  con un status desde 200 hasta 299.
-   \`response.headers\`  – Objeto tipo \`map\` con los HTTP \`headers\`.

### Métodos para obtener el body de la respuesta:

-   **\`response.text()\`**  – Devuelve el body como texto
-   **\`response.json()\`**  – Convierte el body en objeto JSON
-   **\`response.formData()\`**  – Devuelve un objeto  \`FormData\`
-   **\`response.blob()\`**  – Devuelve un  Blob (Más sobre blobs en el futuro) 🤓
-   **\`response.arrayBuffer()\`**  – Retorna un buffer  ArrayBuffer

### Algunas de las opciones que podemos pasar:

-   \`method\`  – el método HTTP,
-   \`headers\`  – Un objeto con \`headers\`de \`request\`(No todas se pueden manipular),
-   \`body\`  – El cuerpo de la petición como   \`string\`,  \`FormData\`,  \`BufferSource\`,  \`Blob\`  o \`UrlSearchParams\`.

### Y ya está, si esto te ha sido útil, por favor considera [suscribirte](https://fixtergeek.com/subscribe)

Abrazo. Bliss. 🤓`;

async function main() {
  const slug = "fetch-explicado-2023";

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

  // Crear el post con la fecha original (1 Junio 2023)
  const post = await db.post.create({
    data: {
      slug,
      title: "Fetch | Explicado",
      body: postContent.trim(),
      published: true,

      // Imágenes
      coverImage:
        "https://blog.alexdevero.com/wp-content/uploads/2020/09/07-09-20-getting-started-with-the-javascript-fetch-api-blog.jpg",
      metaImage:
        "https://blog.alexdevero.com/wp-content/uploads/2020/09/07-09-20-getting-started-with-the-javascript-fetch-api-blog.jpg",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",

      // Clasificación
      mainTag: "Fetch",
      tags: ["js", "fetch", "response", "request", "ajax", "basics", "fundations"],
      category: ["JavaScript"],

      // Fecha original del post (1 Junio 2023)
      createdAt: new Date(1685670592178),
      updatedAt: new Date(),

      // YouTube link vacío como en el original
      youtubeLink: "",

      isFeatured: false,
    },
  });

  console.log("Post creado exitosamente:");
  console.log(`  ID: ${post.id}`);
  console.log(`  Slug: ${post.slug}`);
  console.log(`  Título: ${post.title}`);
  console.log(`  URL: /blog/${post.slug}`);
  console.log(`  Fecha original: ${post.createdAt}`);
  console.log(`  Cover: ${post.coverImage}`);

  await db.$disconnect();
}

main().catch(console.error);
