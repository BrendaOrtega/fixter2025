import { useSearchParams, type LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { getUserOrRedirect } from "~/utils/dbGetters";
import type { Route } from "./+types/mis-cursos";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import SimpleFooter from "~/components/common/SimpleFooter";
import MyCourses from "~/components/MyCourses";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // this functions validates that user exists in db.
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
    <main className="min-h-screen flex flex-col dark:bg-brand-black-500 bg-white">
      {/* <Navbar user={user} /> */}
      {isSuccess && <SuccessAlert />}
      <div className="grid mt-16 mb-16 px-4  max-w-6xl mx-auto w-full text-center">
        <h2 className="text-gray-900 text-4xl font-bold dark:text-gray-10">
          Estos son todos tus cursos
        </h2>
        <p className="text-gray-700 text-lg mb-12 dark:text-gray-500">
          ¡No tardes en añadir otro!
        </p>
        <MyCourses courses={courses} />
      </div>
      <SimpleFooter />
    </main>
  );
}

const SuccessAlert = () => (
  <div className="text-center py-3 bg-gradient-to-r from-brand-100 via-brand-300 to-brand-200 text-white">
    <h2 className="text-xl font-semibold">
      🎉 ¡Feliciades, ya eres parte del curso!
    </h2>
    <p className="font-medium">Ahora preparate para tu primera clase 🤓</p>
    <EmojiConfetti emojis={false} />
  </div>
);
