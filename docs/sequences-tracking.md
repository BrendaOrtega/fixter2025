# Email Sequences — SES Tracking

Cómo funcionan los envíos de **sequences** y cómo se capturan los eventos SES (delivery, open, click, bounce, complaint).

## Arquitectura

```
SequenceEnrollment ──> sendSESTEST ──> SES (con Tags + ConfigurationSet)
       │                                       │
       │                                       ▼
       │                               SNS topic "envios"
       │                                       │
       │                                       ▼
       └─────────────  api/sns.tsx ◄─── webhook (firma verificada)
                            │
                            ▼
              addToSequenceArrayAtomic
              pauseSequenceEnrollment (en bounce/complaint)
```

Mismo SES `ConfigurationSet` que ya usa Newsletter — los eventos heredan automáticamente la configuración de event destinations al SNS topic.

## Archivos clave

| Path | Rol |
|---|---|
| `prisma/schema.prisma` (modelo `SequenceEnrollment`) | Campos `messageIds[]`, `delivered[]`, `opened[]`, `clicked[]`, `bounced[]` |
| `app/mailSenders/sendSESTEST.tsx` | Sender con opciones `tags`, `trackOpens`, `to`. Devuelve `{ messageId, response }` |
| `app/.server/agenda.ts` (job `process_sequences`) | Cron cada 5 min (prod) / 15 min (dev) |
| `app/routes/api.sequences.process.ts` | Endpoint manual `POST /api/sequences/process` |
| `app/routes/api/sns.tsx` | Webhook SNS — resuelve Newsletter o SequenceEnrollment, dispatcha eventos |

## Tags SES enviados

Cada email de sequence sale con estos `Tags` (visibles como header `X-SES-MESSAGE-TAGS`):

```
sequence_id        // SequenceEnrollment.sequenceId
enrollment_id      // SequenceEnrollment.id  ← lookup principal
sequence_email_id  // SequenceEmail.id
```

El webhook prefiere `enrollment_id` (lookup directo por id) y cae a búsqueda por `messageIds` si el tag falta.

## Flujo de eventos

| SES event | Acción |
|---|---|
| `Delivery` | `$addToSet` en `SequenceEnrollment.delivered` |
| `Open` | `$addToSet` en `opened` |
| `Click` | `$addToSet` en `clicked` |
| `Bounce` (cualquier tipo) | `$addToSet` en `bounced` |
| `Bounce` Permanent | + `status='paused'` + `handleBadEmail` (blacklist + delete subscriber) |
| `Complaint` | `status='paused'` + `handleBadEmail` |

Idempotente por `$addToSet`: reentregos de SNS no duplican.

## Pre-requisito

`process.env.SES_CONFIGURATION_SET` debe estar definido. Ya lo está (lo usa Newsletter).

## Cómo probar end-to-end

1. **Crear sequence + enrollment**:
   ```ts
   const seq = await db.sequence.create({
     data: {
       name: "Test Tracking",
       trigger: "MANUAL",
       isActive: true,
       emails: { create: [{ order: 1, subject: "Hola", content: "<p>Test</p>", schedulingType: "delay", delayDays: 0 }] },
     },
     include: { emails: true },
   });
   const sub = await db.subscriber.findFirst({ where: { email: "fixtergeek@gmail.com" } });
   await db.sequenceEnrollment.create({
     data: { sequenceId: seq.id, subscriberId: sub.id, nextEmailAt: new Date() },
   });
   ```

2. **Disparar envío**: `curl -X POST https://fixtergeek.com/api/sequences/process` (o esperar al cron).

3. **Verificar tracking**:
   ```ts
   const e = await db.sequenceEnrollment.findFirst({
     where: { sequenceId: seq.id },
     select: { messageIds: true, delivered: true, opened: true, clicked: true, bounced: true, status: true },
   });
   ```
   - `messageIds` se llena al instante (sync con el envío).
   - `delivered` aparece ~30s después (SNS async).
   - `opened` cuando el cliente carga imágenes.
   - `clicked` al clickear cualquier link.

4. **Probar bounce/complaint** con SES mailbox simulator:
   - `bounce@simulator.amazonses.com` → bounce Permanent → `status='paused'` + blacklist.
   - `complaint@simulator.amazonses.com` → complaint → mismo path.

## Reanudar un enrollment pausado

Si un enrollment se pausó por bounce transitorio (no se hace hoy, pero podría):
```ts
await db.sequenceEnrollment.update({ where: { id }, data: { status: 'active' } });
```

## Diferencia con Newsletter

| | Newsletter | Sequence |
|---|---|---|
| Modelo de tracking | `Newsletter.{messageIds,delivered,opened,clicked}` | `SequenceEnrollment.{messageIds,delivered,opened,clicked,bounced}` |
| Tag identificador | `newsletter_id` | `enrollment_id` |
| Bounce permanente | Blacklist + delete subscriber | Blacklist + delete subscriber + `status='paused'` |
| Granularidad | Por campaign | Por enrollment (no por email individual) |

Si en el futuro se necesita granularidad por **email individual** de la secuencia (ej. comparar open rate del email 1 vs 3), migrar a un modelo `SequenceEmailEvent` separado.
