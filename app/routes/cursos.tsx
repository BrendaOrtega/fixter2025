import { useEffect, type ReactNode } from "react";
import { PrimaryButton } from "~/components/PrimaryButton";
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
import { cn } from "~/lib/utils";

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
    <>
      <Header />
      <CousesList courses={courses} />
      <CourseBanner />
      <Banner>
        <div className="w-full md:w-[60%]">
          <h3 className="text-2xl md:text-4xl text-white font-bold mb-10 !leading-snug">
            ¿Explorando nuevas herramientas? Visita nuestro Blog
          </h3>{" "}
          <PrimaryButton link="/blog" title="Ver blog" />
        </div>
      </Banner>
      <Footer />
    </>
  );
}

export const Banner = ({
  children,
  className,
  variant,
}: {
  children: ReactNode;
  className?: string;
  variant?: string;
}) => {
  return (
    <div className="px-8 md:px-[5%] lg:px-0 max-w-7xl mx-auto">
      <div
        className={cn(
          "bg-bannerOne bg-cover  bg-right-bottom  h-[300px] my-60 p-12 rounded-3xl border-[2px] border-brand-500",
          {
            "bg-bannerHome ": variant === "home",
          }
        )}
      >
        {children}
      </div>{" "}
    </div>
  );
};

const CousesList = ({ courses }: { courses: Course[] }) => {
  return (
    <div className="grid gap-20 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-32 w-full px-8 md:px-[5%] lg:px-0 max-w-7xl mx-auto">
      {courses.map((course) => (
        <CourseCard courseSlug={course.slug} key={course.id} course={course} />
      ))}
    </div>
  );
};

export const formatDuration = (secs: number) => {
  if (isNaN(secs) || !secs) return "60 mins";
  return (secs / 60).toFixed(0) + " mins";
};

export const CourseCard = ({
  course,
  courseSlug,
}: {
  courseSlug: string;
  course: Course;
}) => {
  const videosLength = useVideosLength(course.id);

  // @todo add courses route to save seo
  return (
    <Link
      to={`/cursos/${courseSlug}/detalle`}
      className="grid-cols-1 relative w-full h-[480px]"
    >
      <div className="bg-brand-500/40 blur-xl w-full h-[480px] rounded-3xl"></div>{" "}
      <div className="pt-12 absolute top-0 rounded-3xl border bg-cover border-white/20 bg-card w-full h-full">
        <img className="mx-auto h-60 " src={course.icon} alt={course.title} />
        <h3 className="font-bold text-2xl text-white mt-8 text-center">
          {course.title}
        </h3>
        <p className="mt-3 text-colorCaption font-light text-center">
          {videosLength} lecciones | {formatDuration(course.duration)}
        </p>
        <div className="flex gap-2 mx-auto justify-center text-center mt-6">
          <p className=" text-brand-500 uppercase">{course.level}</p>
          {course.level === "Avanzado" ? (
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
    </Link>
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
