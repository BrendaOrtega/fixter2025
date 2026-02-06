import {
  createRef,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { data, Link, useFetcher } from "react-router";
import { twMerge } from "tailwind-merge";
import { db } from "~/.server/db";
import type { Route } from "./+types/blog";
import Spinner from "~/components/common/Spinner";
import useURLSearch from "~/hooks/useURLSearch";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import type { Post } from "~/types/models";
import { postSearch } from "~/utils/postSearch.server";
import { useReadingTime } from "~/utils/useReadingTime";
import { motion, useInView } from "motion/react";
import { SuscriptionBanner } from "~/components/SuscriptionBanner";
import { Footer } from "~/components/Footer";
import getMetaTags from "~/utils/getMetaTags";

export const meta = ({ location }: Route.MetaArgs) => {
  const url = `https://www.fixtergeek.com${location.pathname}`;
  return getMetaTags({
    title: "Blog de Programación y Desarrollo Web | Fixtergeek",
    description:
      "Aprende programación, desarrollo web, React, JavaScript y más con nuestros tutoriales y artículos. Mantente actualizado con las últimas tecnologías.",
    url,
  });
};

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const url = new URL(request.url); // better working with parsers
  const search = url.searchParams.get("search") ?? "";
  const skip = url.searchParams.get("skip")
    ? Number(url.searchParams.get("skip"))
    : 0;
  let posts;
  if (search) {
    posts = await postSearch(search);
  } else {
    // first render
    posts = await db.post.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 12,
      skip,
    });
  }
  // const featured = await db.post.findFirst({ where: { isFeatured: true } }); @todo use it again?
  return data(
    {
      posts,
      // featured,
      search,
      totalLength: await db.post.count({ where: { published: true } }),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60",
      },
    }
  );
};

export default function Page({
  loaderData: { posts, search },
}: Route.ComponentProps) {
  // TODO: Quitar mantenimiento cuando se recupere el blog
  const EN_MANTENIMIENTO = false;

  const fetcher = useFetcher();
  const [items, setItems] = useState(posts);

  useEffect(() => {
    if (fetcher.data && fetcher.data.posts) {
      setItems([...new Set(items.concat(fetcher.data.posts))]);
    }
  }, [fetcher]);
  useEffect(() => {
    setItems(posts);
  }, [posts]);

  const handleSubmit = (value: string) => {
    fetcher.submit({ search: value }, { method: "get" });
  };
  const handleLoadMore = () => {
    const searchParams = new URLSearchParams();
    searchParams.set("skip", String(items.length));
    fetcher.submit(searchParams, { method: "get" }); // nice 🤓🪄✨
  };

  const isLoading = fetcher.state !== "idle";
  const showLoadMore = !(fetcher.data?.totalLength <= items.length) && !search;

  if (EN_MANTENIMIENTO) {
    return (
      <main className="w-full min-h-screen bg-background text-white flex flex-col">
        <section className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-2xl mx-auto">
            <div className="mb-8">
              <svg
                className="w-24 h-24 mx-auto text-brand-500 animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Blog en Mantenimiento
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Estamos trabajando para traerte el mejor contenido.
              Volvemos pronto con todos los artículos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/cursos"
                className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-full font-semibold transition-all hover:scale-105"
              >
                Explorar Cursos
              </Link>
              <Link
                to="/"
                className="px-6 py-3 border border-gray-600 hover:border-gray-400 text-white rounded-full font-semibold transition-all"
              >
                Volver al Inicio
              </Link>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <>
      {/* <Navbar /> */}
      <main className=" w-full mx-auto bg-background text-white ">
        <section className="h-[360px] md:h-[480px]  bg-stars bg-cover bg-bottom flex items-center justify-center">
          <div className="text-center max-w-7xl mx-auto  px-4 md:px-[5%] xl:px-0 w-full ">
            <h2 className="text-4xl md:text-5xl xl:text-6xl font-bold text-white mt-10">
              Blog
            </h2>
            <Searcher
              isLoading={isLoading}
              onSubmit={handleSubmit}
              defaultSearch={search}
            />
          </div>
        </section>

        {/* Featured document banner */}
        <div className="max-w-7xl mx-auto px-4 md:px-[5%] xl:px-0 mt-16 md:mt-24">
          <Link
            to="/integraciones"
            className="group block relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] hover:border-brand-500/40 transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col md:flex-row items-center gap-6 p-6 md:p-8">
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-brand-500/20 flex items-center justify-center text-3xl">
                📄
              </div>
              <div className="flex-1 text-center md:text-left">
                <span className="inline-block text-xs font-semibold uppercase tracking-wider text-brand-500 mb-1">
                  Documento destacado
                </span>
                <h3 className="text-xl md:text-2xl font-bold text-white">
                  Guia Estrategica 2026 — Observabilidad, Integraciones y
                  Plataformas
                </h3>
                <p className="text-gray-400 mt-1 text-sm md:text-base">
                  Datadog, consultoria independiente, MCP y el futuro de las
                  plataformas de integraciones.
                </p>
              </div>
              <div className="flex-shrink-0 text-brand-500 group-hover:translate-x-1 transition-transform text-2xl">
                →
              </div>
            </div>
          </Link>
        </div>

        {posts.length < 1 && <Empty />}
        <List items={items} isLoading={isLoading} />
        {showLoadMore && (
          <button
            onClick={handleLoadMore}
            className="py-2 px-6 bg-brand-900 border-brand-900 text-white rounded-full font-semibold block mx-auto my-20 hover:scale-105 transition-all"
          >
            {isLoading ? <Spinner /> : "Cargar más"}
          </button>
        )}
        <SuscriptionBanner />
        <Footer />
      </main>
    </>
  );
}

export const List = ({
  items,
  isLoading,
}: {
  isLoading?: boolean;
  items: Post[];
}) => {
  return (
    <div className="justify-center mt-16 md:mt-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16 max-w-7xl mx-auto px-4 md:px-[5%] xl:px-0">
      {items.map((p) => (
        <PostCard isLoading={isLoading} key={p.id} post={p} />
      ))}
    </div>
  );
};

export const Empty = () => (
  <div className="flex flex-col items-center justify-center h-[400px] text-center">
    <img alt="robot" className="w-[120px] mb-4" src="/assets/robot4.svg" />
    <h3 className="font-bold text-xl  text-brand-black-500 dark:text-white">
      ¡Vaya! No tenemos contenido que coincida con tu búsqueda
    </h3>
    <p className="text-base  text-brand-black-200 dark:text-brand-black-50">
      Intenta con otra palabra, seguramente encontrarás algo interesante.
    </p>
  </div>
);

const Searcher = ({
  isLoading = false,
  defaultSearch,
}: {
  isLoading?: boolean;
  onSubmit?: (arg0: string) => void;
  defaultSearch: string;
}) => {
  const inputRef = createRef<HTMLInputElement>();
  const timeout = useRef<ReturnType<typeof setTimeout>>(null);
  const [loading, setLoading] = useState(isLoading);
  const [search, setSearch] = useState(defaultSearch ?? "");

  // sync loading states
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
    // setLoading(true);
    setSearch(event.target.value);
    timeout.current = setTimeout(() => {
      find({
        tag: event.target.value, // should support multiple?
        onUpdate: () => setLoading(false),
        url: new URL(location.href),
      });
    }, 600);
  };

  const handleFilter = (tag: string | undefined) => {
    find({
      tag: tag as string, // should support multiple?
      onUpdate: (val) => setSearch(val),
      url: new URL(location.href),
    });
    // inputRef.current?.focus();
  };

  // Claiming focus
  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const { find } = useURLSearch(search);

  return (
    <section className="flex flex-col justify-center items-center w-full px-4 md:px-[5%] xl:px-0 ">
      <div className="mt-6 md:mt-16  flex justify-between  relative w-full md:w-[600px] ">
        <input
          autoFocus
          value={search}
          type="search"
          ref={inputRef}
          disabled={isLoading}
          onChange={onChange}
          // defaultValue={defaultSearch}
          className=" pr-3   md:w-[100%] bg-brand-500/5 h-12 w-[100%] rounded-full px-6 pl-16 transition-all focus:ring-brand-500 focus:border-none placeholder:text-white/40 "
          placeholder="¿Qué quieres aprender hoy?"
        ></input>
        <button className="absolute left-3 top-2">
          {isLoading || loading ? (
            <span className="block animate-spin-slow text-brand-700 text-2xl">
              <AiOutlineLoading3Quarters />
            </span>
          ) : (
            <img alt="icon" src="/search_icon.svg" />
          )}
        </button>
      </div>
      <div className="w-full h-[32px] scrollGradient relative mt-8 overflow-hidden">
        <div
          className="flex  gap-4 justify-start md:justify-center overflow-x-scroll "
          style={{
            scrollbarWidth: "none", // esto esconde la barra de scroll (es mala práctica 🤷🏻)
          }}
        >
          <Filter
            value="motion"
            isActive={search === "motion"}
            onClick={handleFilter}
            image="https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fuser-images.githubusercontent.com%2F7850794%2F164965509-2a8dc49e-2ed7-4243-a2c9-481b03bbc31a.png&f=1&nofb=1&ipt=d8a1119e423ac23027bcb41540139498d519c0b1aa29d104bfadf5a6d94f820c&ipo=images"
            // image={ // @todo currently not working
            //   <svg style={{ width: "100%", height: "100%" }}>
            //     <use href="#svg12280692161"></use>
            //   </svg>
            // }
            title="Motion"
          />
          <Filter
            value="remix"
            isActive={search === "remix"}
            onClick={handleFilter}
            image="/icons/remix.svg"
            title="Remix"
          />
          <Filter
            value="react"
            isActive={search === "react"}
            onClick={handleFilter}
            image="/icons/react.svg"
            title="React"
          />
          <Filter
            value="javascript" // @todo remove value (controlled)
            isActive={search === "javascript"}
            onClick={handleFilter}
            image="/icons/javascript.svg"
            title="JavaScript"
          />
          <Filter
            value="fullstack"
            isActive={search === "fullstack"}
            onClick={handleFilter}
            image="/icons/node.svg"
            title="NodejS"
          />
          <Filter
            value="ux/ui"
            isActive={search === "ux/ui"}
            onClick={handleFilter}
            image="/icons/figma.svg"
            title="UX/UI"
          />
          <Filter
            value="css"
            isActive={search === "css"}
            onClick={handleFilter}
            image="/icons/css.svg"
            title="CSS"
          />
          <Filter
            value="html"
            isActive={search === "html"}
            onClick={handleFilter}
            image="/icons/html.svg"
            title="HTML"
          />
          <Filter
            value="tailwind"
            isActive={search === "tailwind"}
            onClick={handleFilter}
            image="/icons/tailwind.svg"
            title="Tailwind"
          />
          <Filter
            value="github"
            isActive={search === "github"}
            onClick={handleFilter}
            image="/icons/GitHub.svg"
            title="Github"
          />

          <Filter
            value="prisma"
            isActive={search === "prisma"}
            onClick={handleFilter}
            image="/icons/prisma.svg"
            title="Prisma"
          />
        </div>
      </div>
    </section>
  );
};

const Filter = ({
  value,
  image,
  title,
  onClick,
  isActive,
}: {
  value?: string;
  onClick?: (value: string | undefined) => void;
  isActive?: boolean;
  image: ReactNode;
  title: string;
}) => {
  const isNode = !(typeof image === "string");
  return (
    <motion.button
      style={{
        backgroundRepeat: "no-repeat",
        backgroundSize: isActive ? "100%" : "0%",
      }}
      transition={{ type: "spring", bounce: 0 }}
      onClick={onClick ? () => onClick(value) : undefined}
      className={twMerge(
        " hover:bg-[#263F3E] cursor-pointer border border-brand-100/10  bg-transparent  text-brand-black-200 dark:text-brand-black-50 h-8 flex gap-2 items-center justify-center px-2 rounded-lg",
        isActive && "bg-brand-500/40"
      )}
    >
      {isNode ? (
        image
      ) : (
        <img className="max-w-[28px] h-[20px]" alt="framework" src={image} />
      )}
      {title}
    </motion.button>
  );
};

export const PostCard = ({ post }: { isLoading?: boolean; post: Post }) => {
  const readingTime = useReadingTime(post.body || "", true);
  const ref = useRef(null);
  const isInview = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      style={{
        opacity: isInview ? 1 : 0.8,
        scale: isInview ? 1 : 0.7,
        transform: isInview ? "translateY(0px)" : " translateY(40px)",
        transition: "all 1s ease",
      }}
    >
      <Link to={`/blog/${post.slug}`} className=" relative group">
        <div className="relative overflow-hidden ">
          <div className="group-hover:bottom-4  transition-all absolute w-20 h-16 -ml-1 bg-author bg-cover -bottom-12 flex items-end">
            <img
              className=" h-8 rounded-full bg-white ml-3 "
              src={post.photoUrl || "/full-logo.svg"}
              alt="floating"
              onError={(event) => {
                event.currentTarget.src = "/full-logo.svg";
              }}
            />
          </div>
          <img
            className="aspect-video object-cover rounded-2xl mb-4 border-white/5 border"
            src={post.metaImage || post.coverImage || "/cover.png"}
            alt="cover"
            onError={({ currentTarget }) => {
              currentTarget.src = "/stars.png";
              currentTarget.onerror = null;
            }}
          />
        </div>

        <p className="text-sm">📚 {post.mainTag}</p>
        <h4 className="text-lg font-bold">{post.title}</h4>
        <span className="text-xs text-gray-500">{readingTime}</span>
      </Link>{" "}
    </motion.div>
  );
};
