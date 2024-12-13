import { data, Link, type LoaderFunctionArgs } from "react-router";
import Markdown from "~/components/common/Markdown";
import type { Route } from "./+types/post";
import { db } from "~/.server/db";
import { IoIosArrowBack } from "react-icons/io";
import { Autor } from "~/components/common/Autor";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const post = await db.post.findUnique({
    where: {
      slug: params.postSlug,
    },
  });
  if (!post) throw data("Not Found", { status: 404 });
  return {
    post,
  };
};

export default function Route({ loaderData: { post } }: Route.ComponentProps) {
  return (
    <article className="text-white">
      <section className="flex flex-col max-w-3xl mx-auto py-20 px-4 gap-4">
        <img
          src={post.coverImage || "/Banner.svg"}
          alt="cover"
          className="w-[95%] md:w-full object-cover mx-auto rounded-3xl h-[220px] md:h-[400px]" // 🪄✨ nice
        />
        <Link
          to="/blog"
          className="bg-brand-100 p-3 text-black self-start rounded-full hover:scale-105 transition-all"
        >
          <IoIosArrowBack />
        </Link>
        <h2 className="lg:mt-0 text-4xl font-bold text-center">{post.title}</h2>
        <Autor {...post} />
        <hr />
        <Markdown>{post.body}</Markdown>
      </section>
    </article>
  );
}
