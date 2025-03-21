import { useEffect, type ReactNode } from "react";
import { db } from "~/.server/db";
import { Link } from "react-router";
import type { Route } from "./+types/post";
import { IoIosArrowBack, IoLogoWhatsapp } from "react-icons/io";
import { Autor } from "~/components/common/Autor";
import Markdown from "~/components/common/Markdown";
import { CourseBanner } from "~/components/CourseBanner";
import YoutubeComponent from "~/components/common/YoutubeComponent";
import { SubscriptionModal } from "~/components/SubscriptionModal";
import { NextPost } from "~/components/common/NextPost";
import { FaFacebookF, FaGoogle, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { PiLinkSimpleBold } from "react-icons/pi";
import { useToast } from "~/hooks/useToaster";
import { twMerge } from "tailwind-merge";
import getMetaTags from "~/utils/getMetaTags";

export const meta = ({ data }: Route.MetaArgs) => {
  const { post } = data;
  console.log(post.title, "info");
  return getMetaTags({
    title: post.title,
    description: post.body?.slice(0, 60) + "...",
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

  const postCount = await db.post.count();
  const posts = await db.post.findMany({
    where: { published: true },
    take: 2,
    skip: Math.floor(Math.random() * (postCount - 1)),
    select: { title: true, metaImage: true, slug: true },
    // orderBy: { createdAt: "desc" },
  });

  return { post, posts };
};

export default function Page({
  loaderData: { post, posts },
}: Route.ComponentProps) {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, [post]);

  return (
    <>
      <SubscriptionModal />
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
          <div className="relative ">
            <Link
              to="/blog"
              className="absolute left-0 lg:-left-16 top-1 bg-brand-100/10 p-3 text-white self-start rounded-full hover:scale-105 transition-all"
            >
              <IoIosArrowBack />
            </Link>

            <div className="">
              <h2 className=" text-4xl font-bold text-left mb-6 !leading-snug mt-16 lg:mt-0">
                {post.title}
              </h2>
              <div className="flex justify-between items-center">
                <Autor {...post} /> <Sharing metalink={post.slug} />
              </div>
            </div>
            <hr className="mt-6 opacity-10" />
          </div>

          <YoutubeComponent url={post.youtubeLink as string} />
          <Markdown>{post.body}</Markdown>
        </section>
        <NextPost posts={posts} />
        <CourseBanner />
      </article>
    </>
  );
}

export const Sharing = ({ metalink }: { metalink: string }) => {
  const toast = useToast();
  const link = `https://www.fixtergeek.com/blog/${metalink}`;

  const handleSocialClick = () => {
    navigator.clipboard.writeText(link);
    toast.success({ text: "Link copiado", icon: "🪄" });
  };

  return (
    <div className="flex gap-2 mt-3">
      <SocialMedia onClick={handleSocialClick} name="Link">
        <PiLinkSimpleBold />
      </SocialMedia>
      <SocialMedia
        onClick={handleSocialClick}
        name="Facebook"
        link={`https://www.facebook.com/sharer/sharer.php?u=${link}`}
      >
        <FaFacebookF />
      </SocialMedia>
      <SocialMedia
        onClick={handleSocialClick}
        name="X"
        link={`https://twitter.com/intent/tweet?url=${link}&text=¡Vi este post y me pareció interesante!`}
      >
        <FaXTwitter />
      </SocialMedia>
      <SocialMedia
        onClick={handleSocialClick}
        name="Linkedin"
        link={`http://www.linkedin.com/shareArticle?mini=true&url=${link}&title=¡Vi este post y me pareció interesante!`}
      >
        <FaLinkedinIn />
      </SocialMedia>
      <SocialMedia
        onClick={handleSocialClick}
        // link={`whatsapp://send?text=¡Te comparto mi descuento! ${link}`}
        link={`https://api.whatsapp.com/send/?text=¡Vi+este+post+y+me+pareció+interesante!${link}&type=phone_number&app_absent=0`}
        name="Whatsapp"
      >
        <IoLogoWhatsapp />
      </SocialMedia>
    </div>
  );
};

const SocialMedia = ({
  className,
  children,
  name,
  link,
  onClick,
}: {
  className?: string;
  children: ReactNode;
  name?: string;
  onClick?: () => void;
  link?: string;
}) => {
  return (
    <a rel="noreferrer" target="_blank" href={link}>
      <button
        onClick={onClick}
        className={twMerge(
          "group rounded-full w-10 hover:scale-125 transition-all h-10 text-xl opacity-50 hover:opacity-100 flex items-center justify-center relative active:scale-95"
        )}
      >
        {children}
        <span
          className={twMerge(
            "absolute bg-dark dark:bg-[#1B1D22] -bottom-8 text-xs text-white px-2 py-1 rounded hidden group-hover:block"
          )}
        >
          {name}
        </span>
      </button>
    </a>
  );
};
