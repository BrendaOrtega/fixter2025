import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import type { ReactNode } from "react";
import { PrimaryButton } from "~/components/PrimaryButton";
import { Footer } from "~/components/Footer";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Cursos" },
    { name: "description", content: "Encuentra el curso para ti" },
  ];
}

export default function Courses() {
  return (
    <>
      <Header />
      <CousesList />
      <Banner>
        <div className="w-full md:w-[60%]">
          <h3 className="text-2xl md:text-4xl text-white font-bold mb-10 leading-snug">
            ¿Explorando nuevas herramientas? Visita nuestro Blog
          </h3>{" "}
          <PrimaryButton link="/blog" title="Ver blog" />
        </div>
      </Banner>
      <Footer />
    </>
  );
}

export const Banner = ({ children }: { children: ReactNode }) => {
  return (
    <div className="px-8 md:px-[5%] lg:px-0 max-w-7xl mx-auto">
      <div className="p-12 rounded-3xl border-[2px] border-brand-500 bg-bannerOne bg-cover bg-right-bottom  h-[300px] my-60">
        {children}
      </div>{" "}
    </div>
  );
};

const CousesList = () => {
  return (
    <div className="grid gap-20 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-32 w-full px-8 md:px-[5%] lg:px-0 max-w-7xl mx-auto">
      <CourseCard
        title="Mínimo JS para React"
        lessons=" 17 lecciones"
        duration="32 minutos"
        level="Avanzado"
        image="/js.png"
      />
      <CourseCard
        title="Mínimo JS para React"
        lessons=" 17 lecciones"
        duration="32 minutos"
        level="Avanzado"
        image="/js.png"
      />
      <CourseCard
        title="Mínimo JS para React"
        lessons=" 17 lecciones"
        duration="32 minutos"
        level="Avanzado"
        image="/js.png"
      />
      <CourseCard
        title="Mínimo JS para React"
        lessons=" 17 lecciones"
        duration="32 minutos"
        level="Avanzado"
        image="/js.png"
      />
      <CourseCard
        title="Mínimo JS para React"
        lessons=" 17 lecciones"
        duration="32 minutos"
        level="Avanzado"
        image="/js.png"
      />
      <CourseCard
        title="Mínimo JS para React"
        lessons=" 17 lecciones"
        duration="32 minutos"
        level="Avanzado"
        image="/js.png"
      />
    </div>
  );
};

export const CourseCard = ({
  title,
  lessons,
  duration,
  level,
  image,
}: {
  title: string;
  lessons: string;
  duration: string;
  level: string;
  image: string;
}) => {
  return (
    <div className="grid-cols-1 relative w-full h-[480px]">
      <div className="bg-brand-500/40 blur-xl w-full h-[480px] rounded-3xl"></div>{" "}
      <div className="pt-12 absolute top-0 rounded-3xl border bg-cover border-white/20 bg-card w-full h-full">
        <img className="mx-auto h-60 " src={image} alt={title} />
        <h3 className="font-bold text-2xl text-white mt-8 text-center">
          {title}
        </h3>
        <p className="mt-3 text-colorCaption font-light text-center">
          {lessons} | {duration}
        </p>
        <div className="flex gap-2 mx-auto justify-center text-center mt-6">
          <p className=" text-brand-500 uppercase">{level}</p>
          {level === "Avanzado" ? (
            <span className="flex gap-2">
              <img src="/thunder.svg" className="w-3" />
              <img src="/thunder.svg" className="w-3" />
              <img src="/thunder.svg" className="w-3" />
            </span>
          ) : (
            <span className="flex gap-2">
              <img src="/thunder.svg" className="w-3" />
              <img src="/thunder.svg" className="w-3" />
              <img className="opacity-25 w-3" src="/thunder.svg" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const Header = () => {
  return (
    <section className="h-[480px] bg-stars bg-cover bg-bottom flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-4xl md:text-5xl xl:text-6xl font-bold text-white">
          Cursos
        </h2>
        <p className="text-colorParagraph text-xl md:text-2xl mt-6 font-light">
          Mejora tus skills profesionales con cursos específicos, cuando quieras
          desde donde quieras.
        </p>{" "}
      </div>
    </section>
  );
};
