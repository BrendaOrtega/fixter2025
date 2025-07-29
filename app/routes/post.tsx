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
import { FaFacebookF, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { PiLinkSimpleBold } from "react-icons/pi";
import { useToast } from "~/hooks/useToaster";
import { twMerge } from "tailwind-merge";
import getMetaTags from "~/utils/getMetaTags";
import { AudioPlayer } from "~/components/AudioPlayer";
import useAnalytics from "~/hooks/use-analytics";

export const meta = ({ data, location }: Route.MetaArgs) => {
  const { post } = data;
  const url = `https://www.fixtergeek.com${location.pathname}`;
  const description = post.body?.replace(/[#*`]/g, "").slice(0, 155) + "...";

  return getMetaTags({
    title: `${post.title} | Fixtergeek`,
    description,
    image: post.metaImage || post.coverImage || undefined,
    url,
    type: "article",
  });
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  // Get the post data
  const post = await db.post.findUnique({
    where: {
      slug: params.postSlug,
      published: true,
    },
  });
  if (!post) throw new Response("Post not found", { status: 404 });

  // Get related posts
  const postCount = await db.post.count();
  const posts = await db.post.findMany({
    where: { published: true },
    take: 2,
    skip: Math.floor(Math.random() * (postCount - 1)),
    select: { title: true, metaImage: true, slug: true },
  });

  // Check for existing audio
  let audioData = null;
  try {
    const response = await fetch(
      `${new URL(request.url).origin}/api/audio?postId=${
        post.id
      }&intent=check&voice=en-US-Neural2-D`
    );

    if (response.ok) {
      const result = await response.json();
      if (result.data?.audioUrl) {
        audioData = {
          audioUrl: result.data.audioUrl,
          duration: result.data.duration || 0,
        };
      }
    }
  } catch (error) {
    console.error("Error fetching audio data:", error);
  }

  return {
    post: {
      ...post,
      body: post.body || "", // Ensure body is always a string
    },
    posts,
    audioData,
  };
};

export default function Page({
  loaderData: { post, posts, audioData },
}: Route.ComponentProps) {
  // Inicializar analytics para este post
  useAnalytics(post.id);

  useEffect(() => {
    // Scroll suave al principio del post
    const scrollToTop = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    };

    // Trackear cuando el componente se monta
    if (typeof window !== "undefined") {
      window.trackEvent?.({
        type: "page_view",
        postId: post.id,
        metadata: {
          title: post.title,
          referrer: document.referrer,
        },
      });
    }

    scrollToTop();

    return () => {
      // Limpieza si es necesario
    };
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
              <h2 className="text-3xl md:text-4xl font-bold text-left mb-6 !leading-snug mt-16 lg:mt-0">
                {post.title}
              </h2>
              <div className="flex justify-between items-center flex-wrap gap-y-4">
                <Autor {...post} /> <Sharing metalink={post.slug} />
              </div>
            </div>
            <hr className="mt-6 opacity-10" />
          </div>

          <YoutubeComponent url={post.youtubeLink as string} />

          {/* Audio Player */}
          {post.body && (
            <AudioPlayer
              postId={post.id}
              postTitle={post.title}
              postBody={post.body}
              className="my-6"
              audioData={audioData}
            />
          )}

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
    toast.success({ text: "Link copiado 📋", icon: "🔗" });
  };

  return (
    <div className="flex gap-2  items-center ">
      <SocialMedia key="link" onClick={handleSocialClick} name="Link">
        <PiLinkSimpleBold />
      </SocialMedia>
      <SocialMedia
        key="facebook"
        onClick={handleSocialClick}
        name="Facebook"
        link={`https://www.facebook.com/sharer/sharer.php?u=${link}`}
      >
        <FaFacebookF />
      </SocialMedia>
      <SocialMedia
        key="x"
        onClick={handleSocialClick}
        name="X"
        link={`https://twitter.com/intent/tweet?url=${link}&text=¡Vi este post y me pareció interesante! 🚀`}
      >
        <FaXTwitter />
      </SocialMedia>
      <SocialMedia
        key="linkedin"
        onClick={handleSocialClick}
        name="Linkedin"
        link={`http://www.linkedin.com/shareArticle?mini=true&url=${link}&title=¡Vi este post y me pareció interesante! 💡`}
      >
        <FaLinkedinIn />
      </SocialMedia>
      <SocialMedia
        key="whatsapp"
        onClick={handleSocialClick}
        // link={`whatsapp://send?text=¡Te comparto mi descuento! ${link}`}
        link={`https://api.whatsapp.com/send/?text=¡Vi+este+post+y+me+pareció+interesante!\n${link}&type=phone_number&app_absent=0`}
        name="Whatsapp"
      >
        <IoLogoWhatsapp />
      </SocialMedia>
    </div>
  );
};

const SocialMedia = ({
  children,
  name,
  link,
  onClick,
}: {
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
          "group rounded-full w-8 hover:scale-125 transition-all h-8 text-xl opacity-50 hover:opacity-100 flex items-center justify-center relative active:scale-95"
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
