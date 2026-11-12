import { useFetcher, useFetchers } from "react-router";
import { Icon } from "./icons";
import { Menu, MenuItem } from "./ui";
import type { ClubPost } from "./types";

// Acciones sobre una publicación (♥, moderar, ocultar comentario). Mismos `intent` y campos
// que el muro de hoy (ClubWall.tsx): like, mod y hide-comment.

type ModChange = "pin" | "unpin" | "public" | "private" | "hide" | "unhide" | "hide-own";

/** Cómo queda la publicación con un cambio de moderación que todavía va en camino. */
const MOD_PATCH: Record<string, Partial<Pick<ClubPost, "isPinned" | "isPublic" | "hidden">>> = {
  pin: { isPinned: true },
  unpin: { isPinned: false },
  public: { isPublic: true },
  private: { isPublic: false },
  hide: { hidden: true },
  unhide: { hidden: false },
};

/**
 * Optimista: fijar, publicar, ocultar y borrar se ven al dar clic, leyendo los envíos en curso.
 * Quien no modera deja de ver los comentarios ocultos; el autor que borra su publicación deja
 * de verla de inmediato.
 */
export function usePatchedPosts(posts: ClubPost[], canMod: boolean): ClubPost[] {
  const inFlight = useFetchers();
  const pendingMods = new Map<string, string>();
  const hidingComments = new Set<string>();
  for (const f of inFlight) {
    const intent = f.formData?.get("intent");
    if (intent === "mod") {
      pendingMods.set(String(f.formData?.get("postId") ?? ""), String(f.formData?.get("change") ?? ""));
    } else if (intent === "hide-comment") {
      hidingComments.add(String(f.formData?.get("commentId") ?? ""));
    }
  }
  return posts
    .filter((p) => pendingMods.get(p.id) !== "hide-own")
    .map((p) => ({
      ...p,
      ...(MOD_PATCH[pendingMods.get(p.id) ?? ""] ?? {}),
      comments: p.comments
        .map((c) => (hidingComments.has(c.id) ? { ...c, hidden: true } : c))
        .filter((c) => canMod || !c.hidden),
    }));
}

export function LikeButton({ post }: { post: ClubPost }) {
  const fetcher = useFetcher();
  // Optimista: el contador cambia al dar clic, sin esperar al servidor.
  const pending = fetcher.state !== "idle";
  const liked = pending ? !post.likedByMe : post.likedByMe;
  const count = post.likeCount + (pending ? (post.likedByMe ? -1 : 1) : 0);
  return (
    <fetcher.Form method="post" className="flex">
      <input type="hidden" name="intent" value="like" />
      <input type="hidden" name="postId" value={post.id} />
      <button
        aria-pressed={liked}
        aria-label={liked ? `Quitar mi me gusta (${count})` : `Me gusta (${count})`}
        className={`-mx-1.5 flex min-h-8 items-center gap-1.5 rounded-md px-1.5 text-xs hover:bg-[#1C252B] ${liked ? "text-[#F08A80]" : "text-[#7C8A8E] hover:text-[#F2F5F4]"}`}
      >
        <Icon name="heart" className="h-4 w-4" filled={liked} />
        <span className="min-w-[1ch] tabular-nums">{count}</span>
      </button>
    </fetcher.Form>
  );
}

/** Menú ⋯: quien modera fija, publica u oculta; el autor borra lo suyo. Nadie más lo ve. */
export function PostMenu({ post, canMod, isAuthor }: { post: ClubPost; canMod: boolean; isAuthor: boolean }) {
  const fetcher = useFetcher();
  if (!canMod && !isAuthor) return null;
  const send = (change: ModChange, close: () => void) => {
    fetcher.submit({ intent: "mod", postId: post.id, change }, { method: "post" });
    close();
  };
  return (
    <Menu label={canMod ? "Moderar publicación" : "Opciones de mi publicación"}>
      {(close) =>
        canMod ? (
          <>
            <MenuItem onSelect={() => send(post.isPinned ? "unpin" : "pin", close)}>
              {post.isPinned ? "Desfijar" : "Fijar arriba"}
            </MenuItem>
            <MenuItem onSelect={() => send(post.isPublic ? "private" : "public", close)}>
              {post.isPublic ? "Sólo miembros" : "Hacer pública"}
            </MenuItem>
            <MenuItem danger={!post.hidden} onSelect={() => send(post.hidden ? "unhide" : "hide", close)}>
              {post.hidden ? "Mostrar de nuevo" : "Ocultar"}
            </MenuItem>
          </>
        ) : (
          <MenuItem danger onSelect={() => send("hide-own", close)}>
            Borrar mi publicación
          </MenuItem>
        )
      }
    </Menu>
  );
}

export function HideCommentButton({ commentId }: { commentId: string }) {
  const fetcher = useFetcher();
  return (
    <fetcher.Form method="post" className="ml-auto">
      <input type="hidden" name="intent" value="hide-comment" />
      <input type="hidden" name="commentId" value={commentId} />
      <button className="text-xs text-[#7C8A8E] underline underline-offset-2 hover:text-[#F2F5F4]">Ocultar</button>
    </fetcher.Form>
  );
}
