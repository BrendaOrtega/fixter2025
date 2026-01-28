import { type LoaderFunctionArgs, redirect } from "react-router";
import type { Route } from "./+types/descarga.$slug.gracias";
import { db } from "~/.server/db";
import { validateLeadMagnetToken } from "~/utils/tokens";
import { getLeadMagnetDownloadUrl } from "~/.server/services/s3-leadmagnet";
import { sendWaitlistConfirmation } from "~/mailSenders/sendLeadMagnetDownload";
import getMetaTags from "~/utils/getMetaTags";
import { cn } from "~/utils/cn";

export const meta = ({ data }: Route.MetaArgs) => {
  const isWaitlist = data?.leadMagnet?.type === "waitlist";
  return getMetaTags({
    title: isWaitlist ? "¡Estás registrado! | FixterGeek" : "¡Descarga lista! | FixterGeek",
    description: isWaitlist ? "Tu lugar está reservado." : "Tu recurso está listo para descargar.",
  });
};

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const { slug } = params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const directDownloadUrl = url.searchParams.get("download");
  const registered = url.searchParams.get("registered") === "true";

  if (!slug) {
    throw new Response("Slug no proporcionado", { status: 400 });
  }

  const leadMagnet = await db.leadMagnet.findUnique({
    where: { slug },
  });

  if (!leadMagnet || !leadMagnet.isActive) {
    throw new Response("Lead Magnet no encontrado", { status: 404 });
  }

  const isWaitlist = leadMagnet.type === "waitlist";

  // Case 0: Waitlist registration confirmed (already confirmed user)
  if (registered && isWaitlist) {
    return {
      leadMagnet,
      downloadUrl: null,
      fromToken: false,
      isWaitlist: true,
    };
  }

  // Case 1: Direct download URL (already confirmed user)
  if (directDownloadUrl) {
    return {
      leadMagnet,
      downloadUrl: directDownloadUrl,
      fromToken: false,
      isWaitlist: false,
    };
  }

  // Case 2: Magic link with token (confirmation flow)
  if (token) {
    const validation = validateLeadMagnetToken(token);

    if (!validation.isValid || !validation.decoded) {
      return {
        leadMagnet,
        error: validation.error || "Token inválido",
        downloadUrl: null,
        fromToken: true,
      };
    }

    const { email, slug: tokenSlug } = validation.decoded;

    // Verify slug matches
    if (tokenSlug !== slug) {
      return {
        leadMagnet,
        error: "Token no corresponde a este recurso",
        downloadUrl: null,
        fromToken: true,
      };
    }

    try {
      // 1. Find or update subscriber - confirm them
      let subscriber = await db.subscriber.findUnique({
        where: { email },
      });

      if (!subscriber) {
        // Create subscriber if not exists (shouldn't happen normally)
        subscriber = await db.subscriber.create({
          data: {
            email,
            confirmed: true,
            confirmedAt: new Date(),
            tags: [leadMagnet.tagOnDownload],
          },
        });
      } else if (!subscriber.confirmed) {
        // Confirm the subscriber
        subscriber = await db.subscriber.update({
          where: { email },
          data: {
            confirmed: true,
            confirmedAt: new Date(),
          },
        });
      }

      // 2. Add tag if not exists
      const currentTags = subscriber.tags || [];
      if (!currentTags.includes(leadMagnet.tagOnDownload)) {
        await db.subscriber.update({
          where: { id: subscriber.id },
          data: { tags: { push: leadMagnet.tagOnDownload } },
        });
      }

      // 3. Create download/registration record
      await db.leadMagnetDownload.create({
        data: {
          leadMagnetId: leadMagnet.id,
          subscriberId: subscriber.id,
          email,
          name: subscriber.name,
        },
      });

      // 4. Update count
      await db.leadMagnet.update({
        where: { id: leadMagnet.id },
        data: { downloadCount: { increment: 1 } },
      });

      // 5. Enroll in sequence if configured
      if (leadMagnet.sequenceId) {
        const existingEnrollment = await db.sequenceEnrollment.findUnique({
          where: {
            sequenceId_subscriberId: {
              sequenceId: leadMagnet.sequenceId,
              subscriberId: subscriber.id,
            },
          },
        });

        if (!existingEnrollment) {
          await db.sequenceEnrollment.create({
            data: {
              sequenceId: leadMagnet.sequenceId,
              subscriberId: subscriber.id,
              status: "active",
              currentEmailIndex: 0,
              nextEmailAt: new Date(),
              enrolledAt: new Date(),
              emailsSent: 0,
            },
          });
        }
      }

      // 6. Handle waitlist vs download
      if (isWaitlist) {
        // Send waitlist confirmation email
        await sendWaitlistConfirmation({
          to: email,
          slug,
          eventName: leadMagnet.eventName || leadMagnet.title,
          eventDate: leadMagnet.eventDate?.toLocaleDateString("es-MX", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          eventTime: leadMagnet.eventTime || undefined,
          eventLink: leadMagnet.eventLink || undefined,
          eventDescription: leadMagnet.eventDescription || undefined,
          coverImage: leadMagnet.coverImage,
          userName: subscriber.name || undefined,
        });

        return {
          leadMagnet,
          downloadUrl: null,
          fromToken: true,
          email,
          isWaitlist: true,
        };
      } else {
        // Generate presigned URL for download
        if (!leadMagnet.s3Key) {
          return {
            leadMagnet,
            error: "Archivo no configurado",
            downloadUrl: null,
            fromToken: true,
            isWaitlist: false,
          };
        }

        const downloadUrl = await getLeadMagnetDownloadUrl(
          leadMagnet.s3Key,
          leadMagnet.urlExpirationHours
        );

        return {
          leadMagnet,
          downloadUrl,
          fromToken: true,
          email,
          isWaitlist: false,
        };
      }
    } catch (error) {
      console.error("[Lead Magnet] Error processing token:", error);
      return {
        leadMagnet,
        error: "Error procesando la descarga. Intenta de nuevo.",
        downloadUrl: null,
        fromToken: true,
      };
    }
  }

  // No token or download URL - redirect to main page
  return redirect(`/descarga/${slug}`);
};

export default function LeadMagnetGracias({ loaderData }: Route.ComponentProps) {
  const { leadMagnet, downloadUrl, error, fromToken, isWaitlist } = loaderData;

  // Generate gradient style based on colors
  const gradientStyle = {
    background: `linear-gradient(135deg, ${leadMagnet.primaryColor} 0%, ${leadMagnet.secondaryColor || leadMagnet.primaryColor} 100%)`,
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={leadMagnet.bgPattern === "gradient" ? gradientStyle : undefined}
    >
      {leadMagnet.bgPattern !== "gradient" && (
        <div
          className="fixed inset-0 -z-10"
          style={{ backgroundColor: leadMagnet.primaryColor }}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src="/full-logo.svg"
              alt="FixterGeek"
              className="h-12 mx-auto opacity-90"
            />
          </div>

          {/* Cover Image */}
          {leadMagnet.coverImage && (
            <div className="flex justify-center mb-8">
              <img
                src={leadMagnet.coverImage}
                alt={leadMagnet.title}
                className="max-w-[200px] rounded-lg shadow-2xl"
              />
            </div>
          )}

          {/* Content Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
            {error ? (
              <>
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-red-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Enlace expirado o inválido
                </h2>
                <p className="text-white/80 mb-6">{error}</p>
                <a
                  href={`/descarga/${leadMagnet.slug}`}
                  className="inline-block py-3 px-6 rounded-lg font-bold bg-white text-gray-900 hover:bg-white/90 transition-all"
                >
                  Solicitar nuevo enlace
                </a>
              </>
            ) : isWaitlist ? (
              <>
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  ✅ ¡Estás registrado!
                </h2>
                <p className="text-white/80 mb-4">
                  {fromToken
                    ? "¡Email confirmado! Tu lugar está reservado."
                    : "Tu lugar está reservado."}
                </p>

                {/* Event Info */}
                {(leadMagnet.eventDate || leadMagnet.eventTime) && (
                  <div className="bg-white/10 rounded-lg p-4 mb-6">
                    <p className="text-white/60 text-sm mb-1">📅 Fecha y hora:</p>
                    <p className="text-white font-medium">
                      {leadMagnet.eventDate &&
                        new Date(leadMagnet.eventDate).toLocaleDateString("es-MX", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      {leadMagnet.eventTime && ` a las ${leadMagnet.eventTime}`}
                    </p>
                  </div>
                )}

                {leadMagnet.eventLink && (
                  <a
                    href={leadMagnet.eventLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-2 py-3 px-8 rounded-lg font-bold text-lg transition-all",
                      "bg-white text-gray-900 hover:bg-white/90",
                      "shadow-lg hover:shadow-xl"
                    )}
                  >
                    🎥 Link de la videollamada
                  </a>
                )}

                <p className="text-white/50 text-sm mt-6">
                  Te enviamos los detalles por email. ¡No olvides agregarlo a tu calendario!
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {leadMagnet.successTitle}
                </h2>
                <p className="text-white/80 mb-6">
                  {fromToken
                    ? "¡Email confirmado! Tu descarga está lista."
                    : "Tu descarga está lista."}
                </p>

                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download
                    className={cn(
                      "inline-flex items-center gap-2 py-3 px-8 rounded-lg font-bold text-lg transition-all",
                      "bg-white text-gray-900 hover:bg-white/90",
                      "shadow-lg hover:shadow-xl"
                    )}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Descargar ahora
                  </a>
                )}

                <p className="text-white/50 text-sm mt-6">
                  También te enviamos el enlace por email como respaldo.
                </p>
              </>
            )}
          </div>

          {/* Back link */}
          <div className="text-center mt-6">
            <a
              href="/"
              className="text-white/60 hover:text-white/80 text-sm transition-colors"
            >
              ← Volver a FixterGeek
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      {leadMagnet.showFooter && (
        <footer className="py-6 text-center">
          <p className="text-white/40 text-sm">
            {leadMagnet.footerText || "© FixterGeek · fixtergeek.com"}
          </p>
        </footer>
      )}
    </div>
  );
}
