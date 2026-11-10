import {
  Form,
  data,
  redirect,
  useSearchParams,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import type { Route } from "./+types/comunidad.$slug";
import { db } from "~/.server/db";
import { getUserOrNull } from "~/.server/dbGetters";
import {
  createBillingPortal,
  createMembershipCheckout,
  isMembershipActive,
} from "~/.server/services/membership.server";
import getMetaTags from "~/utils/getMetaTags";

// Casa de una comunidad de pago (10-nov-2026). Lo de afuera ve el precio y el
// botón de unirse; el miembro ve la comunidad. El muro y las llamadas entran
// aquí en las siguientes fases (docs/comunidad/PLAN.md). La alta gratuita por
// correo sigue en /c/:slug.

export const meta = ({ data: d }: Route.MetaArgs) =>
  getMetaTags({
    title: d?.community ? `${d.community.name} | FixterGeek` : "Comunidad | FixterGeek",
    description: d?.community?.tagline || d?.community?.description || undefined,
  });

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const community = await db.community.findFirst({
    where: { slug: params.slug, isActive: true, priceMxn: { not: null } },
    select: {
      id: true, slug: true, name: true, tagline: true, description: true,
      priceMxn: true, priceAnnualMxn: true,
    },
  });
  if (!community) throw data("Comunidad no encontrada", { status: 404 });

  const user = await getUserOrNull(request);
  const membership = user
    ? await db.membership.findUnique({
        where: { communityId_userId: { communityId: community.id, userId: user.id } },
        select: { status: true, provider: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
      })
    : null;
  const memberCount = await db.membership.count({
    where: { communityId: community.id, status: { in: ["active", "past_due"] } },
  });

  return {
    community,
    memberCount,
    isLoggedIn: !!user,
    isMember: isMembershipActive(membership),
    membership,
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const slug = params.slug as string;
  const user = await getUserOrNull(request);
  if (!user) throw redirect(`/login?redirect=/comunidad/${slug}`);

  const form = await request.formData();
  const intent = form.get("intent");
  if (intent === "join") {
    const interval = form.get("interval") === "year" ? "year" : "month";
    const url = await createMembershipCheckout({ user, communitySlug: slug, interval });
    if (url) throw redirect(url);
  }
  if (intent === "billing") {
    const url = await createBillingPortal(user.id, slug);
    if (url) throw redirect(url);
  }
  return data({ error: "No se pudo completar la acción" }, { status: 400 });
};

export default function CommunityHome({ loaderData }: Route.ComponentProps) {
  const { community, memberCount, isLoggedIn, isMember, membership } = loaderData;
  const [params] = useSearchParams();
  const justJoined = params.get("bienvenida") === "1";

  return (
    <main className="min-h-screen bg-[#0E1317] text-[#F2F5F4] px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-bold">{community.name}</h1>
        {community.tagline && <p className="mt-4 text-xl text-[#85DDCB]">{community.tagline}</p>}
        <p className="mt-2 text-[#7C8A8E]">{memberCount} miembros</p>

        {isMember ? (
          <section className="mt-12 rounded-2xl border-2 border-[#85DDCB] p-8">
            <p className="text-2xl font-bold">
              {justJoined ? "¡Ya eres parte de la comunidad! 🎉" : "Ya eres miembro."}
            </p>
            <p className="mt-2 text-[#7C8A8E]">
              El muro y las llamadas en vivo se abren aquí muy pronto.
            </p>
            {membership?.cancelAtPeriodEnd && membership.currentPeriodEnd && (
              <p className="mt-4 text-[#fbbf24]">
                Tu membresía termina el{" "}
                {new Date(membership.currentPeriodEnd).toLocaleDateString("es-MX")}.
              </p>
            )}
            {membership?.provider === "stripe" && (
              <Form method="post" className="mt-6">
                <button name="intent" value="billing" className="underline text-[#85DDCB]">
                  Administrar mi membresía
                </button>
              </Form>
            )}
          </section>
        ) : (
          <section className="mt-12 rounded-2xl border-2 border-[#F2F5F4] p-8">
            {community.description && <p className="text-lg">{community.description}</p>}
            <p className="mt-6 text-3xl font-bold">
              ${community.priceMxn} MXN <span className="text-base font-normal">/ mes</span>
            </p>
            {community.priceAnnualMxn && (
              <p className="mt-1 text-[#85DDCB]">
                o ${community.priceAnnualMxn} MXN al año (dos meses gratis)
              </p>
            )}
            {justJoined && (
              <p className="mt-4 text-[#fbbf24]">
                Estamos confirmando tu pago; recarga en unos segundos.
              </p>
            )}
            <Form method="post" className="mt-6">
              <input type="hidden" name="intent" value="join" />
              <div className="flex flex-wrap gap-4">
                <button
                  name="interval"
                  value="month"
                  className="rounded-xl bg-[#85DDCB] px-6 py-3 font-bold text-[#0E1317] shadow-[8px_8px_0_#F2F5F4]"
                >
                  {isLoggedIn ? "Unirme por mes" : "Inicia sesión para unirte"}
                </button>
                {isLoggedIn && community.priceAnnualMxn && (
                  <button
                    name="interval"
                    value="year"
                    className="rounded-xl border-2 border-[#85DDCB] px-6 py-3 font-bold text-[#85DDCB]"
                  >
                    Unirme por un año
                  </button>
                )}
              </div>
            </Form>
            <p className="mt-3 text-sm text-[#7C8A8E]">Cancela cuando quieras.</p>
          </section>
        )}
      </div>
    </main>
  );
}
