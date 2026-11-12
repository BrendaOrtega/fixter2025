// Conectar el canal de YouTube de la comunidad para transmitir (recurso, sin UI): revisa que
// quien llega administra el club y lo manda a Google. El regreso lo atiende `/login?auth=google`
// (`googleHandler`), que reconoce el `state` firmado y vuelve al panel, pestaña «Transmisión».
import { data, redirect, type LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { getUserOrNull } from "~/.server/dbGetters";
import { youtubeAuthorizeUrl, youtubeConfigured } from "~/.server/services/club-live.server";
import { canModerate } from "~/.server/services/wall.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const slug = params.slug as string;
  const user = await getUserOrNull(request);
  if (!user) throw redirect(`/login?next=/comunidad/${slug}/admin`);
  const community = await db.community.findFirst({ where: { slug, isActive: true }, select: { id: true, slug: true, ownerId: true } });
  if (!community) throw data("Comunidad no encontrada", { status: 404 });
  if (!canModerate(user, community)) throw data("Sólo el anfitrión conecta la transmisión.", { status: 403 });
  if (!youtubeConfigured()) throw data("La transmisión a YouTube todavía no está configurada en el servidor.", { status: 503 });
  return redirect(youtubeAuthorizeUrl({ communityId: community.id, slug: community.slug, email: user.email }));
};
