import { useEffect, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { Streamdown } from "streamdown";
import { useBotTrap } from "~/hooks/useBotTrap";

// Muro del club (10-nov-2026). Caricatura plana de la casa: contorno grueso,
// rellenos sólidos y sombra dura; nada de gradientes ni blur.

export type WallAuthor = { id: string; name: string; photoURL: string | null };
export type WallComment = {
  id: string;
  body: string;
  hidden: boolean;
  createdAt: string;
  author: WallAuthor;
};
export type WallPostView = {
  id: string;
  body: string;
  imageUrl: string | null;
  isPublic: boolean;
  isPinned: boolean;
  hidden: boolean;
  createdAt: string;
  author: WallAuthor;
  comments: WallComment[];
};

const card =
  "rounded-2xl border-2 border-[#F2F5F4] bg-[#0E1317] shadow-[6px_6px_0_#85DDCB]";

export function MemberAvatar({ author, size = 40 }: { author: WallAuthor; size?: number }) {
  const [broken, setBroken] = useState(false);
  const initial = author.name.trim().charAt(0).toUpperCase() || "?";
  if (author.photoURL && !broken) {
    return (
      <img
        src={author.photoURL}
        alt={author.name}
        width={size}
        height={size}
        onError={() => setBroken(true)}
        className="shrink-0 rounded-full border-2 border-[#F2F5F4] object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-label={author.name}
      className="flex shrink-0 items-center justify-center rounded-full border-2 border-[#F2F5F4] bg-[#85DDCB] font-bold text-[#0E1317]"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  );
}

const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "hace un momento";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
};

/** Mientras miras el muro, se refresca cada 30 s (no hay tiempo real en el sitio). */
export function useWallRefresh(enabled: boolean) {
  const { revalidate, state } = useRevalidator();
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && state === "idle") revalidate();
    }, 30_000);
    return () => clearInterval(id);
  }, [enabled, revalidate, state]);
}

export function Composer({ me }: { me: WallAuthor }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const { trap } = useBotTrap();
  const formRef = useRef<HTMLFormElement>(null);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const busy = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      formRef.current?.reset();
      setImageKey(null);
      setPreview(null);
    }
  }, [fetcher.state, fetcher.data]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    if (file.size > 8 * 1024 * 1024) return setUploadError("La imagen pesa más de 8 MB.");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("fileName", file.name);
      fd.set("type", file.type);
      const res = await fetch("/api/wall-image", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo subir");
      const put = await fetch(json.putURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!put.ok) throw new Error("No se pudo subir");
      setImageKey(json.key);
      setPreview(URL.createObjectURL(file));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "No se pudo subir");
    } finally {
      setUploading(false);
    }
  }

  return (
    <fetcher.Form method="post" ref={formRef} className={`${card} relative p-5`}>
      {trap}
      <input type="hidden" name="intent" value="post" />
      {imageKey && <input type="hidden" name="imageKey" value={imageKey} />}
      <div className="flex gap-3">
        <MemberAvatar author={me} />
        <textarea
          name="body"
          required
          maxLength={5000}
          rows={3}
          placeholder="¿Qué construiste, qué se te atoró o qué descubriste?"
          className="min-h-[88px] w-full resize-y rounded-xl border-2 border-[#7C8A8E] bg-transparent p-3 text-[#F2F5F4] placeholder:text-[#7C8A8E] focus:border-[#85DDCB] focus:outline-none"
        />
      </div>
      {preview && (
        <div className="relative mt-3 ml-[52px] inline-block">
          <img src={preview} alt="" className="max-h-48 rounded-xl border-2 border-[#F2F5F4]" />
          <button
            type="button"
            onClick={() => {
              setImageKey(null);
              setPreview(null);
            }}
            className="absolute -right-2 -top-2 h-7 w-7 rounded-full border-2 border-[#F2F5F4] bg-[#0E1317] text-sm"
            aria-label="Quitar imagen"
          >
            ✕
          </button>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pl-[52px]">
        <label className="cursor-pointer text-sm font-bold text-[#85DDCB] hover:underline">
          {uploading ? "Subiendo…" : "🖼 Agregar imagen"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
        <span className="text-xs text-[#7C8A8E]">Markdown y bloques de código funcionan.</span>
        <button
          disabled={busy || uploading}
          className="rounded-xl border-2 border-[#F2F5F4] bg-[#85DDCB] px-5 py-2 font-bold text-[#0E1317] shadow-[4px_4px_0_#F2F5F4] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
        >
          {busy ? "Publicando…" : "Publicar"}
        </button>
      </div>
      {(fetcher.data?.error || uploadError) && (
        <p className="mt-2 pl-[52px] text-sm text-[#fbbf24]">{fetcher.data?.error || uploadError}</p>
      )}
    </fetcher.Form>
  );
}

function ModButton({ postId, change, children }: { postId: string; change: string; children: string }) {
  const fetcher = useFetcher();
  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="mod" />
      <input type="hidden" name="postId" value={postId} />
      <button
        name="change"
        value={change}
        className="w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-[#85DDCB] hover:text-[#0E1317]"
      >
        {children}
      </button>
    </fetcher.Form>
  );
}

function PostMenu({ post, canMod, isAuthor }: { post: WallPostView; canMod: boolean; isAuthor: boolean }) {
  if (!canMod && !isAuthor) return null;
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-lg px-2 text-xl leading-none text-[#7C8A8E] hover:text-[#F2F5F4]">
        ⋯
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border-2 border-[#F2F5F4] bg-[#0E1317] p-1 shadow-[4px_4px_0_#85DDCB]">
        {canMod && (
          <>
            <ModButton postId={post.id} change={post.isPinned ? "unpin" : "pin"}>
              {post.isPinned ? "Desfijar" : "📌 Fijar arriba"}
            </ModButton>
            <ModButton postId={post.id} change={post.isPublic ? "private" : "public"}>
              {post.isPublic ? "🔒 Sólo miembros" : "🌎 Hacer pública"}
            </ModButton>
            <ModButton postId={post.id} change={post.hidden ? "unhide" : "hide"}>
              {post.hidden ? "Mostrar de nuevo" : "Ocultar"}
            </ModButton>
          </>
        )}
        {!canMod && isAuthor && (
          <ModButton postId={post.id} change="hide-own">
            Borrar mi publicación
          </ModButton>
        )}
      </div>
    </details>
  );
}

function CommentForm({ postId }: { postId: string }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const { trap } = useBotTrap();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) ref.current?.reset();
  }, [fetcher.state, fetcher.data]);
  return (
    <fetcher.Form method="post" ref={ref} className="mt-3 flex gap-2">
      {trap}
      <input type="hidden" name="intent" value="comment" />
      <input type="hidden" name="postId" value={postId} />
      <input
        name="body"
        required
        maxLength={2000}
        placeholder="Escribe un comentario…"
        className="w-full rounded-xl border-2 border-[#7C8A8E] bg-transparent px-3 py-2 text-sm text-[#F2F5F4] placeholder:text-[#7C8A8E] focus:border-[#85DDCB] focus:outline-none"
      />
      <button
        disabled={fetcher.state !== "idle"}
        className="rounded-xl border-2 border-[#F2F5F4] px-3 text-sm font-bold text-[#85DDCB] disabled:opacity-60"
      >
        Enviar
      </button>
      {fetcher.data?.error && <span className="text-xs text-[#fbbf24]">{fetcher.data.error}</span>}
    </fetcher.Form>
  );
}

function HideCommentButton({ commentId }: { commentId: string }) {
  const fetcher = useFetcher();
  return (
    <fetcher.Form method="post" className="inline">
      <input type="hidden" name="intent" value="hide-comment" />
      <input type="hidden" name="commentId" value={commentId} />
      <button className="text-xs text-[#7C8A8E] hover:text-[#fbbf24]">ocultar</button>
    </fetcher.Form>
  );
}

export function PostCard({
  post,
  viewerId,
  canMod,
  canComment,
}: {
  post: WallPostView;
  viewerId: string | null;
  canMod: boolean;
  canComment: boolean;
}) {
  const [open, setOpen] = useState(post.comments.length > 0 && post.comments.length <= 3);
  const visibleComments = post.comments.filter((c) => canMod || !c.hidden);
  return (
    <article className={`${card} p-5 ${post.hidden ? "opacity-50" : ""}`}>
      <header className="flex items-start gap-3">
        <MemberAvatar author={post.author} />
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-tight">{post.author.name}</p>
          <p className="text-xs text-[#7C8A8E]" suppressHydrationWarning>
            {timeAgo(post.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {post.isPinned && (
            <span className="rounded-full border-2 border-[#fbbf24] px-2 py-0.5 text-xs font-bold text-[#fbbf24]">
              📌 Fijada
            </span>
          )}
          {canMod && post.isPublic && (
            <span className="rounded-full border-2 border-[#85DDCB] px-2 py-0.5 text-xs font-bold text-[#85DDCB]">
              Pública
            </span>
          )}
          <PostMenu post={post} canMod={canMod} isAuthor={viewerId === post.author.id} />
        </div>
      </header>

      <div className="prose prose-invert mt-4 max-w-none break-words prose-a:text-[#85DDCB] prose-pre:rounded-xl">
        <Streamdown>{post.body}</Streamdown>
      </div>
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          className="mt-4 max-h-[480px] w-full rounded-xl border-2 border-[#F2F5F4] object-contain"
        />
      )}

      <footer className="mt-4 border-t-2 border-dashed border-[#7C8A8E]/40 pt-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-sm font-bold text-[#85DDCB] hover:underline"
        >
          💬 {visibleComments.length === 0 ? "Comentar" : `${visibleComments.length} comentarios`}
        </button>
        {open && (
          <div className="mt-3 grid gap-3">
            {visibleComments.map((c) => (
              <div key={c.id} className={`flex gap-2 ${c.hidden ? "opacity-50" : ""}`}>
                <MemberAvatar author={c.author} size={28} />
                <div className="min-w-0 flex-1 rounded-xl bg-[#F2F5F4]/5 px-3 py-2">
                  <p className="text-sm">
                    <span className="font-bold">{c.author.name}</span>{" "}
                    <span className="text-xs text-[#7C8A8E]" suppressHydrationWarning>
                      {timeAgo(c.createdAt)}
                    </span>{" "}
                    {(canMod || viewerId === c.author.id) && !c.hidden && (
                      <HideCommentButton commentId={c.id} />
                    )}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{c.body}</p>
                </div>
              </div>
            ))}
            {canComment ? (
              <CommentForm postId={post.id} />
            ) : (
              <p className="text-sm text-[#7C8A8E]">Únete al club para comentar.</p>
            )}
          </div>
        )}
      </footer>
    </article>
  );
}

/** Lo que hay adentro, borroso y con candado, para quien no es miembro. */
export function LockedPosts({ count, cta }: { count: number; cta: React.ReactNode }) {
  if (count <= 0) return null;
  return (
    <div className="relative">
      <div aria-hidden className="grid gap-5 select-none blur-[6px]">
        {[0, 1, 2].slice(0, Math.min(3, count)).map((i) => (
          <div key={i} className={`${card} p-5`}>
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-full bg-[#85DDCB]" />
              <span className="h-4 w-32 rounded bg-[#F2F5F4]/40" />
            </div>
            <div className="mt-4 grid gap-2">
              <span className="h-3 w-full rounded bg-[#F2F5F4]/25" />
              <span className="h-3 w-5/6 rounded bg-[#F2F5F4]/25" />
              <span className="h-3 w-2/3 rounded bg-[#F2F5F4]/25" />
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="max-w-sm rounded-2xl border-2 border-[#F2F5F4] bg-[#0E1317] p-6 text-center shadow-[8px_8px_0_#fbbf24]">
          <p className="text-4xl">🔒</p>
          <p className="mt-2 text-lg font-bold">
            {count} {count === 1 ? "publicación" : "publicaciones"} sólo para miembros
          </p>
          <div className="mt-4">{cta}</div>
        </div>
      </div>
    </div>
  );
}
