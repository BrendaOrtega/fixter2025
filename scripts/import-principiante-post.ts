import { db } from "../app/.server/db";

const postContent = `No queremos ser principiantes, queremos ser expertos, fingimos serlo. Pero esto nos aleja de serlo.

Cuando comienzas tu canal de YouTube, cuando escribes tu primer post de blog, cuando grabas tu primer curso o dictas tu primera clase, cuando das tu primera mentoría a un compañero de trabajo, un poco más «jr» que tú. Cuando por primera vez hacemos cualquiera de esas cosas, no queremos ser un principiante, queremos ser un experto, de tal forma que fingimos serlo y hablamos como si lo supiéramos todo sobre el tema.

Pero esta actitud no es la correcta, no solo nos mentimos a nosotros mismos y a los demás, también nos impedimos ser verdaderamente expertos, nos impedimos el aprendizaje porque no nos permitimos fallar, equivocarnos, **decir que no lo sabemos.**

**Cuando admitir que no lo sabemos es, lo que nos acerca a ser expertos.**

## Está bien si no lo sabes, lo puedes investigar

Al permitirte no saber, puedes admitir que no sabes algo, así te acercas realmente a saberlo.

Al principio de mi carrera, (como seguramente tú también lo has vivido) para abrirme paso en la industria tecnológica, tuve que fingir que sabía mucho, cuando realmente estaba aprendiendo en tiempo real.

El primer curso que dicté, lo di apenas sabiendo programar, leía todo el día un libro maravilloso llamado «Django by example» de Antonio Melé **que te recomiendo ampliamente**. Llegaba a las 7 pm a dictar la clase basada en un 80% en todo lo que había leído y luego practicado durante horas, lo que resultaba en una clase chingona que mis estudiantes de ese momento disfrutaban, así también descubrí que puedes autoeducarte a velocidad luz.

Me esforzaba mucho en esas clases y por ahí he leído que el mejor instructor es aquel que tiene frescos los conceptos que enseña, al mismo tiempo que conserva «la mente de principiante».

**Cuando yo leí sobre eso, me hizo mucho sentido,** ¿sabes?, porque lo viví en carne propia, yo dictaba esa clase con todo el ánimo, intención y emoción que me causaba justamente haber aprendido a hacer todo eso que estaba enseñando. **Era la combinación perfecta.**

## Está bien si no lo sabes, lo puedes googlear

Claro que me hacían muchas preguntas, y yo no tenía experiencia para dar una respuesta basada en mis proyectos pasados (inexistentes), así que mis respuestas regularmente eran «no lo sé», esto podría haber sido una receta para el fracaso en este curso (por el que los estudiantes pagaban mucho dinero) pero no fue así, resultó todo lo contrario. **Un total éxito.**

Cada que yo respondía «no lo sé» automáticamente se abría una pestaña nueva en mi navegador que en ese momento se compartía en la pantalla o proyector que se estuviera usando y de forma grupal, «googleábamos».

**En ese curso junto con mis estudiantes aprendí mucho,** ellos seguían pensando tal vez, que yo era su instructor, pero realmente yo solo era el líder en un grupo de estudio común, donde todos estábamos aprendiendo en tiempo real, **mientras yo guiaba el aprendizaje.**

Esta fue una de las mejores experiencias de aprendizaje de mi vida, casualmente mi grupo y yo, logramos convertir un bootcamp **pobremente planeado**, sin temario y con instructores voluntarios, con poco o nada de sueldo; en **una experiencia liberadora** de autoaprendizaje comunitario. \`Fue más que maravilloso\`.

## Está bien si no lo sabes, si lo admites, lo puedes saber

Recuerdo con agrado esa etapa de mi carrera, todos en ese grupo disfrutábamos profundamente, reunirnos y aprender, éramos un grupo tan unido que no nos interesaba mucho más sobre el bootcamp en el que nos encontrábamos, había charlas de «expertos emprendedores» que nada tenían que ver con lo que en ese momento era nuestra pasión. **Programar y aprender desarrollo web con Python**.

Los fundadores vivían en otro planeta «whitexican» donde entender qué pasaba con el grupo y obtener la fórmula para crear grupos de estudio apasionados y exitosos en su aprendizaje autodidacta, **no era la prioridad**. Lo importante era que yo, siendo un pseudo empleado sin contrato y trabajando casi de voluntario, OBEDECIERA a mis amos y no me saltara las charlas de emprendimiento.

Como te imaginarás dejé pronto ese bootcamp para concentrarme en mis descubrimientos:

1. Puedo autoeducarme y enseñar pronto las cosas que aprendo porque puede que sea la enseñanza más efectiva, al tener aún mi mente de principiante puedo enseñar a otros en un nivel similar al mío.
2. Lo más efectivo no es un grupo con un instructor experto, si no, un grupo de estudio con un buen líder que sepa guiar el aprendizaje.
3. Lo más valioso es practicar y equivocarse, hacer preguntas, muchas preguntas, para todo lo demás existe Google.

**Así nació el método Fixtergeek**, aprendiendo en comunidad, compartiendo las inquietudes, haciendo preguntas, rompiendo cosas, **admitiendo que somos principiantes para poder investigar, acompañados y en libertad.**

Aún me gusta ser un principiante.

Todos los años me preparo una buena lista de cosas que me gustaría aprender, y paso el resto del año siendo un principiante, **un eterno estudiante.**

Inténtalo, sé un principiante y así como principiante, júntate con otros a aprender, date la oportunidad de no saber, de fallar, **de aprender.**

Abrazo. Bliss.`;

async function main() {
  const slug = "esta-bien-ser-un-principiante-de-hecho-es-genial-te-digo-por-que-2023";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("Post ya existe, actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "Está bien ser un principiante, de hecho, ¡es genial!, te digo por qué.",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        coverImage: "https://i.imgur.com/6miWqmH.jpg",
        metaImage: "https://i.imgur.com/6miWqmH.jpg",
        tags: ["desarrolloweb"],
        mainTag: "Principiante",
      },
    });
    console.log("Post actualizado:", post.id);
  } else {
    console.log("Creando nuevo post...");
    const post = await db.post.create({
      data: {
        slug,
        title: "Está bien ser un principiante, de hecho, ¡es genial!, te digo por qué.",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        coverImage: "https://i.imgur.com/6miWqmH.jpg",
        metaImage: "https://i.imgur.com/6miWqmH.jpg",
        tags: ["desarrolloweb"],
        mainTag: "Principiante",
      },
    });
    console.log("Post creado:", post.id);
  }

  await db.$disconnect();
}

main().catch(console.error);
