import { Form } from "react-router";
import { btn, btnGhost, card as panel, textLink } from "~/components/community/v2/ui";

// Pestaña «Transmisión» del panel del anfitrión: conectar el canal de YouTube de la comunidad.
// Al grabar una llamada con «En vivo» encendido, sale también a ese canal.

type Live = {
  configured: boolean;
  youtube: { account: string; channelUrl: string; privacy: "public" | "unlisted"; lastWatchUrl: string | null; lastPreparedAt: string | null } | null;
};

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
          Conecta tu canal y, al grabar una llamada con «En vivo» encendido, sale también a YouTube. El evento se crea solo al empezar y se cierra al detener.
        </p>
      </div>
      {result && NOTICE[result] && (
        <p className={`rounded-lg border px-3 py-2 text-[13px] ${result === "ok" ? "border-[#2A4A44] bg-[#17302C] text-[#85DDCB]" : "border-[#4A2F2C] bg-[#2A1B1A] text-[#F08A80]"}`}>
          {NOTICE[result]} {detail ?? ""}
        </p>
      )}
      <div className={`${panel} grid gap-3 p-4 lg:p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <b className="block text-[15px] font-semibold text-[#F2F5F4]">YouTube</b>
            {yt ? (
              <a href={yt.channelUrl} target="_blank" rel="noopener" className="block truncate text-[13px] text-[#85DDCB] hover:underline">
                ✓ Conectado: {yt.account}
              </a>
            ) : (
              <span className="block text-[13px] text-[#7C8A8E]">
                {live.configured ? "Sin conectar." : "Falta configurar la transmisión en el servidor."}
              </span>
            )}
          </div>
          {live.configured && (
            <a href={connect} className={yt ? btnGhost : btn}>
              {yt ? "Cambiar de canal" : "Conectar YouTube"}
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
                  className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${yt.privacy === value ? "border-brand-500 bg-[#17302C] text-[#F2F5F4]" : "border-[#232D33] bg-[#141B20] text-[#7C8A8E] hover:bg-[#1C252B]"}`}
                >
                  {text}
                </button>
              ))}
            </Form>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#232D33] pt-3 text-[13px]">
              {yt.lastWatchUrl ? (
                <a href={yt.lastWatchUrl} target="_blank" rel="noopener" className={textLink}>
                  Última transmisión
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
      <p className="text-[13px] text-[#7C8A8E]">
        ✓ Tu canal debe tener habilitada la transmisión en vivo en YouTube Studio (la primera vez tarda hasta 24 h). Facebook llega muy pronto.
      </p>
    </section>
  );
}
