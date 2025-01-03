import { data, Link, type LoaderFunctionArgs } from "react-router";
import Markdown from "~/components/common/Markdown";
import type { Route } from "./+types/post";
import { db } from "~/.server/db";
import { IoIosArrowBack } from "react-icons/io";
import { Autor } from "~/components/common/Autor";
import YoutubeComponent from "~/components/common/YoutubeComponent";
import { CourseBanner } from "~/components/CourseBanner";
import { useEffect } from "react";

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
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, []);
  return (
    <article className="text-white bg-postbg  bg-bottom bg-contain bg-no-repeat pb-20">
      <section className="flex flex-col max-w-3xl mx-auto py-20 px-4  md:px-[5%] xl:px-0 gap-4 ">
        <img
          src={post.coverImage || "/Banner.svg"}
          alt="cover"
          className="w-[95%] md:w-full object-cover mx-auto rounded-3xl h-[220px] md:h-[320px] xl:h-[400px]" // 🪄✨ nice
        />
        <div className="relative">
          <Link
            to="/blog"
            className="absolute left-0 lg:-left-16 top-1 bg-brand-100/10 p-3 text-white self-start rounded-full hover:scale-105 transition-all"
          >
            <IoIosArrowBack />
          </Link>
          <h2 className=" text-4xl font-bold text-left mb-6 !leading-snug mt-16 lg:mt-0">
            {post.title}
          </h2>
          <Autor {...post} />
          <hr className="mt-6 opacity-10" />
        </div>

        <YoutubeComponent url={post.youtubeLink} />
        <Markdown>{post.body}</Markdown>
      </section>

      <CourseBanner />
    </article>
  );
}
