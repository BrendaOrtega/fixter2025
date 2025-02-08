import { useEffect } from "react";
import { db } from "~/.server/db";
import { Link } from "react-router";
import type { Route } from "./+types/post";
import { IoIosArrowBack } from "react-icons/io";
import { Autor } from "~/components/common/Autor";
import Markdown from "~/components/common/Markdown";
import { CourseBanner } from "~/components/CourseBanner";
import YoutubeComponent from "~/components/common/YoutubeComponent";
import { getMetaTags } from "~/utils/getMetaTags";

export const meta = ({ data }: Route.MetaArgs) => {
  const { post } = data;
  return getMetaTags({
    title: post.title,
    description: post.body?.slice(0, 60),
    image: post.metaImage || post.coverImage || undefined,
  });
};

export const loader = async ({ params }: Route.LoaderArgs) => {
  const post = await db.post.findUnique({
    where: {
      slug: params.postSlug,
      published: true,
    },
  });
  if (!post) throw new Response(null, { status: 404 });
  return { post };
};

export default function Page({ loaderData: { post } }: Route.ComponentProps) {
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
          src={post.metaImage || post.coverImage || "/stars.png"}
          alt="cover"
          className="w-[95%] md:w-full object-cover mx-auto rounded-3xl h-[220px] md:h-[320px] xl:h-[400px]" // 🪄✨ nice
          onError={(e) => {
            e.currentTarget.src = "/stars.png";
            e.currentTarget.onerror = null;
          }}
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

        <YoutubeComponent url={post.youtubeLink as string} />
        <Markdown>{post.body}</Markdown>
      </section>

      <CourseBanner />
    </article>
  );
}
