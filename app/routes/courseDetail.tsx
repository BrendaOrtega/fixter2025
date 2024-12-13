import type { ReactNode } from "react";
import { Footer } from "~/components/Footer";
import { PrimaryButton } from "~/components/PrimaryButton";
import type { Route } from "./+types/courseDetail";
import { data, Form, type LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { useVideosLength } from "~/hooks/useVideosLength";
import { formatDuration } from "./cursos";
import type { Course, Video } from "@prisma/client";
import { getVideoTitles } from "~/.server/dbGetters";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Cursos" },
    { name: "description", content: "Encuentra el curso para ti" },
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
    },
  });
  if (!course) throw data("Course Not Found", { status: 404 });
  const videos = await getVideoTitles(course.id);
  return { course, videos };
};

export default function Route({
  loaderData: { course, videos },
}: Route.ComponentProps) {
  return (
    <>
      <CourseHeader {...course} />
      <CourseContent course={course} videos={videos} />
      <Teacher course={course} />
      <Footer />
    </>
  );
}

const CourseContent = ({
  videos,
  course,
}: {
  videos: Partial<Video>[];
  course: Course;
}) => {
  return (
    <section className=" mt-20 md:mt-32 w-full px-8 md:px-[5%] lg:px-0 max-w-7xl mx-auto ">
      <p className="text-colorParagraph text-base md:text-lg mt-6 font-light">
        {course.description}
      </p>
      <div className="border-[1px] my-20 border-brand-500 rounded-3xl p-6 md:p-16 relative">
        <img
          className="absolute -top-12 -left-8"
          alt="comic"
          src="/courses/comic.svg"
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

const Teacher = ({ course }: { course: Partial<Course> }) => {
  return (
    <section className="mt-32 w-full px-8 md:px-[5%] lg:px-0 max-w-7xl mx-auto my-[160px]  overflow-hidden">
      <div className="bg-backface rounded-3xl md:py-16 md:pl-16 pt-6 px-6 w-full relative pb-80 ">
        <div className="w-full md:w-[60%]">
          <span className="text-colorParagraph font-light">
            ¿Quien es tu instructor?
          </span>
          <h3 className="text-white text-3xl font-bold mt-4">
            {course.authorName ? course.authorName : "Héctor Bliss"}
          </h3>{" "}
          {course.authorDescription ? (
            course.authorDescription
          ) : (
            <div>
              {" "}
              <p className="text-colorParagraph font-light mt-8 text-base md:text-lg">
                Con más de 10 años de experiencia como desarrollador de software
                profesional e instructor tecnológico, Héctor Bliss disfruta de
                simplificar temas complejos para que sus estudiantes
                puedan aprender de la forma más práctica, rápida y
                divertida. Héctor ha sido instructor en diferentes bootcamps
                internacionales, y ha grabado infinidad de cursos en línea. Por
                medio de su canal de youtube enseña los temas más actualizados
                de la industria tecnológica, acercando las herramientas que usan
                los profesionales a nivel mundial a sus estudiantes de habla
                hispana.
              </p>
              <p className="text-colorParagraph font-light mt-4 text-base md:text-lg">
                Si no has experimentado una clase con Héctor Bliss, es tu
                momento de comprobar que aprender no tiene que ser ni díficil ni
                aburrido.
              </p>{" "}
            </div>
          )}
        </div>
        <div className=" absolute -bottom-16 -right-16">
          <img
            className="w-[320px] rounded-full"
            src={course.photoUrl ? course.photoUrl : "/courses/titor.png"}
            alt={course.authorName ? course.authorName : "Héctor Bliss"}
          />
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
  title,
  id,
  summary,
  duration,
  level,
  slug,
  basePrice,
}: {
  basePrice: number;
  slug: string;
  id: string;
  title?: string;
  summary?: string;
  duration?: number;
  level?: string;
}) => {
  return (
    <section className="w-full h-fit py-20 md:py-0 md:h-[580px] bg-heroMobile md:bg-hero bg-cover bg-botom bg-center ">
      <div className="max-w-7xl mx-auto flex items-center h-full gap-12 md:gap-0  flex-wrap-reverse md:flex-nowrap px-4 md:px-[5%] xl:px-0">
        <div className="text-left w-full md:w-[60%]">
          <h2 className="text-4xl md:text-5xl xl:text-5xl font-bold text-white">
            {title}
          </h2>
          <p className="text-colorParagraph text-base md:text-lg mt-6 font-light">
            {summary}
          </p>
          <div className="flex items-center mt-6 gap-4">
            <p className="text-colorParagraph text-base md:text-lg  font-light">
              {useVideosLength(id)} lecciones
            </p>
            <p className="text-colorParagraph text-base md:text-lg font-light">
              | {formatDuration(duration)} |
            </p>
            <div className="flex gap-2 ">
              <p className=" text-brand-500 uppercase"> {level}</p>
              <span className="flex gap-2">
                <img src="/thunder.svg" className="w-3" />
                {level !== "principiante" && (
                  <>
                    <img src="/thunder.svg" className="w-3" />
                    <img src="/thunder.svg" className="w-3" />
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="gap-6 flex mt-10">
            <PrimaryButton
              as="Link"
              to={`/cursos/${slug}/viewer`}
              variant="fill"
              title="Empezar gratis"
            />
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
          </div>
        </div>
        <div className="w-full md:w-[40%]  flex justify-center h-full items-center">
          <img className="w-[50%]" src="/js.png" alt="curso" />{" "}
        </div>
      </div>
    </section>
  );
};
