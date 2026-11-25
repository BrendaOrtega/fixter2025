import { getSesTransport } from "~/utils/sendGridTransport";
import { emailButton, wrapEmailHtml } from "~/utils/emailShell";
import { escapeHtml } from "~/utils/escapeHtml";
import { buildIcs } from "~/.server/services/club-events.server";

// Confirmación del taller gratis Ghosty Anti-Factory (desde el 25-nov-2026). Corta, con la anatomía
// de los correos de campaña de la casa (`docs/correo-campana-a-suscriptores.md`): saludo,
// ilustración propia, recuadro menta del evento, un renglón del club, botón al club y firma.

// Dominio verificado en SES: enviar como @gmail.com rompe DMARC y Gmail lo tira.
const FROM = "Héctorbliss de FixterGeek <secuencias@fixtergeek.com>";
const TITLE = "Ghosty Anti-Factory";
const UNSUBSCRIBE = "mailto:brenda@fixter.org?subject=Baja%20de%20correos%20FixterGeek";

type Session = { id: string; label: string; startsAt: Date; endsAt: Date };
/** Cómo quedó el regalo de 3 meses del club al registrarse. */
export type AntiFactoryGift = "granted" | "member" | "used" | null;

/// Ilustración del correo (1120 px servida a 560): la pantalla de la llamada con su tablero, Ghosty
/// oficial y un control de juego. Fuente: HTML + Chrome headless, subida con scripts/upload-email-asset.ts.
const ART_URL = "https://wild-bird-2039.t3.storage.dev/correos/anti-factory-registro-club-1120.png";
const ART_ALT = "Ghosty junto a la pantalla de la llamada del club, con un tablero de tareas y un control de juego";

/// Con membresía vigente la invitación es a jugar con Ghosty en el Mundo del club (la vista de entrada,
/// Archipiélago, con Ghosty de guía); quien ya usó su regalo sólo tiene pase a la llamada esos días.
const clubCta = (gift: AntiFactoryGift) =>
  gift === "granted"
    ? { line: "Tus <strong>3 meses del Club de Agentes de IA</strong> ya están activos: entra y juega con Ghosty mientras llega el martes.", button: "Jugar con Ghosty en el club" }
    : gift === "member"
      ? { line: "Ya eres miembro del <strong>Club de Agentes de IA</strong>: entra y juega con Ghosty mientras llega el martes.", button: "Jugar con Ghosty en el club" }
      : { line: "Tu registro te da pase a la llamada del <strong>Club de Agentes de IA</strong> esos dos días.", button: "Entrar al Club" };

export const antiFactoryConfirmationHtml = ({
  userName,
  joinUrl,
  gift,
}: {
  userName?: string | null;
  joinUrl: string;
  gift: AntiFactoryGift;
}) => {
  const cta = clubCta(gift);
  const hi = userName ? `Hola, ${escapeHtml(userName.split(" ")[0])}:` : "Hola:";
  const inner = `
    <p style="margin:0 0 16px 0;">${hi} ya estás registrado al taller gratis <strong>${TITLE}</strong>.</p>
    <div style="margin:0 0 16px 0;"><img src="${ART_URL}" alt="${ART_ALT}" width="560" style="width:100%;max-width:560px;height:auto;border:0;border-radius:12px;display:block;" /></div>
    <div style="margin:0 0 16px 0;border:1px solid #85DDCB;border-radius:12px;padding:16px;">
      <p style="margin:0 0 6px 0;font-size:13px;font-weight:bold;letter-spacing:1px;color:#3F8F7F;">MARTES 1 Y JUEVES 3 DE DIC · 7 PM (CDMX) · GRATIS</p>
      <p style="margin:0 0 6px 0;font-size:18px;"><strong>Taller ${TITLE}</strong></p>
      <p style="margin:0;">Dos sesiones en vivo de 7 a 9 pm, por YouTube y en la llamada del club. Los dos .ics de este correo las agregan a tu calendario.</p>
    </div>
    <p style="margin:0 0 20px 0;">${cta.line}</p>
    <div style="text-align:center;margin:0 0 12px 0;">${emailButton(cta.button, joinUrl)}</div>
    <p style="margin:0 0 20px 0;font-size:14px;color:#5A6A6E;text-align:center;">Entra con tu correo; la llamada se abre 15 minutos antes.</p>
    <p style="margin:0;">Abrazo. @blissito</p>`;
  return wrapEmailHtml(inner, {
    preheader: "Martes 1 y jueves 3 de diciembre, 7 pm (CDMX). Guarda las dos sesiones en tu calendario.",
    promoFooter: false,
  }).replace(/\{\{unsubscribe\}\}/g, UNSUBSCRIBE);
};

/** Confirmación del registro al taller, con un .ics por sesión. */
export const sendAntiFactoryConfirmation = async ({
  to,
  userName,
  sessions,
  joinUrl,
  gift = null,
}: {
  to: string;
  userName?: string | null;
  sessions: readonly Session[];
  /** Página del club desde la que se entra a la llamada; también va en el .ics. */
  joinUrl: string;
  gift?: AntiFactoryGift;
}) => {
  const html = antiFactoryConfirmationHtml({ userName, joinUrl, gift });

  const attachments = sessions.map((s, i) => ({
    filename: `anti-factory-sesion-${i + 1}.ics`,
    contentType: "text/calendar; charset=utf-8; method=PUBLISH",
    content: buildIcs(
      {
        id: s.id,
        title: `${TITLE} · sesión ${i + 1} de ${sessions.length}`,
        description: "Taller gratis en vivo en la llamada del Club de Agentes de IA de FixterGeek. Entra con el correo de tu registro.",
        startsAt: s.startsAt,
        endsAt: s.endsAt,
      },
      joinUrl,
    ),
  }));

  return getSesTransport()
    .sendMail({
      from: FROM,
      to,
      subject: `Ya estás registrado a ${TITLE}: martes 1 y jueves 3 de diciembre`,
      html,
      attachments,
    })
    .then((result: unknown) => {
      console.log(`[anti-factory] confirmation sent to: ${to}`);
      return result;
    });
};
