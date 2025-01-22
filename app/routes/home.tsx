import { getMetaTags } from "~/utils/getMetaTags";
import { useEffect } from "react";
import {
  Benefits,
  HomeHero,
  SocialPlanet,
  TopCourses,
  Why,
} from "./home/components";
import { db } from "~/.server/db";
import type { Route } from "./+types/home";

export const meta = () =>
  getMetaTags({
    title:
      "Aprende las herramientas que usan los profesionales del open source",
  });

// esto es para prerender, si no: evitar.
export const loader = async () => {
  return {
    topCourses: await db.course.findMany({
      orderBy: { createdAt: "desc" },
      where: { published: true },
      take: 3,
      select: {
        id: true,
        title: true,
        icon: true,
        duration: true,
        level: true,
        slug: true,
      },
    }),
  };
};

export default function Page({ loaderData }: Route.ComponentProps) {
  const { topCourses } = loaderData || {};

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, []);

  return (
    <main className="overflow-hidden">
      <HomeHero />
      <Why />
      <Benefits />
      <TopCourses courses={topCourses} />
      <SocialPlanet />
    </main>
  );
}
