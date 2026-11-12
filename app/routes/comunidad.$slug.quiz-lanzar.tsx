// Lanzar un quiz en vivo FUERA de una llamada (evento presencial, clase, transmisión).
// Misma mecánica que el panel de la llamada: los controles viven en QuizPanel.tsx y hablan con la
// ruta de recurso /comunidad/:slug/quiz, que es la que revisa quién es anfitrión.
import { Link, redirect, type LoaderFunctionArgs } from "react-router";
import type { Route } from "./+types/comunidad.$slug.quiz-lanzar";
import { getUserOrNull } from "~/.server/dbGetters";
import { QuizHost } from "~/components/community/QuizPanel";

export const meta = () => [{ title: "Lanzar un quiz | FixterGeek" }, { name: "robots", content: "noindex" }];

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const slug = params.slug as string;
  const user = await getUserOrNull(request);
  if (!user) throw redirect(`/login?next=${encodeURIComponent(`/comunidad/${slug}/quiz/lanzar`)}`);
  return { slug, quiz: new URL(request.url).searchParams.get("quiz") ?? undefined };
};

export default function QuizLaunch({ loaderData }: Route.ComponentProps) {
  const { slug, quiz } = loaderData;
  return (
    <main className="min-h-dvh bg-background px-4 pb-28 pt-24 text-[#F2F5F4]">
      <div className="mx-auto w-full max-w-md">
        <Link to={`/comunidad/${slug}`} className="text-xs font-medium text-[#7C8A8E] underline underline-offset-2 hover:text-[#F2F5F4]">
          Volver al club
        </Link>
        <div className="mt-4">
          <QuizHost slug={slug} preselect={quiz} />
        </div>
      </div>
    </main>
  );
}
