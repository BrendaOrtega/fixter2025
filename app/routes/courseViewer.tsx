import { redirect, data, useNavigate } from "react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { db } from "~/.server/db";
import { VideoPlayer } from "~/components/viewer/VideoPlayer";
import { UnifiedSidebarMenu } from "~/components/viewer/UnifiedSidebarMenu";
import { SuccessDrawer } from "~/components/viewer/SuccessDrawer";
import { PurchaseDrawer } from "~/components/viewer/PurchaseDrawer";
import { SubscriptionDrawer } from "~/components/viewer/SubscriptionDrawer";
import { SequenceLockedDrawer } from "~/components/viewer/SequenceLockedDrawer";
import { SubscriptionSuccessDrawer } from "~/components/viewer/SubscriptionSuccessDrawer";
import { RatingDrawer } from "~/components/viewer/RatingDrawer";
import {
  getFreeOrEnrolledCourseFor,
  getUserOrNull,
  checkSubscriptionByEmail,
} from "~/.server/dbGetters";
import { sendVerificationCode } from "~/mailSenders/sendVerificationCode";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import type { Route } from "./+types/courseViewer";
import getMetaTags from "~/utils/getMetaTags";
import { parseVideoTime } from "~/utils/videoTime";
import { checkSignupEmail } from "~/.server/anti-bot";
import { recordOrigin, recordSelfReported } from "~/.server/origen";

export function meta({ data }: Route.MetaArgs) {
  if (!data) {
    return getMetaTags({
      title: "Cargando curso...",
      description: "Accediendo al contenido del curso",
    });
  }

  const { course, video } = data;

  if (video) {
    return getMetaTags({
      title: `${video.title} - ${course.title}`,
      // La descripción escrita gana. El arranque del transcript sólo sirve de red: las
      // primeras frases de una grabación son "vamos a ver si empieza", que como
      // resultado de búsqueda no dice nada de la clase.
      description:
        video.description?.slice(0, 155) ||
        (data as any).seoDescription ||
        course.description?.slice(0, 155) ||
        `Aprende con ${video.title} en el curso ${course.title}`,
      // El póster del VÍDEO, no el icono del curso: al compartirlo se ve de qué pieza
      // se trata, y los buscadores lo usan como miniatura.
      image: video.poster || course.icon || course.poster || undefined,
      // La canónica es la URL que sirve 200. `/cursos/:curso/:vídeo` es más bonita pero
      // redirige, así que apuntar ahí manda a los buscadores por un salto de más.
      url: `${SITE}/cursos/${course.slug}/${video.slug}`,
      type: "video.other",
      videoUrl: `${SITE}/cursos/${course.slug}/${video.slug}`,
      videoDuration: video.duration ? Number(video.duration) * 60 : undefined,
    });
  }

  return getMetaTags({
    title: course.title,
    description: course.description?.slice(0, 155) || `Curso completo: ${course.title}`,
    image: course.icon || course.poster || undefined,
    url: `${SITE}/cursos/${course.slug}/detalle`,
  });
}

const SITE = "https://www.fixtergeek.com";

// Cookie name for subscriber email
const SUBSCRIBER_COOKIE = "fixtergeek_subscriber";

// Comunidad a la que entra quien desbloquea un video con su correo. Es el
// mismo público —vino por un webinar de agentes— y la secuencia pública de la
// comunidad es la continuación natural.
const COMMUNITY_SLUG = "agentes";

/**
 * Deja a la persona dentro de verdad: cuenta y sesión abiertas.
 *
 * El código que le llegó al correo ya demostró que ese buzón es suyo — es la
 * misma prueba que usa el magic link. No abrirle sesión después de eso dejaba el
 * encabezado diciéndole "Iniciar sesión" justo cuando acababa de entrar, y la
 * ataba a ese navegador: desde el teléfono tenía que repetir el código.
 *
 * Devuelve las cabeceras con la cookie de sesión, o `null` si algo falla: el
 * acceso al video no depende de esto.
 */
async function openSession(request: Request, email: string) {
  try {
    const { placeSession } = await import("~/.server/dbGetters");
    const { commitSession } = await import("~/sessions");
    await db.user.upsert({
      where: { email },
      // `username` es obligatorio en el modelo y no tiene default: sin él el upsert
      // truena, el catch se lo come y la persona entra sin sesión.
      create: {
        email,
        username: email,
        displayName: email.split("@")[0],
        confirmed: true,
        roles: ["viewer"],
      },
      update: { confirmed: true },
    });
    return await commitSession(await placeSession(request, email));
  } catch (error) {
    console.error("📧 No se pudo abrir sesión:", error);
    return null;
  }
}

/** Las dos cookies del alta: la de suscriptor (de siempre) y la de sesión. */
function accessCookies(email: string, session: string | null) {
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    `${SUBSCRIBER_COOKIE}=${encodeURIComponent(email)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`,
  );
  if (session) headers.append("Set-Cookie", session);
  return headers;
}

/**
 * Mete al correo a la comunidad y le arranca su secuencia de bienvenida.
 * `joinCommunity` ya es idempotente (no duplica tag ni inscripción), así que
 * volver a verlo un mes después no le vuelve a mandar nada.
 *
 * Nunca bloquea: si la comunidad no existe o algo truena, la persona igual ve
 * su video. Perder el alta es molesto; perder el acceso que ya se ganó, no.
 */
async function joinCommunityFromViewer(email: string) {
  try {
    const community = await db.community.findUnique({
      where: { slug: COMMUNITY_SLUG },
      select: { id: true },
    });
    if (!community) return;
    const { joinCommunity } = await import("~/.server/community");
    await joinCommunity({ communityId: community.id, email });
  } catch (error) {
    console.error("📧 No se pudo unir a la comunidad:", error);
  }
}

// Action for handling subscription with OTP verification
export const action = async ({ request, params }: Route.ActionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const courseSlug = formData.get("courseSlug") as string;
  const tag = `${courseSlug}-free-access`;

  if (!email || !courseSlug) {
    return data({ error: "Email requerido" }, { status: 400 });
  }

  // Dominio desechable o truco de puntos en gmail. Se finge que el código salió:
  // decirle a un bot por qué lo rechazaron es enseñarle a pasar. Este formulario
  // es el que va en abierto, así que era el que más lo necesitaba.
  if (checkSignupEmail(email).blocked) {
    return data({ codeSent: true, email });
  }

  // INTENT: send-code - Envía código OTP o da acceso directo si ya está confirmado
  if (intent === "send-code") {
    console.log("📧 send-code intent received for:", email);
    try {
      const existing = await db.subscriber.findUnique({ where: { email } });
      console.log("📧 Existing subscriber:", existing?.email, "confirmed:", existing?.confirmed);

      // Antes, un correo ya confirmado entraba directo, sin código. Eso dejó de
      // ser aceptable en cuanto el alta abre sesión: escribir el correo de otra
      // persona bastaría para entrar como ella. El código es la única prueba de
      // que el buzón es tuyo, así que se pide siempre.
      if (existing?.confirmed && !existing.tags.includes(tag)) {
        await db.subscriber.update({
          where: { email },
          data: { tags: { push: tag } },
        });
      }

      // CASO: No confirmado o no existe → enviar código
      const code = Math.random().toString().slice(2, 8); // 6 dígitos
      const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

      await db.subscriber.upsert({
        where: { email },
        create: {
          email,
          verificationCode: code,
          codeExpiresAt,
          confirmed: false,
        },
        update: {
          verificationCode: code,
          codeExpiresAt,
        },
      });

      // El correo dice qué se abre con el código: un código pelón no le recuerda
      // a nadie qué estaba haciendo, y estos correos se leen minutos después.
      const course = await db.course.findUnique({
        where: { slug: courseSlug },
        select: { title: true, videoIds: true },
      });
      const unlocks = course
        ? (
            await db.video.findMany({
              where: { id: { in: course.videoIds }, accessLevel: "subscriber" },
              orderBy: { index: "asc" },
              select: { title: true },
            })
          ).map((v) => v.title)
        : [];
      await sendVerificationCode(email, code, {
        courseTitle: course?.title,
        unlocks,
      });
      console.log("📧 Code sent successfully, returning codeSent: true");
      return data({ codeSent: true, email });
    } catch (error) {
      console.error("📧 Error sending code:", error);
      return data({ error: "Error al enviar código" }, { status: 500 });
    }
  }

  // INTENT: verify-code - Verifica el código OTP
  // Alta a la serie SIN salir del video. Mandar a otra pestaña a llenar otro
  // formulario pierde a la mitad: quien está aquí ya decidió que le interesa
  // ESTE video, y el alta debe ocurrir donde está su atención.
  if (intent === "subscribe-sequence") {
    const sequenceId = formData.get("sequenceId") as string;
    if (!sequenceId) return data({ error: "Falta la serie" }, { status: 400 });

    try {
      const sequence = await db.sequence.findUnique({
        where: { id: sequenceId },
        select: { id: true, name: true, isActive: true, isPrivate: true },
      });
      if (!sequence || !sequence.isActive || sequence.isPrivate) {
        return data({ error: "Esta serie no está disponible" }, { status: 404 });
      }

      const { sendSequenceConfirmation } = await import(
        "~/mailSenders/sendSequenceConfirmation"
      );
      const existing = await db.subscriber.findUnique({ where: { email } });

      // El celular es opcional y solo se guarda con el consentimiento explícito
      // del switch. Mismo trato que en la landing de la serie.
      if (formData.get("wantsWhatsapp") === "on") {
        const raw = String(formData.get("phone") || "").trim();
        if (raw) {
          const { normalizePhone } = await import("~/.server/phone");
          const parsed = normalizePhone(raw);
          if (!parsed.ok) return data({ error: parsed.error }, { status: 400 });
          if (existing) {
            await db.subscriber.update({
              where: { id: existing.id },
              data: { phone: parsed.phone, whatsappOptIn: true },
            });
          }
        }
      }

      // Ya confirmó su correo antes: no se le vuelve a pedir la prueba, se le
      // inscribe y el primer correo sale en el siguiente ciclo del riel.
      if (existing?.confirmed) {
        const { enrollSubscriberInSequence } = await import("~/.server/sequences");
        await enrollSubscriberInSequence(sequence.id, existing.id, {
          immediate: true,
        });
        const { setMemberCookie } = await import("~/.server/memberCookie");
        return data(
          { sequenceEnrolled: true },
          { headers: { "Set-Cookie": await setMemberCookie(email) } }
        );
      }

      await sendSequenceConfirmation({
        email,
        sequenceId: sequence.id,
        sequenceName: sequence.name,
      });
      return data({ sequenceNeedsConfirmation: true });
    } catch (error) {
      console.error("📧 Alta a la serie falló:", error);
      return data({ error: "No se pudo completar el alta" }, { status: 500 });
    }
  }

  if (intent === "verify-code") {
    const code = formData.get("code") as string;

    if (!code) {
      return data({ error: "Código requerido" }, { status: 400 });
    }

    try {
      const subscriber = await db.subscriber.findUnique({ where: { email } });

      if (
        !subscriber ||
        subscriber.verificationCode !== code ||
        !subscriber.codeExpiresAt ||
        subscriber.codeExpiresAt < new Date()
      ) {
        return data({ error: "Código inválido o expirado" }, { status: 400 });
      }

      // Código válido → confirmar + añadir tag + limpiar código
      await db.subscriber.update({
        where: { email },
        data: {
          confirmed: true,
          confirmedAt: new Date(),
          tags: subscriber.tags.includes(tag)
            ? undefined
            : { push: tag },
          verificationCode: null,
          codeExpiresAt: null,
        },
      });

      await joinCommunityFromViewer(email);
      await recordOrigin(email, request);
      await recordSelfReported(
        email,
        (formData.get("origenOtro") as string) || (formData.get("origen") as string),
      );

      const redirectUrl = new URL(request.url);
      redirectUrl.searchParams.set("subscribed", "1");
      const session = await openSession(request, email);
      return redirect(redirectUrl.toString(), {
        headers: accessCookies(email, session),
      });
    } catch (error) {
      console.error("📧 Error verifying code:", error);
      return data({ error: "Error al verificar código" }, { status: 500 });
    }
  }

  return data({ error: "Intent no válido" }, { status: 400 });
};

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { getPresignedFromUrl, getFirebaseSignedUrl } = await import("~/.server/tigrs");
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const user = await getUserOrNull(request);

  // Check subscription from cookie
  const cookieHeader = request.headers.get("Cookie") || "";
  const subscriberEmail = cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith(`${SUBSCRIBER_COOKIE}=`))
    ?.split("=")[1];

  let isSubscribed = false;
  if (subscriberEmail) {
    isSubscribed = await checkSubscriptionByEmail(
      decodeURIComponent(subscriberEmail),
      params.courseSlug as string
    );
  }

  const result = await getFreeOrEnrolledCourseFor(
    user,
    params.courseSlug as string
  );
  if (!result) throw redirect("/404");
  const { course, videos } = result;
  const isPurchased = user ? user.courses.includes(course.id as string) : false;
  let video;
  // La URL canónica es `/cursos/:curso/:video`. Quien llega por la vieja
  // —`/viewer?videoSlug=`— se manda a la canónica con TODA su query intacta:
  // los links repartidos en correos y descripciones de YouTube no se rompen, y
  // los `utm_*` sobreviven al salto.
  if (!params.videoSlug && searchParams.has("videoSlug")) {
    const slug = searchParams.get("videoSlug") as string;
    const resto = new URLSearchParams(searchParams);
    resto.delete("videoSlug");
    const query = resto.toString();
    throw redirect(
      `/cursos/${params.courseSlug}/${slug}${query ? `?${query}` : ""}`,
      301
    );
  }

  if (params.videoSlug) {
    video = await db.video.findUnique({
      where: {
        slug: params.videoSlug as string,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        index: true,
        duration: true,
        description: true,
        poster: true,
        isPublic: true,
        moduleName: true,
        accessLevel: true,
        storageLink: true,
        youtubeUrl: true,
        m3u8: true,
        // Para el `uploadDate` del schema, que Google exige para los carruseles de vídeo.
        eventDate: true,
        createdAt: true,
        authorName: true,
      },
    });
  } else {
    // Si no hay videoSlug, usar el primer video y redireccionar
    video = videos[0];
    if (video?.slug) {
      throw redirect(`/cursos/${params.courseSlug}/${video.slug}`);
    }
  }

  // if (!video) throw data("Video not found", { status: 404 });
  if (!video) throw redirect("/404"); // @todo throw a proper 404!
  const nextVideo = await db.video.findFirst({
    where: {
      index: video.index + 1,
      courseIds: { has: course.id },
    },
    select: {
      title: true,
      slug: true,
      id: true,
      poster: true,
      accessLevel: true,
    },
  });

  // Extraer módulos únicos de los videos, manteniendo el orden de aparición
  const moduleNames = videos.reduce((acc: string[], video: any) => {
    const name = video.moduleName || "nomodules";
    if (!acc.includes(name)) acc.push(name);
    return acc;
  }, []);

  // Determine access based on accessLevel
  const accessLevel = (video as any).accessLevel || "paid";

  // Los videos que llegan por una secuencia se abren con el avance de quien
  // mira, no con la compra: hay que ir a preguntarle a su inscripción. Se
  // resuelven TODOS los del curso y no solo el actual, porque la lista lateral
  // también tiene que decir cuándo se abre cada uno — un candado sin fecha se
  // lee como error del sitio.
  const sequenceVideos = isPurchased
    ? []
    : videos.filter((v: any) => v.accessLevel === "sequence");
  const sequenceUnlocks: Record<
    string,
    {
      unlocked: boolean;
      unlocksAt: string | null;
      enrolled: boolean;
      order: number | null;
    }
  > = {};
  let sequenceUrl: string | null = null;
  let sequenceName: string | null = null;
  let sequenceDbId: string | null = null;

  if (sequenceVideos.length) {
    const { viewerEmailFrom } = await import("~/.server/videoAccess");
    const { sequenceUnlockFor } = await import("~/.server/sequences");
    const viewerEmail = await viewerEmailFrom(request, user?.email);
    let sequenceId: string | undefined;

    for (const v of sequenceVideos) {
      if (!v?.slug) continue;
      const unlock = await sequenceUnlockFor(v.slug as string, viewerEmail);
      sequenceUnlocks[v.slug as string] = {
        unlocked: unlock.unlocked,
        unlocksAt: unlock.unlocksAt ? unlock.unlocksAt.toISOString() : null,
        enrolled: unlock.enrolled,
        order: unlock.order ?? null,
      };
      sequenceId ||= unlock.sequenceId;
    }

    if (sequenceId) {
      const seq = await db.sequence.findUnique({
        where: { id: sequenceId },
        select: { slug: true, id: true, name: true },
      });
      if (seq) {
        sequenceUrl = `/s/${seq.slug || seq.id}`;
        sequenceName = seq.name;
        sequenceDbId = seq.id;
      }
    }
  }

  const currentUnlock = sequenceUnlocks[video.slug as string];
  const sequenceUnlocked = currentUnlock?.unlocked ?? false;
  const unlocksAt = currentUnlock?.unlocksAt ?? null;
  const sequenceEnrolled = currentUnlock?.enrolled ?? false;
  const sequenceOrder = currentUnlock?.order ?? null;

  // La regla vive en un solo lugar; aquí solo se le pasan los datos ya cargados.
  const { resolveAccess } = await import("~/.server/videoAccess");
  const { hasAccess } = resolveAccess({
    accessLevel,
    isPurchased,
    isSubscribed,
    sequenceUnlocked,
    unlocksAt: unlocksAt ? new Date(unlocksAt) : null,
  });

  const removeStorageLink = !hasAccess;

  // Los videos de curso en Tigris se sirven por el proxy, con un token que se firma
  // AQUÍ — el único lugar que sabe si hay acceso. El proxy ya no atiende nada sin token.
  const { buildHlsProxyUrl } = await import("~/.server/hls");
  let finalM3u8 = (video as any).m3u8 || "";
  if (hasAccess && finalM3u8) {
    finalM3u8 = buildHlsProxyUrl(finalM3u8) || finalM3u8;
  }

  // Generar presigned URL para videos de Tigris (bucket privado)
  let finalStorageLink = (video as any).storageLink || "";
  console.log("🎬 Original storageLink:", finalStorageLink);
  // Video de curso: va por el proxy firmado en vez de una presigned suelta.
  const proxiedStorageLink = hasAccess && finalStorageLink
    ? buildHlsProxyUrl(finalStorageLink)
    : null;
  if (proxiedStorageLink) {
    finalStorageLink = proxiedStorageLink;
  } else if (hasAccess && finalStorageLink) {
    try {
      // Detectar URLs de Tigris (cualquier formato)
      const isTigrisUrl = finalStorageLink.includes('tigris.dev') || finalStorageLink.includes('t3.storage.dev');
      // Detectar URLs de Firebase Storage
      const isFirebaseUrl = finalStorageLink.includes('firebasestorage.googleapis.com');

      if (isTigrisUrl) {
        console.log("🎬 Generating Tigris presigned URL for:", finalStorageLink.substring(0, 80));
        finalStorageLink = await getPresignedFromUrl(finalStorageLink, 3600);
      } else if (isFirebaseUrl) {
        // Firebase URLs públicas funcionan sin signed URL
        // Solo intentar firmar si hay credenciales configuradas
        if (process.env.FIREBASE_CREDENTIALS_BASE64) {
          console.log("🔥 Generating Firebase signed URL for:", finalStorageLink.substring(0, 80));
          finalStorageLink = await getFirebaseSignedUrl(finalStorageLink, 3600000);
        } else {
          console.log("🔥 Using Firebase URL directly (no credentials):", finalStorageLink.substring(0, 80));
          // Usar la URL original - es pública
        }
      }
    } catch (err) {
      console.error("❌ Error generating presigned URL:", err);
      // Mantener la URL original como fallback en lugar de vacío
      console.log("⚠️ Using original URL as fallback");
    }
  }

  // Materiales de la pieza y del curso completo (temario, repo base). Se listan aunque no
  // haya acceso: saber QUÉ existe es parte de lo que vende el curso; abrirlos ya es otra
  // cosa, y eso lo decide la ruta del material.
  const resources = await db.resource.findMany({
    where: { OR: [{ videoId: video.id }, { courseId: course.id, videoId: null }] },
    select: { slug: true, kind: true, title: true, externalUrl: true, videoId: true },
    orderBy: { createdAt: "asc" },
  });

  // Dos lecturas distintas a propósito:
  //
  // - `transcript` es el vídeo en texto y se entrega con el MISMO criterio que el vídeo.
  // - `seo` va SIEMPRE, con acceso o sin él. Un buscador nunca tiene sesión, así que
  //   dejar los datos estructurados detrás del muro equivale a no tenerlos: los modelos
  //   de IA no ven vídeo, leen el transcript, y sin esto la clase es invisible.
  //   Por eso sólo sale un extracto y los capítulos, no la transcripción entera.
  const guardado = await db.transcript.findUnique({
    where: { videoId: video.id },
    select: { segments: true, chapters: true, text: true },
  });

  const transcript = hasAccess ? guardado : null;
  const seo = guardado
    ? {
        chapters: guardado.chapters,
        extracto: (guardado.text || "").slice(0, 1200),
      }
    : null;

  // La descripción de la página sale del propio contenido cuando existe: describe de
  // qué habla el vídeo, no lo que se escribió en el campo hace meses.
  const seoDescription = guardado?.text
    ? guardado.text.slice(0, 155).replace(/\s+\S*$/, "") + "…"
    : null;

  const videoToReturn = removeStorageLink
    ? { ...video, storageLink: "", m3u8: "" }
    : { ...video, storageLink: finalStorageLink, m3u8: finalM3u8 };
  console.log("🔐 Result:", { hasAccess, removeStorageLink, returnedLink: videoToReturn.storageLink?.substring(0, 80) });

  // Get subscriber videos for the drawer (with title and slug for navigation)
  const subscriberVideos = videos
    .filter((v: any) => v.accessLevel === "subscriber")
    .map((v: any) => ({ title: v.title, slug: v.slug }));

  return {
    course,
    nextVideo,
    user,
    isPurchased,
    isSubscribed,
    accessLevel,
    unlocksAt,
    sequenceUrl,
    sequenceName,
    sequenceDbId,
    sequenceEnrolled,
    sequenceOrder,
    sequenceUnlocks,
    video: videoToReturn,
    transcript,
    seo,
    seoDescription,
    resources,
    videos,
    moduleNames,
    subscriberVideos,
    subscriberEmail: subscriberEmail ? decodeURIComponent(subscriberEmail) : null,
    searchParams: {
      success: searchParams.get("success") === "1",
      subscribed: searchParams.get("subscribed") === "1",
      tab: searchParams.get("tab"),
      t: searchParams.get("t"),
    },
  };
};

// Helper para obtener videos completados del localStorage
function getWatchedVideos(courseId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const key = `watched_videos_${courseId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Helper para marcar video como visto
function markVideoAsWatched(courseId: string, videoId: string) {
  if (typeof window === "undefined") return;
  try {
    const key = `watched_videos_${courseId}`;
    const watched = getWatchedVideos(courseId);
    if (!watched.includes(videoId)) {
      watched.push(videoId);
      localStorage.setItem(key, JSON.stringify(watched));
    }
  } catch {
    // Silently fail
  }
}

// Helper para verificar si ya se mostró el rating drawer
function hasShownRatingDrawer(courseId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(`rating_shown_${courseId}`) === "true";
  } catch {
    return true;
  }
}

function setRatingDrawerShown(courseId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`rating_shown_${courseId}`, "true");
  } catch {
    // Silently fail
  }
}

export default function Route({
  loaderData: {
    nextVideo,
    isPurchased,
    isSubscribed: serverIsSubscribed,
    accessLevel,
    unlocksAt,
    sequenceUrl,
    sequenceName,
    sequenceDbId,
    sequenceEnrolled,
    sequenceOrder,
    sequenceUnlocks,
    video,
    transcript,
    seo,
    seoDescription,
    resources,
    videos,
    searchParams,
    moduleNames,
    course,
    subscriberVideos,
    subscriberEmail,
    user,
  },
}: Route.ComponentProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLessonContent, setShowLessonContent] = useState(false);
  const [showRatingDrawer, setShowRatingDrawer] = useState(false);
  const lessonContentRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();

  // El segundo en curso, para marcar la línea que suena en la transcripción. Entero, no
  // el valor crudo del <video>: con el crudo serían ~60 renders por segundo.
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<HTMLVideoElement | null>(null);

  const seekTo = useCallback((segundo: number) => {
    const el = playerRef.current;
    if (!el) return;
    el.currentTime = segundo;
    el.play().catch(() => {});
  }, []);

  // `?t=` abre el video en ese momento. Es lo que hace compartible un instante
  // concreto —por correo, por WhatsApp— y lo que necesita el SeekToAction del JSON-LD.
  // Acepta `12m30s`, `12:30` o segundos pelones: la liga tiene que poder escribirse
  // a mano, no solo generarse.
  // `?t=` se lee una sola vez y se le pasa al player, que es quien sabe cuándo
  // quedó attachada la fuente. Antes se fijaba `currentTime` desde aquí y el
  // attach lo pisaba: la liga con minuto abría el video desde el principio.
  const [startAt] = useState(() =>
    typeof window === "undefined"
      ? 0
      : parseVideoTime(new URLSearchParams(window.location.search).get("t")) ?? 0,
  );

  // Scroll lesson content into view when expanded
  useEffect(() => {
    if (showLessonContent && lessonContentRef.current) {
      setTimeout(() => {
        lessonContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100); // wait for expand animation to start
    }
  }, [showLessonContent]);

  // Determine which drawer to show based on accessLevel.
  // Para `sequence` la última palabra la tiene el servidor: el cliente no puede
  // recalcular el avance de una inscripción, así que se fía de que llegó fuente.
  const hasAccess =
    isPurchased ||
    accessLevel === "public" ||
    (accessLevel === "subscriber" && serverIsSubscribed) ||
    (accessLevel === "sequence" && !!(video.m3u8 || video.storageLink));

  const chaptersList = (seo?.chapters as { s: number; titulo: string }[]) || [];
  const videoUrl = `https://www.fixtergeek.com/cursos/${course.slug}/${video.slug}`;

  const showSubscriptionDrawer = !hasAccess && accessLevel === "subscriber";
  const showSequenceDrawer = !hasAccess && accessLevel === "sequence";
  const showPurchaseDrawer = !hasAccess && accessLevel === "paid";

  // Bloquear autoplay cuando hay drawer abierto
  const hasDrawerOpen =
    searchParams.success ||
    searchParams.subscribed ||
    showSubscriptionDrawer ||
    showSequenceDrawer ||
    showPurchaseDrawer;

  // Set initial menu state based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(true); // Open on desktop by default
      } else {
        setIsMenuOpen(false); // Closed on mobile by default
      }
    };

    // Set initial state
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle video completion - check if course is complete and show rating
  const handleVideoEnd = useCallback(() => {
    const courseId = course.id as string | undefined;
    const videoId = video.id as string | undefined;
    if (!courseId || !videoId) return;

    // Mark current video as watched
    markVideoAsWatched(courseId, videoId);

    // Check if this is the last video (no nextVideo)
    const isLastVideo = !nextVideo;

    // Get watched videos count
    const watchedVideos = getWatchedVideos(courseId);
    const totalVideos = videos.length;
    const watchedPercentage = totalVideos > 0 ? (watchedVideos.length / totalVideos) * 100 : 0;

    // Show rating drawer if:
    // 1. This is the last video OR user has watched 80%+ of videos
    // 2. User has access (purchased or subscribed)
    // 3. Rating drawer hasn't been shown before
    // 4. User is logged in or has email
    const hasEmail = user?.email || subscriberEmail;
    const shouldShowRating =
      (isLastVideo || watchedPercentage >= 80) &&
      hasAccess &&
      !hasShownRatingDrawer(courseId) &&
      hasEmail;

    if (shouldShowRating) {
      // Small delay for better UX
      setTimeout(() => {
        setShowRatingDrawer(true);
        setRatingDrawerShown(courseId);
      }, 1500);
    }
  }, [course.id, video.id, nextVideo, videos.length, hasAccess, user?.email, subscriberEmail]);


  // Datos estructurados. Sirven dos cosas distintas: los `Clip` habilitan los "momentos
  // clave" en el buscador, y el `transcript` es lo ÚNICO que los modelos de IA pueden
  // leer de un video —no lo ven, lo leen— así que sin él la clase es invisible para ellos.
  const jsonLd = seo
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: video.title,
        description:
          video.description?.slice(0, 500) || seoDescription || undefined,
        // `thumbnailUrl` es OBLIGATORIO para que Google muestre la miniatura; sin él
        // el resultado sale como un enlace de texto más.
        thumbnailUrl: video.poster ? [video.poster] : undefined,
        // También obligatorio. Sin fecha de publicación, el vídeo no entra a las
        // carruseles de vídeo del buscador.
        // `eventDate` es cuándo ocurrió en vivo; para lo demás vale la fecha de alta.
        uploadDate:
          (video as any).eventDate || (video as any).createdAt || undefined,
        // ISO 8601: el campo `duration` está en minutos y como texto.
        duration: video.duration ? `PT${Math.round(Number(video.duration))}M` : undefined,
        inLanguage: "es-MX",
        embedUrl: videoUrl,
        publisher: {
          "@type": "Organization",
          name: "FixterGeek",
          url: SITE,
          logo: { "@type": "ImageObject", url: `${SITE}/logo.png` },
        },
        author: {
          "@type": "Person",
          name: video.authorName || "Héctorbliss",
        },
        // Ata el vídeo a su programa: así el buscador entiende que es una clase de un
        // curso y no una pieza suelta.
        isPartOf: {
          "@type": "Course",
          name: course.title,
          url: `${SITE}/cursos/${course.slug}/detalle`,
          provider: { "@type": "Organization", name: "FixterGeek", url: SITE },
        },
        // El texto completo se recorta: un webinar de 75 min son ~9.000 palabras y
        // meterlas enteras en cada carga infla el HTML sin ganar nada.
        // Extracto, no la clase entera: suficiente para ser encontrable y citable sin
        // regalar 75 minutos de contenido de pago.
        transcript: seo.extracto,
        hasPart: (chaptersList || []).length
          ? chaptersList.map((c, i) => ({
              "@type": "Clip",
              name: c.titulo,
              startOffset: c.s,
              endOffset: chaptersList[i + 1]?.s ?? undefined,
              url: `${videoUrl}&t=${c.s}`,
            }))
          : undefined,
        potentialAction: {
          "@type": "SeekToAction",
          target: `${videoUrl}&t={seek_to_second_number}`,
          "query-input": "required name=seek_to_second_number",
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <article className="bg-dark relative overflow-x-hidden pt-20">
        <VideoPlayer
          key={video.id}
          video={video}
          startAt={startAt}
          courseId={course.id}
          src={video.storageLink || undefined}
          type={"video/mp4"}
          nextVideo={nextVideo || undefined}
          nextVideoLink={
            nextVideo
              ? `/cursos/${course.slug}/${nextVideo.slug}`
              : undefined
          }
          slug={video.slug}
          disabled={hasDrawerOpen}
          userId={user?.id}
          userEmail={user?.email || subscriberEmail || undefined}
          chapters={(transcript?.chapters as any) || undefined}
          captionsUrl={
            transcript ? `/api/transcript/${video.slug}?kind=captions` : undefined
          }
          onTimeChange={setCurrentTime}
          onVideoRef={(el) => (playerRef.current = el)}
          // Con `?t=` manda el enlace: no tiene sentido ofrecer retomar cuando alguien
          // acaba de hacer clic en un momento concreto.
          arranqueForzado={!!searchParams.t}
          onPause={() => {
            // setIsMenuOpen(true);// @todo consider this
          }}
          onEnd={handleVideoEnd}
        />

        {/* Lesson content — collapsible below video */}
        {video.description && video.description.length > 100 && (
          <div className="relative">
            {/* Toggle button */}
            {!showLessonContent && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                // Va debajo del video, no encima: con `absolute -top-14` se montaba
                // sobre la barra de progreso del player.
                className="mx-auto mt-4 flex items-center gap-2 px-5 py-2.5 bg-brand-700 hover:bg-brand-600 text-white rounded-full text-sm font-medium shadow-lg transition-colors cursor-pointer"
                onClick={() => setShowLessonContent(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                </svg>
                Leer contenido de la lección
              </motion.button>
            )}

            {/* Collapsible content */}
            <AnimatePresence>
              {showLessonContent && (
                <motion.section
                  ref={lessonContentRef}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="overflow-hidden border-t border-white/10 bg-dark"
                >
                  <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-white">Contenido de la lección</h2>
                      <button
                        onClick={() => setShowLessonContent(false)}
                        className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        Ocultar ↑
                      </button>
                    </div>
                    <div className="dark prose prose-invert prose-lg max-w-none">
                      <Streamdown plugins={{ code }} shikiTheme={["one-dark-pro", "one-dark-pro"]}>
                        {video.description}
                      </Streamdown>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        )}

        <UnifiedSidebarMenu
          // El admin enlaza `?tab=transcript` para caer directo en la
          // transcripción, en vez de aterrizar en la lista de videos.
          defaultTab={
            (searchParams.tab as
              | "videos"
              | "notes"
              | "transcript"
              | "resources") || "videos"
          }
          courseTitle={course.title}
          courseSlug={course.slug}
          isOpen={isMenuOpen}
          setIsOpen={setIsMenuOpen}
          currentVideoSlug={video.slug || undefined}
          videos={videos}
          moduleNames={moduleNames.filter((n) => typeof n === "string")}
          isLocked={!isPurchased}
          isSubscribed={serverIsSubscribed}
          markdownBody={video.description || undefined}
          transcript={transcript as any}
          resources={resources}
          courseId={course.id}
          currentTime={currentTime}
          onSeek={seekTo}
          // `?tab=transcript` abre directo la transcripción: es lo que necesitan los
          // enlaces a otra lección desde un resultado de búsqueda.
          defaultTab={searchParams.tab === "transcript" ? "transcript" : "videos"}
        />
      </article>
      {searchParams.success && <SuccessDrawer isOpen />}
      {searchParams.subscribed && (
        <SubscriptionSuccessDrawer
          isOpen
          onClose={() => navigate(`/cursos/${course.slug}/${video.slug}`, { replace: true })}
          subscriberVideos={subscriberVideos}
          courseSlug={course.slug}
        />
      )}
      {showSequenceDrawer && (
        <SequenceLockedDrawer
          isOpen
          title={video.title}
          unlocksAt={unlocksAt as string | null}
          enrolled={sequenceEnrolled}
          order={sequenceOrder}
          sequenceId={sequenceDbId}
          sequenceName={sequenceName}
          sequenceUrl={sequenceUrl}
          userEmail={user?.email || subscriberEmail}
        />
      )}
      {showSubscriptionDrawer && (
        <SubscriptionDrawer
          key={video.id}
          courseSlug={course.slug}
          subscriberVideos={subscriberVideos}
          userEmail={user?.email}
          hasWatchedBefore={getWatchedVideos(course.id).length > 0}
        />
      )}
      {showPurchaseDrawer && <PurchaseDrawer key={video.id} courseSlug={course.slug} price={course.basePrice} />}
      {showRatingDrawer && (user?.email || subscriberEmail) && course.id && (
        <RatingDrawer
          isOpen={showRatingDrawer}
          onClose={() => setShowRatingDrawer(false)}
          courseId={course.id as string}
          courseTitle={course.title as string}
          userEmail={user?.email || subscriberEmail || ""}
          userName={user?.displayName || undefined}
        />
      )}
    </>
  );
}
