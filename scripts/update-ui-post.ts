import { db } from "../app/.server/db";

const updatedBody = `Desde hace unos años el desarrollo \`Frontend\` ha tomado cada vez mas relevancia pasando de hacer vistas simples a trasladar mucha de la lógica que anteriormente se hacía en el \`Backend\` al lado del cliente. Sin embargo, esto no representa que su principal concepto, la UI, haya perdido importancia o haya pasado a segundo plano, todo lo contrario.

Hoy en día con todas las herramientas que tenemos a nuestra disposición crear interfaces cada vez más complejas, fáciles de usar y por supuesto, \`increiblemente agradables a la vista\` es practicamente un deber, dejando de lado los Frameworks y librerías como \`React\`,\`Angular\` o \`Vue\` para cumplir con este objetivo. La cantidad de opciones que hay para ayudarnos a construir es inmensa, tenemos librerías de CSS (basadas en clases), librerías de componentes, librerías de animaciones, íconos, etc.

Pero... con tantas opciones ¿qué herramienta debo elegir?, ¿qué librería?, ¿hacer los estilos a mano, usar un librería CSS o una librería de componentes? \`¡demonios!\`, muchas preguntas, ¿no lo crees?.

En este post quiero compartir contigo a título personal, mi opinión y el proceso para tomar algunas de estas desiciones.

## ¿Hacer los estilos a mano?...¿en serio?

Para ti quizá esto es obvio pero puede que para alguien más leyendo este post no sea tan simple este punto, aún más si vas empezando. Hacer los estilos desde cero representa una cantidad de trabajo y esfuerzo titánico y como desarrolladores me parece que una premisa fundamental es \`no reinventar la rueda\` por lo que mi sugerencia al respecto es que siempre optes por usar herramientas que te permitan simplemente modificar estilos en lugar de hacerlos tu mismo. Sí, aun debes saber manejar CSS para poder hacer modificaciones, sin embargo, serán minimos los cambios; hoy en día no imagino un caso en el cuál tengas que hacer los estilos desde cero.

![](https://media.giphy.com/media/yYSSBtDgbbRzq/giphy.gif)

Dicho esto, pasemos con el siguiente punto, ¿librería CSS o librería de componentes?, analicemos una a la vez.

## Librerías de CSS

Las librerías de CSS son una opción muy popular entre los desarrolladores \`Fronted\` de todos los niveles, debido a que, por lo general, la curva de aprendizaje es casi nula. Te permiten crear interfaces completas en minutos, copiando y pegando bloques de código y simplemente hacer cambios en algunas clases para llegar al resultado que buscas, sin mencionar que en su mayoría te permiten personalizar colores, tamaños de letra, espaciados y practicamente todos los estilos.

Gracias a que están basadas en solamente HTML, CSS y en ocasiones algo de JS, son compatibles con todas las herramientas como \`React\`, \`Angular\`, \`Vue\` o cualquier otra que decidas usar.

No obstante, también tienen un par de puntos a considera. Desde mi punto de vista uno de los principales es la legibilidad del código, ya que, muchas veces para llegar al resultado esperado es necesario usar multiples clases y si combinamos eso y una base igual de grande de HTML, el resultado es un conjunto de lineas de código no tan simple de leer.

Ejemplo:

\`\`\`html
<span className='underline font-editor-bold absolute text-xl md:text-2xl bg-neutral-900/90 text-white px-4 py-1 rounded-full w-max -bottom-[230%] -left-[400%]'>
 Costa Oaxaca
</span>
\`\`\`

Sí, es un simple \`span\`, imagina eso en todos los elementos de HTML para poderlos estilizar.

El otro punto a considerar es que al usar este tipo de herramientas es importante que no combines unas con otras porque puede haber conflictos entre las clases que ambas tengan, selecciona solo una.

Como recomendación, te diría que siempre selecciones la librería que más se paresca al estilo que vas a construir. Aquí te dejo algunas opciones de librerias que puedes considerar para tu próximo proyecto.

### Opciones de Librerias

- [tailwindcss](https://tailwindcss.com/)
- [UiKit](https://getuikit.com/)
- [SPECTRE.CSS](https://picturepan2.github.io/spectre/index.html)
- [Material Design Lite](https://getmdl.io/)
- [semantic-ui](https://semantic-ui.com/)
- [Primer css](https://primer.style/css/)
- [Bulma](https://bulma.io/)

### BONUS

Como extra me gustaría compartirte mi experiencia con una de las herramientas que te mencioné hace un momento \`tailwindcss\`. Fue una de las últimas librerías de CSS que probé y me pareció increible, cada día se vuelve más popular y muchos proyectos y desarrolladores estan adoptando debido a que cubre con sus clases practicamente todo lo que podrías necesitar, incluso te brinda animaciones y otros utilitarios que hacenla vida más simple. Sin embargo, no cuenta directamente con \`"Componentes" (gratis)\` como algunas otras de las opciones que mencione, es decir, no tiene bloques como \`Dropdowns\`, una \`Card\`, o una \`Navbar\`, todo lo tenemos que construir desde cero con sus clases.

Investigando al respecto encontré opciones muy interesantes que cubren esa parte y que nos brindan estructuras que podemos usar enteramente basadas en clases de \`tailwind\`, te comparto algunas.

- [daisyUI](https://daisyui.com/)
- [MerakiUI](https://merakiui.com/)
- [HyperUI](https://www.hyperui.dev/)
- [Flowbite](https://flowbite.com/) (Mi favorita)

![](https://flowbite.com/static/og-image-121de0f08dcb4e42c2fce0319ff586a8.png)

---

🎬 **¿Quieres ver estas herramientas en acción?** Tenemos tutoriales de Tailwind y React en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Librerías de Componentes (ReactJS)

Es importante aclarar que en esta sección me referiré a librerías de componentes con \`ReactJs\` principalmente porque es la herramienta más popular actualmente para crear aplicaciones web y por lo mismo es con la que más he trabajado en los últimos años.

Las librerías de componentes también son una alternativa genial cuando hablamos de crear interfaces, estas herramientas nos ayudan no solo a tener una UI visualmente agradable, sino que también gracias al poder de  \`React\` los componentes son capaces de ayudarnos con interacciones más complejas, incluso lidiando con información, por ejemplo, filtros y ordenamiento de datos.

Estas librerías estan diseñadas para ayudar a los desarrolladores a crear interfaces estéticas pero altamente funcionales, encargándose de las interacciones básicas de los elementos más comunes en la web como mostrar mensajes de error en los \`inputs\` si el usuario ingresa valores incorrectos o mostrar botones con estados de \`carga\` como \`loaders\` o mensajes tipo "Cargando..." con simplemente pasar un prop.

Contrario a las librerías de CSS nos permiten crear a nivel código, estructuras mucho más legibles, ya que, tenemos encapsulado todo en un \`Componente\`, haciendo el uso tan simple como colocar \`<Componente/ >\` en nuestro código.

A nivel visual estas herramientas también me permiten customizar los estilos base y cambiarlos por los que necesitamos para cada proyecto.


### Opciones de Librerias

- [Material UI](https://mui.com/)
- [Grommet](https://v2.grommet.io/)
- [Chakra](https://chakra-ui.com/) (Mi favorita)
- [Ant.design](https://ant.design/)


### BONUS

Recientemente, como parte de un proyecto, un gran amigo, [@hectorBliss](https://www.hectorbliss.com/) compartió conmigo una herramienta genial, para hacer animaciones, basada en componentes de React y quedé asombrado por lo fácil que es crear todo tipo de animaciones para darle vida a tu sitio o aplicación, haciéndola más interactiva y llamativa, un factor cada vez más importante en el desarrollo \`Frontend\`.

Te dejo el enlace aquí abajo y quizá muy pronto estemos hablando más a detalle de esta herramienta tan genial.

- [Framer motion](https://www.framer.com/motion/)

![framermotion](https://res.cloudinary.com/practicaldev/image/fetch/s--Y1o7iPST--/c_imagga_scale,f_auto,fl_progressive,h_900,q_auto,w_1600/https://dev-to-uploads.s3.amazonaws.com/i/mii3a0dd4ttq71ed8gzm.png)

👉 **¿Te interesa dominar Framer Motion?** En FixterGeek tenemos un curso completo donde construyes **más de 14 componentes animados** con React y Motion. [Ver el curso de Animaciones](/animaciones).

## Conclusión

A este punto seguro te preguntarás, ¿y las sugerencias para tomar la decisión?

En mi opinión no hay una opción correcta para todos los casos que puedas tener al desarrollar un nuevo proyecto. En mi caso, antes de seleccionar una herramienta, hago un análisis sobre lo que voy a construir, no es lo mismo crear un \`dashboard\` donde la UI no tiene que ser necesariamente impactante a nivel visual a crear una \`landing page\` donde la primera impresión cuenta mucho y generalmente buscas que se vea lo mejor posible.

Tomando como referencia los ejemplos que acabo de usar, para una aplicación donde el factor funcional es más importante que el visual escogería usar una \`librería de componentes como Chakra\` que me permite construir una UI rapidamente y centrarme en la funcionalidad. Por otro lado, si lo visual fuera prioridad y es necesario construir una UI con un estilo muy particular seguramente una \`librería de CSS\` seria mi opción.

Finalmente, te tengo un buena noticia, si tu proyecto demanda ambas cosas, puedes considerar utilizar las dos opciones, ejemplo: \`tailwindcss y chakraUI\` aunque casi siempre basta con una.

---

💡 **¿Quieres profundizar en Frontend con React?** En [FixterGeek](/) tenemos cursos prácticos de React, animaciones y desarrollo web moderno.

---

Recuerda, "...un gran poder conlleva una gran responsabilidad".

Espero que esto te ayude a responder las preguntas del comienzo y te sea más fácil construir una increible UI.`;

async function main() {
  console.log("Actualizando post de UI...");

  const post = await db.post.update({
    where: { slug: 'ohh-la-ui-librerias-de-css-o-librerias-de-componentes-cual-usar' },
    data: { body: updatedBody },
  });

  console.log("✅ Post actualizado!");
  console.log(`   URL: /blog/${post.slug}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
