import type { ReactNode } from "react";
import type { Route } from "./+types/home";
import { Footer } from "~/components/Footer";
import { PrimaryButton } from "~/components/PrimaryButton";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Cursos" },
    { name: "description", content: "Encuentra el curso para ti" },
  ];
}

export default function Detail() {
  return (
    <>
      <CourseHeader />
      <CourseContent />
      <Teacher />
      <Footer />
    </>
  );
}

const CourseContent = () => {
  return (
    <section className=" mt-20 md:mt-32 w-full px-8 md:px-[5%] lg:px-0 max-w-7xl mx-auto ">
      <p className="text-colorParagraph text-base md:text-lg mt-6 font-light">
        Lorem ipsum dolor sit amet consectetur. Nisl euismod tristique
        vestibulum faucibus diam vel. Tempor dictum tincidunt integer sed
        scelerisque ipsum tristique eget suspendisse. Nunc ut nisl tortor
        elementum. Vestibulum enim ut dolor nulla faucibus ut dui. Diam eget
        sagittis at nisi fermentum purus amet nibh laoreet. Vulputate
        condimentum cras facilisi ipsum arcu{" "}
      </p>
      <div className="border-[1px] my-20 border-brand-500 rounded-3xl p-6 md:p-16 relative">
        <img
          className="absolute -top-12 -left-8"
          alt="comic"
          src="/courses/comic.svg"
        />
        <img
          className="w-32 md:w-auto absolute -right-6 md:-right-16 -bottom-16"
          alt="comic"
          src="/courses/astronaut.svg"
        />
        <h3 className="text-4xl font-bold text-white">¿Qué vas a aprender?</h3>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Lesson title="Pollitos a la naranja" />
          <Lesson title="Pollitos a la naranja" isFree={true} />
          <Lesson title="Pollitos a la naranja" />
          <Lesson title="Pollitos a la naranja" isFree={true} />
          <Lesson title="Pollitos a la naranja" />
          <Lesson title="Pollitos a la naranja" />
          <Lesson title="Pollitos a la naranja" />
          <Lesson title="Pollitos a la naranja" />
          <Lesson title="Pollitos a la naranja" />
          <Lesson title="Pollitos a la naranja" />
        </div>
      </div>
    </section>
  );
};

const Teacher = ({
  teacher,
  description,
  image,
}: {
  teacher?: string;
  description?: ReactNode;
  image?: string;
}) => {
  return (
    <section className="mt-32 w-full px-8 md:px-[5%] lg:px-0 max-w-7xl mx-auto my-[160px]  overflow-hidden">
      <div className="bg-backface rounded-3xl md:py-16 md:pl-16 pt-6 px-6 w-full relative pb-80 ">
        <div className="w-full md:w-[60%]">
          <span className="text-colorParagraph font-light">
            ¿Quien es tu instructor?
          </span>
          <h3 className="text-white text-3xl font-bold mt-4">
            {teacher ? teacher : "Héctor Bliss"}
          </h3>{" "}
          {description ? (
            description
          ) : (
            <div>
              {" "}
              <p className="text-colorParagraph font-light mt-8 text-base md:text-lg">
                Con más de 10 años de experiencia como desarrollador de software
                profesional e instructor tecnológico, Héctor Bliss disfruta de
                simplificar temas complejos para que sus estudiantes
                puedan aprender de la forma más práctica, rápida y
                divertida. Héctor ha sido instructor en diferentes bootcamps
                internacionales, y ha grabado infinidad de cursos en línea. Por
                medio de su canal de youtube enseña los temas más actualizados
                de la industria tecnológica, acercando las herramientas que usan
                los profesionales a nivel mundial a sus estudiantes de habla
                hispana.
              </p>
              <p className="text-colorParagraph font-light mt-4 text-base md:text-lg">
                Si no has experimentado una clase con Héctor Bliss, es tu
                momento de comprobar que aprender no tiene que ser ni díficil ni
                aburrido.
              </p>{" "}
            </div>
          )}
        </div>
        <div className=" absolute -bottom-16 -right-16">
          <img
            className="scale-75 md:scale-100"
            src={image ? image : "/courses/titor.png"}
            alt={teacher ? teacher : "Héctor Bliss"}
          />
        </div>
      </div>
    </section>
  );
};

const Lesson = ({ title, isFree }: { title: string; isFree?: boolean }) => {
  return (
    <div className="col-span-1 border border-colorOutline rounded-lg h-12 flex items-center justify-between px-4 ">
      <div className="flex gap-3">
        <img src="/courses/code.svg" />
        <p className="text-white font-light">{title}</p>
      </div>
      {isFree ? <img src="/courses/free.svg" alt="free mark" /> : null}
    </div>
  );
};

const CourseHeader = ({
  title,
  description,
  lessons,
  duration,
  image,
}: {
  title?: string;
  description?: ReactNode;
  lessons?: string;
  duration?: string;
  level?: string;
  image?: string;
}) => {
  return (
    <section className="w-full h-fit py-20 md:py-0 md:h-[580px] bg-hero bg-cover bg-botom bg-center ">
      <div className="max-w-7xl mx-auto flex items-center h-full gap-12 md:gap-0  flex-wrap-reverse md:flex-nowrap px-4 md:px-[5%] xl:px-0">
        <div className="text-left w-full md:w-[60%]">
          <h2 className="text-4xl md:text-5xl xl:text-5xl font-bold text-white">
            Mínimo JS para React
          </h2>
          <p className="text-colorParagraph text-base md:text-lg mt-6 font-light">
            Lorem ipsum dolor sit amet consectetur. Mauris cum sed eget lorem
            turpis facilisis ac amet tincidunt. Nulla dui egestas sodales augue.
            Fermentum ac turpis est eu. Porttitor tellus sapien magna
          </p>{" "}
          <div className="flex items-center mt-6 gap-4">
            <p className="text-colorParagraph text-base md:text-lg  font-light">
              17 lecciones
            </p>
            <p className="text-colorParagraph text-base md:text-lg font-light">
              | 10 horas |
            </p>
            <div className="flex gap-2 ">
              <p className=" text-brand-500 uppercase"> Avanzado</p>
              <span className="flex gap-2">
                <img src="/thunder.svg" className="w-3" />
                <img src="/thunder.svg" className="w-3" />
                <img src="/thunder.svg" className="w-3" />
              </span>
            </div>
          </div>
          <div className="gap-6 flex mt-10">
            <PrimaryButton type="fill" title="Empezar gratis" />
            <PrimaryButton type="ghost" title="Comprar $499 mxn" />
          </div>
        </div>
        <div className="w-full md:w-[40%]  flex justify-center h-full items-center">
          <img className="w-[50%]" src="/js.png" alt="curso" />{" "}
        </div>
      </div>
    </section>
  );
};
