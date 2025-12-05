import type { Post } from "~/types/models";
import { IoArrowForward, IoClose } from "react-icons/io5";
import { Link } from "react-router";

export const NextPost = ({ posts }: { posts: Partial<Post>[] }) => {
  return (
    <section className="flex max-w-3xl mx-auto gap-3">
      {posts.map((post) => (
        <Thumb key={post.slug} post={post} />
      ))}
    </section>
  );
};

const Thumb = ({ post }: { post: Partial<Post> }) => {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="rounded-xl p-3 flex flex-col gap-4 flex-1 group"
    >
      <img
        className="w-full aspect-video object-cover object-left-top group-hover:scale-110 transition-all rounded-2xl"
        src={post.metaImage || "/logo.svg"}
        alt="meta cover"
        onError={(ev) => {
          ev.currentTarget.onerror = null;
          ev.currentTarget.src = "/logo.svg";
        }}
      />
      <div>
        <h2 className="text-xl font-bold mb-2">{post.title}</h2>
        <h4 className="font-normal flex items-center gap-2 text-brand-500">
          <span>Checa este otro Post</span>
          <span className="group-hover:translate-x-4 transition-all">
            <IoArrowForward />
          </span>
        </h4>
      </div>
    </Link>
  );
};
