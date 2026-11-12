import { Form } from "react-router";
import { btnGhost, card as panel } from "~/components/community/v2/ui";

// Pestaña «Transmisión» del panel del anfitrión: conectar el canal de YouTube de la comunidad.
// Al grabar una llamada con «En vivo» encendido, sale también a ese canal.

type Live = {
  configured: boolean;
  /** La caja tiene la llave de Facebook en su env (hoy se carga a mano; el OAuth llega después). */
  facebook: boolean;
  youtube: { account: string; channelUrl: string; privacy: "public" | "unlisted"; lastWatchUrl: string | null; lastPreparedAt: string | null } | null;
};

/** Ícono oficial de YouTube (botón rojo de reproducir), como lo pide su guía de marca para «conectar con YouTube». */
function YouTubeIcon({ className = "h-7 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" className={className} aria-hidden="true">
      <path fill="#FF0000" d="M27.4 3.1A3.5 3.5 0 0 0 24.9.6C22.7 0 14 0 14 0S5.3 0 3.1.6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9a3.5 3.5 0 0 0 2.5 2.5C5.3 20 14 20 14 20s8.7 0 10.9-.6a3.5 3.5 0 0 0 2.5-2.5C28 14.7 28 10 28 10s0-4.7-.6-6.9Z" />
      <path fill="#FFFFFF" d="m11.2 14.3 7.3-4.3-7.3-4.3v8.6Z" />
    </svg>
  );
}

/** «f» de Facebook en blanco, sobre el cuadro azul de su marca. */
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
      <path fill="#FFFFFF" d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1Z" />
    </svg>
  );
}

// Rojo de YouTube sólo en lo que es de YouTube (ícono, botón de conectar, testigo «en vivo»).
const ytBtn = "inline-flex items-center gap-2 rounded-lg bg-[#FF0000] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#CC0000]";

const NOTICE: Record<string, string> = {
  ok: "Canal conectado.",
  cancelled: "No se conectó: cerraste la ventana de Google o no diste el permiso.",
  error: "No se pudo conectar el canal.",
};

export function LiveAdmin({ slug, live, result, detail }: { slug: string; live: Live; result: string | null; detail: string | null }) {
  const yt = live.youtube;
  const connect = `/comunidad/${slug}/transmision`;
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-[15px] font-semibold text-[#F2F5F4]">Transmisión en vivo</h2>
        <p className="mt-1 text-[13px] text-[#7C8A8E]">
          Conecta tus destinos y, al grabar una llamada con «En vivo» encendido, sale también a YouTube y Facebook. El evento se crea solo al empezar y se cierra al detener.
        </p>
      </div>
      {result && NOTICE[result] && (
        <p className={`rounded-lg border px-3 py-2 text-[13px] ${result === "ok" ? "border-[#2A4A44] bg-[#17302C] text-[#85DDCB]" : "border-[#4A2F2C] bg-[#2A1B1A] text-[#F08A80]"}`}>
          {NOTICE[result]} {detail ?? ""}
        </p>
      )}
      <div className={`${panel} grid gap-3 border-l-4 border-l-[#FF0000] p-4 lg:p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white">
              <YouTubeIcon />
            </span>
            <div className="min-w-0">
              <b className="block text-[15px] font-semibold text-[#F2F5F4]">YouTube Live</b>
              {yt ? (
                <a href={yt.channelUrl} target="_blank" rel="noopener" className="flex items-center gap-1.5 truncate text-[13px] text-[#D9E0DE] hover:underline">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#FF0000]" aria-hidden="true" />
                  Canal: <b className="font-semibold text-[#F2F5F4]">{yt.account}</b>
                </a>
              ) : (
                <span className="block text-[13px] text-[#7C8A8E]">
                  {live.configured ? "Transmite tus llamadas en tu canal." : "Falta configurar la transmisión en el servidor."}
                </span>
              )}
            </div>
          </div>
          {live.configured && (
            <a href={connect} className={yt ? btnGhost : ytBtn}>
              {!yt && <YouTubeIcon className="h-4 w-6 [&>path:first-child]:fill-white [&>path:last-child]:fill-[#FF0000]" />}
              {yt ? "Cambiar de canal" : "Conectar con YouTube"}
            </a>
          )}
        </div>
        {yt && (
          <>
            <Form method="post" className="flex flex-wrap items-center gap-2 border-t border-[#232D33] pt-3">
              <input type="hidden" name="intent" value="live-privacy" />
              <span className="text-[13px] text-[#D9E0DE]">La transmisión sale como:</span>
              {(
                [
                  ["public", "Pública"],
                  ["unlisted", "No listada (sólo con la liga)"],
                ] as const
              ).map(([value, text]) => (
                <button
                  key={value}
                  name="privacy"
                  value={value}
                  aria-pressed={yt.privacy === value}
                  className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${yt.privacy === value ? "border-[#FF0000] bg-[#2A1515] text-[#F2F5F4]" : "border-[#232D33] bg-[#141B20] text-[#7C8A8E] hover:bg-[#1C252B]"}`}
                >
                  {text}
                </button>
              ))}
            </Form>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#232D33] pt-3 text-[13px]">
              {yt.lastWatchUrl ? (
                <a href={yt.lastWatchUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 font-medium text-[#F2F5F4] hover:underline">
                  <YouTubeIcon className="h-3.5 w-5" /> Ver la última transmisión
                </a>
              ) : (
                <span className="text-[#7C8A8E]">Aún no has transmitido desde aquí.</span>
              )}
              <Form method="post">
                <input type="hidden" name="intent" value="live-disconnect" />
                <button className="text-[13px] text-[#7C8A8E] hover:text-[#F08A80]">Desconectar</button>
              </Form>
            </div>
          </>
        )}
      </div>
      <div className={`${panel} flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-[#1877F2] p-4 lg:p-5`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#1877F2]">
            <FacebookIcon />
          </span>
          <div className="min-w-0">
            <b className="block text-[15px] font-semibold text-[#F2F5F4]">Facebook Live</b>
            {live.facebook ? (
              <span className="flex items-center gap-1.5 text-[13px] text-[#D9E0DE]">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#1877F2]" aria-hidden="true" />
                Conectado con la llave de transmisión de tu página
              </span>
            ) : (
              <span className="block text-[13px] text-[#7C8A8E]">Conectar tu página con un botón llega muy pronto.</span>
            )}
          </div>
        </div>
      </div>
      <p className="text-[13px] text-[#7C8A8E]">
        ✓ Tu canal debe tener habilitada la transmisión en vivo en YouTube Studio (la primera vez tarda hasta 24 h).
        {live.facebook && " En Facebook, si el video se queda en vista previa, dale «Go live» en Live Producer."}
      </p>
    </section>
  );
}
