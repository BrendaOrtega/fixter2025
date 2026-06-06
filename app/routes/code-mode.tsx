import { useState } from "react";
import { motion } from "motion/react";
import { useFetcher } from "react-router";
import getMetaTags from "~/utils/getMetaTags";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";

export const meta = () =>
  getMetaTags({
    title: "Code Mode | El taller para agentes que no pierden el tiempo",
    description:
      "Tu agente de IA pide una herramienta, espera, pide otra, espera… cientos de veces. El Code Mode lo cambia: escribe un solo programa que hace todo de corrido en una caja segura. Aprende a montarlo con EasyBits.",
    url: "https://www.fixtergeek.com/code-mode",
    image: "https://www.fixtergeek.com/courses/code-mode.png",
  });

const LEARN = [
  "Deja de pagar de más por tus agentes",
  "Haz que escriban un programa, no 200 pasos",
  "Aísla su código en un sandbox seguro",
  "Lánzalo production-ready desde la primera línea",
];

export default function CodeModeLanding() {
  const fetcher = useFetcher();
  const isLoading = fetcher.state !== "idle";
  const isSuccess = fetcher.data?.success;
  const [email, setEmail] = useState("");

  return (
    <main className="relative flex min-h-screen w-full flex-col justify-center overflow-hidden bg-[#0E1317] px-8 pb-12 pt-28 text-zinc-100 lg:px-12 lg:pt-24">
      {/* confeti al anotarse: puro ovni 🛸 */}
      {isSuccess && <EmojiConfetti emojis={["🛸"]} />}

      {/* grid de fondo con drift animado */}
      <motion.div
        className="absolute inset-0 opacity-[0.11]"
        style={{
          backgroundImage:
            "linear-gradient(#85DDCB 1px, transparent 1px), linear-gradient(90deg, #85DDCB 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 75%)",
        }}
        animate={{ backgroundPosition: ["0px 0px", "44px 44px"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      {/* blobs de glow flotando */}
      <motion.div
        className="absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-brand-500/30 blur-[120px]"
        animate={{ x: [0, 80, -30, 0], y: [0, 50, -40, 0], scale: [1, 1.2, 0.92, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -right-32 h-[26rem] w-[26rem] rounded-full bg-brand-700/25 blur-[120px]"
        animate={{ x: [0, -70, 40, 0], y: [0, -50, 40, 0], scale: [1, 0.88, 1.25, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute left-1/2 top-1/3 h-[22rem] w-[22rem] rounded-full bg-brand-700/18 blur-[130px]"
        animate={{ x: [0, 55, -75, 0], y: [0, -60, 30, 0], scale: [1, 1.15, 0.82, 1] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-5 py-2 text-base font-medium text-brand-500"
        >
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-500" />
          Nuevo taller · infraestructura para agentes
        </motion.div>

        <div className="relative">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-6xl font-black leading-[1.02] tracking-tight sm:text-7xl lg:text-8xl xl:text-[7rem]"
          >
            Cómo entrar a la era del{" "}
            <span className="text-brand-500">Code Mode</span>
          </motion.h1>

          {/* CTA en el hueco a la derecha de "Code Mode" (desktop); flujo normal en móvil */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-8 lg:absolute lg:bottom-1 lg:right-0 lg:mt-0 lg:w-[50%]"
          >
            {isSuccess ? (
              <div className="inline-flex items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-5 py-4 text-base font-medium text-brand-500">
                ✓ Listo. Te avisaremos antes que a nadie cuando abramos cupos.
              </div>
            ) : (
              <fetcher.Form
                method="post"
                action="/api/waitlist"
                className="flex w-full flex-col gap-3 sm:flex-row"
              >
                <input type="hidden" name="courseSlug" value="code-mode" />
                <input
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="h-14 flex-1 rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 text-base text-white outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-14 shrink-0 rounded-xl bg-brand-500 px-7 text-base font-bold text-brand-900 transition hover:brightness-110 disabled:opacity-60"
                >
                  {isLoading ? "Enviando…" : "Solicitar un lugar"}
                </button>
              </fetcher.Form>
            )}
            <p className="mt-4 text-sm text-zinc-400">
              <span className="font-semibold text-brand-500">Gratis</span>, pero con lugares
              limitados. Solicita el tuyo.
            </p>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="mt-5 text-sm font-medium tracking-wide text-zinc-500"
        >
          Un taller de{" "}
          <a
            href="https://www.hectorbliss.com"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-300 underline-offset-4 transition hover:text-brand-500 hover:underline"
          >
            Héctorbliss
          </a>
        </motion.p>

        {/* dos columnas: copy a la izquierda · código + CTA a la derecha */}
        <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
          {/* Columna copy (humano, sin jerga) */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-2xl leading-relaxed text-zinc-400 lg:text-3xl"
            >
              ¿Tu agente se siente lento y caro? Es porque pide una herramienta,
              espera, pide otra, espera… cientos de veces. El{" "}
              <span className="text-zinc-100">Code Mode</span> lo cambia: el agente
              escribe <span className="text-brand-500">un solo programa</span> que
              hace todo de corrido y lo ejecuta en una caja segura y aislada. Menos pasos, menos
              costo, más velocidad — con el sandbox de{" "}
              <span className="text-zinc-100">EasyBits</span>.
            </motion.p>

            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-8 space-y-3"
            >
              {LEARN.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-xl text-zinc-300 lg:text-2xl"
                >
                  <span className="mt-0.5 text-brand-500">▸</span>
                  <span>{item}</span>
                </li>
              ))}
            </motion.ul>
          </div>

          {/* Columna derecha: ejemplo real */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80 shadow-2xl backdrop-blur"
            >
              <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-red-400/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
                <span className="h-3 w-3 rounded-full bg-brand-500/80" />
                <span className="ml-2 font-mono text-sm text-zinc-500">
                  código real corriendo dentro de la caja
                </span>
              </div>
              <pre className="overflow-hidden p-6 font-mono text-xs leading-relaxed text-zinc-300 lg:text-sm">
                <span className="text-zinc-600">{"// 🧰 eb = tu cliente de Easybits"}</span>
                {"\n"}
                <span className="text-zinc-600">{"//    (tus archivos, bases de datos y tools)."}</span>
                {"\n"}
                <span className="text-zinc-600">{"// 📁 \"ventas-junio.csv\" ya está guardado ahí."}</span>
                {"\n\n"}
                <span className="text-fuchsia-400">const</span> {"{"} result {"}"} ={" "}
                <span className="text-brand-500">await</span> eb.
                <span className="text-brand-500">compute</span>({"{"}
                {"\n"}
                {"  "}file:{" "}
                <span className="text-amber-300">"ventas-junio.csv"</span>,{"   "}
                <span className="text-zinc-600">{"// qué datos usar"}</span>
                {"\n"}
                {"  "}prompt:{" "}
                <span className="text-amber-300">{"`agrúpalo por ciudad, saca el ticket"}</span>
                {"\n"}
                {"          "}
                <span className="text-amber-300">{"promedio y dame un reporte.pdf`"}</span>,
                {"\n"}
                {"}"})
                {"\n\n"}
                <span className="text-zinc-600">{"// 🧠 el modelo escribe el código y lo ejecuta en un"}</span>
                {"\n"}
                <span className="text-zinc-600">{"//    sandbox: una caja aislada y segura. las 80,000"}</span>
                {"\n"}
                <span className="text-zinc-600">{"//    filas se procesan ahí, no en tu app ni en el chat."}</span>
                {"\n\n"}
                result.url{"  "}
                <span className="text-zinc-600">{"// 📄 el PDF terminado, listo para descargar"}</span>
              </pre>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
