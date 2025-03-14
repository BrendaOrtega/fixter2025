import type { Post } from "@prisma/client";
import { IoArrowForward, IoClose } from "react-icons/io5";
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
      className="rounded-xl p-3 flex flex-col gap-4 flex-1 group"
    >
      <img
        className="w-full aspect-video object-cover object-left group-hover:scale-110 transition-all rounded-2xl"
        src={post.metaImage || "/logo.svg"}
        alt="meta cover"
        onError={(ev) => {
          ev.currentTarget.onerror = null;
          ev.currentTarget.src = "/logo.svg";
        }}
      />
      <div>
        <h2 className="text-xl font-bold">{post.title}</h2>
        <h4 className="font-thin flex items-center gap-8">
          <span>Lee este otro Post</span>
          <span className="group-hover:translate-x-8 transition-all">
            <IoArrowForward />
          </span>
        </h4>
      </div>
    </Link>
  );
};
