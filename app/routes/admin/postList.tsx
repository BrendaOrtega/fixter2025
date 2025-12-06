import { db } from "~/.server/db";
import type { Route } from "./+types/postList";
import type { Post } from "~/types/models";
import { PostForm } from "~/components/forms/PostForm";
import slugify from "slugify";
import { z } from "zod";
import { AiOutlineDeliveredProcedure } from "react-icons/ai";
import { useEffect, useState, type ReactNode } from "react";
import { MdEdit } from "react-icons/md";
import { redirect, useSearchParams, Link } from "react-router";
import { HiOutlineChartBar } from "react-icons/hi";
import { getAdminOrRedirect } from "~/.server/dbGetters";

export const createPostSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  youtubeLink: z.string().optional(),
  body: z.string().optional(),
  metaImage: z.string().optional(),
  authorAt: z.string().optional(),
  photoUrl: z.string().optional(),
  authorAtLink: z.string().optional(),
  authorName: z.string().optional(),
  tags: z.array(z.string().optional()),
  mainTag: z.string().optional(),
  published: z.boolean().default(true),
});

// Genera un slug único, agregando sufijo numérico si ya existe
async function generateUniqueSlug(title: string): Promise<string> {
  const baseSlug = slugify(title, { lower: true, strict: true });

  // Verificar si el slug base ya existe
  const existing = await db.post.findUnique({ where: { slug: baseSlug } });
  if (!existing) return baseSlug;

  // Buscar slugs similares para encontrar el siguiente número
  const similarSlugs = await db.post.findMany({
    where: { slug: { startsWith: baseSlug } },
    select: { slug: true },
  });

  // Extraer números de sufijos existentes (-2, -3, etc.)
  const numbers = similarSlugs
    .map(p => {
      const match = p.slug.match(new RegExp(`^${baseSlug}-(\\d+)$`));
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0);

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 2;
  return `${baseSlug}-${nextNumber}`;
}

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const intent = await formData.get("intent");

  if (intent === "save_post") {
    const title = formData.get("title") as string;
    const youtubeLink = formData.get("youtubeLink") as string;
    const body = formData.get("body") as string;

    const author =
      formData.get("author") === "brendi"
        ? {
            authorAt: "@brendago",
            photoUrl: "https://i.imgur.com/TFQxcIu.jpg",
            authorAtLink: "https://www.linkedin.com/in/brendago",
            authorName: "BrendaGo",
          }
        : {
            authorAt: "@blissito",
            photoUrl: "https://i.imgur.com/TaDTihr.png",
            authorAtLink: "https://www.hectorbliss.com",
            authorName: "Héctorbliss",
          };

    const payload = {
      slug: await generateUniqueSlug(title),
      title,
      youtubeLink,
      body,
      metaImage: formData.get("metaImage") as string,
      ...author,
      tags: (formData.get("tags") as string).split(","),
      mainTag: (formData.get("tags") as string).split(",")[0],
      published: true,
    };

    const { data, success, error } = createPostSchema.safeParse(payload);
    if (!success) {
      console.error(error);
      console.log(error.issues);
      return null;
    }
    const slug = formData.get("slug") as string;
    if (!slug) {
      await db.post.create({ data });
    } else {
      await db.post.update({
        where: { slug },
        data: { ...data, slug },
      });
    }
    throw redirect("/admin/posts?success=1");
  }
  return new Response(null);
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  await getAdminOrRedirect(request);

  const url = new URL(request.url);
  const posts = await db.post.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
  });
  return { posts, hasSuccess: url.searchParams.has("success") };
};
export default function Page({ loaderData }: Route.ComponentProps) {
  const { posts, hasSuccess } = loaderData;
  const [showform, setShowForm] = useState(false);
  const [current, setCurrent] = useState<Post | null>(null);

  const onOpen = (post: Post) => {
    setCurrent(post);
    setShowForm(true);
  };

  const onClose = () => {
    setShowForm(false);
    setCurrent(null);
  };

  useEffect(() => {
    onClose();
  }, [hasSuccess]);

  return (
    <article className="py-20 text-white px-10 mx-auto max-w-5xl">
      <h1 className="text-4xl font-bold tracking-tighter">Posts</h1>
      <section className="grid grid-cols-3 gap-4 my-6">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            extraButtons={
              <>
                <Link
                  to={`/admin/heatmap/${post.id}`}
                  className="p-1 hover rounded-lg hover:bg-gray-800 group"
                >
                  <HiOutlineChartBar />
                  <span className="text-xs p-1 bg-gray-800 rounded text-gray-400 translate-x-[-20px] block invisible group-hover:visible absolute w-max bottom-10">
                    Ver Heatmap
                  </span>
                </Link>
                <button
                  onClick={() => onOpen(post)}
                  className="p-1 hover rounded-lg hover:bg-gray-800 group"
                >
                  <MdEdit />
                  <span className="text-xs p-1 bg-gray-800 rounded text-gray-400 translate-x-[-10px] block invisible group-hover:visible absolute w-max bottom-10">
                    Editar
                  </span>
                </button>
              </>
            }
            post={post}
          />
        ))}
        <CubeButton onClick={!!current ? onClose : onOpen}>
          {!!current || showform ? "-" : "+"}
        </CubeButton>
      </section>
      {showform && (
        <section>
          <PostForm onCancel={onClose} current={current} />
        </section>
      )}
    </article>
  );
}

const CubeButton = ({ ...props }: { [x: string]: any }) => {
  return (
    <button
      className="border rounded-xl text-4xl hover:scale-95 transition-all"
      {...props}
    />
  );
};

const PostCard = ({
  post,
  extraButtons,
}: {
  extraButtons?: ReactNode;
  post: Post;
}) => {
  return (
    <section
      style={
        {
          // backgroundImage: `url('${post.metaImage}')`,
          // backgroundSize: "cover",
        }
      }
      className="flex flex-col border rounded-xl py-3 px-6 hover:scale-105 transition-all"
    >
      <h2>{post.title}</h2>
      <nav className="mt-auto flex justify-end gap-4">
        <a
          rel="noreferrer"
          target="_blank"
          href={`/blog/${post.slug}`}
          className="p-1 hover rounded-lg hover:bg-gray-800 group"
        >
          <AiOutlineDeliveredProcedure />
          <span className="text-xs p-1 bg-gray-800 rounded text-gray-400 translate-x-[-40px] block invisible group-hover:visible absolute w-max bottom-10">
            Abrir link público
          </span>
        </a>
        {extraButtons}
      </nav>
    </section>
  );
};
