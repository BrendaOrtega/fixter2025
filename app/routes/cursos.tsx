import { type ReactNode } from "react";
import { PrimaryButton } from "~/components/PrimaryButton";
import { Footer } from "~/components/Footer";
import {
  Link,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { db } from "~/.server/db";
import type { Route } from "./+types/cursos";
import type { Course } from "@prisma/client";
import { useVideosLength } from "~/hooks/useVideosLength";
import { Header } from "~/components/common/Header";
import { motion } from "framer-motion";
import { use3DHover } from "~/hooks/use3DHover";
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
    orderBy: { createdAt: "desc" },
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
      <Banner>
        <div className="w-full md:w-[60%]">
          <h3 className="text-3xl md:text-4xl text-white font-bold mb-10 !leading-snug">
            ¿Explorando nuevas herramientas? Visita nuestro Blog
          </h3>{" "}
          <PrimaryButton as="Link" to="/blog" title="Ver blog" />
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
    <div className="px-4 md:px-[5%] lg:px-0 max-w-7xl mx-auto">
      <div
        className={cn(
          "bg-bannerOne  bg-contain md:bg-cover bg-no-repeat  bg-right-bottom h-[300px] my-32 md:my-60 p-6 md:p-12 rounded-3xl border-[2px] border-brand-500",
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

export const CousesList = ({ courses }: { courses: Course[] }) => {
  return (
    <div className="grid gap-20 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-32 w-full px-8 md:px-[5%] lg:px-0 max-w-7xl mx-auto">
      {courses.map((course) => (
        <CourseCard courseSlug={course.slug} key={course.id} course={course} />
      ))}
    </div>
  );
};

export const formatDuration = (secs?: string | number | null) => {
  if (typeof secs === "string") {
    secs = Number(secs);
  }
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
  const {
    containerRef,
    springX,
    springY,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseMove,
    isHovered,
  } = use3DHover();
  // @todo add courses route to save seo
  return (
    <Link
      to={`/cursos/${courseSlug}/detalle`}
      className="grid-cols-1 relative w-full h-[480px]"
      style={{
        transformStyle: "preserve-3d",
        perspective: 600,
      }}
    >
      {!isHovered && (
        <div className="bg-brand-500/40 blur-xl w-full h-[480px] rounded-3xl" />
      )}
      <motion.div
        style={{ rotateX: springX, rotateY: springY }}
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="pt-2 absolute top-0 rounded-3xl border bg-cover border-white/20 bg-card w-full h-full"
      >
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
      </motion.div>
    </Link>
  );
};
