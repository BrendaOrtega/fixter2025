import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { data, type ActionFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { checkSignupEmail } from "~/.server/anti-bot";
import { recordOrigin } from "~/.server/origen";
import { CanvasConfetti } from "~/components/common/CanvasConfetti";
import getMetaTags from "~/utils/getMetaTags";

// ===========================================
// Lista de espera: Animaciones con AI
// Una pantalla, un correo. Nada más.
// ===========================================

/// Audiencia del curso. Quien entra por aquí se cuenta con este tag en
/// `Subscriber.tags` (ver `audienceTagsFor` en `~/.server/programas`).
const WAITLIST_TAG = "animaciones-ai-waitlist";

export const meta = () =>
  getMetaTags({
    title: "Animaciones con AI · Lista de espera",
    description:
      "Construyes componentes 3D, presentaciones animadas y micro-interacciones con Motion y AI.",
  });

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return data({ ok: false, error: "Escribe un correo válido." }, { status: 400 });
  }

  // Bots y desechables: fingir éxito y no guardar nada.
  if (checkSignupEmail(email).blocked) {
    return data({ ok: true });
  }

  const blocked = await db.emailBlacklist.findUnique({ where: { email } });
  if (blocked) {
    return data(
      { ok: false, error: "Este correo no puede suscribirse en este momento." },
      { status: 400 },
    );
  }

  const existing = await db.subscriber.findUnique({
    where: { email },
    select: { id: true, tags: true },
  });

  if (!existing) {
    await db.subscriber.create({
      data: { email, tags: [WAITLIST_TAG], confirmed: false },
    });
  } else if (!existing.tags.includes(WAITLIST_TAG)) {
    // Sin duplicar el tag: apuntarse dos veces cuenta una.
    await db.subscriber.update({
      where: { id: existing.id },
      data: { tags: { push: WAITLIST_TAG } },
    });
  }

  await recordOrigin(email, request);

  return data({ ok: true });
};

export default function Route() {
  const fetcher = useFetcher<typeof action>();
  const inputRef = useRef<HTMLInputElement>(null);
  const isLoading = fetcher.state !== "idle";
  const done = fetcher.data?.ok === true;
  const error =
    fetcher.data && "error" in fetcher.data && typeof fetcher.data.error === "string"
      ? fetcher.data.error
      : null;

  useEffect(() => {
    if (error) inputRef.current?.focus();
  }, [error]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0b0b0f] px-5 py-16 text-[#f5f3ff] sm:px-8">
      {done && <CanvasConfetti />}

      {/* Malla de puntos sutil + halo morado; nunca un negro plano */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(245,243,255,0.13) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, #000 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, #000 30%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7c3aed] opacity-20 blur-[140px]"
      />

      <section className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#fbbf24]/30 bg-[#fbbf24]/10 px-3 py-1 text-xs font-medium tracking-wide text-[#fbbf24]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#fbbf24]" />
          Nuevo curso · Octubre 2026
        </span>

        <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
          Animaciones con AI
        </h1>

        <p className="mt-5 max-w-md text-base leading-relaxed text-[#f5f3ff]/75 sm:text-lg">
          Construyes componentes 3D, presentaciones animadas y
          micro-interacciones con Motion y AI.
        </p>

        <p className="mt-3 font-mono text-xs text-[#f5f3ff]/45 sm:text-sm">
          Motion · Fable 5.1 · GPT-6 Astra · Three.js
        </p>

        {done ? (
          <div
            role="status"
            className="mt-10 w-full rounded-2xl border border-[#7c3aed]/40 bg-[#7c3aed]/10 px-5 py-4 text-sm sm:text-base"
          >
            Ya estás en la lista. Te escribimos cuando abra el curso.
          </div>
        ) : (
          <fetcher.Form
            method="post"
            className="mt-10 flex w-full flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="email" className="sr-only">
              Correo
            </label>
            <input
              ref={inputRef}
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@correo.com"
              aria-invalid={!!error}
              className="h-12 w-full flex-1 rounded-xl border border-[#f5f3ff]/15 bg-[#f5f3ff]/5 px-4 text-base text-[#f5f3ff] placeholder:text-[#f5f3ff]/35 focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="h-12 shrink-0 rounded-xl bg-[#7c3aed] px-5 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {isLoading ? "Enviando…" : "Únete a la lista de espera"}
            </button>
          </fetcher.Form>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-[#fbbf24]">
            {error}
          </p>
        )}
      </section>

      <footer className="relative z-10 mt-16 text-xs text-[#f5f3ff]/45">
        Por{" "}
        <a
          href="https://www.hectorbliss.com"
          target="_blank"
          rel="noopener"
          className="underline decoration-[#f5f3ff]/25 underline-offset-4 hover:text-[#f5f3ff]"
        >
          Héctorbliss
        </a>{" "}
        · FixterGeek
      </footer>
    </main>
  );
}
