import { Footer } from "~/components/Footer";
import { getMetaTags } from "~/utils/getMetaTags";
import { Banner } from "~/components/common/Banner";
import { useEffect } from "react";
import { PrimaryButton } from "~/components/common/PrimaryButton";
import {
  Benefits,
  Comments,
  HomeHero,
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
  const { topCourses } = loaderData;

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
      <div className="bg-planet bg-bottom bg-cover ">
        <Comments />
        <Banner variant="home">
          <div className="w-full md:w-[60%]">
            <h3 className="text-3xl md:text-4xl text-white font-bold mb-10 !leading-snug">
              ¿Listo para mejorar tus skills en programación?
            </h3>{" "}
            <PrimaryButton as="Link" to="/cursos" title="Explorar cursos" />
          </div>
        </Banner>
        <Footer />
      </div>
    </main>
  );
}
