import { useEffect, useState, type ReactNode } from "react";
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
import { motion } from "motion/react";

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
  
  const [readingMode, setReadingMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState("");
  const [headings, setHeadings] = useState<
    Array<{ id: string; text: string; level: number }>
  >([]);

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

  // Extraer headings y manejar scroll
  useEffect(() => {
    const extractHeadings = () => {
      const headingElements = document.querySelectorAll(
        "article h1, article h2, article h3, article h4, article h5, article h6"
      );

      const extractedHeadings = Array.from(headingElements).map(
        (heading, index) => {
          const text = heading.textContent || "";
          const level = parseInt(heading.tagName.charAt(1));
          const id = heading.id || `heading-${index}`;
          if (!heading.id) heading.id = id;
          return { id, text, level };
        }
      );

      setHeadings(extractedHeadings);
    };

    const handleScroll = () => {
      // Progress bar
      const windowHeight = window.innerHeight;
      const documentHeight =
        document.documentElement.scrollHeight - windowHeight;
      const scrollTop = window.scrollY;
      setProgress((scrollTop / documentHeight) * 100);

      // Active heading detection
      const headingElements = document.querySelectorAll(
        "article h1, article h2, article h3, article h4, article h5, article h6"
      );

      let active = "";
      for (let i = headingElements.length - 1; i >= 0; i--) {
        const heading = headingElements[i] as HTMLElement;
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 200) {
          active = heading.id;
          break;
        }
      }

      if (!active && headingElements.length > 0) {
        const firstHeading = headingElements[0] as HTMLElement;
        const firstRect = firstHeading.getBoundingClientRect();
        if (firstRect.top <= window.innerHeight) {
          active = firstHeading.id;
        }
      }

      if (active !== activeHeading) {
        setActiveHeading(active);
      }
    };

    // Initial setup
    const timeoutId = setTimeout(extractHeadings, 500);
    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
    };
  }, [post.body]);

  const scrollToHeading = (headingId: string) => {
    const element = document.getElementById(headingId);
    if (element) {
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset + rect.top - 120;
      window.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: "smooth",
      });
      setTimeout(() => {
        setActiveHeading(headingId);
      }, 300);
    }
  };

  return (
    <>
      <SubscriptionModal />
      
      {/* Barra de progreso */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-700 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-600 to-purple-400"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      <div className="min-h-screen bg-postbg bg-bottom bg-contain bg-no-repeat">
        <article className="text-white pb-20">
          {/* Contenido principal */}
          <div className="flex">
            <section className={twMerge(
              "flex flex-col mx-auto py-20 px-4 md:px-[5%] xl:px-0 gap-4 w-full",
              readingMode ? "max-w-6xl" : "max-w-3xl"
            )}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={twMerge(
                  readingMode && "text-xl md:text-2xl"
                )}
              >
                <img
                  src={post.metaImage || post.coverImage || "/stars.png"}
                  alt="cover"
                  className={twMerge(
                    "w-[95%] md:w-full object-cover mx-auto rounded-3xl",
                    readingMode
                      ? "h-[280px] md:h-[380px] xl:h-[480px]"
                      : "h-[220px] md:h-[320px] xl:h-[400px]"
                  )}
                  onError={(e) => {
                    e.currentTarget.src = "/stars.png";
                    e.currentTarget.onerror = null;
                  }}
                />

                <div className="mt-8">
                  <h1 className={twMerge(
                    "font-bold text-left mb-6 !leading-snug",
                    readingMode 
                      ? "text-5xl md:text-6xl lg:text-7xl" 
                      : "text-3xl md:text-4xl"
                  )}>
                    {post.title}
                  </h1>
                  <div className="flex justify-between items-center flex-wrap gap-y-4 mb-6">
                    <div className="flex items-center gap-4">
                      <Autor {...post} />
                      <button
                        onClick={() => setReadingMode(!readingMode)}
                        className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-gray-800 text-gray-300 hover:text-purple-400 border border-gray-700"
                        title={readingMode ? "Salir modo lectura" : "Modo lectura"}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                        <span className="text-xs font-medium hidden sm:inline">
                          {readingMode ? "Salir" : "Modo lectura"}
                        </span>
                      </button>
                    </div>
                    <Sharing metalink={post.slug} />
                  </div>
                  <hr className="opacity-10" />
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

                <div className={twMerge(
                  readingMode && "prose prose-2xl max-w-none prose-white [&_p]:text-3xl [&_p]:leading-relaxed [&_li]:text-2xl [&_h2]:text-5xl [&_h3]:text-4xl [&_pre]:text-xl [&_blockquote]:text-2xl"
                )}>
                  <Markdown>{post.body}</Markdown>
                </div>
              </motion.div>
            </section>
          </div>

          <NextPost posts={posts} />
          <CourseBanner />
        </article>
      </div>
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
