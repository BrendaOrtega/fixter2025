import type { Course } from "@prisma/client";
import clsx from "clsx";
import React, { useMemo } from "react";
import { Link } from "react-router";

export type CourseCardProps = CourseType & {
  isEnrolled?: boolean;
  variant?: "default" | "list-item";
  theme?: Record<string, string>;
  course: Course;
  slug: string;
};
export default function CourseCard({
  variant = "default",
  isEnrolled = false,
  title,
  slug,
  duration,
  icon,
  photoUrl,
  level,
  tipo,
  _id,
  id,
  course,
  theme,
}: CourseCardProps) {
  const formatDuration = (number: string | number | null | undefined) => {
    const n = Number(number);
    if (isNaN(n)) return "2hrs 10min";
    const min = Math.floor((n / 60) % 60);
    const hrs = Math.floor(n / 60 / 60);
    return `${hrs}hrs ${min}mins`;
  };

  const link =
    tipo === "live"
      ? (_id || id) + "/dashboard"
      : isEnrolled
      ? "/courses/" + slug + "/viewer"
      : "/courses/" + slug + "/detail";

  const gradient =
    theme && theme.from && theme.to
      ? `linear-gradient(180deg, ${theme.from} 0%, ${theme.to} 100%)`
      : `linear-gradient(180deg, #1D2025 0%, #3A3340 100%)`;

  return (
    <section
      style={{
        background: gradient,
        transition: `all 0.8s cubic-bezier(0.075, 0.82, 0.165, 1) 0s`,
      }}
      className={clsx(
        "relative group  pt-4 pb-6 w-[300px] md:w-[300px] rounded-xl  transition-all cursor-pointer hover:scale-105  ",
        variant === "list-item" &&
          "min-w-full flex max-h-[148px] items-center gap-4 pb-0 "
      )}
    >
      <Link
        to={link}
        prefetch="intent"
        className={clsx(variant === "list-item" && "flex flex-row w-full")}
      >
        <img
          className="w-10 h-10 rounded-full bg-white z-1 absolute right-4"
          src={photoUrl}
        />
        <div
          className={clsx(
            " mb-3  flex justify-center w-full",
            variant === "list-item" && "max-w-[200px] mb-0"
          )}
        >
          <img
            className={clsx(
              "object-cover w-[80%] group-hover:scale-[.95] transition-all group-hover:translate-y-[-12px]",
              variant === "list-item" &&
                "h-[140px] w-[auto] mt-[-16px] group-hover:translate-y-[-6px]"
            )}
            style={{
              transition: "all 0.8s cubic-bezier(0.075, 0.82, 0.165, 1) 0s",
            }}
            src={icon}
            alt="cover"
          />
        </div>
        <article className="px-2 box-border	 w-full">
          <div
            className={clsx(
              " flex	 items-center min-h-[56px] ",
              variant === "list-item"
                ? "justify-start text-left min-h-[auto]"
                : "items-center justify-center text-center"
            )}
          >
            <h3
              style={{ fontFamily: "Proxima Nova Bold" }}
              className="font-bold text-lg text-white  "
            >
              {title}{" "}
            </h3>
          </div>
          <div
            className={clsx(
              "flex flex-col  gap-2 justify-center",
              variant === "list-item" ? "items-start" : "items-center"
            )}
          >
            <div className="flex items-center">
              <span className="text-xs  pt-[2px] text-[#EAE9E9]">
                {theme?.learnings} lecciones
              </span>
              <span className="mx-1 text-[#EAE9E9] text-xs">| </span>
              <img className="w-[12px] " src="/assets/reloj.svg" />
              <span className="text-xs pt-[2px] ml-[4px] text-[#EAE9E9]">
                {" "}
                {formatDuration(duration)}
              </span>
            </div>
            <span className="uppercase text-[#ffffff] tracking-wide text-xs font-light flex gap-1 items-center mt-2">
              {level} <Dots level={level} />
            </span>
          </div>
        </article>
      </Link>
    </section>
  );
}

export const Dots = ({
  level = "principiante",
}: {
  level?: "principiante" | "intermedio" | "avanzado" | string;
}) => {
  return (
    <div className="flex gap-[2px] ml-[4px]">
      {level === "principiante" ? (
        <>
          <img src="/assets/rayo-amarillo.svg" />
          <img src="/assets/rayo-gris.png" />
          <img src="/assets/rayo-gris.png" />
        </>
      ) : level === "intermedio" ? (
        <>
          <img src="/assets/rayo-amarillo.svg" />
          <img src="/assets/rayo-amarillo.svg" />
          <img src="/assets/rayo-gris.png" />
        </>
      ) : (
        <>
          <img src="/assets/rayo-amarillo.svg" />
          <img src="/assets/rayo-amarillo.svg" />
          <img src="/assets/rayo-amarillo.svg" />
        </>
      )}
    </div>
  );
};

const Dot = ({
  isActive,
  color,
}: {
  isActive?: boolean;
  color?: "green" | "blue" | "orange";
}) => {
  const classname = useMemo(() => {
    if (!isActive) {
      return `w-2 h-2 rounded-full bg-slate-300`;
    }
    if (color === "green") {
      return `w-2 h-2 rounded-full bg-green-300`;
    }
    if (color === "blue") {
      return `w-2 h-2 rounded-full bg-blue-300`;
    }
    if (color === "orange") {
      return `w-2 h-2 rounded-full bg-orange-300`;
    }
  }, [color, isActive]);

  return <div className={classname}></div>;
};
