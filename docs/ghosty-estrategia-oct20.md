# Ghosty móvil: estrategia y video (20-oct-2026) — EN PAUSA

Arrancó como «copiar el motion de Agent Vault para Ghosty iOS» y se detuvo a pensar estrategia antes del video.

## 1. Referencia de video
`~/Downloads/mark-vassilevskiy-cant-stop-rewatching.mp4`: promo de Agent Vault, de 38 s en 1280×720.
- **Beats:**
  1. La tarjeta se tokeniza con un barrido de píxeles.
  2. Callouts en pastilla: «ONLY TOKEN IS VISIBLE».
  3. Log tipo terminal con logos: Logging in / Filling in details / Payment complete.
  4. iPhone con el chat de Grok Bot.
  5. Contraste con texto resaltado: «Either do manually / Or give your credentials to random apps».
  6. Actor frustrado y «Booking failed».
  7. Logo con la fila de asistentes.
  8. Cierre en pastillas sobre retícula: AGENT VAULT / tagline / URL.
- **Qué se copia:** la mecánica, no el gradiente magenta ni el negro plano (están prohibidos).
- **Piel para Ghosty:** la de ghosty.studio (`videos/ghosty-en-caja/src/index.tpl.html`, const C).
- **Formato decidido:** vertical 1080×1920 con CTA al App Store.

## 2. Datos de mercado (México)
- Hay 5.45 M de unidades económicas y el 95.5% son micro. De las micro, sólo el 23.5% usa internet; de las pequeñas, el 82% (INEGI/IMCO 2025).
- El 92% de las MiPyMEs usa WhatsApp Business (Meta 2025; el dato es débil).
- iOS tiene sólo el 22% de los teléfonos (StatCounter, jun-2026).
- Barreras para digitalizarse: conocimiento 38.5%, costo 37% y tiempo 25% (Concanaco 2026).
- Competencia: Gemini cuesta 99–395 MXN y ChatGPT 110–399 MXN; los dos ya agendan y mandan correo. Meta Business AI ya contesta y agenda en WhatsApp México.
- **Huecos sin dato mexicano:** Gmail contra Outlook, penetración de Workspace, dolores de cotizar y cobrar, y gasto en SaaS.

## 3. Lo que Ghosty ya tiene (verificado en código)
- **Conectores `live`** en `~/ghosty-studio/app/lib/connectors/registry.ts`: Gmail, Calendar, Contactos (verificados por Google el 14-oct), Mercado Pago, Facturama, Facturapi, Clip, Conekta y Deník.
- **WhatsApp** (oficial y por QR) y el tablero de ventas `sales.ghosty.studio`.
- **Precios:**
  - Pro $299, con el primer mes a $199.
  - Sales Basic $690.
  - Teams Empresarial $8,490.
- **App iOS** (`~/ghosty-app`):
  - Notas de voz, push y `PermissionCard`.
  - Entregas de PDF y Word.
  - La Fábrica (`Core/Factory/`).
- **Work (Teams + Sales):** se decidió el 30-sep que sea otro target sobre `Core/`. Todavía no existe.

## 4. Decisiones y descartes
- **Asistente personal de agenda y correo:** descartado. Gemini y ChatGPT ya lo hacen por menos.
- **Sales** (cotiza → aprueba en el iPhone → manda → agenda → cobra → factura): ya estaba priorizado, pero bliss lo ve como un **mercado saturado**. Brief en `videos/ghosty-ios-sales/BRIEF.md`, congelado.
- **Siguiente mercado propuesto: Ghosty Teams para organizaciones** (universidades, despachos y, con cautela, gobierno). Razones:
  - Ya hay tracción real: DESCTI tiene 697 mensajes en 38 días.
  - Es el ticket más alto.
  - El agente entrega oficios y reportes, que es trabajo difícil de copiar.
  - El director aprueba desde el iPhone.
- **Plan B:** cobranza y facturación postventa para pymes. No hay dato mexicano que lo respalde.

## 5. Estimación de ghosty-app-24: «la Fábrica para documentos»
Flujo: pedido → borrador → «¿qué cambió?» → aprobar y mandar.
- **Teams/gs:**
  - Flujo de aprobación copiado de `factory-flow.ts`: 3–5 días.
  - Endpoints `docs/approvals`: 2.
  - Salas: 2–3.
  - Resumen de cambios con LLM: 2. La marca de cambios visual al estilo Word lleva 4–6 y queda fuera.
  - Mandar por correo: 1–2.
- **iOS:**
  - Target Work: 1–2.
  - Login de organización: 2–3.
  - Salas: 4–6.
  - Cola «Por aprobar»: 3–4.
  - Vista de cambios: 2.
- **Mínimo para una demo:** 8–10 días.
- **Atajo recomendado (4–5 días):** una pestaña con bandera dentro de la app Personal. No pide una segunda App Review, y Work se hace cuando haya cliente que pague.
- **Riesgos:**
  - App Review: regla 4.3 (duplicada) y regla 4.2 (funcionalidad mínima).
  - Las instituciones piden saber dónde viven los datos y una bitácora de quién aprobó.
  - **Aprobar no es firmar con e.firma.**
  - La fidelidad de Word en QuickLook.

## 6. Pendiente (para retomar)
1. bliss decide si sigue el atajo (la pestaña en Personal) con DESCTI como piloto, o el plan B.
2. Si es Teams: investigar a fondo el mercado de universidades y despachos (cuántos son, cómo compran, competencia) antes de construir.
3. El video se hace después, sobre la demo real, con storytelling aprobado y capturas reales de ghosty-app-24.

Sesiones que ayudaron: ghosty-studio-6c (paleta y reglas) y ghosty-app-24 (iOS y estimación).
