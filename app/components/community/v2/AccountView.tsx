import type { ReactNode } from "react";
import { Form, useNavigation } from "react-router";
import { EmptyNote, SectionHead, Wrap, btn, btnGhost, card, longDate } from "./ui";
import type { ClubData } from "./types";

// «Mi membresía» y «Cursos incluidos»: lo que hoy enseña el bloque «Hola, …» de la casa del
// club (fechas, meses gratis, «Administrar mi membresía»), en renglones.

const GRANT_WARNING_MS = 14 * 86_400_000;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[#232D33] px-4 py-3 first:border-t-0">
      <span className="text-[#7C8A8E]">{label}</span>
      <div className="text-right font-semibold text-[#F2F5F4]">{children}</div>
    </div>
  );
}

/** Mismo `intent=join` de la página de hoy: mensual y anual. */
function JoinButtons({ community }: { community: ClubData["community"] }) {
  const navigation = useNavigation();
  const pendingInterval = navigation.formData?.get("intent") === "join" ? navigation.formData.get("interval") : null;
  return (
    <Form method="post" className="flex flex-wrap gap-2">
      <input type="hidden" name="intent" value="join" />
      <button name="interval" value="month" disabled={!!pendingInterval} aria-busy={pendingInterval === "month"} className={btn}>
        {pendingInterval === "month" ? "Abriendo…" : `$${community.priceMxn}/mes`}
      </button>
      {community.priceAnnualMxn && (
        <button name="interval" value="year" disabled={!!pendingInterval} aria-busy={pendingInterval === "year"} className={btnGhost}>
          {pendingInterval === "year" ? "Abriendo…" : `$${community.priceAnnualMxn}/año · 2 meses gratis`}
        </button>
      )}
    </Form>
  );
}

function statusLabel(membership: ClubData["membership"], canMod: boolean) {
  if (!membership) return canMod ? "Anfitrión" : "Sin membresía";
  if (membership.status === "active") return "Activa";
  if (membership.status === "past_due") return "Pago pendiente";
  return membership.status;
}

const money = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

/** Nombre del plan: lo que paga (o no paga) esta persona. */
function planLabel(membership: ClubData["membership"], community: ClubData["community"], canMod: boolean) {
  if (membership?.provider === "stripe") {
    return membership.interval === "year"
      ? `Anual${community.priceAnnualMxn ? ` · ${money(community.priceAnnualMxn)} al año` : ""}`
      : `Mensual${community.priceMxn ? ` · ${money(community.priceMxn)} al mes` : ""}`;
  }
  if (canMod) return "Anfitrión · sin costo";
  if (membership?.provider === "grant") return "Meses gratis de regalo";
  return "Sin plan";
}

export function MembershipView({ data }: { data: ClubData }) {
  const { community, me, membership, canMod, courseCount } = data;
  const navigation = useNavigation();
  const openingBilling = navigation.formData?.get("intent") === "billing";
  const periodEnd = membership?.currentPeriodEnd ?? null;
  // Meses gratis: al dueño y a los ADMIN no se les enseña (igual que en la página de hoy).
  const isGrant = membership?.provider === "grant" && !!periodEnd && !canMod;
  const grantEndsSoon = isGrant && new Date(periodEnd!).getTime() - Date.now() <= GRANT_WARNING_MS;
  // Stripe sólo difiere el primer cobro si al regalo le quedan más de 48 h (ver `giftTrialEnd`).
  const chargesLater = isGrant && new Date(periodEnd!).getTime() - Date.now() > 49 * 3_600_000;
  const isStripe = membership?.provider === "stripe";
  // Quien no paga todavía (regalo o sin membresía) puede elegir plan; a quien modera no se le ofrece.
  const canPickPlan = !canMod && !isStripe;
  return (
    <>
      <SectionHead title="Mi membresía" />
      <Wrap>
        <div className={card}>
          {me && <Row label="Miembro">{me.name}</Row>}
          <Row label="Plan">{planLabel(membership, community, canMod)}</Row>
          <Row label="Estado">{statusLabel(membership, canMod)}</Row>
          {isStripe && !membership?.cancelAtPeriodEnd && periodEnd && (
            <Row label="Próximo cobro">
              <span suppressHydrationWarning>{longDate(periodEnd)}</span>
            </Row>
          )}
          {membership?.cancelAtPeriodEnd && periodEnd && (
            <Row label="Tu membresía termina el">
              <span suppressHydrationWarning>{longDate(periodEnd)}</span>
            </Row>
          )}
          {isGrant && (
            <Row label="Meses gratis hasta el">
              <span suppressHydrationWarning>{longDate(periodEnd!)}</span>
            </Row>
          )}
          {isStripe && (
            <Row label="Cambiar plan, tarjeta o cancelar">
              <Form method="post">
                <button name="intent" value="billing" disabled={openingBilling} aria-busy={openingBilling} className={btnGhost}>
                  {openingBilling ? "Abriendo…" : "Administrar mi plan"}
                </button>
              </Form>
            </Row>
          )}
          {canMod && community.priceMxn && (
            <Row label="Precio para miembros">
              {money(community.priceMxn)} al mes
              {community.priceAnnualMxn ? ` · ${money(community.priceAnnualMxn)} al año` : ""}
            </Row>
          )}
          <Row label="Cursos incluidos">
            <a href="/cursos" className="underline underline-offset-2 hover:text-brand-500">
              {courseCount} cursos
            </a>
          </Row>
          {canMod && (
            <Row label="Panel del anfitrión">
              <a href={`/comunidad/${community.slug}/admin`} className={btnGhost}>
                Administrar club
              </a>
            </Row>
          )}
        </div>
        {canPickPlan && (
          <div className={`${card} mt-3.5 grid gap-3 px-4 py-3.5`}>
            <p className="font-semibold text-[#F2F5F4]">{isGrant ? "Elige tu plan para seguir en el club" : "Elige tu plan"}</p>
            {isGrant && (
              <p>
                Tus meses gratis {grantEndsSoon ? "terminan" : "van hasta"} el{" "}
                <strong className="text-[#F2F5F4]" suppressHydrationWarning>
                  {longDate(periodEnd!)}
                </strong>
                .{chargesLater ? " Si eliges plan hoy, no se cobra nada hasta esa fecha." : ""}
              </p>
            )}
            <JoinButtons community={community} />
          </div>
        )}
      </Wrap>
    </>
  );
}

export function CoursesView({ data }: { data: ClubData }) {
  const { courseCount } = data;
  return (
    <>
      <SectionHead title="Cursos incluidos" />
      <Wrap>
        {courseCount > 0 ? (
          <div className={`${card} flex flex-wrap items-center gap-3 px-4 py-3.5`}>
            <div className="min-w-0 flex-1 basis-[12rem]">
              <p className="font-semibold text-[#F2F5F4]">
                {courseCount} cursos de pago de FixterGeek
              </p>
              <p className="text-xs text-[#7C8A8E]">Abiertos mientras seas miembro del club.</p>
            </div>
            <a href="/cursos" className={btnGhost}>
              Ver cursos
            </a>
          </div>
        ) : (
          <EmptyNote>Todavía no hay cursos incluidos.</EmptyNote>
        )}
      </Wrap>
    </>
  );
}
