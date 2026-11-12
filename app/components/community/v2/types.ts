import type { Route } from "../../../routes/+types/comunidad.$slug";

// Todo sale del loader de /comunidad/:slug tal cual: la casa v2 no pide datos propios.
export type ClubData = Route.ComponentProps["loaderData"];
export type ClubWallData = NonNullable<Awaited<ClubData["wall"]>>;
export type ClubPost = ClubWallData["posts"][number];
export type ClubComment = ClubPost["comments"][number];
export type ClubRecording = Awaited<ClubData["recordings"]>[number];
export type ClubEvent = NonNullable<ClubData["event"]>;
export type ClubMe = NonNullable<ClubData["me"]>;

export const VIEWS = ["wall", "events", "recs", "courses", "me"] as const;
export type View = (typeof VIEWS)[number];

/** Cambia de vista; con `postId` abre esa publicación dentro del muro. */
export type Go = (view: View, postId?: string | null) => void;
