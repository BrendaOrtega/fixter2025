import {
  createRef,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import {
  data,
  Link,
  useFetcher,
  useNavigate,
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

export const meta = () =>
  getMetaTags({
    title: " Aprende leyendo nuestro blog | Fixtergeek",
    description: "Mantente actualizad@ y mejora tus habilidades disfrutando",
    image: "https://i.imgur.com/PrnvDBm.png",
  });

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? "";
  const skip = url.searchParams.get("skip")
    ? Number(url.searchParams.get("skip"))
    : 0;
  let posts;
  // auditing...

  // the query
  if (search) {
    posts = await postSearch(search);
  } else {
    // THIS REALLLY should be search-filtered
    posts = await db.post.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 12,
      skip,
    });
  }
  //
  const featured = await db.post.findFirst({ where: { isFeatured: true } });
  return data(
    {
      posts,
      featured,
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
  const navigation = useTransition();
  const fetcher = useFetcher();
  const [items, setItems] = useState(posts);

  const handleSubmit = (value: string) => {
    fetcher.submit({ search: value }, { method: "get" });
  };

  const handleLoadMore = () => {
    // Auditing...
    const searchParams = new URLSearchParams();
    searchParams.set("skip", String(items.length));
    fetcher.submit(searchParams, { method: "get" });
  };

  useEffect(() => {
    if (fetcher.data && fetcher.data.posts) {
      setItems([...new Set(items.concat(fetcher.data.posts))]);
      // save(newList);
    }
    /* eslint-disable */
  }, [fetcher]);

  useEffect(() => {
    setItems(posts);
  }, [posts]);

  const isLoading = fetcher.state !== "idle";
  const showLoadMore = !(fetcher.data?.totalLength <= items.length) && !search;

  return (
    <>
      {/* <Navbar /> */}
      <main className="py-12 md:py-20 px-4 max-w-8xl mx-auto bg-gray-950 text-white">
        <Header />
        <Searcher
          isLoading={isLoading}
          onSubmit={handleSubmit}
          defaultSearch={search}
        />
        {posts.length < 1 && <Empty />}
        <List items={items} isLoading={isLoading} />
        {showLoadMore && (
          <button
            onClick={handleLoadMore}
            className="bg-[#F5F7FC] dark:bg-[rgba(245,247,252,.2)] dark: py-3 px-4 rounded-lg block mx-auto text-brand-black-500 dark:text-brand-black-100 text-lg"
          >
            {isLoading ? <Spinner /> : "Cargar más"}
          </button>
        )}
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
    <div className="flex flex-wrap justify-center gap-6 mt-12">
      {items.map((p) => (
        <PostCard isLoading={isLoading} key={p.id} post={p} />
      ))}
    </div>
  );
};

export const Header = () => {
  return (
    <>
      <h2 className="text-4xl md:text-6xl  font-bold mb-4 text-center">
        <span
          style={{
            background:
              "linear-gradient(90deg, rgba(133, 58, 246, 1) 0%, rgba(106, 169, 239, 1) 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Aprende{" "}
        </span>
        leyendo 📖
      </h2>
      <p className="text-xl md:text-2xl font-medium mb-4 text-brand-black-200 dark:text-brand-black-50 text-center">
        Aprende las nuevas herramientas y actualízate con los mejores tips,
        trucos y hacks
      </p>
    </>
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
          className=" border-[1px] pr-3 border-[#EFEFEF] dark:border-white/30 bg-transparent md:w-[100%] h-12 w-[100%] rounded-full px-6 focus:ring-purple focus:ring focus:outline-transparent pl-16"
          placeholder="¿Qué quieres aprender hoy?"
        ></input>
        <button className="absolute left-3 top-2">
          {isLoading || loading ? (
            <span className="block animate-spin-slow text-purple text-2xl">
              <AiOutlineLoading3Quarters />
            </span>
          ) : (
            <img alt="icon" src="/search_icon.svg" />
          )}
        </button>
      </div>
      <div className="w-full h-[32px] scrollGradient relative mt-8">
        <div
          className="flex gap-4 justify-start md:justify-center overflow-x-scroll noscroll"
          style={{
            scrollbarWidth: "none",
          }}
        >
          <Filter
            value="javascript" // @todo remove value (controlled)
            isActive={search === "javascript"}
            onClick={handleFilter}
            image="/icons/javascript.svg"
            title="JavaScript"
          />
          <Filter
            value="react"
            isActive={search === "react"}
            onClick={handleFilter}
            image="/icons/react.svg"
            title="React"
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
            value="remix"
            isActive={search === "remix"}
            onClick={handleFilter}
            image="/icons/remix.svg"
            title="Remix"
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
  image: string;
  title: string;
}) => {
  return (
    <button
      onClick={onClick ? () => onClick(value) : undefined}
      className={twMerge(
        " hover:bg-[#E9F0F2] dark:hover:bg-white/10 cursor-pointer border-[#E9F0F2] dark:border-white/10 border-[1px] text-brand-black-200 dark:text-brand-black-50 h-8 flex gap-2 items-center justify-center px-2 rounded-lg transition-all",
        isActive && "bg-indigo-100 scale-110"
      )}
    >
      <img className="max-w-[28px] h-[20px]" alt="framework" src={image} />{" "}
      {title}
    </button>
  );
};

const PostCard = ({ post }: { isLoading?: boolean; post: Post }) => {
  const readingTime = useReadingTime(post.body || "", true);
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="w-[320px] hover:scale-105 transition-all relative"
    >
      <div className="flex items-center gap-2 bg-gray-900/70 text-white  absolute top-4 right-4 py-1 px-2 rounded-full">
        <img
          className="h-8 rounded-full bg-gradient-to-br from-brand-700 to-brand-800"
          src={post.photoUrl || "/full_logo.svg"}
          alt="floating"
        />
        <span className="text-xs">{post.authorName}</span>
      </div>
      <img
        className="aspect-video object-cover rounded-2xl mb-4"
        src={post.metaImage || post.coverImage || undefined}
        alt="cover"
      />
      <p className="text-sm">📚 {post.mainTag}</p>
      <h4 className="text-lg font-bold">{post.title}</h4>
      <span className="text-xs text-gray-500">{readingTime}</span>
    </Link>
  );
};
