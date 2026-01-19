import { redirect, data, useNavigate } from "react-router";
import { useState, useEffect, useCallback } from "react";
import { db } from "~/.server/db";
import { VideoPlayer } from "~/components/viewer/VideoPlayer";
import { UnifiedSidebarMenu } from "~/components/viewer/UnifiedSidebarMenu";
import { SuccessDrawer } from "~/components/viewer/SuccessDrawer";
import { PurchaseDrawer } from "~/components/viewer/PurchaseDrawer";
import { SubscriptionDrawer } from "~/components/viewer/SubscriptionDrawer";
import { SubscriptionSuccessDrawer } from "~/components/viewer/SubscriptionSuccessDrawer";
import { RatingDrawer } from "~/components/viewer/RatingDrawer";
import {
  getFreeOrEnrolledCourseFor,
  getUserOrNull,
  checkSubscriptionByEmail,
} from "~/.server/dbGetters";
import { sendVerificationCode } from "~/mailSenders/sendVerificationCode";
import type { Route } from "./+types/courseViewer";
import getMetaTags from "~/utils/getMetaTags";

export function meta({ data }: Route.MetaArgs) {
  if (!data) {
    return getMetaTags({
      title: "Cargando curso...",
      description: "Accediendo al contenido del curso",
    });
  }

  const { course, video } = data;
  
  // Si hay un video específico, usar su información
  if (video) {
    return getMetaTags({
      title: `${video.title} - ${course.title}`,
      description: video.description?.slice(0, 150) || course.description?.slice(0, 150) || `Aprende con ${video.title} en el curso ${course.title}`,
      image: course.icon || course.poster || undefined,
    });
  }
  
  // Fallback al curso general
  return getMetaTags({
    title: course.title,
    description: course.description?.slice(0, 150) || `Curso completo: ${course.title}`,
    image: course.icon || course.poster || undefined,
  });
}

// Cookie name for subscriber email
const SUBSCRIBER_COOKIE = "fixtergeek_subscriber";

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

  // INTENT: send-code - Envía código OTP o da acceso directo si ya está confirmado
  if (intent === "send-code") {
    console.log("📧 send-code intent received for:", email);
    try {
      const existing = await db.subscriber.findUnique({ where: { email } });
      console.log("📧 Existing subscriber:", existing?.email, "confirmed:", existing?.confirmed);

      // CASO: Ya confirmado → acceso directo sin OTP
      if (existing?.confirmed) {
        console.log("📧 User already confirmed, redirecting directly");
        // Añadir tag si no lo tiene
        if (!existing.tags.includes(tag)) {
          await db.subscriber.update({
            where: { email },
            data: { tags: { push: tag } },
          });
        }
        // Set cookie + redirect (sin pedir código)
        const redirectUrl = new URL(request.url);
        redirectUrl.searchParams.set("subscribed", "1");
        return redirect(redirectUrl.toString(), {
          headers: {
            "Set-Cookie": `${SUBSCRIBER_COOKIE}=${encodeURIComponent(email)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`,
          },
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

      await sendVerificationCode(email, code);
      console.log("📧 Code sent successfully, returning codeSent: true");
      return data({ codeSent: true, email });
    } catch (error) {
      console.error("📧 Error sending code:", error);
      return data({ error: "Error al enviar código" }, { status: 500 });
    }
  }

  // INTENT: verify-code - Verifica el código OTP
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

      // Set cookie + redirect
      const redirectUrl = new URL(request.url);
      redirectUrl.searchParams.set("subscribed", "1");
      return redirect(redirectUrl.toString(), {
        headers: {
          "Set-Cookie": `${SUBSCRIBER_COOKIE}=${encodeURIComponent(email)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`,
        },
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
  if (searchParams.has("videoSlug")) {
    video = await db.video.findUnique({
      where: {
        slug: searchParams.get("videoSlug") as string,
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
      },
    });
  } else {
    // Si no hay videoSlug, usar el primer video y redireccionar
    video = videos[0];
    if (video?.slug) {
      throw redirect(`/cursos/${params.courseSlug}/viewer?videoSlug=${video.slug}`);
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

  // Debug log
  console.log("🔐 Access check:", {
    videoTitle: video.title,
    accessLevel,
    rawAccessLevel: (video as any).accessLevel,
    isSubscribed,
    isPurchased,
    courseFree: course.isFree,
  });

  const hasAccess =
    isPurchased ||
    accessLevel === "public" ||
    (accessLevel === "subscriber" && isSubscribed);

  const removeStorageLink = !hasAccess;

  // Generar presigned URL para videos de Tigris (bucket privado)
  let finalStorageLink = (video as any).storageLink || "";
  console.log("🎬 Original storageLink:", finalStorageLink);
  if (hasAccess && finalStorageLink) {
    try {
      // Detectar URLs de Tigris (cualquier formato)
      const isTigrisUrl = finalStorageLink.includes('tigris.dev') || finalStorageLink.includes('t3.storage.dev');
      // Detectar URLs de Firebase Storage
      const isFirebaseUrl = finalStorageLink.includes('firebasestorage.googleapis.com');

      if (isTigrisUrl) {
        console.log("🎬 Generating Tigris presigned URL for:", finalStorageLink.substring(0, 80));
        finalStorageLink = await getPresignedFromUrl(finalStorageLink, 3600);
      } else if (isFirebaseUrl) {
        console.log("🔥 Generating Firebase signed URL for:", finalStorageLink.substring(0, 80));
        finalStorageLink = await getFirebaseSignedUrl(finalStorageLink, 3600000);
      }
    } catch (err) {
      console.error("❌ Error generating presigned URL:", err);
      finalStorageLink = ""; // Fallback a vacío si falla
    }
  }

  const videoToReturn = removeStorageLink
    ? { ...video, storageLink: "", m3u8: "" }
    : { ...video, storageLink: finalStorageLink };
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
    video: videoToReturn,
    videos,
    moduleNames,
    subscriberVideos,
    subscriberEmail: subscriberEmail ? decodeURIComponent(subscriberEmail) : null,
    searchParams: {
      success: searchParams.get("success") === "1",
      subscribed: searchParams.get("subscribed") === "1",
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
    video,
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
  const [showRatingDrawer, setShowRatingDrawer] = useState(false);
  const navigate = useNavigate();

  // Determine which drawer to show based on accessLevel
  const hasAccess =
    isPurchased ||
    accessLevel === "public" ||
    (accessLevel === "subscriber" && serverIsSubscribed);

  const showSubscriptionDrawer = !hasAccess && accessLevel === "subscriber";
  const showPurchaseDrawer = !hasAccess && accessLevel === "paid";

  // Bloquear autoplay cuando hay drawer abierto
  const hasDrawerOpen =
    searchParams.success ||
    searchParams.subscribed ||
    showSubscriptionDrawer ||
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


  return (
    <>
      <article className="bg-dark relative overflow-x-hidden pt-20">
        <VideoPlayer
          key={video.id}
          video={video}
          courseId={course.id}
          src={video.storageLink || undefined}
          type={"video/mp4"}
          nextVideo={nextVideo || undefined}
          nextVideoLink={
            nextVideo
              ? `/cursos/${course.slug}/viewer?videoSlug=${nextVideo.slug}`
              : undefined
          }
          slug={video.slug}
          disabled={hasDrawerOpen}
          userId={user?.id}
          userEmail={user?.email || subscriberEmail || undefined}
          onPause={() => {
            // setIsMenuOpen(true);// @todo consider this
          }}
          onEnd={handleVideoEnd}
        />

        <UnifiedSidebarMenu
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
          defaultTab="videos"
        />
      </article>
      {searchParams.success && <SuccessDrawer isOpen />}
      {searchParams.subscribed && (
        <SubscriptionSuccessDrawer
          isOpen
          onClose={() => navigate(`/cursos/${course.slug}/viewer?videoSlug=${video.slug}`, { replace: true })}
          subscriberVideos={subscriberVideos}
          courseSlug={course.slug}
        />
      )}
      {showSubscriptionDrawer && (
        <SubscriptionDrawer
          key={video.id}
          courseSlug={course.slug}
          subscriberVideos={subscriberVideos}
          userEmail={user?.email}
        />
      )}
      {showPurchaseDrawer && <PurchaseDrawer key={video.id} courseSlug={course.slug} />}
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
