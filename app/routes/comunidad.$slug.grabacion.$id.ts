// URL de reproducción de una grabación del club: sólo miembros (o el anfitrión). Devuelve
// `{ src }` con la URL del proxy HLS firmada; el reproductor la carga con hls.js.
import { data, redirect, type LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { getUserOrNull } from "~/.server/dbGetters";
import { recordingPlayUrl } from "~/.server/services/club-recording.server";
import { canModerate, canParticipate } from "~/.server/services/wall.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const user = await getUserOrNull(request);
  if (!user) throw redirect(`/login?next=/comunidad/${params.slug}`);
  const community = await db.community.findFirst({
    where: { slug: params.slug as string },
    select: { id: true, ownerId: true },
  });
  if (!community) throw data("No encontrada", { status: 404 });
  const membership = await db.membership.findUnique({
    where: { communityId_userId: { communityId: community.id, userId: user.id } },
    select: { status: true, currentPeriodEnd: true },
  });
  if (!canModerate(user, community) && !canParticipate(user, membership, community)) {
    throw data("Sólo miembros", { status: 403 });
  }
  const src = await recordingPlayUrl(community.id, params.id as string);
  if (!src) throw data("No encontrada", { status: 404 });
  return Response.json({ src }, { headers: { "Cache-Control": "no-store" } });
};
