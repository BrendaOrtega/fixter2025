import { type ReactNode } from "react";
import { PrimaryButton } from "~/components/common/PrimaryButton";
import { Footer } from "~/components/Footer";
import { type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import type { Route } from "./+types/cursos";
import type { Course } from "@prisma/client";
import { Header } from "~/components/common/Header";
import { CourseCard } from "~/components/CourseCard";
import { cn } from "~/utils/cn";

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
