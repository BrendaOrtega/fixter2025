// Llamada del club DENTRO de fixtergeek (10-nov-2026), como la sala de Ghosty Teams.
//
// La sala (room.html de la caja de eventos) va en un iframe. Su botón Grabar/Detener no le
// pega a la caja —con LOCK_TOKEN la caja lo rechaza y «Detener» no hacía nada—: manda la
// intención al padre (`gs:rec`) y esta página la ejecuta con la credencial de partner, igual
// que Teams. Nunca cruza una credencial el iframe, sólo «quiero grabar» y «se está grabando».
//
// La grabación ya NO arranca sola al entrar: la inicia el anfitrión desde la sala.
import { useEffect, useRef } from "react";
import { data, redirect, useFetcher, useLoaderData, useNavigate, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { getUserOrNull } from "~/.server/dbGetters";
import { canModerate, getNextEvent } from "~/.server/services/wall.server";
import { recordingState, startRecording, stopRecording } from "~/.server/services/club-recording.server";

async function load(request: Request, slug: string) {
  const user = await getUserOrNull(request);
  if (!user) throw redirect(`/login?next=/comunidad/${slug}`);
  const community = await db.community.findFirst({ where: { slug }, select: { id: true, ownerId: true } });
  if (!community) throw data("Comunidad no encontrada", { status: 404 });
  return { user, community, canMod: canModerate(user, community) };
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const slug = params.slug as string;
  await load(request, slug);
  // `u` es la URL de la sala con su ticket de un solo uso (120 s) que firmó gs en el action
  // `call` de la página del club. Sólo se acepta https.
  const u = new URL(request.url).searchParams.get("u") ?? "";
  let src: string | null = null;
  try {
    const parsed = new URL(u);
    if (parsed.protocol === "https:") src = parsed.toString();
  } catch {}
  if (!src) throw redirect(`/comunidad/${slug}`);
  return { slug, src };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const slug = params.slug as string;
  const { community, canMod } = await load(request, slug);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  if (intent === "rec-state") {
    const s = await recordingState();
    return { intent, recording: !!s?.recording };
  }
  if (!canMod) return data({ intent, error: "Sólo el anfitrión graba." }, { status: 403 });
  const event = await getNextEvent(community.id);
  const title = event?.title ?? "Llamada del club";
  if (intent === "rec-start") {
    const r = await startRecording(community, title, undefined, { live: form.get("live") === "1", event });
    return r.ok ? { intent, recording: true } : data({ intent, error: r.error }, { status: 502 });
  }
  if (intent === "rec-stop") {
    const r = await stopRecording(community, title, undefined, event);
    return r.ok ? { intent, recording: false } : data({ intent, error: r.error }, { status: 502 });
  }
  return data({ intent, error: "Acción desconocida" }, { status: 400 });
};

type RecReply = { intent: string; recording?: boolean; error?: string };

export default function ClubCall() {
  const { slug, src } = useLoaderData<typeof loader>();
  const frame = useRef<HTMLIFrameElement>(null);
  const fetcher = useFetcher<RecReply>();
  const navigate = useNavigate();
  const recording = useRef(false);

  const tell = (msg: Record<string, unknown>) => frame.current?.contentWindow?.postMessage({ t: "gs:rec:state", ...msg }, "*");

  // Respuesta del servidor → al botón de dentro de la sala.
  useEffect(() => {
    const d = fetcher.data;
    if (!d || fetcher.state !== "idle") return;
    if (d.error) return tell({ recording: recording.current, error: d.error });
    const stopped = d.intent === "rec-stop";
    recording.current = !!d.recording;
    // Al detener, el enlace a las grabaciones del club: el HLS tarda unos minutos en aparecer ahí.
    tell({ recording: recording.current, ...(stopped ? { url: `${window.location.origin}/comunidad/${slug}` } : {}) });
  }, [fetcher.data, fetcher.state]);

  // Lo que pide la sala. Se filtra por procedencia; quien decide si puede grabar es el action.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const d = e.data as { t?: string; action?: string; live?: boolean };
      if (d?.t === "gs:leave") return navigate(`/comunidad/${slug}`);
      if (d?.t === "gs:rec:ask") return fetcher.submit({ intent: "rec-state" }, { method: "post" });
      if (d?.t === "gs:rec" && (d.action === "start" || d.action === "stop")) {
        // Detener cierra el MP4 y lo manda a convertir (hasta ~2 min): el botón lo dice ya.
        if (d.action === "stop") tell({ recording: false, uploading: true });
        fetcher.submit({ intent: d.action === "start" ? "rec-start" : "rec-stop", live: d.live ? "1" : "" }, { method: "post" });
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [slug]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0E1317]">
      <iframe
        ref={frame}
        src={src}
        title="Llamada del club"
        className="h-full w-full border-0"
        allow="camera; microphone; display-capture; autoplay; fullscreen; speaker-selection; clipboard-write"
        allowFullScreen
      />
    </div>
  );
}
