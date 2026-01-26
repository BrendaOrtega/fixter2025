import { db } from "../app/.server/db";

const postContent = `Últimamente, he estado revisando temarios de algunos bootcamps y cursos en línea.
Me encuentro con la triste sorpresa de que se sigue enseñando los componentes de clase como la mejor opción.

Esto puede ser debido a la educación tradicional de los instructores que imparten estos cursos, con una fuerte inclinación por la programación orientada a objetos o tal vez por ==el desconocimiento== de cómo usar correctamente \`useEffect\` y necesitar el «ciclo de vida» de un componente de clase.

Por eso hoy, quiero invitarte a que solo uses componentes de función y para ello te voy a dar 5 razones:

## Razón # 1: Mucho menos código
Siempre me ha gustado React por la mínima cantidad de código que tengo que escribir, sobre todo viniendo de usar Angular como herramienta principal por varios años. React me da mucha velocidad al reducir la cantidad no solo de archivos, también de líneas de código.

Esto es todavía mejor cuando dejas de escribir toda la estructura que una clase requiere y más aún cuando escribes componentes de display que puedes incluso utilizar sin bloque, con «arrow functions».

Veamos una comparación simple: componente de clase, con un método:
\`\`\`jsx
class Card extends React.Component{
    constructor(){
        this.state = {
            following:false
        }
        this.handleFollow = this.handleFollow.bind(this);
    }
    handleFollow(){
        this.setState(true)
    }
    render(){
        return (
              <button
                onClick={this.handleFollow}
                type="button"
              >
                Follow
              </button>
        )
    }
}
\`\`\`
Ahora veamos el mismo componente, pero de tipo función:
\`\`\`jsx
const Card = () => {
    const [follow, setFollow] = useState(false);
    const handleFollow = () => setFollow(true);
    return (<button onClick={handleFollow} type="button">Follow</button>);
}
\`\`\`
¡Cuanta paz mental!, ¿no crees?

## Razón #2: Mucho más fácil de entender
Como lo vimos en el ejemplo anterior, los componentes de tipo función son mucho más fáciles de leer y, por tanto, son más fáciles de entender, de modificar ¡y de mantener!

Nunca pierdas de vista que escribes código para otros programadores y que pasamos más del 80% del tiempo leyendo código. La simplificación de los componentes te consigue velocidad, pues inviertes mucho menos tiempo en leer, menos tiempo en entender.

Con componentes de tipo función, todo es más obvio y menos doloroso.

## Razón #3: \`this\` no es necesario
La velocidad es el rey, y los componentes de tipo función te traen mucha velocidad, al escribirlas, al leerlas y entenderlas, pero además, te traen velocidad de una forma inesperada.

Cuando utilizas componentes de tipo clase, siempre debes estar lidiando con el keyword \`this\`. Deja de lado el entenderlo, siempre está estorbando a la hora de usar eventos como \`onClick\` o si has olvidado declarar métodos con arrow functions, entonces debes ir al constructor y hacer el correspondiente "binding", para que tu \`this\` si sea este \`this\` y no ese \`this\`. ¿Absurdo, verdad?

\`\`\`jsx
    constructor(){
        this.state = {
            following:false
        }
        this.handleFollow = this.handleFollow.bind(this);
    }
\`\`\`
Bueno, olvídate de esto con los componentes de función 🥳

## Razón #4: Ahora tenemos hooks
Una de las razones que se mantenían más sólidas para seguir usando componentes de clase, eran los \`stateless components\`, así se les conocía a los componentes de tipo función, pues no poseían un estado, ni tenían el método \`this.setState()\`.

Este nombre dejó de tener valides, ya no podemos llamarle así a los componentes de función, pues ahora gracias a los hooks tenemos acceso a un estado, e incluso \`useState\` es mucho más económico que el estado de un componente de clase.
\`\`\`jsx
const [follow, setFollow] = useState(false);
\`\`\`
Gracias hooks.

No olvides que también se requerían los componentes de clase por el ciclo de vida y los métodos para comparar los props (que eran bastante complicados) como \`componentDidMount\`, \`componentWillUnmount\`, \`componentDidUpdate\`, \`shouldComponentUpdate\`, \`getDerivedStateFromError\` entre otros más que prefiero no recordar.🥵

Todos estos y más, sustituidos por el poderoso, \`useEffect\` eliminando por completo la necesidad de pensar en \`Lifecicles\` para pensar en \`Effects\` o efectos secundarios, que resulta en un mapa mental mucho más fácil de comprender.

Gracias de nuevo hooks.

> 👀 ¡Ojo!, es curioso que en los últimos cursos en los que he enseñado React, ha resultado muy fácil para mis estudiantes entender los efectos secundarios al no tener ningún contexto del ciclo de vida de un componente, mientras que a mis estudiantes que ya conocían los ciclos de vida y las clases de React, les resulta muy dificil desprenderse de ellos para adoptar useEffect.


## Razón #5: Las funciones son el futuro de React
La importancia de los componentes de clase, como ya lo hemos visto, ha disminuido casi en totalidad, convirtiendo a los componentes de tipo función en la nueva protagonista de React.

Esto es todavía más obvio cuando el propio equipo de desarrolladores de React recomienda el uso de componentes de función por sobre los de clase.

La [nueva documentación de React](https://react.dev/) y los nuevos tutoriales están enfocados principalmente a los componentes de tipo función.

Nunca está de más conocer a fondo tu herramienta, si tienes curiosidad de cómo funciona un componente de clase y su ciclo de vida, no dejes que este post detenga tu curiosidad, puedes aprenderlo en un fin de semana, adquirir contexto y seguir usando funciones, pero definitivamente, los componentes de tipo función, son el futuro de React.

### Ahora tienes todas las razones necesarias para seguir aprendiendo React con funciones, pero tengo una más para ti:
Los componentes de servidor, pronto, se volverán sumamente importantes, y sí, la mejor forma de mandar componentes desde el servidor, hidratarlos o pensarlos como islas, es con funciones.

Te platicaré más sobre componentes de servidor en el futuro cercano 😉

Si este artículo te gusto, no dejes de suscribirte a nuestro newsletter. Gracias por tu tiempo.

Abrazo. Bliss.`;

async function main() {
  const slug = "5-razones-para-preferir-componentes-de-tipo-funcion-2023";

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

  // Crear el post con la fecha original (17 Febrero 2023)
  const post = await db.post.create({
    data: {
      slug,
      title: "5 Razones para preferir componentes de tipo función",
      body: postContent.trim(),
      published: true,

      // Imágenes
      coverImage: "https://i.ytimg.com/vi/Bx7taFW0XbY/maxresdefault.jpg",
      metaImage: "https://i.ytimg.com/vi/Bx7taFW0XbY/maxresdefault.jpg",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Clasificación
      mainTag: "React",
      tags: ["hooks", "functions", "react"],
      category: ["js", "webdev"],

      // Fecha original del post (17 Febrero 2023)
      createdAt: new Date(1676651127652),
      updatedAt: new Date(),

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
