import { db } from "../app/.server/db";

const postContent = `# Closure

JavaScript controla la visibilidad y la vida de las variables y parámetros por nosotros, reduciendo la colisión de nombres y asignando memoria para los valores de forma automática por medio del scope.

\`\`\`jsx
const name = 'blissmo';
const sayMyName = () => {
    console.log(name) // blissmo
}

sayMyName();
\`\`\`

Gracias al *scope,* **se tiene acceso** a los parámetros y las variables que son definidas dentro del mismo bloque (\`{}\`).

Pero si creamos una variable con el mismo nombre de una global, JavaScript se encargará de evitar la colisión.

\`\`\`jsx
const name = 'blissmo 🤓';
const sayMyName = () => {
    const name = 'pedrito 😎';
    console.log(name) // pedrito 😎
}

sayMyName();
\`\`\`

**¿Podemos usar esta característica a nuestro favor?**, ¡claro! Veamos qué pasa si creamos un objeto ayudándonos de una función:

\`\`\`jsx
// Constructor
const createUser = function (name){
    return {
        sayMyName: function () {
            return name;
        }
    }
}
// Creamos el objeto (como una instancia):
const user = createUser('blissmo 🤓');

// Invocamos getMyName
user.sayMyName(); // blissmo 🤓
\`\`\`

> 👀 A estas funciones se les llama *constructors*

Si observas bien esta función, te preguntarás: **¿Donde es que se almacena el valor de name?** El objeto no tiene ninguna propiedad *name*, ni nada de \`this.name=name\` o algo similar. Sin embargo, la referencia a la variable \`name\` queda almacenada en el objeto *user*. 🤯

Esto porque el método \`sayMyName\` tiene privilegios de *scope*.

Es decir, que la función \`sayMyName\` **seguirá teniendo acceso al valor original** del parámetro, gracias al *scope*. A esto se le llama ***closure***.

## Vamos un ejemplo práctico del closure para entender mejor

Vamos a definir una función que genere un contador de 0 hasta el número que le indiquemos y coloque número por número en un nodo del **DOM** cada segundo.

\`\`\`jsx
const counter = function (max, node) {
    let current = 0;
    const count = function () {
      current +=1
        if(current <= max) {
            node.innerText = current;
            setTimeout(count, 1000);
        }
    }

    setTimeout(count,1000);
}
\`\`\`

Esto se resuelve fácilmente con un poco de recursividad, pero observa que la magia sucede gracias a que la función count tiene acceso privilegiado por ser parte del scope de \`current\`.

## Ahora veamos un error común

Existen errores comunes al escribir código JavaScript cuando no se tiene en cuenta el *closure*.

\`\`\`jsx
// ESTO ESTÁ MAL
const counter = function (max,node){
    for(i=0; i<=max; i++){
        setTimeout(()=>{
            console.log("i:",i)
            node.innerText = i;
        },1000*i)
    }
}
\`\`\`

Esto no funciona correctamente porque la \`i\` que hemos usado dentro del \`setTimeout\` es **una referencia a la variable** dentro del *scope*, pero **no una referencia al valor**.

Un segundo después, cuando el primer \`setTimeout\` es ejecutado, el valor de \`i\` ya es \`11\`, pues el \`for\` ya ha terminado. 😱

Pero, podemos usar un *closure* para resolver este problema:

\`\`\`jsx
// ESTO ESTÁ MEJOR

const counter = function (max,node){
    const helper = (value) => function () {
        console.log(value)
        node.innerText = value;
    }
    for(i=0; i<=max; i++){
        const fun = helper(i); // hacemos un closure de i
        setTimeout(()=>{
            fun()
        },1000*i)
    }
}
\`\`\`

¡Genial! 🤯 Ahora que entiendes qué es un closure le puedes sacar todo el provecho 🔥🎉

## De paso vamos a entender let

Hay una forma más de resolver este for de forma más simple.

\`\`\`jsx
// LIBERANDO EL PODER DE LET

const counter = function (max,node){
    const helper = function (value){
        console.log(value)
        node.innerText = value;
    }
    for(let i=0; i<=max; i++){
        setTimeout(()=>{
            helper(i)
        },1000*i)
    }
}
\`\`\`

Cuando i es utilizada en el for como var, su valor es global, signifíca que cuando la usamos, no estamos pasando el valor de i, sino su referencia, por eso cuando es utilizada en el setTimeout esta devuelve su valor actual y no de cuando se definío el setTimeout.

Pero con let, esto es distinto, una variable let es inmune al hoisting, y se mantiene local al scope donde fue definida, esto significa que la i que se usa en el setTimeout ya no es global sino una copia local. 🤯

Abrazo. Bliss. 🤓

## Enlaces relacionados

Mozilla docs

https://developer.mozilla.org/es/docs/Web/JavaScript/Closures`;

async function main() {
  const slug = "te-explico-que-es-closure-en-javascript-2023";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("Post ya existe, actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "Te explico qué es Closure en JavaScript",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.facebook.com/blissito",
        coverImage: "https://i.imgur.com/bqhNp09h.png",
        metaImage: "https://i.imgur.com/bqhNp09h.png",
        youtubeLink: "https://youtu.be/66WWeGf4taY",
        tags: ["programacion", "js"],
        mainTag: "JavaScript",
      },
    });
    console.log("Post actualizado:", post.id);
  } else {
    console.log("Creando nuevo post...");
    const post = await db.post.create({
      data: {
        slug,
        title: "Te explico qué es Closure en JavaScript",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.facebook.com/blissito",
        coverImage: "https://i.imgur.com/bqhNp09h.png",
        metaImage: "https://i.imgur.com/bqhNp09h.png",
        youtubeLink: "https://youtu.be/66WWeGf4taY",
        tags: ["programacion", "js"],
        mainTag: "JavaScript",
      },
    });
    console.log("Post creado:", post.id);
  }

  await db.$disconnect();
}

main().catch(console.error);
