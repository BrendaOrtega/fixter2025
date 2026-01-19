import { useEffect, type ReactNode } from "react";
import { Footer } from "~/components/Footer";
import { PrimaryButton } from "~/components/common/PrimaryButton";
import type { Route } from "./+types/courseDetail";
import { data, Form, type LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { useVideosLength } from "~/hooks/useVideosLength";
import { formatDuration } from "./cursos";
import type { Course, Video } from "~/types/models";
import { getVideoTitles } from "~/.server/dbGetters";
import { BsGithub, BsLinkedin, BsFacebook } from "react-icons/bs";
import { CourseRatings } from "~/components/common/CourseRatings";
import { motion, useSpring, useTransform } from "motion/react";
import LiquidEther from "~/components/backgrounds/LiquidEther";
import getMetaTags from "~/utils/getMetaTags";
import { cn } from "~/utils/cn";
import { use3DHover } from "~/hooks/use3DHover";
import { Streamdown } from "streamdown";

export function meta({ data }: Route.MetaArgs) {
  const course = data.course;
  const baseUrl = "https://www.fixtergeek.com";
  const courseUrl = `${baseUrl}/cursos/${course.slug}/detalle`;

  // Generar descripción optimizada (155 caracteres para SEO)
  const description = course.summary
    ? course.summary.slice(0, 155)
    : course.description
    ? course.description.replace(/[#*`]/g, "").slice(0, 155)
    : `Aprende ${course.title} con FixterGeek. Curso práctico en español.`;

  const baseMeta = getMetaTags({
    title: `${course.title} | Curso Online | FixterGeek`,
    description,
    image: course.icon || `${baseUrl}/cover.png`,
    url: courseUrl,
    type: "website",
    keywords: `${
      course.title
    }, curso online, programación, FixterGeek, desarrollo web, ${
      course.level || "principiante"
    }`,
  });

  // Schema.org JSON-LD para LLMs y SEO
  const schemaOrg = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        "@id": `${courseUrl}#course`,
        name: course.title,
        description: description,
        url: courseUrl,
        image: course.icon || `${baseUrl}/cover.png`,
        provider: {
          "@type": "Organization",
          "@id": `${baseUrl}/#organization`,
          name: "FixterGeek",
          url: baseUrl,
          logo: `${baseUrl}/logo.png`,
        },
        instructor: {
          "@type": "Person",
          name: course.authorName || "Héctor Bliss",
        },
        offers: course.isFree
          ? {
              "@type": "Offer",
              price: "0",
              priceCurrency: "MXN",
              availability: "https://schema.org/InStock",
            }
          : {
              "@type": "Offer",
              price: String(course.basePrice || 499),
              priceCurrency: "MXN",
              availability: "https://schema.org/InStock",
              url: courseUrl,
            },
        inLanguage: "es",
        educationalLevel:
          course.level?.toLowerCase() === "avanzado"
            ? "Advanced"
            : course.level?.toLowerCase() === "intermedio"
            ? "Intermediate"
            : "Beginner",
        timeRequired: course.duration ? `PT${course.duration}M` : undefined,
      },
      {
        "@type": "WebPage",
        "@id": `${courseUrl}#webpage`,
        url: courseUrl,
        name: `${course.title} | FixterGeek`,
        description: description,
        isPartOf: {
          "@id": `${baseUrl}/#website`,
        },
        about: {
          "@id": `${courseUrl}#course`,
        },
        inLanguage: "es",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${courseUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Inicio",
            item: baseUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Cursos",
            item: `${baseUrl}/cursos`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: course.title,
            item: courseUrl,
          },
        ],
      },
    ],
  };

  return [
    ...baseMeta,
    {
      "script:ld+json": schemaOrg, // The elegant way
    },
  ];
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const course = await db.course.findUnique({
    where: { slug: params.courseSlug },
    select: {
      description: true,
      title: true,
      summary: true,
      duration: true,
      icon: true,
      isFree: true,
      createdAt: true,
      level: true,
      videoIds: true,
      id: true,
      slug: true,
      authorDescription: true,
      authorName: true,
      photoUrl: true,
      basePrice: true,
    },
  });
  if (!course) throw data("Course Not Found", { status: 404 });
  const videos = await getVideoTitles(course.id);
  const hasPublicVideos = videos.some((video) => video.isPublic);
  return { course, videos, hasPublicVideos };
};

export default function Route({
  loaderData: { course, videos, hasPublicVideos },
}: Route.ComponentProps) {
  return (
    <article className="pt-40">
      <CourseHeader course={course} hasPublicVideos={hasPublicVideos} />
      <CourseContent course={course} videos={videos} />
      <CourseRatings courseSlug={course.slug} />
      <Teacher course={course} />
      <Footer />
    </article>
  );
}

const CourseContent = ({
  videos,
  course,
}: {
  videos: Partial<Video>[];
  course: Course;
}) => {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, []);
  return (
    <section className=" mt-20 md:mt-32 w-full px-8 md:px-[5%] xl:px-0 max-w-7xl mx-auto ">
      <div className="prose prose-lg prose-invert max-w-none text-colorParagraph
        [&_h2]:text-brand-500 [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4
        [&_h3]:text-white [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-3
        [&_a]:text-brand-500 [&_a]:no-underline hover:[&_a]:underline
        [&_strong]:text-white [&_strong]:font-semibold
        [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-brand-500 [&_code]:text-sm
        [&_pre]:bg-[#1e1e1e] [&_pre]:border [&_pre]:border-white/10 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:overflow-x-auto
        [&_blockquote]:border-l-4 [&_blockquote]:border-brand-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-400
        [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
        [&_li]:marker:text-brand-500 [&_li]:mb-2">
        <Streamdown shikiTheme={["one-dark-pro", "one-dark-pro"]}>
          {course.description}
        </Streamdown>
      </div>
      <div className="border-[1px] my-20 border-brand-500 rounded-3xl p-6 md:p-10 xl:p-16 relative">
        <img
          className="absolute -top-12 -left-8"
          alt="comic"
          src={"/courses/comic.svg"}
        />
        <img
          className="w-32 md:w-auto absolute -right-6 md:-right-16 -bottom-16"
          alt="comic"
          src="/courses/astronaut.svg"
        />
        <h3 className="text-4xl font-bold text-white">¿Qué vas a aprender?</h3>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {videos.map((video) => (
            <Lesson
              key={video.id}
              title={video.title || "Sin título"}
              isFree={video.isPublic}
            />
          ))}
          {/* <Lesson title="Pollitos a la naranja" /> */}
        </div>
      </div>
    </section>
  );
};

export const Teacher = ({ course }: { course: Partial<Course> }) => {
  const isHectorBliss =
    !course.authorName || course.authorName === "Héctor Bliss";

  return (
    <section className="py-10 lg:py-20 relative overflow-hidden bg-background">
      {/* LiquidEther Background */}
      <div className="absolute inset-0 z-0">
        <LiquidEther
          colors={["#85DDCB", "#37AB93", "#186656"]}
          mouseForce={50}
          cursorSize={150}
          isViscous={false}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.3}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.3}
          autoIntensity={1.5}
          takeoverDuration={0.1}
          autoResumeDelay={2000}
          autoRampDuration={0.3}
        />
      </div>
      <div className="relative container mx-auto px-4 z-10 pointer-events-none">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <div className="rounded-3xl p-8 md:p-12 relative overflow-hidden bg-backface/90 backdrop-blur-sm">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="font-light text-colorParagraph">
                  Tu instructor
                </span>
                <h3 className="text-3xl font-bold mt-2 mb-4 text-brand-500">
                  {isHectorBliss ? "Héctor Bliss" : course.authorName}
                </h3>
                {isHectorBliss ? (
                  <>
                    <p className="mb-6 text-colorParagraph">
                      Pionero en hacer la tecnología accesible para todos, con
                      más de 10 años enseñando desarrollo de software y una
                      comunidad de más de 2,000 estudiantes activos.
                    </p>
                    <p className="mb-6 text-colorParagraph">
                      Especializado en simplificar temas complejos de forma
                      práctica y divertida. Ha sido instructor en bootcamps
                      internacionales y creador de infinidad de cursos en línea.
                    </p>
                  </>
                ) : (
                  <p className="mb-6 text-colorParagraph">
                    {course.authorDescription}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-brand-500">10+</div>
                    <div className="text-xs text-colorCaption">
                      Años enseñando
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-brand-500">2K+</div>
                    <div className="text-xs text-colorCaption">Estudiantes</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-brand-500">
                      100%
                    </div>
                    <div className="text-xs text-colorCaption">Práctico</div>
                  </div>
                </div>
                {/* Social Links */}
                <div className="flex gap-4 mt-6">
                  <a
                    href={
                      isHectorBliss
                        ? "https://www.linkedin.com/in/hectorbliss/"
                        : course.authorSocial || "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-colorCaption hover:text-brand-500 transition-colors"
                  >
                    <BsLinkedin className="text-2xl" />
                  </a>
                  <a
                    href={
                      isHectorBliss
                        ? "https://github.com/blissito"
                        : course.authorSocial || "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-colorCaption hover:text-brand-500 transition-colors"
                  >
                    <BsGithub className="text-2xl" />
                  </a>
                  <a
                    href={
                      isHectorBliss
                        ? "https://www.facebook.com/blissito"
                        : course.authorSocial || "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-colorCaption hover:text-brand-500 transition-colors"
                  >
                    <BsFacebook className="text-2xl" />
                  </a>
                </div>
              </div>
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full blur-3xl opacity-20"
                  style={{ backgroundColor: "#85DDCB" }}
                ></div>
                <img
                  className="w-full rounded-2xl relative z-10"
                  src={isHectorBliss ? "/courses/titor.png" : course.photoUrl}
                  alt={isHectorBliss ? "Héctor Bliss" : course.authorName}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Lesson = ({ title, isFree }: { title: string; isFree?: boolean }) => {
  return (
    <div className="col-span-1 border border-colorOutline rounded-lg h-12 flex items-center justify-between px-4 ">
      <div className="flex gap-3">
        <img src="/courses/code.svg" />
        <p className="text-white font-light">{title}</p>
      </div>
      {isFree ? <img src="/courses/free.svg" alt="free mark" /> : null}
    </div>
  );
};

const CourseHeader = ({
  className,
  course,
  hasPublicVideos,
}: {
  className?: string;
  course: Course;
  hasPublicVideos?: boolean;
}) => {
  const { title, id, summary, duration, level, slug, basePrice, icon } = course;

  // 3D hover effect setup
  const z = useSpring(0, { bounce: 0 });
  const {
    containerRef,
    springX,
    springY,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseMove,
  } = use3DHover({
    onMouseEnter: () => {
      z.set(30);
    },
    onMouseLeave: () => {
      z.set(0);
    },
  });
  const imgZ = useTransform(z, [0, 30], [0, 50]);

  return (
    <section
      className={cn(
        "w-full h-fit py-20 md:py-0 md:h-[580px] bg-heroMobile md:bg-hero bg-cover bg-botom bg-center",
        className
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center h-full gap-12 md:gap-0  flex-wrap-reverse md:flex-nowrap px-4 md:px-[5%] xl:px-0">
        <div className="text-left w-full md:w-[60%]">
          <h2 className="text-4xl md:text-5xl xl:text-5xl font-bold text-white !leading-snug">
            {title}
          </h2>
          <p className="text-colorParagraph text-base md:text-lg mt-6 font-light whitespace-pre-line">
            {summary}
          </p>
          <div className="flex items-center mt-6 gap-4">
            <p className="text-colorParagraph text-sm md:text-lg  font-light">
              {useVideosLength(id)} lecciones
            </p>
            <p className="text-colorParagraph text-sm md:text-lg font-light">
              | {formatDuration(duration)} |
            </p>
            <div className="flex items-center gap-2 ">
              <p className=" text-brand-500 uppercase text-sm md:text-lg">
                {" "}
                {level}
              </p>
              <span className="flex gap-2">
                {level?.toLowerCase() === "avanzado" ? (
                  <span className="flex gap-2">
                    <img src="/thunder.svg" className="w-3" />
                    <img src="/thunder.svg" className="w-3" />
                    <img src="/thunder.svg" className="w-3" />
                  </span>
                ) : level?.toLowerCase() === "intermedio" ? (
                  <span className="flex gap-2">
                    <img src="/thunder.svg" className="w-3" />
                    <img src="/thunder.svg" className="w-3" />
                    <img className="opacity-25 w-3" src="/thunder.svg" />
                  </span>
                ) : (
                  <span className="flex gap-2">
                    <img src="/thunder.svg" className="w-3" />
                    <img className="opacity-25 w-3" src="/thunder.svg" />
                    <img className="opacity-25 w-3" src="/thunder.svg" />
                  </span>
                )}
              </span>
            </div>
          </div>
          <div className="gap-6 flex mt-10">
            {course.isFree || hasPublicVideos || slug === "ai-sdk" ? (
              <PrimaryButton
                as="Link"
                to={`/cursos/${slug}/viewer`}
                variant="fill"
                title="Empezar gratis"
              />
            ) : slug === "power-user-en-claude-code" ? (
              <PrimaryButton
                as="a"
                to="https://youtu.be/EkH82XjN45w"
                target="_blank"
                variant="fill"
                title="Ver demo"
              />
            ) : null}
            {!course.isFree && (
              <Form method="POST" action="/api/stripe">
                <input type="hidden" name="courseSlug" value={slug} />
                <PrimaryButton
                  variant="ghost"
                  name="intent"
                  value="checkout"
                  type="submit"
                  title={`Comprar $${basePrice || 499} mxn`}
                />
              </Form>
            )}
          </div>
        </div>
        <div
          className="w-full md:w-[40%] flex justify-center h-full items-center"
          style={{
            transformStyle: "preserve-3d",
            perspective: 900,
          }}
        >
          <motion.div
            ref={containerRef}
            style={{
              rotateX: springX,
              rotateY: springY,
              transformStyle: "preserve-3d",
              perspective: 600,
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="w-[70%]"
          >
            <motion.img
              style={{ z: imgZ }}
              className="w-full"
              src={icon}
              alt="curso"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
