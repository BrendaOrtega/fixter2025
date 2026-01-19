import { db } from "~/.server/db";
import { Header } from "~/components/common/Header";
import { CourseCard } from "~/components/CourseCard";
import { getUserOrRedirect } from "~/.server/dbGetters";
import SimpleFooter from "~/components/common/SimpleFooter";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import {
  useSearchParams,
  useFetcher,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "react-router";
import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";

import type { Course } from "~/types/models";
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

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await getUserOrRedirect(request);
  const formData = await request.formData();
  const message = formData.get("message") as string;

  if (!message || message.trim().length === 0) {
    return { error: "El mensaje no puede estar vacío" };
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Solicitud de ayuda - Mis cursos</h2>
      <p><strong>Usuario:</strong> ${user.displayName || user.email}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Cursos actuales:</strong> ${user.courses?.length || 0}</p>
      <hr style="margin: 20px 0;" />
      <p><strong>Mensaje:</strong></p>
      <p style="white-space: pre-wrap;">${message}</p>
    </div>
  `;

  try {
    await getSesTransport().sendMail({
      from: getSesRemitent(),
      to: ["contacto@fixter.org", "brenda@fixter.org"],
      subject: `[Mis Cursos] Solicitud de ayuda - ${user.email}`,
      html: htmlContent,
      replyTo: user.email,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending help email:", error);
    return { error: "Error al enviar el mensaje. Intenta de nuevo." };
  }
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
        <HelpForm />
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
  return (
    <div className="grid gap-20 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 mt-16 lg:mt-32 w-full  max-w-7xl mx-auto px-8 md:px-[5%] xl:px-0">
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

const HelpForm = () => {
  const fetcher = useFetcher<{ success?: boolean; error?: string }>();
  const isSubmitting = fetcher.state === "submitting";
  const isSuccess = fetcher.data?.success;

  if (isSuccess) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12 text-center">
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
          <p className="text-green-400 font-medium">
            Mensaje enviado correctamente. Te responderemos pronto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50">
        <h3 className="text-white text-lg font-medium mb-2">
          ¿No encuentras tus cursos?
        </h3>
        <p className="text-zinc-400 text-sm mb-4">
          Escríbenos y te ayudamos a recuperar el acceso.
        </p>
        <fetcher.Form method="post">
          <textarea
            name="message"
            placeholder="Cuéntanos qué curso compraste y cuándo..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand-500 resize-none"
            rows={4}
            required
          />
          {fetcher.data?.error && (
            <p className="text-red-400 text-sm mt-2">{fetcher.data.error}</p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            {isSubmitting ? "Enviando..." : "Enviar mensaje"}
          </button>
        </fetcher.Form>
      </div>
    </div>
  );
};
