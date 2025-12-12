import { db } from "~/.server/db";
import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";

export const action = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const subject = formData.get("subject") as string;
  const htmlContent = formData.get("htmlContent") as string;
  const recipients = formData.get("recipients") as string;

  if (!subject || !htmlContent || !recipients) {
    return new Response(JSON.stringify({ error: "Faltan campos" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const recipientsList = recipients
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (recipientsList.length === 0) {
    return new Response(JSON.stringify({ error: "No hay destinatarios" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Crear newsletter
  const newsletter = await db.newsletter.create({
    data: {
      slug: `stream-${Date.now()}`,
      title: subject,
      status: "SENT",
      content: htmlContent,
      recipients: recipientsList,
      sentAt: new Date(),
      delivered: [],
      opened: [],
      clicked: [],
    },
  });

  // Preparar HTML con tracking
  let finalHtmlContent = htmlContent;
  if (!htmlContent.includes("{{ses:openTracker}}")) {
    if (htmlContent.includes("<body")) {
      finalHtmlContent = htmlContent.replace(
        /<body[^>]*>/i,
        "$&\n{{ses:openTracker}}"
      );
    } else {
      finalHtmlContent = "{{ses:openTracker}}\n" + htmlContent;
    }
  }

  const transporter = getSesTransport();
  const from = getSesRemitent();
  const configurationSet = process.env.SES_CONFIGURATION_SET;

  const batchSize = 50;
  const totalBatches = Math.ceil(recipientsList.length / batchSize);

  // Crear stream de respuesta
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Enviar evento inicial
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "start",
            newsletterId: newsletter.id,
            total: recipientsList.length,
            totalBatches,
          })}\n\n`
        )
      );

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < recipientsList.length; i += batchSize) {
        const batchNumber = Math.floor(i / batchSize) + 1;
        const batch = recipientsList.slice(i, i + batchSize);

        // Enviar evento de progreso
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "progress",
              batch: batchNumber,
              totalBatches,
              sending: batch.length,
              percent: Math.round((batchNumber / totalBatches) * 100),
            })}\n\n`
          )
        );

        try {
          const result = await transporter.sendMail({
            from,
            subject,
            bcc: batch,
            html: finalHtmlContent,
            ses: {
              ConfigurationSetName: configurationSet || undefined,
              Tags: [{ Name: "newsletter_id", Value: newsletter.id }],
            },
          });

          successCount += batch.length;

          // Actualizar newsletter
          await db.newsletter.update({
            where: { id: newsletter.id },
            data: {
              delivered: { push: batch },
              messageIds: { push: result.messageId || "" },
            },
          });

          // Enviar evento de batch completado
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "batch_complete",
                batch: batchNumber,
                sent: batch.length,
                successCount,
                failCount,
              })}\n\n`
            )
          );
        } catch (error) {
          failCount += batch.length;
          console.error(`Error batch ${batchNumber}:`, error);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "batch_error",
                batch: batchNumber,
                error: error instanceof Error ? error.message : "Error",
                failCount,
              })}\n\n`
            )
          );
        }

        // Esperar entre lotes
        if (i + batchSize < recipientsList.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // Enviar evento final
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "complete",
            newsletterId: newsletter.id,
            total: recipientsList.length,
            sent: successCount,
            failed: failCount,
          })}\n\n`
        )
      );

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
