import { useEffect } from "react";
import { motion } from "motion/react";
import { data, Link, redirect, useFetcher } from "react-router";
import type { Route } from "./+types/anti-factory";
import getMetaTags from "~/utils/getMetaTags";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import { getUserOrNull } from "~/.server/dbGetters";
import {
  ANTI_FACTORY_TIERS,
  isClubMember,
  pickAntiFactoryTier,
  priceFor,
} from "~/.server/services/anti-factory.server";

// ===========================================
// Taller en vivo «Ghosty Anti-Factory» · dic-2026
// Una sola pantalla, sin scroll: todo lo que hace falta para decidir y pagar.
// ===========================================

// Se repite aquí y no se importa del `.server`: el componente corre en el navegador.
const ANTI_FACTORY_PATH = "/anti-factory";
const GHOSTY_URL = "https://formmy.app/logo.png";
const PAGE_URL = `https://www.fixtergeek.com${ANTI_FACTORY_PATH}`;

const INCLUDES = [
  "ghosty-dev instalado en tu repo",
  "Varios pendientes a la vez",
  "Un revisor con contexto limpio",
  "La grabación de las dos sesiones",
  "Acceso gratis a las cajas de CI de Ghosty Studio",
];

const mxn = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

export const meta = () =>
  getMetaTags({
    title: "Ghosty Anti-Factory | Taller en vivo del Club de Agentes de IA | FixterGeek",
    description:
      "Hay formas más simples y efectivas de desarrollar que una fábrica. Taller en vivo el martes 1 y el jueves 3 de diciembre de 2026, de 7 a 9 pm (CDMX). $1,990 MXN; $1,490 MXN para miembros del Club de Agentes de IA.",
    url: PAGE_URL,
    keywords:
      "ghosty anti-factory, ghosty-dev, agentes de código, revisor de código, club de agentes de ia, taller en vivo, fixtergeek",
  });

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await getUserOrNull(request);
  const [member, generalPrice, clubPrice] = await Promise.all([
    isClubMember(user),
    priceFor(ANTI_FACTORY_TIERS.general),
    priceFor(ANTI_FACTORY_TIERS.club),
  ]);
  const params = new URL(request.url).searchParams;
  return {
    isLoggedIn: !!user,
    isMember: member,
    generalPrice,
    clubPrice,
    success: params.get("success") === "1",
    canceled: params.get("cancel") === "1",
  };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  if (formData.get("intent") !== "direct_checkout") return data({ error: null });

  try {
    // El precio lo decide la membresía de quien tiene la sesión abierta; el formulario sólo
    // trae la intención.
    const user = await getUserOrNull(request);
    const tier = pickAntiFactoryTier(await isClubMember(user));
    const priceMxn = await priceFor(tier);

    const stripe = new (await import("stripe")).default(process.env.STRIPE_SECRET_KEY as string, {});
    const location =
      process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://www.fixtergeek.com";

    const session = await stripe.checkout.sessions.create({
      metadata: { type: tier.key },
      mode: "payment",
      ...(user?.email ? { customer_email: user.email } : {}),
      line_items: [
        {
          price_data: {
            currency: "mxn",
            product_data: {
              name: "Ghosty Anti-Factory — taller en vivo",
              description:
                "Martes 1 y jueves 3 de diciembre de 2026, de 7 a 9 pm (CDMX). Club de Agentes de IA de FixterGeek.",
            },
            unit_amount: priceMxn * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${location}${ANTI_FACTORY_PATH}?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${location}${ANTI_FACTORY_PATH}?cancel=1`,
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      payment_method_options: { card: { installments: { enabled: true } } },
    });

    if (!session.url) throw new Error("Failed to create checkout session");
    return redirect(session.url);
  } catch (error) {
    console.error("[anti-factory] checkout error:", error);
    return data({ error: "No pudimos abrir el pago. Intenta de nuevo en un momento." });
  }
};

/** Ghosty oficial sobre la lista de pendientes que avanzan a la vez. */
function Illustration() {
  const rows = [
    { id: "#12", name: "/health", state: "listo" },
    { id: "#13", name: "/pedidos", state: "en curso" },
    { id: "#14", name: "CSV", state: "en revisión" },
  ];
  return (
    <div className="relative mx-auto flex h-full max-h-full w-full max-w-[17rem] flex-col items-center justify-end lg:max-w-md">
      <motion.img
        src={GHOSTY_URL}
        alt="Ghosty"
        className="relative z-10 -mb-3 h-[38%] min-h-0 w-auto object-contain lg:-mb-6 lg:h-[46%]"
        initial={{ y: 0 }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.2, repeat: 4, ease: "easeInOut" }}
      />
      <div className="w-full shrink-0 rounded-2xl border border-sistemas-line bg-sistemas-surface p-3 shadow-lg shadow-black/20 lg:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-sistemas-gray lg:text-xs">
          Pendientes
        </p>
        <ul className="mt-2 space-y-1.5 lg:mt-3 lg:space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-sistemas-line bg-sistemas-dark px-3 py-1.5 font-mono text-xs lg:py-2.5 lg:text-sm"
            >
              <span>
                <span className="text-sistemas-gray">{r.id}</span>{" "}
                <span className="text-zinc-100">{r.name}</span>
              </span>
              <span
                className={
                  r.state === "listo"
                    ? "text-sistemas-accent"
                    : r.state === "en revisión"
                      ? "text-sistemas-primary"
                      : "text-sistemas-gray"
                }
              >
                {r.state}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function AntiFactoryLanding({ loaderData }: Route.ComponentProps) {
  const { isLoggedIn, isMember, generalPrice, clubPrice, success, canceled } = loaderData;
  const fetcher = useFetcher<typeof action>();
  const busy = fetcher.state !== "idle";
  const error = fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;
  const price = isMember ? clubPrice : generalPrice;

  // Limpia la URL de regreso de Stripe sin perder el estado que ya pintó el loader.
  useEffect(() => {
    if (success || canceled) window.history.replaceState({}, "", ANTI_FACTORY_PATH);
  }, [success, canceled]);

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-sistemas-dark text-zinc-100">
      {success && <EmojiConfetti emojis={["👻", "🛠️", "✅"]} />}

      {/* La barra del sitio va fija arriba (la pinta el layout): el contenido arranca debajo. */}
      <section className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 px-4 pb-4 pt-14 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12 lg:px-8 lg:pb-8 lg:pt-20">
        {/* En móvil la ilustración va arriba y cede su alto si falta espacio. */}
        <div className="order-first min-h-0 flex-1 lg:order-last lg:h-[70%] lg:flex-none">
          <Illustration />
        </div>

        <div className="flex shrink-0 flex-col">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sistemas-primary lg:text-sm">
            Taller en vivo · Club de Agentes de IA
          </p>
          <h1 className="mt-1 text-[2.1rem] font-black leading-[1.05] tracking-tight lg:mt-2 lg:text-6xl">
            Ghosty Anti&#8209;Factory
          </h1>
          <p className="mt-2 text-[15px] leading-snug text-sistemas-gray lg:mt-4 lg:text-xl">
            Hay formas más simples y efectivas de desarrollar que una fábrica.
          </p>
          <p className="mt-2 text-[13px] font-semibold leading-snug text-zinc-100 lg:mt-4 lg:text-base">
            Martes 1 y jueves 3 de diciembre de 2026 · de 7 a 9 pm (hora de la Ciudad de México) · dos
            sesiones en vivo en la llamada del Club de Agentes de IA
          </p>

          <ul className="mt-3 space-y-1 text-[13px] leading-snug lg:mt-6 lg:space-y-2 lg:text-base">
            {INCLUDES.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-[1px] text-sistemas-accent" aria-hidden>
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {success ? (
            <div className="mt-4 rounded-2xl border border-sistemas-line bg-sistemas-surface p-4 shadow-lg shadow-black/20 lg:mt-8 lg:p-6">
              <p className="text-lg font-bold text-sistemas-primary lg:text-2xl">Tu lugar ya está pagado.</p>
              <p className="mt-1 text-[13px] leading-snug text-sistemas-gray lg:text-base">
                Te mandamos un correo con las dos fechas, sus archivos para tu calendario y cómo entrar a
                la llamada del club. Nos vemos el martes 1 de diciembre a las 7 pm.
              </p>
            </div>
          ) : (
            <div className="mt-4 lg:mt-8">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="text-2xl font-black lg:text-4xl">{mxn(price)}</span>
                {isMember ? (
                  <span className="text-[13px] text-sistemas-accent lg:text-base">
                    Tienes el precio del club. El precio general es de {mxn(generalPrice)}.
                  </span>
                ) : (
                  <span className="text-[13px] text-sistemas-gray lg:text-base">
                    Los miembros del club pagan {mxn(clubPrice)}.
                  </span>
                )}
              </div>

              <fetcher.Form method="post" className="mt-3 lg:mt-5">
                <input type="hidden" name="intent" value="direct_checkout" />
                <button
                  type="submit"
                  disabled={busy}
                  className="h-12 w-full rounded-xl bg-sistemas-primary px-8 text-base font-bold text-sistemas-dark shadow-md shadow-black/20 transition hover:brightness-105 disabled:opacity-60 lg:h-14 lg:w-auto lg:text-lg"
                >
                  {busy ? "Abriendo el pago…" : "Inscríbete"}
                </button>
              </fetcher.Form>

              <div className="mt-2 text-[12px] leading-snug lg:mt-3 lg:text-sm">
                {error ? (
                  <p className="text-danger">{error}</p>
                ) : canceled ? (
                  <p className="text-sistemas-gray">El pago no se completó. Puedes intentarlo de nuevo.</p>
                ) : null}
                {!isMember &&
                  (isLoggedIn ? (
                    <Link
                      to="/comunidad/club-de-agentes"
                      className="text-sistemas-gray underline-offset-2 hover:text-sistemas-primary hover:underline"
                    >
                      ¿Quieres el precio de {mxn(clubPrice).replace(" MXN", "")}? Únete al Club de Agentes de IA.
                    </Link>
                  ) : (
                    <Link
                      to={`/login?next=${encodeURIComponent(ANTI_FACTORY_PATH)}`}
                      className="text-sistemas-gray underline-offset-2 hover:text-sistemas-primary hover:underline"
                    >
                      ¿Eres del club? Inicia sesión para tu precio de {mxn(clubPrice).replace(" MXN", "")}.
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
