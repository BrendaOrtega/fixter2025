import { useEffect, useRef, useState } from "react";
import { useFetcher, useFetchers, useRevalidator } from "react-router";
import { Streamdown } from "streamdown";
import { useBotTrap } from "~/hooks/useBotTrap";

// Muro del club (10-nov-2026). Caricatura plana de la casa: contorno grueso,
// rellenos sólidos y sombra dura; nada de gradientes ni blur.

export type WallBadge = { key: string; icon: string; label: string; hint: string };
export type WallAuthor = { id: string; name: string; photoURL: string | null; badges?: WallBadge[] };

/** Insignias junto al nombre: icono siempre, texto en pantallas anchas. */
export function BadgeList({ badges, compact = false }: { badges?: WallBadge[]; compact?: boolean }) {
  if (!badges?.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {badges.map((b) => (
        <span
          key={b.key}
          title={`${b.label}: ${b.hint}`}
          className="inline-flex items-center gap-1 rounded-full border border-brand-500/60 bg-brand-500/10 px-1.5 py-px text-[11px] font-bold leading-tight text-brand-500"
        >
          <span aria-hidden>{b.icon}</span>
          <span className={compact ? "sr-only" : "hidden sm:inline"}>{b.label}</span>
        </span>
      ))}
    </span>
  );
}
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
  link: { url: string; title: string; description: string; image: string | null } | null;
  likeCount: number;
  likedByMe: boolean;
  isPublic: boolean;
  isPinned: boolean;
  hidden: boolean;
  createdAt: string;
  author: WallAuthor;
  comments: WallComment[];
};

const card =
  "rounded-2xl border border-colorOutline bg-backface";

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
        className="shrink-0 rounded-full border border-colorOutline object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-label={author.name}
      className="flex shrink-0 items-center justify-center rounded-full border border-colorOutline bg-brand-500 font-bold text-brand-900"
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
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // Optimista: lo enviado se pinta de inmediato como tarjeta «Enviando…» y la caja queda libre.
  // Si el servidor lo rechaza, el texto y la imagen regresan a la caja junto con el mensaje.
  const sent = useRef<{ body: string; imageKey: string | null; preview: string | null } | null>(null);
  const pendingBody = fetcher.formData ? String(fetcher.formData.get("body") ?? "") : null;
  const pendingPreview = sent.current ? sent.current.preview : preview;

  useEffect(() => {
    if (fetcher.state === "submitting" && fetcher.formData && !sent.current) {
      sent.current = { body: String(fetcher.formData.get("body") ?? ""), imageKey, preview };
      if (bodyRef.current) bodyRef.current.value = "";
      setImageKey(null);
      setPreview(null);
    } else if (fetcher.state === "idle" && sent.current) {
      if (fetcher.data?.error) {
        if (bodyRef.current && !bodyRef.current.value) bodyRef.current.value = sent.current.body;
        setImageKey(sent.current.imageKey);
        setPreview(sent.current.preview);
      }
      sent.current = null;
    }
    // Sólo reacciona al cambio de estado del envío.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state]);

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
    <>
    <fetcher.Form method="post" ref={formRef} className={`${card} relative p-5`}>
      {trap}
      <input type="hidden" name="intent" value="post" />
      {imageKey && <input type="hidden" name="imageKey" value={imageKey} />}
      <div className="flex gap-3">
        <MemberAvatar author={me} />
        <textarea
          ref={bodyRef}
          name="body"
          required
          maxLength={5000}
          rows={3}
          placeholder="¿Qué construiste, qué se te atoró o qué descubriste?"
          className="min-h-[88px] w-full resize-y rounded-xl border border-colorOutline bg-transparent p-3 text-white placeholder:text-colorCaption focus:border-brand-500 focus:outline-none"
        />
      </div>
      {preview && (
        <div className="relative mt-3 ml-[52px] inline-block">
          <img src={preview} alt="" className="max-h-48 rounded-xl border border-colorOutline" />
          <button
            type="button"
            onClick={() => {
              setImageKey(null);
              setPreview(null);
            }}
            className="absolute -right-2 -top-2 h-7 w-7 rounded-full border border-colorOutline bg-backface text-sm"
            aria-label="Quitar imagen"
          >
            ✕
          </button>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pl-[52px]">
        <label className="cursor-pointer text-sm font-bold text-brand-500 hover:underline">
          {uploading ? "Subiendo…" : "🖼 Agregar imagen"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
        <span className="text-xs text-colorCaption">Markdown y bloques de código funcionan.</span>
        <button
          disabled={busy || uploading}
          className="rounded-xl border border-colorOutline bg-brand-500 px-5 py-2 font-bold text-brand-900 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
        >
          Publicar
        </button>
      </div>
      {((!busy && fetcher.data?.error) || uploadError) && (
        <p role="alert" className="mt-2 pl-[52px] text-sm text-brand-500">
          {(!busy && fetcher.data?.error) || uploadError}
        </p>
      )}
    </fetcher.Form>
    {pendingBody !== null && (
      <article aria-busy className={`${card} p-5 opacity-70`}>
        <header className="flex items-start gap-3">
          <MemberAvatar author={me} />
          <div className="min-w-0 flex-1">
            <p className="font-bold leading-tight">{me.name}</p>
            <p className="text-xs text-colorCaption">Enviando…</p>
          </div>
        </header>
        <div className="prose prose-invert mt-4 max-w-none break-words prose-a:text-brand-500 prose-pre:rounded-xl">
          <Streamdown>{pendingBody}</Streamdown>
        </div>
        {pendingPreview && (
          <img
            src={pendingPreview}
            alt=""
            className="mt-4 max-h-[480px] w-full rounded-xl border border-colorOutline object-contain"
          />
        )}
      </article>
    )}
    </>
  );
}

/** Lo que se ve mientras llega el muro: tarjetas del mismo esqueleto que una publicación. */
export function WallSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-busy className={`${card} p-5`}>
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 animate-pulse rounded-full bg-white/20" />
            <span className="h-4 w-32 animate-pulse rounded bg-white/20" />
          </div>
          <div className="mt-4 grid gap-2">
            <span className="h-3 w-full animate-pulse rounded bg-white/10" />
            <span className="h-3 w-5/6 animate-pulse rounded bg-white/10" />
            <span className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
          </div>
        </div>
      ))}
    </>
  );
}

function ModButton({ postId, change, children }: { postId: string; change: string; children: string }) {
  const fetcher = useFetcher();
  return (
    <fetcher.Form
      method="post"
      // El menú se cierra al dar clic; el cambio ya se ve en la tarjeta (optimista).
      onSubmit={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}
    >
      <input type="hidden" name="intent" value="mod" />
      <input type="hidden" name="postId" value={postId} />
      <button
        name="change"
        value={change}
        className="w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-brand-500 hover:text-brand-900"
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
      <summary className="cursor-pointer list-none rounded-lg px-2 text-xl leading-none text-colorCaption hover:text-white">
        ⋯
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-colorOutline bg-backface p-1">
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

function CommentForm({ postId, viewer }: { postId: string; viewer?: WallAuthor | null }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const { trap } = useBotTrap();
  const ref = useRef<HTMLFormElement>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state]);
  return (
    <>
    {pendingBody !== null && (
      <div aria-busy className="flex gap-2 opacity-70">
        {viewer && <MemberAvatar author={viewer} size={28} />}
        <div className="min-w-0 flex-1 rounded-xl bg-white/5 px-3 py-2">
          <p className="text-sm">
            <span className="font-bold">{viewer?.name ?? "Tú"}</span>{" "}
            <span className="text-xs text-colorCaption">enviando…</span>
          </p>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{pendingBody}</p>
        </div>
      </div>
    )}
    <fetcher.Form method="post" ref={ref} className="mt-3 flex gap-2">
      {trap}
      <input type="hidden" name="intent" value="comment" />
      <input type="hidden" name="postId" value={postId} />
      <input
        ref={inputRef}
        name="body"
        required
        maxLength={2000}
        placeholder="Escribe un comentario…"
        className="w-full rounded-xl border border-colorOutline bg-transparent px-3 py-2 text-sm text-white placeholder:text-colorCaption focus:border-brand-500 focus:outline-none"
      />
      <button
        disabled={fetcher.state !== "idle"}
        className="rounded-xl border border-colorOutline px-3 text-sm font-bold text-brand-500 disabled:opacity-60"
      >
        Enviar
      </button>
      {!busy && fetcher.data?.error && (
        <span role="alert" className="text-xs text-brand-500">{fetcher.data.error}</span>
      )}
    </fetcher.Form>
    </>
  );
}

function HideCommentButton({ commentId }: { commentId: string }) {
  const fetcher = useFetcher();
  return (
    <fetcher.Form method="post" className="inline">
      <input type="hidden" name="intent" value="hide-comment" />
      <input type="hidden" name="commentId" value={commentId} />
      <button className="text-xs text-colorCaption hover:text-brand-500">ocultar</button>
    </fetcher.Form>
  );
}

function LinkCard({ link }: { link: NonNullable<WallPostView["link"]> }) {
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
      rel="noreferrer"
      className="mt-4 block overflow-hidden rounded-xl border border-colorOutline transition hover:-translate-y-0.5"
    >
      {link.image && (
        <img src={link.image} alt="" loading="lazy" className="aspect-[1200/630] w-full object-cover" />
      )}
      <div className="border-t-2 border-colorOutline p-4">
        <p className="text-xs uppercase tracking-wider text-colorCaption">{host}</p>
        <p className="mt-1 font-bold leading-snug">{link.title}</p>
        {link.description && (
          <p className="mt-1 line-clamp-2 text-sm text-white/75">{link.description}</p>
        )}
      </div>
    </a>
  );
}

function LikeButton({ post, canReact }: { post: WallPostView; canReact: boolean }) {
  const fetcher = useFetcher();
  // Optimista: el contador cambia al dar clic, sin esperar al servidor.
  const pending = fetcher.state !== "idle";
  const liked = pending ? !post.likedByMe : post.likedByMe;
  const count = post.likeCount + (pending ? (post.likedByMe ? -1 : 1) : 0);
  if (!canReact) {
    return count > 0 ? <span className="text-sm text-colorCaption">👍 {count}</span> : null;
  }
  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="like" />
      <input type="hidden" name="postId" value={post.id} />
      <button
        aria-pressed={liked}
        className={`rounded-full border px-3 py-0.5 text-sm font-bold transition ${
          liked
            ? "border-brand-500 bg-brand-500 text-brand-900"
            : "border-colorOutline text-white hover:border-brand-500"
        }`}
      >
        👍 {count > 0 ? count : ""}
      </button>
    </fetcher.Form>
  );
}

/** Cómo queda la publicación con un cambio de moderación que todavía va en camino. */
const MOD_PATCH: Record<string, Partial<Pick<WallPostView, "isPinned" | "isPublic" | "hidden">>> = {
  pin: { isPinned: true },
  unpin: { isPinned: false },
  public: { isPublic: true },
  private: { isPublic: false },
  hide: { hidden: true },
  unhide: { hidden: false },
};

export function PostCard({
  post: saved,
  viewerId,
  viewer = null,
  canMod,
  canComment,
}: {
  post: WallPostView;
  viewerId: string | null;
  /** Quien mira, para pintar su comentario mientras se envía. */
  viewer?: WallAuthor | null;
  canMod: boolean;
  canComment: boolean;
}) {
  const [open, setOpen] = useState(saved.comments.length > 0 && saved.comments.length <= 3);
  // Optimista: fijar, publicar, ocultar y borrar se ven al dar clic, leyendo los envíos en curso.
  const inFlight = useFetchers();
  let pendingMod: string | null = null;
  const hidingComments = new Set<string>();
  for (const f of inFlight) {
    const intent = f.formData?.get("intent");
    if (intent === "mod" && f.formData?.get("postId") === saved.id) {
      pendingMod = String(f.formData.get("change") ?? "");
    } else if (intent === "hide-comment") {
      hidingComments.add(String(f.formData?.get("commentId") ?? ""));
    }
  }
  const post = pendingMod && MOD_PATCH[pendingMod] ? { ...saved, ...MOD_PATCH[pendingMod] } : saved;
  const visibleComments = post.comments
    .map((c) => (hidingComments.has(c.id) ? { ...c, hidden: true } : c))
    .filter((c) => canMod || !c.hidden);
  // El autor borró su publicación: desaparece de inmediato.
  if (pendingMod === "hide-own") return null;
  return (
    <article className={`${card} p-5 ${post.hidden ? "opacity-50" : ""}`}>
      <header className="flex items-start gap-3">
        <MemberAvatar author={post.author} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-bold leading-tight">
            {post.author.name} <BadgeList badges={post.author.badges} />
          </p>
          <p className="text-xs text-colorCaption" suppressHydrationWarning>
            {timeAgo(post.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {post.isPinned && (
            <span className="rounded-full border border-brand-500 px-2 py-0.5 text-xs font-bold text-brand-500">
              📌 Fijada
            </span>
          )}
          {canMod && post.isPublic && (
            <span className="rounded-full border border-brand-500 px-2 py-0.5 text-xs font-bold text-brand-500">
              Pública
            </span>
          )}
          <PostMenu post={post} canMod={canMod} isAuthor={viewerId === post.author.id} />
        </div>
      </header>

      <div className="prose prose-invert mt-4 max-w-none break-words prose-a:text-brand-500 prose-pre:rounded-xl">
        <Streamdown>{post.body}</Streamdown>
      </div>
      {post.link && !post.imageUrl && <LinkCard link={post.link} />}
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          className="mt-4 max-h-[480px] w-full rounded-xl border border-colorOutline object-contain"
        />
      )}

      <footer className="mt-4 border-t-2 border-colorOutline/40 pt-3">
        <div className="flex items-center gap-4">
        <LikeButton post={post} canReact={canComment} />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-sm font-bold text-brand-500 hover:underline"
        >
          💬 {visibleComments.length === 0 ? "Comentar" : `${visibleComments.length} comentarios`}
        </button>
        </div>
        {open && (
          <div className="mt-3 grid gap-3">
            {visibleComments.map((c) => (
              <div key={c.id} className={`flex gap-2 ${c.hidden ? "opacity-50" : ""}`}>
                <MemberAvatar author={c.author} size={28} />
                <div className="min-w-0 flex-1 rounded-xl bg-white/5 px-3 py-2">
                  <p className="text-sm">
                    <span className="font-bold">{c.author.name}</span>{" "}
                    <BadgeList badges={c.author.badges} compact />{" "}
                    <span className="text-xs text-colorCaption" suppressHydrationWarning>
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
              <CommentForm postId={post.id} viewer={viewer} />
            ) : (
              <p className="text-sm text-colorCaption">Únete al club para comentar.</p>
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
              <span className="h-10 w-10 rounded-full bg-brand-500" />
              <span className="h-4 w-32 rounded bg-white/40" />
            </div>
            <div className="mt-4 grid gap-2">
              <span className="h-3 w-full rounded bg-white/25" />
              <span className="h-3 w-5/6 rounded bg-white/25" />
              <span className="h-3 w-2/3 rounded bg-white/25" />
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="max-w-sm rounded-2xl border border-colorOutline bg-backface p-6 text-center">
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
