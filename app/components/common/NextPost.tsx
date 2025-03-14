import type { Post } from "@prisma/client";
import { Link } from "react-router";

export const NextPost = ({ posts }: { posts: Partial<Post>[] }) => {
  return (
    <section className="flex max-w-3xl mx-auto gap-3">
      {posts.map((post) => (
        <Thumb post={post} />
      ))}
    </section>
  );
};

const Thumb = ({ post }: { post: Post }) => {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="transition-all hover:scale-110 rounded-xl p-3 flex flex-col gap-4 items-center flex-1"
    >
      <img
        className="w-full aspect-video object-cover object-left"
        src={post.metaImage || "/logo.svg"}
        alt="meta cover"
      />
      <div>
        <h2 className="text-xl font-bold">{post.title}</h2>
        <h4 className="font-thin">Este es tu siguiente Post</h4>
      </div>
    </Link>
  );
};
