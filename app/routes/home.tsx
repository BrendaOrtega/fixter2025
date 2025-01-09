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

export const meta = () =>
  getMetaTags({
    title:
      "Aprende las herramientas que usan los profesionales del open source",
  });

export default function Page() {
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
      <TopCourses />
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
