// Reproducción de una grabación del club: sólo miembros (o el anfitrión). Devuelve `{ src, captions,
// storyboard }` firmados para el reproductor oficial; con `?storyboard=1` responde el VTT de miniaturas.
import { data, redirect, type LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { getUserOrNull } from "~/.server/dbGetters";
import { recordingPlayAssets } from "~/.server/services/club-recording.server";
import { canModerate, canParticipate } from "~/.server/services/wall.server";
import { signedStoryboardVtt, storyboardResponse } from "~/.server/storyboard";

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
  const canMod = canModerate(user, community);
  if (!canMod && !canParticipate(user, membership, community)) {
    throw data("Sólo miembros", { status: 403 });
  }
  const assets = await recordingPlayAssets(community.id, params.id as string, { includeHidden: canMod });
  if (!assets) throw data("No encontrada", { status: 404 });
  if (new URL(request.url).searchParams.has("storyboard")) {
    const vtt = await signedStoryboardVtt(assets.storyboardBase);
    return vtt ? storyboardResponse(vtt) : new Response("Sin storyboard", { status: 404 });
  }
  return Response.json(
    {
      src: assets.src,
      title: assets.title,
      captions: assets.captions,
      storyboard: `/comunidad/${params.slug}/grabacion/${params.id}?storyboard=1`,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
};
