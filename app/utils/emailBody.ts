/**
 * Partir y rearmar un correo generado por `wrapEmailHtml`.
 *
 * Lo que se guarda en `SequenceEmail.content` es un documento completo: doctype,
 * tablas de layout, logo y footer. Un editor rico normaliza todo eso y se lleva
 * el diseño entero por delante, así que el editor solo debe tocar el cuerpo —
 * lo que va dentro de la celda de contenido— y devolverlo a su lugar sin
 * modificar una sola línea de lo demás.
 *
 * La celda de contenido de `wrapEmailHtml` siempre se abre igual (`padding:16px
 * 32px 32px 32px;color:…;font-size:16px;line-height:1.6;">`) y cierra con
 * `</td></tr>`. Eso es lo que buscamos. Si el HTML no viene de ahí —pegado a
 * mano, de otro generador— no hay shell: el cuerpo es el documento entero.
 */

const OPEN = /(<td style="padding:16px 32px 32px 32px;color:[^"]*font-size:16px;line-height:1\.6;">)/;

export type SplitEmail = {
  /** Todo lo que va antes del cuerpo. Cadena vacía si el correo no trae shell. */
  before: string;
  body: string;
  after: string;
  hasShell: boolean;
};

export function splitEmailBody(html: string): SplitEmail {
  const match = html.match(OPEN);
  if (!match || match.index === undefined) {
    return { before: "", body: html, after: "", hasShell: false };
  }

  const bodyStart = match.index + match[0].length;
  const close = html.indexOf("</td></tr>", bodyStart);
  if (close === -1) {
    return { before: "", body: html, after: "", hasShell: false };
  }

  return {
    before: html.slice(0, bodyStart),
    body: html.slice(bodyStart, close),
    after: html.slice(close),
    hasShell: true,
  };
}

export function joinEmailBody(split: SplitEmail, body: string): string {
  if (!split.hasShell) return body;
  return `${split.before}\n${body}\n      ${split.after}`;
}
