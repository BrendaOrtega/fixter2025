import { useState, useRef } from "react";
import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  data,
  redirect,
} from "react-router";
import type { Route } from "./+types/descarga.$slug";
import { useFetcher } from "react-router";
import { db } from "~/.server/db";
import { getLeadMagnetDownloadUrl } from "~/.server/services/s3-leadmagnet";
import {
  sendLeadMagnetDownload,
  sendLeadMagnetConfirmation,
  sendWaitlistConfirmation,
  sendWaitlistMagicLink,
} from "~/mailSenders/sendLeadMagnetDownload";
import getMetaTags from "~/utils/getMetaTags";
import useRecaptcha from "~/lib/useRecaptcha";
import { cn } from "~/utils/cn";
import { Streamdown } from "streamdown";

export const meta = ({ data }: Route.MetaArgs) => {
  if (!data?.leadMagnet) {
    return getMetaTags({
      title: "Descarga no encontrada | FixterGeek",
      description: "Este recurso no está disponible.",
    });
  }

  return getMetaTags({
    title: `${data.leadMagnet.heroTitle} | FixterGeek`,
    description: data.leadMagnet.heroSubtitle || data.leadMagnet.description || "",
    image: data.leadMagnet.coverImage || undefined,
    url: `https://www.fixtergeek.com/descarga/${data.leadMagnet.slug}`,
  });
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { slug } = params;

  if (!slug) {
    throw new Response("Slug no proporcionado", { status: 400 });
  }

  const leadMagnet = await db.leadMagnet.findUnique({
    where: { slug },
  });

  if (!leadMagnet || !leadMagnet.isActive) {
    throw new Response("Lead Magnet no encontrado", { status: 404 });
  }

  return { leadMagnet };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { slug } = params;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (!slug) {
    return data({ error: "Slug no proporcionado" }, { status: 400 });
  }

  const leadMagnet = await db.leadMagnet.findUnique({
    where: { slug },
  });

  if (!leadMagnet || !leadMagnet.isActive) {
    return data({ error: "Lead Magnet no encontrado" }, { status: 404 });
  }

  if (intent === "download_request") {
    const email = String(formData.get("email")).toLowerCase().trim();
    const name = formData.get("name") as string | null;

    if (!email || !email.includes("@")) {
      return data({ error: "Email inválido" }, { status: 400 });
    }

    const isWaitlist = leadMagnet.type === "waitlist";

    try {
      // 1. Upsert Subscriber + add tag
      let subscriber = await db.subscriber.findUnique({
        where: { email },
      });

      const tag = leadMagnet.tagOnDownload;

      if (!subscriber) {
        subscriber = await db.subscriber.create({
          data: {
            email,
            name: name || undefined,
            confirmed: false,
            tags: [tag],
          },
        });
      } else {
        // Add tag if not exists
        const currentTags = subscriber.tags || [];
        if (!currentTags.includes(tag)) {
          await db.subscriber.update({
            where: { id: subscriber.id },
            data: {
              tags: { push: tag },
              name: name || subscriber.name,
            },
          });
        }
      }

      // 2. Check if subscriber is confirmed
      if (subscriber.confirmed) {
        // Create download/registration record
        await db.leadMagnetDownload.create({
          data: {
            leadMagnetId: leadMagnet.id,
            subscriberId: subscriber.id,
            email,
            name: name || subscriber.name,
          },
        });

        // Update count
        await db.leadMagnet.update({
          where: { id: leadMagnet.id },
          data: { downloadCount: { increment: 1 } },
        });

        // Enroll in sequence if configured
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
            userName: name || subscriber.name || undefined,
          });

          // Redirect to thank you page (no download)
          return redirect(`/descarga/${slug}/gracias?registered=true`);
        } else {
          // Download flow - generate presigned URL
          if (!leadMagnet.s3Key) {
            return data({ error: "Archivo no configurado" }, { status: 500 });
          }

          const downloadUrl = await getLeadMagnetDownloadUrl(
            leadMagnet.s3Key,
            leadMagnet.urlExpirationHours
          );

          // Send backup email with download link
          await sendLeadMagnetDownload({
            to: email,
            slug,
            title: leadMagnet.title,
            downloadUrl,
            coverImage: leadMagnet.coverImage,
            userName: name || subscriber.name || undefined,
            expirationHours: leadMagnet.urlExpirationHours,
          });

          // Redirect to thank you page with download
          return redirect(
            `/descarga/${slug}/gracias?download=${encodeURIComponent(downloadUrl)}`
          );
        }
      } else {
        // Not confirmed - send magic link email
        if (isWaitlist) {
          await sendWaitlistMagicLink({
            to: email,
            slug,
            eventName: leadMagnet.eventName || leadMagnet.title,
            coverImage: leadMagnet.coverImage,
            userName: name || undefined,
          });
        } else {
          await sendLeadMagnetConfirmation({
            to: email,
            slug,
            title: leadMagnet.title,
            coverImage: leadMagnet.coverImage,
            userName: name || undefined,
          });
        }

        return data({
          success: true,
          needsConfirmation: true,
          message: isWaitlist
            ? "Revisa tu email para confirmar tu registro"
            : "Revisa tu email para confirmar y descargar",
        });
      }
    } catch (error) {
      console.error("[Lead Magnet] Error processing request:", error);
      return data(
        { error: "Error procesando la solicitud. Intenta de nuevo." },
        { status: 500 }
      );
    }
  }

  return data({ error: "Acción no reconocida" }, { status: 400 });
};

export default function LeadMagnetLanding({ loaderData }: Route.ComponentProps) {
  const { leadMagnet } = loaderData;
  const fetcher = useFetcher();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const isLoading = fetcher.state !== "idle";
  const needsConfirmation = fetcher.data?.needsConfirmation;
  const error = fetcher.data?.error;

  const onSubmit = (_: SubmitEvent) => {
    if (!inputRef.current) return;

    const formData = new FormData();
    formData.append("intent", "download_request");
    formData.append("email", inputRef.current.value);

    fetcher.submit(formData, { method: "POST" });
  };

  const { handleSubmit } = useRecaptcha(onSubmit);

  // Generate gradient style based on colors
  const gradientStyle = {
    background: `linear-gradient(135deg, ${leadMagnet.primaryColor} 0%, ${leadMagnet.secondaryColor || leadMagnet.primaryColor} 100%)`,
  };

  // Background pattern based on config
  const getBackgroundPattern = () => {
    switch (leadMagnet.bgPattern) {
      case "dots":
        return "bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[size:20px_20px]";
      case "grid":
        return "bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px]";
      case "none":
        return "";
      default:
        return "";
    }
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
      <div className={cn("fixed inset-0 -z-10", getBackgroundPattern())} />

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

          {/* Hero Text */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {leadMagnet.heroTitle}
            </h1>
            {leadMagnet.heroSubtitle && (
              <p className="text-lg text-white/80">{leadMagnet.heroSubtitle}</p>
            )}
          </div>

          {/* Event Info (for waitlist) */}
          {leadMagnet.type === "waitlist" && (leadMagnet.eventDate || leadMagnet.eventTime) && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/20">
              <div className="flex items-center justify-center gap-4 text-white">
                <span className="text-2xl">📅</span>
                <div>
                  {leadMagnet.eventDate && (
                    <p className="font-medium">
                      {new Date(leadMagnet.eventDate).toLocaleDateString("es-MX", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  )}
                  {leadMagnet.eventTime && (
                    <p className="text-white/70">{leadMagnet.eventTime}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            {needsConfirmation ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  {leadMagnet.successTitle}
                </h2>
                <p className="text-white/80">{leadMagnet.successMessage}</p>
                <p className="text-white/60 text-sm mt-4">
                  {leadMagnet.type === "waitlist"
                    ? "Revisa tu bandeja de entrada y haz clic en el enlace para confirmar."
                    : "Revisa tu bandeja de entrada y haz clic en el enlace para descargar."}
                </p>
              </div>
            ) : (
              <fetcher.Form onSubmit={handleSubmit} className="space-y-4">
                <input type="hidden" name="intent" value="download_request" />

                <div>
                  <label htmlFor="email" className="sr-only">
                    Email
                  </label>
                  <input
                    ref={inputRef}
                    type="email"
                    name="email"
                    id="email"
                    required
                    placeholder={leadMagnet.inputPlaceholder}
                    className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                </div>

                {error && (
                  <p className="text-red-200 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    "w-full py-3 px-6 rounded-lg font-bold text-lg transition-all",
                    "bg-white text-gray-900 hover:bg-white/90",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "shadow-lg hover:shadow-xl"
                  )}
                >
                  {isLoading ? "Procesando..." : leadMagnet.ctaText}
                </button>
              </fetcher.Form>
            )}
          </div>

          {/* Description */}
          {leadMagnet.description && (
            <div className="mt-8 prose prose-invert prose-sm max-w-none text-white/80 prose-headings:text-white prose-strong:text-white prose-a:text-white/90 prose-a:underline">
              <Streamdown>{leadMagnet.description}</Streamdown>
            </div>
          )}
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
