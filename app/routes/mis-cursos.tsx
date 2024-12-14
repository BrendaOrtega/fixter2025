import { useSearchParams, type LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { getUserOrRedirect } from "~/.server/dbGetters";
import type { Route } from "./+types/mis-cursos";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import SimpleFooter from "~/components/common/SimpleFooter";
import { Header } from "~/components/common/Header";
import type { Course } from "@prisma/client";
import { CourseCard } from "~/components/CourseCard";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUserOrRedirect(request);
  const enrolledCourses = await db.course.findMany({
    where: {
      id: {
        in: user.courses,
      },
    },
  });
  return { user, courses: enrolledCourses };
};

export default function Route({
  loaderData: { user, courses },
}: Route.ComponentProps) {
  const [searchParams] = useSearchParams();
  const isSuccess = searchParams.get("success") === "true" ? true : false; // good to be in the client

  return (
    <>
      <Header
        title="Todos tus cursos"
        text={
          <span>
            Colecciona todos los cursos uno por uno o adquiere una membresía
            ¡con acceso a todo! 🤩
            <br />
            <br />
            ¡No tardes en añadir otro! 🤓📚
          </span>
        }
      />

      <main className="min-h-screen flex flex-col dark:bg-brand-black-500 pt-20">
        {isSuccess && <SuccessAlert />}
        <CousesList courses={courses} />
        <SimpleFooter />
      </main>
    </>
  );
}

const CousesList = ({ courses }: { courses: Course[] }) => {
  return (
    <div className="grid gap-20 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-32 w-full px-8 md:px-[5%] lg:px-0 max-w-7xl mx-auto">
      {courses.map((course) => (
        <CourseCard
          to={`/cursos/${course.slug}/viewer`}
          courseSlug={course.slug}
          key={course.id}
          course={course}
        />
      ))}
    </div>
  );
};

const SuccessAlert = () => (
  <div className="text-center py-3 bg-gradient-to-r from-brand-100 via-brand-300 to-brand-200 text-white">
    <h2 className="text-xl font-semibold">
      🎉 ¡Feliciades, ya eres parte del curso!
    </h2>
    <p className="font-medium">Ahora preparate para tu primera clase 🤓</p>
    <EmojiConfetti emojis={false} />
  </div>
);
