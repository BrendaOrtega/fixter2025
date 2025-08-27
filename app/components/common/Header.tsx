import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export const Header = ({
  title = "Cursos",
  text = "Mejora tus skills profesionales con cursos específicos, cuando quieras desde donde quieras",
  className,
}: {
  title?: string;
  text?: ReactNode;
  className?: string;
}) => {
  return (
    <section
      className={twMerge(
        "h-[360px] md:h-[480px] bg-stars bg-cover bg-bottom flex items-center justify-center px-4 md:px-[5%] xl:px-0",
        className
      )}
    >
      <div className="text-center mt-10 md:mt-0">
        <h2 className="text-4xl md:text-5xl xl:text-6xl font-bold text-white">
          {title}
        </h2>
        <p className="text-colorParagraph text-xl mt-6 font-light lg:max-w-7xl max-w-2xl">
          {text}
        </p>{" "}
      </div>
    </section>
  );
};
