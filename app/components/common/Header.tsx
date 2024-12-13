import type { ReactNode } from "react";

export const Header = ({
  title = "Cursos",
  text = "Mejora tus skills profesionales con cursos específicos, cuando quieras desde donde quieras.",
}: {
  title?: string;
  text?: ReactNode;
}) => {
  return (
    <section className="h-[480px] bg-stars bg-cover bg-bottom flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-4xl md:text-5xl xl:text-6xl font-bold text-white">
          {title}
        </h2>
        <p className="text-colorParagraph text-xl md:text-2xl mt-6 font-light lg:max-w-7xl max-w-lg">
          {text}
        </p>{" "}
      </div>
    </section>
  );
};
