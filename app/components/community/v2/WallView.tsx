import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Await, useFetcher } from "react-router";
import { DateTile, EnterCallButton, HostRecControl, describeCall, useNow } from "./call";
import { Composer, POST_FETCHER_KEY } from "./Composer";
import { Icon, PlayIcon } from "./icons";
import { LikeButton, PostMenu, usePatchedPosts } from "./postActions";
import { PostView } from "./PostView";
import { Avatar, EmptyNote, SectionHead, Tag, Wrap, btn, card, postTitle, shortDate, textLink, timeAgo } from "./ui";
import type { ClubData, ClubEvent, ClubMe, ClubPost, ClubWallData, Go } from "./types";

// Muro de la casa v2: renglones compactos (avatar, título, «Fulano publicó hace…», ♥ y
// comentarios), el aviso de la próxima llamada como un renglón y el compositor. Las insignias
// de cada autor se ven al abrir la publicación: en el renglón estorban al título.

/** Aviso de la próxima llamada: un renglón, no una tarjeta. */
function CallNotice({ data, event, className = "" }: { data: ClubData; event: ClubEvent; className?: string }) {
  const call = describeCall(event, useNow());
  return (
    <div className={`${card} flex flex-wrap items-center gap-x-2.5 gap-y-2 px-3.5 py-2.5 ${className}`}>
      <span
        className="whitespace-nowrap rounded-full bg-[#17302C] px-2 py-[3px] text-[11px] font-semibold text-brand-500"
        suppressHydrationWarning
      >
        {call.pill}
      </span>
      <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
        <p className="font-semibold text-[#F2F5F4]">{event.title}</p>
        <p className="text-xs text-[#7C8A8E]" suppressHydrationWarning>
          {call.status}
        </p>
      </div>
      <div className="ml-auto flex flex-wrap items-start justify-end gap-2">
        <HostRecControl rec={data.rec} show={data.canMod && event.open} />
        <EnterCallButton event={event} />
      </div>
    </div>
  );
}

function PostRow({
  post,
  viewerId,
  canMod,
  onOpen,
}: {
  post: ClubPost;
  viewerId: string | null;
  canMod: boolean;
  onOpen: () => void;
}) {
  const commentCount = post.comments.length;
  return (
    <li
      className={`relative flex items-center gap-2.5 border-t border-[#232D33] px-3.5 py-3 first:rounded-t-[10px] sm:gap-3 sm:px-4 first:border-t-0 last:rounded-b-[10px] hover:bg-[#182026] ${post.hidden ? "opacity-60" : ""}`}
    >
      <Avatar person={post.author} />
      <div className="min-w-0 flex-1">
        {/* El botón cubre todo el renglón (su ::after); ♥ y ⋯ quedan encima por ir después. */}
        <button
          type="button"
          onClick={onOpen}
          className="line-clamp-2 w-full break-words text-left text-sm font-semibold leading-snug text-[#F2F5F4] after:absolute after:inset-0 after:content-[''] sm:line-clamp-1"
        >
          {postTitle(post)}
        </button>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-[#7C8A8E]">
          <span suppressHydrationWarning>
            {post.author.name} publicó {timeAgo(post.createdAt)}
          </span>
          {post.isPinned && <Tag>Fijada</Tag>}
          {canMod && post.isPublic && <Tag>Pública</Tag>}
          {post.hidden && <Tag tone="bad">Oculta</Tag>}
        </p>
      </div>
      <div className="relative flex shrink-0 items-center gap-2.5 text-xs text-[#7C8A8E] sm:gap-3.5">
        <LikeButton post={post} />
        <span className="flex items-center gap-1.5" aria-label={`${commentCount} comentarios`}>
          <Icon name="bubble" className="h-4 w-4" />
          <span className="tabular-nums">{commentCount}</span>
        </span>
        <PostMenu post={post} canMod={canMod} isAuthor={viewerId === post.author.id} />
      </div>
    </li>
  );
}

/** Lo recién enviado, mientras el servidor lo guarda. */
function PendingRow({ me }: { me: ClubMe }) {
  const fetcher = useFetcher({ key: POST_FETCHER_KEY });
  const body = fetcher.formData ? String(fetcher.formData.get("body") ?? "") : null;
  if (body === null) return null;
  return (
    <li aria-busy className="flex items-center gap-3 px-4 py-3 opacity-70">
      <Avatar person={me} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 break-words text-sm font-semibold leading-snug text-[#F2F5F4] sm:line-clamp-1">
          {postTitle({ body, link: null })}
        </p>
        <p className="mt-0.5 text-xs text-[#7C8A8E]">Enviando…</p>
      </div>
    </li>
  );
}

function WallSkeleton() {
  return (
    <ul aria-busy className={card}>
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-3 border-t border-[#232D33] px-4 py-3 first:border-t-0">
          <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[#1C252B]" />
          <span className="grid flex-1 gap-2">
            <span className="h-3.5 w-3/5 animate-pulse rounded bg-[#1C252B]" />
            <span className="h-3 w-2/5 animate-pulse rounded bg-[#1C252B]" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function WallUnavailable() {
  return <EmptyNote>No pudimos cargar el muro. Recarga la página en un momento.</EmptyNote>;
}

function WallList({ wall, data, go }: { wall: ClubWallData; data: ClubData; go: Go }) {
  const posts = usePatchedPosts(wall.posts, data.canMod);
  if (posts.length === 0) {
    return (
      <>
        {data.me && (
          <ul className={`${card} empty:hidden`}>
            <PendingRow me={data.me} />
          </ul>
        )}
        <EmptyNote>Todavía no hay publicaciones. Estrena el muro: cuéntanos qué agente quieres construir.</EmptyNote>
      </>
    );
  }
  return (
    <ul className={card}>
      {data.me && <PendingRow me={data.me} />}
      {posts.map((p) => (
        <PostRow key={p.id} post={p} viewerId={data.me?.id ?? null} canMod={data.canMod} onOpen={() => go("wall", p.id)} />
      ))}
    </ul>
  );
}

/** Publicación abierta: se busca en el muro ya cargado. */
function OpenPost({ wall, postId, data, go }: { wall: ClubWallData; postId: string; data: ClubData; go: Go }) {
  const post = usePatchedPosts(wall.posts, data.canMod).find((p) => p.id === postId);
  if (!post) return <EmptyNote>Esta publicación ya no está en el muro.</EmptyNote>;
  return <PostView post={post} me={data.me} canMod={data.canMod} />;
}

// ── Columna derecha de quien modera (sólo en pantalla ancha) ──

function RailCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={`${card} px-4 py-3.5`}>
      <h2 className="mb-3 flex items-center justify-between text-[13px] font-semibold text-[#F2F5F4]">
        {title}
        {action}
      </h2>
      {children}
    </section>
  );
}

function HostRail({ data, go }: { data: ClubData; go: Go }) {
  const { community, event, memberCount } = data;
  const now = useNow();
  const call = event ? describeCall(event, now) : null;
  const adminHref = `/comunidad/${community.slug}/admin`;
  return (
    <aside className="order-first grid items-start gap-3.5 sm:grid-cols-2 min-[1240px]:order-none min-[1240px]:grid-cols-1" aria-label="Resumen del club">
      <RailCard title="Próxima llamada" action={<a href={adminHref} className={textLink}>Editar</a>}>
        {event && call ? (
          <>
            <div className="flex items-center gap-3">
              <DateTile month={call.month} day={call.dayOfMonth} />
              <div className="min-w-0">
                <p className="font-semibold leading-snug text-[#F2F5F4]">{event.title}</p>
                <p className="text-xs text-[#7C8A8E]" suppressHydrationWarning>
                  {call.status}
                </p>
              </div>
            </div>
            <div className="mt-3.5 grid gap-2">
              <EnterCallButton event={event} block />
              <HostRecControl rec={data.rec} show={event.open} block />
            </div>
          </>
        ) : (
          <p className="text-xs text-[#7C8A8E]">No hay una llamada programada.</p>
        )}
      </RailCard>
      <Suspense fallback={null}>
        <Await resolve={data.recordings} errorElement={null}>
          {(list) => {
            const recent = list.filter((r) => r.status === "ready").slice(0, 3);
            if (recent.length === 0) return null;
            return (
              <RailCard
                title="Grabaciones recientes"
                action={
                  <button type="button" onClick={() => go("recs")} className={textLink}>
                    Ver todas
                  </button>
                }
              >
                {recent.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => go("recs")}
                    className="flex w-full items-center gap-2.5 border-t border-[#232D33] py-2 text-left first:border-t-0 first:pt-0 last:pb-0"
                  >
                    <span className="grid h-10 w-16 shrink-0 place-items-center rounded-md bg-[#1C252B] text-[#7C8A8E]">
                      <PlayIcon />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold leading-snug text-[#F2F5F4]">{r.title}</span>
                      <span className="block text-xs text-[#7C8A8E]" suppressHydrationWarning>
                        {shortDate(r.endedAt)}
                        {r.minutes ? ` · ${r.minutes} min` : ""}
                      </span>
                    </span>
                  </button>
                ))}
              </RailCard>
            );
          }}
        </Await>
      </Suspense>
      <RailCard title="Tu club" action={<a href={adminHref} className={textLink}>Administrar</a>}>
        <p className="flex items-center justify-between gap-3">
          <span className="text-[#7C8A8E]">Miembros activos</span>
          <span className="font-semibold text-[#F2F5F4]">{memberCount}</span>
        </p>
      </RailCard>
    </aside>
  );
}

export function WallView({ data, postId, go }: { data: ClubData; postId: string | null; go: Go }) {
  const { me, canMod, event, wall } = data;
  // A quien modera el compositor le queda siempre a la vista; al miembro se le abre con el botón.
  const [composerOpen, setComposerOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (focusRequest > 0) bodyRef.current?.focus();
  }, [focusRequest]);

  const compose = () => {
    if (postId) go("wall");
    setComposerOpen(true);
    setFocusRequest((n) => n + 1);
  };

  return (
    <>
      <SectionHead
        title="Muro"
        action={
          me && (
            <button type="button" onClick={compose} className={btn}>
              Nueva publicación
            </button>
          )
        }
      />
      <Wrap wide={canMod && !postId}>
        {postId ? (
          <>
            <button
              type="button"
              onClick={() => go("wall")}
              className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-[#7C8A8E] hover:text-[#F2F5F4]"
            >
              <Icon name="back" />
              Volver al muro
            </button>
            <Suspense fallback={<WallSkeleton />}>
              <Await resolve={wall} errorElement={<WallUnavailable />}>
                {(loaded) => (loaded ? <OpenPost wall={loaded} postId={postId} data={data} go={go} /> : <WallUnavailable />)}
              </Await>
            </Suspense>
          </>
        ) : (
          <div className={canMod ? "grid items-start gap-5 min-[1240px]:grid-cols-[minmax(0,1fr)_300px]" : ""}>
            <div className="grid min-w-0 gap-3.5">
              {/* Quien modera ya trae la llamada en la columna «Próxima llamada», a cualquier ancho. */}
              {event && !canMod && <CallNotice data={data} event={event} />}
              {me && (canMod || composerOpen) && (
                <Composer
                  me={me}
                  bodyRef={bodyRef}
                  onCancel={canMod ? undefined : () => setComposerOpen(false)}
                  onPosted={() => setComposerOpen(false)}
                />
              )}
              <Suspense fallback={<WallSkeleton />}>
                <Await resolve={wall} errorElement={<WallUnavailable />}>
                  {(loaded) => (loaded ? <WallList wall={loaded} data={data} go={go} /> : <WallUnavailable />)}
                </Await>
              </Suspense>
            </div>
            {canMod && <HostRail data={data} go={go} />}
          </div>
        )}
      </Wrap>
    </>
  );
}
