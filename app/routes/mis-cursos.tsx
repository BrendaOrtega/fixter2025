import { db } from "~/.server/db";
import { Header } from "~/components/common/Header";
import { CourseCard } from "~/components/CourseCard";
import { getUserOrRedirect } from "~/.server/dbGetters";
import SimpleFooter from "~/components/common/SimpleFooter";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import { useSearchParams, type LoaderFunctionArgs } from "react-router";

import type { Course } from "@prisma/client";
import type { Route } from "./+types/mis-cursos";
import getMetaTags from "~/utils/getMetaTags";

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
    // confirmed: url.searchParams.get("confirmed") === "1",
  };
};

export const meta = () =>
  getMetaTags({
    title: " Mis cursos",
    description: "¡No tardes en añadir otro! 🤓📚",
  });

export default function Route({
  loaderData: { courses }, // @todo confirmed confetti
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
                Para que te animes con tu primer curso, tenemos un descuento
                especial para ti.
              </span>
            </p>
          )
        }
      />

      <main className="flex flex-col dark:bg-brand-black-500 ">
        {isSuccess && <SuccessAlert />}
        {courses.length > 0 ? <CourseList courses={courses} /> : <Empty />}
        <SimpleFooter />
      </main>
    </>
  );
}

const Empty = () => {
  return (
    <div className="flex justify-center mt-12 text-center text-white">
      <div>
        <img className="mx-auto w-52" alt="astronaut" src="/discount.png" />
        <p className="text-xl px-4 grid gap-2">
          <span>Usa el código</span>
          <span className="text-3xl text-brand-500 my-2 font-bold">
            COMENZAR15
          </span>
          <span>
            Y obten -15% de descuento ¡en CUALQUIERA de nuestros cursos!
          </span>
        </p>{" "}
      </div>
    </div>
  );
};

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
  <div className="text-center py-3 bg-gradient-to-r from-brand-500 via-brand-300 to-brand-800 text-white">
    <h2 className="text-xl font-semibold">🎉 {title}</h2>
    <p className="font-medium">Ahora preparate para tu primera clase 🤓</p>
    <EmojiConfetti emojis={emojis} />
  </div>
);
