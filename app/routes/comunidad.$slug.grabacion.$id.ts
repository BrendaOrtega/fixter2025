// Video de una grabación del club: sólo miembros (o el anfitrión). Redirige a una URL de
// lectura prefirmada de 2 h; el <video> sigue el redirect y pide por rangos al bucket.
import { data, redirect, type LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { getUserOrNull } from "~/.server/dbGetters";
import { recordingReadUrl } from "~/.server/services/club-recording.server";
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
  const url = await recordingReadUrl(community.id, params.id as string);
  if (!url) throw data("No encontrada", { status: 404 });
  return redirect(url);
};
