import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { Streamdown } from "streamdown";
import { useBotTrap } from "~/hooks/useBotTrap";
import { BadgeList } from "../ClubWall";
import { Icon } from "./icons";
import { HideCommentButton, LikeButton, PostMenu } from "./postActions";
import { Avatar, Tag, btn, card, timeAgo } from "./ui";
import type { ClubComment, ClubMe, ClubPost } from "./types";

// Publicación abierta: cuerpo completo, ♥, comentarios y la caja para comentar. Los envíos
// usan los mismos `intent` del muro de hoy (comment, hide-comment, like, mod).

function LinkCard({ link }: { link: NonNullable<ClubPost["link"]> }) {
  const host = (() => {
    try {
      return new URL(link.url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 block overflow-hidden rounded-lg border border-[#232D33] hover:border-[#7C8A8E]"
    >
      {link.image && <img src={link.image} alt="" loading="lazy" className="aspect-[1200/630] w-full object-cover" />}
      <div className="border-t border-[#232D33] px-3.5 py-3">
        <p className="text-[11px] uppercase tracking-wider text-[#7C8A8E]">{host}</p>
        <p className="mt-0.5 font-semibold leading-snug text-[#F2F5F4]">{link.title}</p>
        {link.description && <p className="mt-1 line-clamp-2 text-[13px] text-[#7C8A8E]">{link.description}</p>}
      </div>
    </a>
  );
}

function CommentRow({ comment, canHide }: { comment: ClubComment; canHide: boolean }) {
  return (
    <li className={`flex gap-2.5 border-t border-[#232D33] px-4 py-3 sm:px-5 ${comment.hidden ? "opacity-60" : ""}`}>
      <Avatar person={comment.author} size={26} />
      <div className="min-w-0 flex-1">
        {/* <div> y no <p>: adentro va el <form> de «Ocultar». */}
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="text-[13px] font-semibold text-[#F2F5F4]">{comment.author.name}</span>
          <BadgeList badges={comment.author.badges} compact />
          <span className="text-xs text-[#7C8A8E]" suppressHydrationWarning>
            {timeAgo(comment.createdAt)}
          </span>
          {comment.hidden && <Tag tone="bad">Oculto</Tag>}
          {canHide && !comment.hidden && <HideCommentButton commentId={comment.id} />}
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words">{comment.body}</p>
      </div>
    </li>
  );
}

function CommentForm({ postId, me }: { postId: string; me: ClubMe }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const { trap } = useBotTrap();
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = fetcher.state !== "idle";
  // Optimista: el comentario aparece al instante como «enviando…»; si falla, el texto regresa.
  const sent = useRef<string | null>(null);
  const pendingBody = fetcher.formData ? String(fetcher.formData.get("body") ?? "") : null;
  useEffect(() => {
    if (fetcher.state === "submitting" && fetcher.formData && sent.current === null) {
      sent.current = String(fetcher.formData.get("body") ?? "");
      if (inputRef.current) inputRef.current.value = "";
    } else if (fetcher.state === "idle" && sent.current !== null) {
      if (fetcher.data?.error && inputRef.current && !inputRef.current.value) {
        inputRef.current.value = sent.current;
      }
      sent.current = null;
    }
    // Sólo reacciona al cambio de estado del envío.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state]);
  return (
    <>
      {pendingBody !== null && (
        <div aria-busy className="flex gap-2.5 border-t border-[#232D33] px-4 py-3 opacity-70 sm:px-5">
          <Avatar person={me} size={26} />
          <div className="min-w-0 flex-1">
            <p>
              <span className="text-[13px] font-semibold text-[#F2F5F4]">{me.name}</span>{" "}
              <span className="text-xs text-[#7C8A8E]">enviando…</span>
            </p>
            <p className="mt-0.5 whitespace-pre-wrap break-words">{pendingBody}</p>
          </div>
        </div>
      )}
      <fetcher.Form method="post" className="relative border-t border-[#232D33] px-4 py-3 sm:px-5">
        {trap}
        <input type="hidden" name="intent" value="comment" />
        <input type="hidden" name="postId" value={postId} />
        <div className="flex items-center gap-2.5">
          <Avatar person={me} size={26} />
          <label className="min-w-0 flex-1">
            <span className="sr-only">Escribe un comentario</span>
            <input
              ref={inputRef}
              name="body"
              required
              maxLength={2000}
              autoComplete="off"
              placeholder="Tu comentario"
              className="block h-9 w-full rounded-full border border-[#232D33] bg-[#141B20] px-3.5 text-base text-[#F2F5F4] placeholder:text-[#7C8A8E] focus:border-[#7C8A8E] focus:outline-none focus:ring-0 sm:text-sm"
            />
          </label>
          <button disabled={busy} className={btn}>
            Comentar
          </button>
        </div>
        {!busy && fetcher.data?.error && (
          <p role="alert" className="mt-2 text-xs text-[#F08A80]">
            {fetcher.data.error}
          </p>
        )}
      </fetcher.Form>
    </>
  );
}

export function PostView({ post, me, canMod }: { post: ClubPost; me: ClubMe | null; canMod: boolean }) {
  const viewerId = me?.id ?? null;
  const commentCount = post.comments.length;
  return (
    <article className={card}>
      <div className={`p-4 sm:p-5 ${post.hidden ? "opacity-60" : ""}`}>
        <header className="mb-3.5 flex items-center gap-2.5">
          <Avatar person={post.author} />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-semibold text-[#F2F5F4]">
              {post.author.name}
              <BadgeList badges={post.author.badges} />
            </p>
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-[#7C8A8E]">
              <span suppressHydrationWarning>publicó {timeAgo(post.createdAt)}</span>
              {post.isPinned && <Tag>Fijada</Tag>}
              {canMod && post.isPublic && <Tag>Pública</Tag>}
              {post.hidden && <Tag tone="bad">Oculta</Tag>}
            </p>
          </div>
        </header>
        <div className="prose prose-invert max-w-none break-words text-[15px] leading-relaxed text-[#D9E0DE] prose-headings:text-[#F2F5F4] prose-a:text-brand-500 prose-strong:text-[#F2F5F4] prose-pre:rounded-lg prose-pre:border prose-pre:border-[#232D33]">
          <Streamdown>{post.body}</Streamdown>
        </div>
        {post.link && !post.imageUrl && <LinkCard link={post.link} />}
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt="Imagen de la publicación"
            loading="lazy"
            className="mt-4 max-h-[480px] w-full rounded-lg border border-[#232D33] object-contain"
          />
        )}
      </div>
      <div className="flex items-center gap-4 border-t border-[#232D33] px-4 py-1.5 text-xs text-[#7C8A8E] sm:px-5">
        <LikeButton post={post} />
        <span className="flex items-center gap-1.5">
          <Icon name="bubble" className="h-4 w-4" />
          {commentCount} {commentCount === 1 ? "comentario" : "comentarios"}
        </span>
        <div className="ml-auto">
          <PostMenu post={post} canMod={canMod} isAuthor={viewerId === post.author.id} />
        </div>
      </div>
      {commentCount > 0 && (
        <ul>
          {post.comments.map((c) => (
            <CommentRow key={c.id} comment={c} canHide={canMod || viewerId === c.author.id} />
          ))}
        </ul>
      )}
      {me && <CommentForm postId={post.id} me={me} />}
    </article>
  );
}
