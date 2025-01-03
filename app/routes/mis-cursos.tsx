import { db } from "~/.server/db";
import { getMetaTags } from "~/utils/getMetaTags";
import { Header } from "~/components/common/Header";
import { CourseCard } from "~/components/CourseCard";
import { getUserOrRedirect } from "~/.server/dbGetters";
import SimpleFooter from "~/components/common/SimpleFooter";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import { useSearchParams, type LoaderFunctionArgs } from "react-router";

import type { Course } from "@prisma/client";
import type { Route } from "./+types/mis-cursos";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const user = await getUserOrRedirect(request);
  const enrolledCourses = await db.course.findMany({
    where: {
      id: {
        in: user.courses,
      },
    },
  });
  return {
    user,
    courses: enrolledCourses,
    confirmed: url.searchParams.get("confirmed") === "1",
  };
};

export const meta = () =>
  getMetaTags({
    title: " Mis cursos",
    description: "¡No tardes en añadir otro! 🤓📚",
  });

export default function Route({
  loaderData: { courses, confirmed }, // @todo confirmed confetti
}: Route.ComponentProps) {
  const [searchParams] = useSearchParams();
  const isSuccess = searchParams.get("success") === "true" ? true : false;

  return (
    <>
      <Header
        className="bg-heroProfile"
        title="Todos tus cursos"
        text={
          courses.length > 0 ? (
            <span>
              Colecciona todos los cursos uno por uno; o adquiere una membresía
              ¡con acceso a todo, muy pronto! 🤩
              <br />
              <br />
              ¡No tardes en añadir otro! 🤓📚
            </span>
          ) : (
            <p className="text-xl px-4 grid gap-2">
              <span>
                Para que te animes con tu primer curso, usa el código:
              </span>
              <span className="text-3xl text-brand-500 font-bold">
                COMENZAR15
              </span>
              <span>
                Y obten -15% de descuento ¡en CUALQUIERA de nuestros cursos!
              </span>
            </p>
          )
        }
      />

      <main className="flex flex-col dark:bg-brand-black-500 ">
        {isSuccess && <SuccessAlert />}
        {confirmed && (
          <SuccessAlert emojis title="Gracias por confirmar tu cuenta" />
        )}
        <CourseList courses={courses} />

        <SimpleFooter />
      </main>
    </>
  );
}

const CourseList = ({ courses }: { courses: Course[] }) => {
  const ids = ["645d3dbd668b73b34443789c"];
  return (
    <div className="grid gap-20 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 mt-16 lg:mt-32 w-full  max-w-7xl mx-auto px-8 md:px-[5%] xl:px-0">
      {courses.map((course) => (
        <CourseCard
          to={
            ids.includes(course.id)
              ? "http://animaciones.fixtergeek.com"
              : `/cursos/${course.slug}/viewer`
          }
          courseSlug={course.slug}
          key={course.id}
          course={course}
        />
      ))}
    </div>
  );
};

const SuccessAlert = ({
  emojis = false,
  title = "¡Feliciades, ya eres parte del curso!",
}: {
  emojis?: boolean | string[];
  title?: string;
}) => (
  <div className="text-center py-3 bg-gradient-to-r from-brand-100 via-brand-300 to-brand-200 text-white">
    <h2 className="text-xl font-semibold">🎉 {title}</h2>
    <p className="font-medium">Ahora preparate para tu primera clase 🤓</p>
    <EmojiConfetti emojis={emojis} />
  </div>
);
