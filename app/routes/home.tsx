import { FlipWords } from "~/components/FlipWords";

import { JackPotSection } from "~/components/Jackpot";
import { Banner, CourseCard } from "~/routes/cursos";
import { useEffect, type ReactNode } from "react";
import { PrimaryButton } from "~/components/common/PrimaryButton";
import { Footer } from "~/components/Footer";
import {
  Link,
  useFetcher,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { db } from "~/.server/db";
import type { Route } from "./+types/cursos";
import type { Course } from "@prisma/client";
import { useVideosLength } from "~/hooks/useVideosLength";
import { CourseBanner } from "~/components/CourseBanner";
import { twMerge } from "tailwind-merge";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Cursos" },
    { name: "description", content: "Encuentra el curso para ti" },
  ];
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  return null;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const courses = await db.course.findMany({
    take: 3,
    orderBy: {
      createdAt: "desc",
    },
    where: {
      published: true,
    },
    select: {
      title: true,
      duration: true,
      icon: true,
      isFree: true,
      createdAt: true,
      level: true,
      videoIds: true,
      id: true,
      slug: true,
    },
  });
  return { courses };
};

export default function Route({
  loaderData: { courses },
}: Route.ComponentProps) {
  return (
    <main className="">
      <HomeHero />
      <Why />
      <Benefits />
      <TopCourses courses={courses} />
      <div className="bg-planet bg-bottom bg-cover ">
        <Comments />
        <Banner variant="home">
          <div className="w-full md:w-[60%]">
            <h3 className="text-2xl md:text-4xl text-white font-bold mb-10 !leading-snug">
              ¿Listo para mejorar tus skills en programación?
            </h3>{" "}
            <PrimaryButton link="/cursos" title="Explorar cursos" />
          </div>
        </Banner>
        <Footer />
      </div>
    </main>
  );
}

const Comments = () => {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-[5%] xl:px-0 my-[160px] md:my-[240px] ">
      <h2 className="text-3xl md:text-4xl lg:text-5xl  font-bold text-white leading-snug text-center">
        Qué piensan nuestros estudiantes
      </h2>
      <p className="text-base md:text-lg text-colorParagraph font-light my-4 text-center">
        +20,000 estudiantes han confiado en nuestros cursos en línea y
        presenciales
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3  mt-12 md:mt-16 gap-8 lg:gap-y-12 xl:gap-12">
        <CommentCard
          image="https://pbs.twimg.com/profile_images/456497156975644673/QmpE5sMs_400x400.jpeg"
          name="Rodrigo"
          tag="@Alientres"
          comment="Hola, tomé un curso con @FixterGeek Desarrollo Web Full-Stack, me gusto la forma de explicar del profesor y las mentorías personalizadas, también las tecnologías aprendidas son de vanguardia. ¡Se los recomiendo!"
        />
        <CommentCard
          image="https://pbs.twimg.com/profile_images/1640439802104369153/P4m1BLS7_400x400.jpg"
          name="Jonathan"
          tag="@johnxgear"
          comment="Creo que una de las mejores decisiones ha sido tomar un curso en @FixterGeek es una buena forma de aprender / retomar la programación sin duda una gran experiencia, gracias por dejarme ser parte de esta comunidad. 😎🔥🙌🏼"
        />
        <CommentCard
          image="https://pbs.twimg.com/profile_images/1363555823138590724/BSg51cKM_400x400.jpg"
          name="Brenda Ortega"
          tag="@brendaojs"
          comment="En 2016, aprendí frontend en @FixterGeek, era la primera vez que veía la terminal así que fue un poco doloroso pero satisfactorio. 6 años más tarde, después de varios empleos y mucho aprendizaje puedo decir que fue la mejor decisión que he tomado. 👩🏻‍💻😊"
        />
        <CommentCard
          image="https://pbs.twimg.com/profile_images/1605726489055334400/olSwWtH8_400x400.jpg"
          name="David Duran Valdes"
          tag="@DavidDuranVal"
          comment="La forma de enseñar de @HectorBlisS @FixterGeek junto con la documentación y los lerning's son de gran ayuda para resolver los ejercicios y proyectos del curso, los temas parecen mas faciles de lo que son y te motivan a seguir aprendiendo, practicando y mejorar tus conocimientos."
        />
        <CommentCard
          image="https://pbs.twimg.com/profile_images/1509233081194004490/hwUK6HvV_400x400.jpg"
          name="Sandy"
          tag="@SandHv"
          comment="@FixterGeek ha sido una experiencia agradable y nutritiva técnicamente hablando, continuaré con los siguientes cursos para seguir retroalimentando y aprendiendo las nuevas técnicas del mundo de desarrollo web, gracias fixter ✨🐥👩🏻‍💻"
        />
        <CommentCard
          image="https://pbs.twimg.com/profile_images/1659370175546765314/NQtKyiWa_400x400.jpg"
          name="Gustavo"
          tag="@kinxori"
          comment="Hi everyone! As you may know, I am in the journey to become a former web developer! I've started taking bootcamps with @FixterGeek and it's been a great experience. We have access to mentorships through all the course lapse and to be fair, Bliss has a natural talent to teach! 👨‍💻"
        />
        <CommentCard
          image="https://img-c.udemycdn.com/user/50x50/60222492_f928_3.jpg"
          name="Alexis E. L."
          platform="udemy"
          tag=""
          comment="Hector es un genio enseñando, yo había aprendido redux en otro curso, pero verdaderamente . Hector Bliss, lo hizo muy fácil con este curso. Muchas Gracias !!"
        />
        <CommentCard
          image="https://pbs.twimg.com/profile_images/1509233081194004490/hwUK6HvV_400x400.jpg"
          name="Marc"
          tag="@Marc"
          platform="udemy"
          comment="Excelente explicación de las tecnologías, bastante práctico, útil y entendible, 1000% recomendado para comenzar con estas tecnologías."
        />
        <CommentCard
          image="https://img-c.udemycdn.com/user/50x50/57956236_7683.jpg"
          name="Yair Abner R."
          tag="@kinxori"
          platform="udemy"
          comment="Excelente curso para iniciar en React JS porque este modelo es la base."
        />

        <CommentCard
          image="https://pbs.twimg.com/profile_images/1605726489055334400/olSwWtH8_400x400.jpg"
          name="Gonzalo C."
          tag="@DavidDuranVal"
          platform="udemy"
          comment="Cumple justo con lo que buscaba. Estaba haciendo un curso más grande en inglés de react y cuando llegué a la parte de redux no entendí nada, así que me puse a buscar una explicación simple y corta de qué es y cómo funciona y encontré este pequeño curso de introducción. Ahora entiendo la base y puedo seguir con el otro, muchas gracias!"
        />
        <CommentCard
          image="https://pbs.twimg.com/profile_images/1509233081194004490/hwUK6HvV_400x400.jpg"
          name="Adan A."
          tag="@Adan"
          platform="udemy"
          comment="El instructor es espectacular, ya lo conocía pues tengo otro curso de Hector Bliss, de React y es Fantastico, lastima que no hizo mas cursos. Quedo a la espera de que hagas mas cursos profe."
        />
        <CommentCard
          image="https://img-c.udemycdn.com/user/50x50/33424336_3a73.jpg"
          name="Jorge M."
          tag="@kinxori"
          platform="udemy"
          comment="Excelente curso!!! Excelente la forma de explicar!!! Sería genial que crees un curso avanzado de React, donde se desarrolle una aplicación con validaciones de formularios, cargar datos a los formularios desde DB, JWT, roles de usuarios, lazyload, múltiples layouts, etc."
        />
      </div>
    </section>
  );
};

const CommentCard = ({
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
  tag: string;
  className?: string;
  platform?: string;
}) => {
  return (
    <div
      className={twMerge(
        "flex flex-col justify-between bg-[#1A2229] col-span-1  rounded-2xl px-4 pt-4 pb-6 relative cursor-pointer hover:shadow-[0_16px_16px_rgba(0,0,0,0.05)] dark:hover:shadow-lg transition-all",
        className
      )}
    >
      {platform === "udemy" ? (
        <img
          className="absolute right-5 w-8 md:w-8 opacity-20  	"
          src="/udemy.svg"
        />
      ) : (
        <img
          className="absolute right-3 w-8 md:w-10 opacity-20  	"
          src="/x-w.png"
        />
      )}

      <div className="mt-10">
        <span className="text-base md:text-lg text-colorParagraph font-light mt-8 md:mt-12 xl:mt-16">
          "{comment}"
        </span>
      </div>

      <div className="mt-6 md:mt-10 flex gap-3 items-center">
        <img
          className="w-12 h-12 rounded-full object-cover"
          src={
            image
              ? image
              : "https://images.pexels.com/photos/1181352/pexels-photo-1181352.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          }
        />

        <div>
          <h4 className="text-white">{name}</h4>
          <p className="text-sm text-iron dark:text-white/30 font-light">
            {tag}
          </p>
        </div>
      </div>
    </div>
  );
};

export const formatDuration = (secs: number) => {
  if (isNaN(secs) || !secs) return "60 mins";
  return (secs / 60).toFixed(0) + " mins";
};

const TopCourses = ({ courses }: { courses: Course[] }) => {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-[5%] xl:px-0 my-[160px]">
      <h2 className="text-3xl md:text-4xl lg:text-5xl  font-bold text-white leading-snug text-center">
        Cursos más vendidos
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20 mt-20 px-4 md:px-0">
        {courses.map((course) => (
          <CourseCard
            courseSlug={course.slug}
            key={course.id}
            course={course}
          />
        ))}{" "}
      </div>
    </section>
  );
};

const Benefits = () => {
  return (
    <section className=" my-[160px] px-4 md:px-[5%] xl:px-0 overflow-hidden">
      <div className="border border-colorOutline rounded-3xl px-6 md:pl-16 max-w-7xl mx-auto flex-wrap-reverse md:flex-nowrap relative flex gap-6 md:gap-16 h-fit md:h-[800px]">
        <div className="w-full md:w-[50%] pt-6 md:pt-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-snug">
            Que aprender deje de ser aburrido
          </h2>
          <p className=" text-colorParagraph font-light mt-4 mb-12">
            ¿Qué te gusta más? ¿Cursos pregrabados, ejercicios prácticos, clases
            en vivo? No tienes que elegir solo una, aprende de la forma que más
            te gusta.
          </p>
          <div className="flex gap-8 flex-col pb-12">
            <Item
              icon="/icons/2025/books.svg"
              title="Cursos en vivo"
              description="  Inscríbete a los cursos en donde tendrás clases en vivo dos veces por
          semana, recursos extra en la plataforma, mentorías y sesiones de
          feedback. Perfecto para aprender y resolver tus dudas al momento."
            />
            <Item
              icon="/icons/2025/books.svg"
              title="Cursos en vivo"
              description="  Inscríbete a los cursos en donde tendrás clases en vivo dos veces por
          semana, recursos extra en la plataforma, mentorías y sesiones de
          feedback. Perfecto para aprender y resolver tus dudas al momento."
            />
            <Item
              icon="/icons/2025/books.svg"
              title="Cursos en vivo"
              description="  Inscríbete a los cursos en donde tendrás clases en vivo dos veces por
          semana, recursos extra en la plataforma, mentorías y sesiones de
          feedback. Perfecto para aprender y resolver tus dudas al momento."
            />
            <Item
              icon="/icons/2025/books.svg"
              title="Cursos en vivo"
              description="  Inscríbete a los cursos en donde tendrás clases en vivo dos veces por
          semana, recursos extra en la plataforma, mentorías y sesiones de
          feedback. Perfecto para aprender y resolver tus dudas al momento."
            />
          </div>
        </div>{" "}
        <div className="overflow-hidden w-full md:w-[50%]">
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
          className="w-32 md:w-auto absolute -right-6 md:-right-20 top-48 md:-bottom-20"
          alt="cohete"
          src="/rocket.svg"
        />
      </div>
    </section>
  );
};

const Item = ({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) => {
  return (
    <div className="flex gap-3 items-start">
      <img src={icon} alt={title} />
      <div>
        <h3 className="text-white font-bold">{title}</h3>
        <p className="text-sm text-colorParagraph font-light mt-2">
          {description}
        </p>
      </div>
    </div>
  );
};

const Why = () => {
  return (
    <section className="max-w-7xl mx-auto my-[160px] flex-wrap md:flex-nowrap flex gap-16 px-4 md:p-[5%] xl:px-0">
      <div className="w-full md:w-[50%]">
        <img className="mb-8" src="/galaxy.svg" alt="galaxy" />
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
          Que aprender deje de ser aburrido
        </h2>
        <p className="text-lg text-colorParagraph font-light my-4">
          Lorem ipsum dolor sit amet consectetur. Mauris cum sed eget lorem
          turpis facilisis ac amet tincidunt. Nulla dui egestas sodales augue.
          Fermentum ac turpis est eu. Porttitor tellus sapien magna morbi duis
          pulvinar accumsan id quam. Ipsum eget suscipit dolor fermentum
          hendrerit donec viverra. Sapien tellus mauris porttitor mattis varius
          commodo volutpat interdum habitant.
        </p>
        <p className="text-lg text-colorParagraph font-light">
          Lorem ipsum dolor sit amet consectetur. Mauris cum sed eget lorem
          turpis facilisis ac amet tincidunt. Nulla dui egestas sodales augue.
          Fermentum ac turpis est eu. Porttitor tellus sapien magna morbi duis
          pulvinar accumsan id quam. Ipsum eget suscipit dolor fermentum
          hendrerit donec viverra. Sapien tellus mauris porttitor mattis varius
          commodo volutpat interdum habitant.
        </p>
      </div>
      <div className="w-[50%] bg-brand-500"> hola</div>
    </section>
  );
};

const HomeHero = () => {
  return (
    <section className="bg-heroHome w-full min-h-screen md:h-screen bg-cover bg-center  pt-52 md:pt-0 ">
      <div className="flex flex-wrap-reverse md:flex-nowrap justify-center md:justify-between items-center max-w-7xl mx-auto h-full gap-20">
        <div>
          <h2 className="text-4xl xl:text-6xl text-center md:text-left font-bold text-white leading-snug">
            Aprende las{" "}
            <span className="text-brand-500 font-extrabold text-4xl xl:text-6xl ">
              <FlipWords words={["herramientas", "frameworks", "librerías"]} />
            </span>{" "}
            <br />
            que usan los profesionales de la industria.
          </h2>{" "}
          <div className="flex justify-center md:justify-start gap-6 mt-12">
            <PrimaryButton as="Link" to="/cursos" />
            <PrimaryButton
              as="Link"
              to="/blog"
              title="Ir al blog"
              variant="ghost"
            />
          </div>
        </div>
        <img className="scale-75 md:scale-100" src="/robot.svg" alt="robot" />
      </div>
    </section>
  );
};
