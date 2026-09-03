# Correos del trial de EasyBits — taller "Diseño de sistemas agénticos"

Dos correos que salen del mismo script, según el estado del trial de cada inscrito.
El trial es el Payment Link de Stripe del plan **Mega**: 30 días, sin tarjeta
(`payment_method_collection=if_required`), y de ahí salen los tokens del modelo, las
sandboxes y el hosting que se usan en vivo.

| Grupo | Sender | Asunto | Qué dice |
|---|---|---|---|
| `pendientes` | `app/mailSenders/sendTallerTrialPendiente.tsx` | 👾 Todavía no reclamas tus tokens del taller | Sin trial no hay tokens, cajas ni hosting; los dos pasos (activar + `ghosty auth set`); salida por WhatsApp si el pago o el panel fallaron |
| `activos` | `app/mailSenders/sendTallerTrialActivo.tsx` | 🎙️ Hoy 8 pm: sesión 2 del taller | Invitación breve a la sesión de hoy, con una línea de qué se hace y el botón al room |

## Envío

```sh
npx tsx --env-file=.env scripts/send-taller-trial-status.ts pendientes                  # dry-run
npx tsx --env-file=.env scripts/send-taller-trial-status.ts activos --prueba --send     # a las cuentas propias
npx tsx --env-file=.env scripts/send-taller-trial-status.ts activos --send              # de verdad
npx tsx --env-file=.env scripts/send-taller-trial-status.ts pendientes --only x@y.com --send
```

Preview en el navegador: `npx tsx scripts/preview-trial-status.ts` deja los dos HTML en `/tmp`.

## El corte de quién está en cada grupo

La lista `PENDIENTES` del script está a mano y hay que **verificarla contra el panel de EasyBits
antes de cada envío**: la base de fixtergeek sabe quién compró el taller, no quién activó el trial.
Todos los demás inscritos caen en `activos`.

## Envío del 3 de septiembre de 2026

10 alumnos, sin altas nuevas después de Sergio (1 sep).

- **Pendientes (2):** Martín Melo y Marco Antonio Zamora, sin cuenta en EasyBits.
- **Activos (8):** Bremin, Erika, Oswaldo, Ismael, Jimmy, Alberto, Rosalba y Sergio.

Oswaldo empezó en pendientes por no tener plan Mega el 2 sep; ya lo subió y se movió a activos
antes de enviar.
