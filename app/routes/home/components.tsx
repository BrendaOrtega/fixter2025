import { twMerge } from "tailwind-merge";
import { useCounter } from "~/hooks/useCounter";
import { motion, useInView } from "motion/react";
import { TridiLayers } from "~/components/card3d";
import { FlipWords } from "~/components/FlipWords";
import { CourseCard } from "~/components/CourseCard";
import { JackPotSection } from "~/components/Jackpot";
import { useEffect, useRef, type ReactNode } from "react";
import { PrimaryButton } from "~/components/common/PrimaryButton";
import { InfiniteMovingCards } from "~/components/common/InfiniteMoving";
import type { Course } from "@prisma/client";
import { useFetcher, Link } from "react-router";
import { Footer } from "~/components/Footer";
import { Banner } from "~/components/common/Banner";

const companies = [
  {
    title: "Inicial",
    image: "/caption.png",
  },
  {
    title: "GFT",
    image: "https://i.imgur.com/sDVJX3C.png",
  },
  {
    title: "Santander",
    image: "/companies/santander.png",
  },
  {
    title: "Wize",
    image: "https://i.imgur.com/1Jgk0PI.png",
  },

  {
    title: "Synac",
    image: "/companies/synack.png",
  },
  {
    title: "Super rare",
    image: "/companies/rare.png",
  },
  {
    title: "Mercado libre",
    image: "/companies/mercado.png",
  },
  {
    title: "Flink",
    image: "/companies/flink.png",
  },
  {
    title: "Runa",
    image: "/companies/runa.png",
  },
  {
    title: "HSBC",
    image: "/companies/hsbc.png",
  },
  {
    title: "Zendala",
    image: "/companies/zenda.png",
  },
  {
    title: "Bancomer",
    image: "/companies/bbva.png",
  },
  {
    title: "Cisco",
    image: "https://i.imgur.com/S7Ihn5W.png",
  },
];

export const SocialPlanet = () => {
  return (
    <div className="bg-planet bg-bottom bg-cover ">
      <Comments />
      <Banner variant="home">
        <div className="w-full md:w-[60%]">
          <h3 className="text-3xl md:text-4xl text-white font-bold mb-10 !leading-snug">
            ¿Listo para mejorar tus skills en programación?
          </h3>{" "}
          <PrimaryButton as="Link" to="/cursos" title="Explorar cursos" />
        </div>
      </Banner>
      <Footer />
    </div>
  );
};

export const Comments = () => {
  const { ref, count } = useCounter(); // ref se usa para el inView (detona y resetea)

  const formatNumber = (number: number) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-[5%] xl:px-0 my-32  md:my-[240px] ">
      <h2 className="text-3xl md:text-4xl xl:text-5xl  font-bold text-white leading-snug text-center">
        Qué piensan nuestros estudiantes
      </h2>
      <p className="text-base md:text-lg text-colorParagraph font-light my-4 text-center">
        <strong ref={ref} className="text-2xl text-brand-700 font-bold">
          {" "}
          +{formatNumber(count)}{" "}
        </strong>
        estudiantes han comprado nuestros cursos en línea y presenciales
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3  mt-12 md:mt-16 gap-8 lg:gap-y-12 xl:gap-12">
        <CommentCard
          platform="x"
          image="https://pbs.twimg.com/profile_images/456497156975644673/QmpE5sMs_400x400.jpeg"
          name="Rodrigo"
          tag="@Alientres"
          comment="Hola, tomé un curso con @FixterGeek Desarrollo Web Full-Stack, me gusto la forma de explicar del profesor y las mentorías personalizadas, también las tecnologías aprendidas son de vanguardia. ¡Se los recomiendo!"
        />
        <CommentCard
          platform="x"
          image="https://pbs.twimg.com/profile_images/1640439802104369153/P4m1BLS7_400x400.jpg"
          name="Jonathan"
          tag="@johnxgear"
          comment="Creo que una de las mejores decisiones ha sido tomar un curso en @FixterGeek es una buena forma de aprender / retomar la programación sin duda una gran experiencia, gracias por dejarme ser parte de esta comunidad. 😎🔥🙌🏼"
        />
        <CommentCard
          platform="x"
          image="https://pbs.twimg.com/profile_images/1363555823138590724/BSg51cKM_400x400.jpg"
          name="Brenda Ortega"
          tag="@brendaojs"
          comment="En 2016, aprendí frontend en @FixterGeek, era la primera vez que veía la terminal así que fue un poco doloroso pero satisfactorio. 6 años más tarde, después de varios empleos y mucho aprendizaje puedo decir que fue la mejor decisión que he tomado. 👩🏻‍💻😊"
        />
        <CommentCard
          image="https://pbs.twimg.com/profile_images/1605726489055334400/olSwWtH8_400x400.jpg"
          name="David Duran Valdes"
          tag="@DavidDuranVal"
          platform="x"
          comment="La forma de enseñar de @HectorBlisS @FixterGeek junto con la documentación y los lerning's son de gran ayuda para resolver los ejercicios y proyectos del curso, los temas parecen mas faciles de lo que son y te motivan a seguir aprendiendo, practicando y mejorar tus conocimientos."
        />
        <CommentCard
          image="https://pbs.twimg.com/profile_images/1509233081194004490/hwUK6HvV_400x400.jpg"
          name="Sandy"
          tag="@SandHv"
          platform="x"
          comment="@FixterGeek ha sido una experiencia agradable y nutritiva técnicamente hablando, continuaré con los siguientes cursos para seguir retroalimentando y aprendiendo las nuevas técnicas del mundo de desarrollo web, gracias fixter ✨🐥👩🏻‍💻"
        />
        <CommentCard
          image="https://pbs.twimg.com/profile_images/1659370175546765314/NQtKyiWa_400x400.jpg"
          name="Gustavo"
          tag="@kinxori"
          platform="x"
          comment="Hi everyone! As you may know, I am in the journey to become a former web developer! I've started taking bootcamps with @FixterGeek and it's been a great experience. We have access to mentorships through all the course lapse and to be fair, Bliss has a natural talent to teach! 👨‍💻"
        />
        <CommentCard
          image="https://img-c.udemycdn.com/user/50x50/60222492_f928_3.jpg"
          name="Alexis E. L."
          platform="udemy"
          comment="Hector es un genio enseñando, yo había aprendido redux en otro curso, pero verdaderamente . Hector Bliss, lo hizo muy fácil con este curso. Muchas Gracias !!"
        />
        <CommentCard
          name="Marc"
          platform="udemy"
          comment="Excelente explicación de las tecnologías, bastante práctico, útil y entendible, 1000% recomendado para comenzar con estas tecnologías."
        />
        <CommentCard
          image="https://img-c.udemycdn.com/user/50x50/57956236_7683.jpg"
          name="Yair Abner R."
          platform="udemy"
          comment="Excelente curso para iniciar en React JS porque este modelo es la base."
        />

        <CommentCard
          name="Gonzalo C."
          platform="udemy"
          comment="Cumple justo con lo que buscaba. Estaba haciendo un curso más grande en inglés de react y cuando llegué a la parte de redux no entendí nada, así que me puse a buscar una explicación simple y corta de qué es y cómo funciona y encontré este pequeño curso de introducción. Ahora entiendo la base y puedo seguir con el otro, muchas gracias!"
        />
        <CommentCard
          image="/students/victor.png"
          name="Victor Reyes"
          comment="Super agradecido con todo el equipo de Fixter, en especial con Héctor Bliss, los cursos que impartía me ayudaron a actualizarme en diferentes temas como javascript, firebase, react, que hoy en dia son herramientas que utilizo en mi trabajo, y como olvidar los convivios con pizza y cerveza. "
        />

        <CommentCard
          image="/students/osw.png"
          name="Oswaldo Martínez"
          comment="Aprender a programar no es sencillo, enseñarlo tampoco. En fixter tuve la oportunidad de crearme una carrera como desarrollador profesional gracias a la metodología que usan y al acompañamiento que hasta la fecha tengo."
        />
        <CommentCard
          image="/students/carlitos.png"
          name="Carlos Mendoza"
          comment="Mi experiencia en Fixter fue anormal porque conocí a personas motivadas por los mismos temas y podíamos pasar horas y horas hablando de tecnología sin cansancio, ahí descubrí lo increíble que es hacer comunidad."
        />
        <CommentCard
          image="/students/zyan.png"
          name="Zyanya Mo"
          comment="La mejor experiencia en FixterCamp, ya pasaron 5 años y la verdad me gustaría volver a repetir esto, ojala que algún día pueda regresar para actualizarme."
        />
        <CommentCard
          image="/students/pablo.png"
          name="Pablo Castillo"
          comment="Estar en Fixter marco un antes y un después en mi carrera como programador, me mostraron la pasión por el código, resolver problemas, el autoaprendizaje y trabajar duro o irme a casa."
        />

        <CommentCard
          image="/students/richi.png"
          name="Ricardo Hernández"
          comment="Un año después de un salir de un bootcamp, los cursos de Fixter.camp me ayudaron a actualizarme en React y mejoró mucho mi código y mi puesto de trabajo."
        />
        <CommentCard
          name="Adan A."
          tag="@Adan"
          platform="udemy"
          comment="El instructor es espectacular, ya lo conocía pues tengo otro curso de Hector Bliss, de React y es Fantastico, lastima que no hizo mas cursos. Quedo a la espera de que hagas mas cursos profe."
        />

        <CommentCard
          image="/students/mejia.png"
          name="David Mejía"
          comment="Fixter fue un antes y después en mi vida, tanto aprendí cosas que me han ayudado en mi entorno profesional como conocí gente apasionada por el código"
        />
      </div>
    </section>
  );
};

export const CommentCard = ({
  image,
  comment,
  name,
  tag,
  className,
  platform,
}: {
  image?: string;
  comment: ReactNode;
  name: string;
  tag?: string;
  className?: string;
  platform?: string;
}) => {
  const ref = useRef(null);
  const isInview = useInView(ref, { once: true });
  return (
    <motion.div
      style={{
        opacity: isInview ? 1 : 0.8,
        scale: isInview ? 1 : 0.7,
        transform: isInview ? "translateY(0px)" : " translateY(40px)",
        transition: "all 1s ease",
      }}
      className={twMerge(
        "hover:scale-95 flex flex-col justify-between bg-[#1A2229] col-span-1  rounded-2xl px-4 pt-4 pb-6 relative cursor-pointer hover:shadow-[0_16px_16px_rgba(0,0,0,0.05)] dark:hover:shadow-lg transition-all",
        className
      )}
      ref={ref}
    >
      {platform === "udemy" ? (
        <img
          className="absolute right-5 w-8 md:w-8 opacity-20  	"
          src="/udemy.svg"
        />
      ) : platform === "x" ? (
        <img
          className="absolute right-3 w-8 md:w-10 opacity-20  	"
          src="/x-w.png"
        />
      ) : null}

      <div className="mt-10">
        <span className="text-base md:text-lg text-colorParagraph font-light mt-8 md:mt-12 xl:mt-16">
          "{comment}"
        </span>
      </div>

      <div className="mt-6 md:mt-10 flex gap-3 items-center">
        {image ? (
          <img className="w-10 h-10 rounded-full" src={image} />
        ) : (
          <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center ">
            <span className="text-white">{name.substring(0, 1)}</span>
          </div>
        )}

        <div>
          <h4 className="text-white">{name}</h4>
          <p className="text-sm text-iron dark:text-white/30 font-light">
            {tag}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export const formatDuration = (secs: number) => {
  if (isNaN(secs) || !secs) return "60 mins";
  return (secs / 60).toFixed(0) + " mins";
};

export const TopCourses = ({ courses }: { courses?: Partial<Course>[] }) => {
  const fetcher = useFetcher();

  useEffect(() => {
    if (courses) return;

    fetcher.submit(
      { intent: "get_top_courses" },
      { method: "POST", action: "/api/course" }
    );
  }, [courses]);

  const c: Partial<Course>[] = courses || fetcher.data || [];

  return (
    <motion.section className="max-w-7xl mx-auto px-4 md:px-[5%] xl:px-0 my-32  md:my-[160px]">
      <h2 className="text-3xl md:text-4xl xl:text-5xl  font-bold text-white leading-snug text-center">
        Cursos más vendidos
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-20 mt-20 px-4 md:px-0">
        {c.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </motion.section>
  );
};

export const Benefits = () => {
  const ref = useRef(null);
  const isInview = useInView(ref, { once: true });
  return (
    <section className=" mt-0 mb-32 md:my-[160px] px-4 md:px-[5%] xl:px-0 overflow-hidden xl:overflow-visible">
      <motion.div
        ref={ref}
        style={{
          opacity: isInview ? 1 : 0.8,
          scale: isInview ? 1 : 0.7,
          transform: isInview ? "translateY(0px)" : " translateY(40px)",
          transition: "all 1s ease",
        }}
        className="border border-colorOutline rounded-3xl px-6 md:pl-10 xl:pl-16 max-w-7xl mx-auto flex-wrap-reverse lg:flex-nowrap relative flex gap-6 md:gap-16 h-fit md:h-[1100px] lg:h-[900px] xl:h-[800px]"
      >
        <div className="w-full lg:w-[50%] pt-6 md:pt-10 xl:pt-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-snug">
            Una experiencia a la medida
          </h2>
          <p className=" text-colorParagraph font-light mt-4 mb-12">
            ¿Qué te gusta más? ¿Cursos pregrabados, ejercicios prácticos, clases
            en vivo? No tienes que elegir solo una, aprende de la forma que más
            te gusta.
          </p>
          <div className="flex gap-8 flex-col pb-12">
            <Item
              icon="/icons/2025/books.svg"
              title="Cursos en línea"
              description="Si aprender offline es lo tuyo, estos cursos son para ti.
                 Aprende herramientas específicas con cursos pregrabados cortos. Ponte 
                 en mood aprendizaje cuando quieras, desde donde quieras."
            />
            <Item
              icon="/icons/2025/books.svg"
              title="Tutoriales"
              description="Si te gusta resolver algorítmos, crear funciones retadoras,
                 encontrarás en nuestros tutoriales pequeños retos de lógica y algoritmia,
                  y lo mejor, son completamente gratuitos."
            />
            <Item
              icon="/icons/2025/books.svg"
              title="Guías"
              description="Cuando andamos inspirados, públicamos guías cortas sobre cómo iniciar
                 con un nuevo framework, o cómo crear custom hooks, o cómo usar API’s, date una vuelta
                  por la lista completa y descarga la que necesites. ¡Son gratis!"
            />
            <Item
              icon="/icons/2025/books.svg"
              title="Blog"
              description="Semanalmente publicamos en nuestro blog sobre nuevos frameworks, herramientas, hacks o tips de desarrollo web, así que échale un 👁 y no olvides visitarlo de vez en cuando."
            />
          </div>
        </div>{" "}
        <div className="overflow-hidden w-full min-h-[300px]  lg:w-[50%]">
          <JackPotSection
            images={[
              "/tools/react.svg",
              "/tools/js.svg",
              "/tools/ts.svg",
              "/tools/firebase.svg",
              "/tools/tailwind.svg",
              "/tools/mongo.svg",
              "/tools/node.svg",
              "/tools/rust.svg",
              "/tools/docker.svg",
              "/tools/cont.svg",
              "/tools/html.svg",
              "/tools/python.svg",
            ]}
            mode="fast"
          />
        </div>
        <img
          className="w-32 md:w-44 lg:w-auto absolute -right-6 lg:-right-20  top-48 bottom-[inherit] lg:top-[inherit] lg:-bottom-20"
          alt="cohete"
          src="/rocket.svg"
        />
      </motion.div>
    </section>
  );
};

export const Item = ({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, filter: "blur(9px" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px" }}
      exit={{ opacity: 0, y: -40, filter: "blur(9px" }}
      transition={{ type: "spring", bounce: 0, duration: 0.5 }}
      className="flex gap-3 items-start"
    >
      <img src={icon} alt={title} />
      <div>
        <h3 className="text-white font-bold">{title}</h3>
        <p className="text-sm text-colorParagraph font-light mt-2">
          {description}
        </p>
      </div>
    </motion.div>
  );
};

export const Why = () => {
  const ref = useRef(null);
  const isInview = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      style={{
        opacity: isInview ? 1 : 0.8,
        scale: isInview ? 1 : 0.7,
        transform: isInview ? "translateY(0px)" : " translateY(40px)",
        transition: "all 1s ease",
      }}
      className="max-w-7xl mx-auto mt-32 mb-16  md:my-[160px] flex-wrap xl:flex-nowrap flex gap-0 md:gap-16 px-4 md:p-[5%] xl:px-0 "
    >
      <div className="w-full xl:w-[42%]">
        <img className="mb-8" src="/galaxy.svg" alt="galaxy" />
        <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-white !leading-snug">
          Que aprender deje de ser aburrido
        </h2>
        <p className="text-lg text-colorParagraph font-light my-4">
          Nuestra metodología incorpora distintas formas de enseñanza que
          facilitan tu aprendizaje, desde lecciones en video, recursos extra o
          feedback en comunidad. Creemos que el aprendizaje es más fácil y
          duradero cuando te diviertes practicando.
        </p>
        <p className="text-lg text-colorParagraph font-light">
          Nos esforzamos para que nuestros cursos no sean un pack de lecciones
          aburridas llena de teoría y tecnicismos, nos enfocamos en que cada
          lección sea dinámica, entretenida y con ejemplos y ejercicios
          prácticos que realmente puedes utilizar en tu día a día como
          desarrollador.
        </p>
      </div>
      <div className="w-full xl:w-[55%] flex- items-center pt-16 ">
        <TridiLayers images={["/figma-fg.png", "/osw.jpg", "/codigo-fg.png"]} />
      </div>
    </motion.div>
  );
};

export const HomeHero = () => {
  // <<animation
  const ref = useRef(null);
  // const { scrollYProgress } = useScroll({
  //   target: ref,
  //   offset: ["start start", "end start"],
  // });
  // const springScroll = useSpring(scrollYProgress, { bounce: 0 });
  // const opacity = useTransform(springScroll, [0, 1], [1, 0]);
  // const scale = useTransform(springScroll, [0, 1], [1, 1.1]);
  // const filter = useTransform(
  //   springScroll,
  //   [0.3, 0.5],
  //   ["blur(0px)", "blur(9px)"]
  // );
  // animation>>

  return (
    <motion.section
      ref={ref}
      // style={{ opacity, scale, filter }}
      className="bg-heroHome w-full min-h-screen md:h-screen bg-cover bg-center  pt-6 md:pt-0 md:px-10 "
    >
      <div className="flex  flex-col-reverse md:flex-row justify-center md:justify-between items-center max-w-7xl mx-auto h-[95vh] lg:h-[85vh] gap-0 md:gap-0 lg:gap-20">
        <div>
          {/* Tag de nuevo taller Agentes IA */}
          <div className="flex justify-center md:justify-start mb-6 hidden md:flex ">
            <Link to="/agentes" className="group">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-agentes-primary/10 to-agentes-secondary/10 border border-agentes-primary rounded-full px-4 py-2 hover:from-agentes-primary/30 hover:to-agentes-secondary/30 hover:border-agentes-primary/70 transition-all duration-300"
              >
                <span className="text-sm font-semibold text-agentes-primary transition-colors">
                  ✨ Nuevo taller de Construcción de Agentes IA drag & drop
                </span>
              </motion.div>
            </Link>
          </div>
          
          <h2 className="text-3xl xl:text-6xl text-center md:text-left font-bold text-white !leading-snug mt-0 md:mt-12">
            Aprende <br className="md:hidden" />
            <span className="text-brand-500 font-extrabold text-3xl xl:text-6xl ">
              <FlipWords
                words={[
                  "los frameworks",
                  "las herramientas",
                  "las librerías",
                  "las bibliotecas",
                  "los patterns",
                  "los hacks",
                ]}
              />
            </span>{" "}
            <br />
            que usan los profesionales de la industria
          </h2>{" "}
          <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-8 lg:mt-12">
            <PrimaryButton
              as="Link"
              to="/claude"
              children="Aprender Claude"
            />
            <PrimaryButton
              as="Link"
              to="/agentes"
              children="Ir a Creación de agentes no-code"
              variant="ghost"
            />
            {/* <PrimaryButton
              as="Link"
              to="/blog"
              children="Explorar el blog"
              variant="ghost"
            /> */}
          </div>
          {/* Links sutiles a los libros */}
        
            <p className="text-sm text-white/80 hover:text-white  text-center lg:text-left mt-4  gap-2 px-4 lg:px-0">
          📖
               Libro gratuito:  <Link
              to="/libros"
              className="text-sm  text-orange-300  hover:underline transition-all duration-200  "
            >Dominando Claude Code</Link> y    <Link
            to="/libros/llamaindex"
            className="text-sm text-llamaindex-purple hover:underline transition-all duration-200  "
          >LlamaIndex desde Cero</Link>
            </p>

        </div>
        <img className="scale-75 lg:scale-100" src="/robot.svg" alt="robot" />
      </div>
      <div className="max-w-7xl mx-auto ">
        <InfiniteMovingCards
          items={companies}
          direction="left"
          speed="normal"
        />
      </div>
    </motion.section>
  );
};
