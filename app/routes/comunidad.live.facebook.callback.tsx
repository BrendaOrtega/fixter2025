// GET /comunidad/live/facebook/callback — vuelta del login de Meta (app «Ghosty Live») al conectar
// la página de Facebook de una comunidad para transmitir (16-nov-2026). La comunidad sale del
// `state` FIRMADO, y la sesión tiene que ser de quien pidió conectar. Siempre se enseña la lista de
// páginas y el POST guarda la elegida. Calcado de ghosty-studio `oauth.facebook-live.callback.tsx`.
// ⚠️ `https://www.fixtergeek.com/comunidad/live/facebook/callback` tiene que estar en «URI de
// redirección de OAuth válidos» de la app «Ghosty Live».
import { createCookie, data, Form, redirect } from "react-router";
import { getUserOrNull } from "~/.server/dbGetters";
import { signingKey } from "~/.server/live/secret-vault.server";
import { facebookBack, facebookPagesFor, facebookState, saveFacebookPage } from "~/.server/services/club-live.server";
import type { Route } from "./+types/comunidad.live.facebook.callback";

// Los tokens de página viven 10 min en una cookie firmada mientras se elige una.
const pageTokensCookie = () =>
  createCookie("fx_fb_live_pages", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/comunidad/live/facebook",
    maxAge: 600,
    secrets: [signingKey("live-fb-pages").toString("hex")],
  });

const expired = () => new Response("La liga para conectar Facebook caducó. Vuelve a pedirla desde el panel.", { status: 400 });

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const t = url.searchParams.get("state");
  const st = facebookState(t);
  if (!st) throw expired();
  const user = await getUserOrNull(request);
  if (user?.email.toLowerCase() !== st.email.toLowerCase()) throw redirect(facebookBack(st.slug, "error", "la sesión cambió: vuelve a intentarlo"));
  if (url.searchParams.get("error")) throw redirect(facebookBack(st.slug, "cancelled"));
  const code = url.searchParams.get("code");
  if (!code) throw redirect(facebookBack(st.slug, "error", "Meta no devolvió código"));
  let pages: Awaited<ReturnType<typeof facebookPagesFor>>;
  try {
    pages = await facebookPagesFor(code);
  } catch (e) {
    console.error("[club-live] callback de Facebook", st.communityId, e instanceof Error ? e.message : e);
    throw redirect(facebookBack(st.slug, "error", e instanceof Error ? e.message : undefined));
  }
  if (!pages.length) throw redirect(facebookBack(st.slug, "error", "tu cuenta no administra ninguna página de Facebook"));
  // Siempre se pregunta, aunque haya una sola. Los tokens de página no viajan a la pantalla: van
  // en una cookie firmada (10 min) y el POST toma el de la página elegida.
  const tokens = JSON.stringify(pages.map((p) => [p.id, p.token]));
  return data({ t: t!, pages: pages.map((p) => ({ id: p.id, name: p.name })) }, { headers: { "Set-Cookie": await pageTokensCookie().serialize(tokens) } });
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export async function action({ request }: Route.ActionArgs) {
  const fd = await request.formData();
  const st = facebookState(String(fd.get("t") ?? ""));
  if (!st) throw expired();
  const user = await getUserOrNull(request);
  if (user?.email.toLowerCase() !== st.email.toLowerCase()) throw redirect(facebookBack(st.slug, "error", "la sesión cambió: vuelve a intentarlo"));
  const pageId = String(fd.get("pageId") ?? "");
  const raw = (await pageTokensCookie().parse(request.headers.get("Cookie"))) as string | null;
  const pairs = raw ? (JSON.parse(raw) as [string, string][]) : [];
  const token = pairs.find(([id]) => id === pageId)?.[1];
  if (!token) throw redirect(facebookBack(st.slug, "error", "se venció la selección; vuelve a conectar"));
  // El nombre se vuelve a pedir a Meta con el propio token de página (no se le cree al formulario).
  const name = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(pageId)}?fields=name&access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(10_000) })
    .then((r) => r.json() as Promise<{ name?: string }>)
    .then((j) => j.name ?? pageId)
    .catch(() => pageId);
  throw redirect(await saveFacebookPage(st, { id: pageId, name, token }), { headers: { "Set-Cookie": await pageTokensCookie().serialize("", { maxAge: 0 }) } });
}

export default function FacebookLivePick({ loaderData }: Route.ComponentProps) {
  const { t, pages } = loaderData;
  return (
    <main className="min-h-screen bg-[#0E1317] text-[#F2F5F4]">
      <section className="mx-auto w-full max-w-lg px-6 py-12">
        <h1 className="text-2xl font-bold tracking-tight">¿En qué página se transmiten tus eventos?</h1>
        <p className="mt-1 text-sm text-[#7C8A8E]">Cada evento en vivo se publicará en esta página.</p>
        <ul className="mt-5 grid gap-2">
          {pages.map((p) => (
            <li key={p.id}>
              <Form method="post">
                <input type="hidden" name="t" value={t} />
                <input type="hidden" name="pageId" value={p.id} />
                <button type="submit" className="w-full rounded-xl border border-[#232D33] bg-[#141B20] px-4 py-3 text-left text-sm font-medium hover:border-[#85DDCB]">
                  {p.name} <span className="text-xs text-[#7C8A8E]">· {p.id}</span>
                </button>
              </Form>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-[#7C8A8E]">¿No aparece tu página? Cierra esta pestaña, vuelve a «Conectar» y, en la ventana de Facebook, elige «Editar acceso» para seleccionarla.</p>
      </section>
    </main>
  );
}
