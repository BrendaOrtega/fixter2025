import { useEffect, type ReactNode } from "react";
import { PrimaryButton } from "~/components/common/PrimaryButton";
import { Footer } from "~/components/Footer";
import { type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import type { Route } from "./+types/cursos";
import type { Course } from "~/types/models";
import { Header } from "~/components/common/Header";
import { CourseCard } from "~/components/CourseCard";
import { cn } from "~/utils/cn";
import { Banner } from "~/components/common/Banner";
import getMetaTags from "~/utils/getMetaTags";

export const meta = () =>
  getMetaTags({
    title: "Escoge tu curso",
    description: "Encuentra el curso para ti",
  });

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
      tipo: true,
      isLive: true,
      startDate: true,
      landingUrl: true,
    },
  });
  return { courses };
};

export default function Route({
  loaderData: { courses },
}: Route.ComponentProps) {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, []);
  return (
    <>
      <Header className="bg-heroCourses" />
      <CousesList courses={courses} />
      <Banner>
        <div className="w-full md:w-[60%]">
          <h3 className="text-3xl md:text-3xl lg:text-4xl text-white font-bold mb-10 !leading-snug">
            ¿Explorando nuevas herramientas? Visita nuestro Blog
          </h3>{" "}
          <PrimaryButton as="Link" to="/blog" title="Ver blog" />
        </div>
      </Banner>
      <Footer />
    </>
  );
}

// Cursos próximamente (estáticos, sin temario todavía)
const proximamenteCourses: Partial<Course>[] = [];

export const CousesList = ({ courses }: { courses: Partial<Course>[] }) => {
  // Ordenar: Pong primero, AI SDK segundo, luego el resto
  const pongCourse = courses.find((c) => c.slug === "pong-vanilla-js");
  const aiSdkCourse = courses.find((c) => c.slug === "ai-sdk");
  const otherCourses = courses.filter(
    (c) => c.slug !== "pong-vanilla-js" && c.slug !== "ai-sdk"
  );

  const orderedCourses = [
    ...(pongCourse ? [pongCourse] : []),
    ...(aiSdkCourse ? [aiSdkCourse] : []),
    ...proximamenteCourses,
    ...otherCourses,
  ];

  return (
    <div className="grid gap-10 xl:gap-20 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-16 lg:mt-32 w-full px-8 md:px-[5%] xl:px-0 max-w-7xl mx-auto">
      {orderedCourses.map((course) => (
        <CourseCard
          courseSlug={course.slug}
          key={course.id}
          course={course}
          to={course.landingUrl || undefined}
        />
      ))}
    </div>
  );
};

export const formatDuration = (secs?: string | number | null) => {
  // Si ya viene redactada por humano ("120 min", "8 horas"), devolverla tal cual.
  if (typeof secs === "string" && /[a-z]/i.test(secs)) {
    return secs;
  }

  let numSecs: number;
  if (typeof secs === "string") {
    numSecs = Number(secs);
  } else {
    numSecs = secs ?? 0;
  }
  // Sin dato preferimos no decir nada a inventar "60 mins", que era mentira
  // en cualquier curso cuya duración no viniera en segundos.
  if (isNaN(numSecs) || !numSecs) return "";
  return (numSecs / 60).toFixed(0) + " mins";
};
