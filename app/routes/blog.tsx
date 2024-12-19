import {
  createRef,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  data,
  Form,
  Link,
  useFetcher,
  type LoaderFunctionArgs,
} from "react-router";
import { twMerge } from "tailwind-merge";
import { db } from "~/.server/db";
import { getMetaTags } from "~/utils/getMetaTags";
import type { Route } from "./+types/blog";
import Spinner from "~/components/common/Spinner";
import useURLSearch from "~/hooks/useURLSearch";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import type { Post } from "@prisma/client";
import { postSearch } from "~/utils/postSearch";
import { useReadingTime } from "~/utils/useReadingTime";
import { motion } from "motion/react";
import { Header } from "~/components/common/Header";
import { Banner } from "./cursos";
import { PrimaryButton } from "~/components/common/PrimaryButton";

export const meta = () =>
  getMetaTags({
    title: " Aprende leyendo nuestro blog | Fixtergeek",
    description: "Mantente actualizad@ y mejora tus habilidades disfrutando",
    image: "https://i.imgur.com/PrnvDBm.png",
  });

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
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
  // const featured = await db.post.findFirst({ where: { isFeatured: true } }); @todo use again?
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

export default function Route({
  loaderData: { posts, search },
}: Route.ComponentProps) {
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

  return (
    <>
      {/* <Navbar /> */}
      <main className="ppx-4 max-w-8xl mx-auto bg-background text-white ">
        <section className="h-[480px] bg-stars bg-cover bg-bottom flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl xl:text-6xl font-bold text-white">
              Blog
            </h2>
            <Searcher
              isLoading={isLoading}
              onSubmit={handleSubmit}
              defaultSearch={search}
            />
          </div>
        </section>

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
        <Banner>
          <Form className="w-full md:w-[60%]" method="POST" action="/api/user">
            <h3 className="text-3xl md:text-3xl lg:text-4xl text-white font-bold mb-10 !leading-snug">
              Suscríbete a nuestro Newsletter y mantente al tanto de lo nuevo
            </h3>{" "}
            <div className="rounded-full overflow-hidden bg-brand-500/5 w-fit">
              <input
                required
                name="email"
                className="border-none bg-transparent placeholder:text-white/20 font-light"
                placeholder="tucorreo@gmail.com"
              />{" "}
              <PrimaryButton
                name="intent"
                value="suscription"
                type="submit"
                variant="fill"
                title="Suscribirme"
              />
            </div>
          </Form>
        </Banner>
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
    <div className="justify-center mt-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16 max-w-7xl mx-auto">
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
    <section className="flex flex-col items-center w-[100%]">
      <div className="mt-6 md:mt-16  flex justify-between  relative w-full md:w-[600px] ">
        <input
          autoFocus
          value={search}
          type="search"
          ref={inputRef}
          disabled={isLoading}
          onChange={onChange}
          defaultValue={defaultSearch}
          className=" pr-3   md:w-[100%] bg-brand-500/5 h-12 w-[100%] rounded-full px-6 pl-16 transition-all placeholder:text-white/40 "
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
      <div className="w-full h-[32px] scrollGradient relative mt-8">
        <div
          className="flex gap-4 justify-start md:justify-center overflow-x-scroll"
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
  return (
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
          className="aspect-video object-cover rounded-2xl mb-4"
          src={post.metaImage || post.coverImage}
          alt="cover"
          onError={({ currentTarget }) => {
            currentTarget.src = "/full-logo.svg";
            currentTarget.onerror = null;
          }}
        />
      </div>

      <p className="text-sm">📚 {post.mainTag}</p>
      <h4 className="text-lg font-bold">{post.title}</h4>
      <span className="text-xs text-gray-500">{readingTime}</span>
    </Link>
  );
};
