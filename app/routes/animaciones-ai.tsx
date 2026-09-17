import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { data, type ActionFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { checkSignupEmail } from "~/.server/anti-bot";
import { recordOrigin } from "~/.server/origen";
import { CanvasConfetti } from "~/components/common/CanvasConfetti";
import { HeroDeck } from "~/components/common/HeroDeck";
import { motion } from "motion/react";
import getMetaTags from "~/utils/getMetaTags";

// ===========================================
// Lista de espera: Animaciones con AI
// Una pantalla, un correo. Nada más.
// ===========================================

/// Audiencia del curso. Quien entra por aquí se cuenta con este tag en
/// `Subscriber.tags` (ver `audienceTagsFor` en `~/.server/programas`).
const WAITLIST_TAG = "animaciones-ai-waitlist";

const PAGE_URL = "https://www.fixtergeek.com/animaciones-ai";
const OG_IMAGE = "https://www.fixtergeek.com/courses/animaciones-ai-og.png";

export const meta = () => {
  // `url` es obligatorio: sin él getMetaTags pone canonical y og:url de la home y Google trata la
  // página como duplicada. La imagen propia va con sus medidas reales (WhatsApp descarta si no cuadran).
  const baseMeta = getMetaTags({
    title: "Animaciones con AI: curso de Motion, 3D y micro-interacciones | FixterGeek",
    description:
      "Curso en vivo de FixterGeek, octubre 2026. Construye componentes 3D, presentaciones animadas en HTML y micro-interacciones con Motion, GSAP, Three.js y agentes de AI. Apúntate a la lista de espera y recibe el precio de lanzamiento.",
    url: PAGE_URL,
    image: OG_IMAGE,
    imageWidth: 1200,
    imageHeight: 630,
    keywords:
      "curso animaciones, motion react, gsap, three.js, hyperframes, animaciones con AI, micro-interacciones, presentaciones animadas",
  });

  // Sin `offers`: el curso aún no tiene precio y un InStock falso es peor que nada.
  const schemaOrg = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        "@id": `${PAGE_URL}#course`,
        name: "Animaciones con AI",
        description:
          "Curso en vivo para construir componentes 3D, presentaciones animadas en HTML y micro-interacciones con Motion, GSAP, Three.js, HyperFrames y agentes de AI.",
        url: PAGE_URL,
        image: OG_IMAGE,
        inLanguage: "es",
        provider: {
          "@type": "Organization",
          name: "FixterGeek",
          url: "https://www.fixtergeek.com",
          logo: "https://www.fixtergeek.com/logo.png",
        },
        instructor: {
          "@type": "Person",
          name: "Héctor Bliss",
          url: "https://www.hectorbliss.com",
        },
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: "Online",
          startDate: "2026-10",
        },
        educationalLevel: "Intermediate",
        coursePrerequisites: "JavaScript y React básicos",
        teaches: [
          "Componentes 3D con Three.js",
          "Presentaciones animadas escritas en HTML",
          "Micro-interacciones con Motion y GSAP",
          "Shorts y video hechos con código con HyperFrames",
          "Assets y escenas con Blender y agentes de AI",
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${PAGE_URL}#webpage`,
        url: PAGE_URL,
        name: "Animaciones con AI: curso de Motion, 3D y micro-interacciones | FixterGeek",
        description:
          "Lista de espera del curso Animaciones con AI de FixterGeek. Abre en octubre de 2026.",
        isPartOf: { "@id": "https://www.fixtergeek.com/#website" },
        about: { "@id": `${PAGE_URL}#course` },
        inLanguage: "es",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${PAGE_URL}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: "https://www.fixtergeek.com" },
          { "@type": "ListItem", position: 2, name: "Cursos", item: "https://www.fixtergeek.com/cursos" },
          { "@type": "ListItem", position: 3, name: "Animaciones con AI", item: PAGE_URL },
        ],
      },
    ],
  };

  return [...baseMeta, { "script:ld+json": schemaOrg }];
};

// Límite por IP en memoria: 5 altas por hora por dirección. Suficiente contra
// ráfagas de bots; se reinicia con cada deploy y no necesita tabla.
const hits = new Map<string, number[]>();
const rateLimited = (ip: string) => {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  // Tres señales de bot, todas con respuesta "ok" para no darles pistas:
  // el honeypot lleno, el form enviado en menos de 2 s, o más de 5 altas por hora desde la misma IP.
  const honeypot = String(formData.get("website") ?? "");
  const startedAt = Number(formData.get("t") ?? 0);
  const ip = request.headers.get("fly-client-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
  if (honeypot || (startedAt && Date.now() - startedAt < 2000) || rateLimited(ip)) {
    return data({ ok: true });
  }

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
  // el correo que se mandó, para enseñarlo en la celebración (el input ya no existe cuando llega el ok)
  const [submittedEmail, setSubmittedEmail] = useState("");
  // cuándo se pintó el form: un envío a menos de 2 s es un bot
  const [startedAt, setStartedAt] = useState(0);
  useEffect(() => setStartedAt(Date.now()), []);
  const error =
    fetcher.data && "error" in fetcher.data && typeof fetcher.data.error === "string"
      ? fetcher.data.error
      : null;

  useEffect(() => {
    if (error) inputRef.current?.focus();
  }, [error]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0E1317] px-5 py-16 text-[#F2F5F4] sm:px-8">
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
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#85DDCB] opacity-20 blur-[140px]"
      />

      <section className="relative z-10 flex w-full max-w-4xl flex-col items-center text-center">
        <HeroDeck />

        {done ? (
          <div role="status" className="relative mt-10 flex w-full flex-col items-center">
            {/* onda expansiva desde donde estaba el botón */}
            {[0, 0.18, 0.36].map((d) => (
              <motion.span key={d} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 rounded-full border-4 border-[#8DCF6E]" initial={{ x: "-50%", y: "-50%", scale: 0.2, opacity: 0.9 }} animate={{ scale: 14, opacity: 0 }} transition={{ duration: 1.3, delay: d, ease: "easeOut" }} />
            ))}
            {/* el título que se azota, letra por letra */}
            <h2 className="flex flex-wrap justify-center gap-x-[0.3em] text-4xl font-black leading-none tracking-tight sm:text-7xl">
              {["¡ESTÁS", "DENTRO!"].map((w, wi) => (
                <span key={w} className="inline-flex" style={{ color: wi ? "#8DCF6E" : "#F2F5F4" }}>
                  {w.split("").map((ch, i) => (
                    <motion.span key={i} className="inline-block" initial={{ y: -80, opacity: 0, scale: 2.2, rotate: (i % 2 ? 1 : -1) * 18 }} animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.1 + (wi * 6 + i) * 0.05 }}>{ch}</motion.span>
                  ))}
                </span>
              ))}
            </h2>
            <motion.div initial={{ y: 30, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.85 }} className="mt-6 w-full max-w-md rounded-2xl border border-[#85DDCB]/40 bg-[#85DDCB]/10 px-5 py-4 text-sm sm:text-base">
              <span className="font-mono text-[#85DDCB]">{submittedEmail}</span>
              <br />
              Te escribimos en octubre cuando abra el curso.
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="mt-4 text-xs text-[#F2F5F4]/50">
              Mientras, el canal:{" "}
              <a href="https://www.youtube.com/@fixtergeek" target="_blank" rel="noopener" className="text-[#8DCF6E] underline underline-offset-4">youtube.com/@fixtergeek</a>
            </motion.p>
          </div>
        ) : (
          <fetcher.Form
            method="post"
            onSubmit={() => setSubmittedEmail(inputRef.current?.value ?? "")}
            className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap"
          >
            {/* qué es esto y qué gana quien se apunta */}
            <div className="w-full text-center sm:text-left">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#8DCF6E]">Lista de espera</p>
              <p className="mt-1 text-sm text-[#F2F5F4]/75 sm:text-base">Apúntate y te avisamos cuando abra, con el precio de lanzamiento antes que nadie.</p>
            </div>
            {/* honeypot: un humano no lo ve ni lo llena; un bot sí */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
            <input type="hidden" name="t" value={startedAt} />
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
              className="h-12 w-full flex-1 rounded-xl border border-[#F2F5F4]/15 bg-[#F2F5F4]/5 px-4 text-base text-[#F2F5F4] placeholder:text-[#F2F5F4]/35 focus:border-[#85DDCB] focus:outline-none focus:ring-2 focus:ring-[#85DDCB]/40"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="h-12 shrink-0 rounded-xl bg-[#85DDCB] px-5 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {isLoading ? "Enviando…" : "Únete a la lista de espera"}
            </button>
          </fetcher.Form>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-[#8DCF6E]">
            {error}
          </p>
        )}
      </section>

      <footer className="relative z-10 mt-16 text-xs text-[#F2F5F4]/45">
        Por{" "}
        <a
          href="https://www.hectorbliss.com"
          target="_blank"
          rel="noopener"
          className="underline decoration-[#F2F5F4]/25 underline-offset-4 hover:text-[#F2F5F4]"
        >
          Héctorbliss
        </a>{" "}
        · FixterGeek
      </footer>
    </main>
  );
}
