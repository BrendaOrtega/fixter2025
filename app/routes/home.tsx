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
import getMetaTags from "~/utils/getMetaTags";

export const meta = () => {
  const baseMeta = getMetaTags({
    title: "FixterGeek | Cursos de IA, Claude Code y Programación en Español",
    description:
      "Plataforma educativa mexicana de cursos de inteligencia artificial, Claude Code, AI SDK y desarrollo web. Más de 2,000 estudiantes. Aprende con Héctor Bliss.",
    url: "https://www.fixtergeek.com",
    image: "https://www.fixtergeek.com/cover.png",
    keywords:
      "cursos programación, curso ia español, claude code, ai sdk, desarrollo web, fixtergeek, héctor bliss, cursos online méxico",
  });

  // Schema.org JSON-LD para GEO - Organization + WebSite
  const schemaOrg = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.fixtergeek.com/#organization",
        name: "FixterGeek",
        url: "https://www.fixtergeek.com",
        logo: {
          "@type": "ImageObject",
          url: "https://www.fixtergeek.com/logo.png",
          width: 512,
          height: 512,
        },
        description:
          "Plataforma educativa mexicana especializada en cursos de programación, inteligencia artificial y herramientas de desarrollo modernas. Fundada por Héctor Bliss con más de 8 años de experiencia.",
        foundingDate: "2016",
        founder: {
          "@type": "Person",
          name: "Héctor Bliss",
          url: "https://www.linkedin.com/in/hectorbliss/",
        },
        contactPoint: {
          "@type": "ContactPoint",
          email: "brenda@fixter.org",
          contactType: "customer service",
          availableLanguage: "Spanish",
        },
        sameAs: [
          "https://facebook.com/fixtergeek",
          "https://x.com/FixterGeek",
          "https://www.linkedin.com/company/fixtergeek",
          "https://youtube.com/@fixtergeek",
          "https://instagram.com/fixtergeek",
          "https://github.com/FixterGeek",
        ],
        areaServed: {
          "@type": "Country",
          name: "Mexico",
        },
        knowsLanguage: "es",
      },
      {
        "@type": "WebSite",
        "@id": "https://www.fixtergeek.com/#website",
        url: "https://www.fixtergeek.com",
        name: "FixterGeek",
        description:
          "Cursos de IA, Claude Code, AI SDK y programación en español",
        publisher: {
          "@id": "https://www.fixtergeek.com/#organization",
        },
        inLanguage: "es",
      },
      {
        "@type": "WebPage",
        "@id": "https://www.fixtergeek.com/#webpage",
        url: "https://www.fixtergeek.com",
        name: "FixterGeek | Cursos de IA y Programación",
        isPartOf: {
          "@id": "https://www.fixtergeek.com/#website",
        },
        about: {
          "@id": "https://www.fixtergeek.com/#organization",
        },
        description:
          "Aprende inteligencia artificial, Claude Code, AI SDK y desarrollo web con cursos prácticos en español. Más de 2,000 estudiantes formados.",
        inLanguage: "es",
      },
    ],
  };

  return [
    ...baseMeta,
    {
      "script:ld+json": schemaOrg,
    },
  ];
};

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
