// «Agregar a mi calendario» (10-nov-2026): el .ics de un evento del club. En una serie semanal lleva
// su RRULE, así que Google/Apple/Outlook la agendan completa con un solo archivo. Es público: la
// fecha y el título ya se ven en la página del club; entrar a la llamada sigue pidiendo membresía.
import type { LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { buildIcs } from "~/.server/services/club-events.server";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const id = String(params.file ?? "").replace(/\.ics$/, "");
  if (!/^[a-f0-9]{24}$/.test(id)) throw new Response("No encontrado", { status: 404 });
  const event = await db.communityEvent.findUnique({
    where: { id },
    include: { community: { select: { slug: true, isActive: true } } },
  });
  if (!event || !event.community.isActive || event.community.slug !== params.slug) {
    throw new Response("No encontrado", { status: 404 });
  }
  const url = `https://www.fixtergeek.com/comunidad/${event.community.slug}`;
  return new Response(buildIcs(event, url), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.community.slug}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
};
