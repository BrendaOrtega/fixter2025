import { Link } from "react-router";
import { motion } from "motion/react";
import { getSerie, getSeriesPosts } from "~/utils/series.server";
import getMetaTags from "~/utils/getMetaTags";
import type { Route } from "./+types/blog.serie";

export const meta = ({ data }: Route.MetaArgs) => {
  if (!data) return [{ title: "Serie no encontrada | Fixtergeek" }];
  return getMetaTags({
    title: `${data.meta.title} | Fixtergeek`,
    description: data.meta.description,
    image: data.posts[0]?.metaImage ?? undefined,
  });
};

export const loader = async ({ params }: Route.LoaderArgs) => {
  const meta = getSerie(params.serie);
  const posts = await getSeriesPosts(params.serie);
  // Una serie sin posts publicados no es una página vacía: es un 404.
  if (!meta || posts.length === 0) {
    throw new Response("Serie no encontrada", { status: 404 });
  }
  return { serie: params.serie, meta, posts };
};

export default function SeriePage({
  loaderData: { serie, meta, posts },
}: Route.ComponentProps) {
  return (
    <main className="bg-dark min-h-screen text-white pt-40 pb-32">
      <section className="max-w-3xl mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-block rounded-full bg-brand-500/10 px-4 py-1.5 text-xs font-semibold text-brand-500">
            Serie de {posts.length} {posts.length === 1 ? "parte" : "partes"}
          </span>

          <h1 className="font-bold text-3xl md:text-5xl leading-tight mt-5">
            {meta.title}
          </h1>

          <p className="text-gray-300 text-lg mt-5">{meta.description}</p>
        </motion.div>

        <ol className="grid gap-4 mt-12">
          {posts.map((post, i) => (
            <li key={post.slug}>
              <Link
                to={`/blog/${post.slug}`}
                className="group flex gap-5 items-start rounded-2xl bg-white/5 hover:bg-white/10 transition-colors p-5 md:p-6"
              >
                {/* El número es la promesa del ladder: se leen en orden. */}
                <span className="shrink-0 font-bold text-brand-500 text-2xl md:text-3xl leading-none w-10">
                  {i + 1}
                </span>

                <span className="min-w-0">
                  <span className="block font-semibold text-white text-lg md:text-xl leading-snug">
                    {post.title}
                  </span>
                  {post.metaDescription && (
                    <span className="block text-gray-400 text-sm mt-2">
                      {post.metaDescription}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ol>

        <Link
          to="/blog"
          className="inline-block text-sm text-gray-400 hover:text-white transition-colors mt-10"
        >
          ← Ver todo el blog
        </Link>
      </section>
    </main>
  );
}
