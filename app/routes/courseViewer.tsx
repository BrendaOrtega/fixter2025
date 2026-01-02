import { redirect, data } from "react-router";
import { useState, useEffect } from "react";
import { db } from "~/.server/db";
import { VideoPlayer } from "~/components/viewer/VideoPlayer";
import { UnifiedSidebarMenu } from "~/components/viewer/UnifiedSidebarMenu";
import { SuccessDrawer } from "~/components/viewer/SuccessDrawer";
import { PurchaseDrawer } from "~/components/viewer/PurchaseDrawer";
import { SubscriptionDrawer } from "~/components/viewer/SubscriptionDrawer";
import {
  getFreeOrEnrolledCourseFor,
  getUserOrNull,
  checkSubscriptionByEmail,
  subscribeForFreeAccess,
} from "~/.server/dbGetters";
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

// Action for handling subscription
export const action = async ({ request, params }: Route.ActionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "subscribe-free") {
    const email = formData.get("email") as string;
    const courseSlug = formData.get("courseSlug") as string;

    if (!email || !courseSlug) {
      return data({ error: "Email requerido" }, { status: 400 });
    }

    try {
      await subscribeForFreeAccess(email, courseSlug);

      // Set cookie and redirect to reload with access
      return redirect(request.url, {
        headers: {
          "Set-Cookie": `${SUBSCRIBER_COOKIE}=${encodeURIComponent(email)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`,
        },
      });
    } catch (error) {
      console.error("📧 Error:", error);
      return data({ error: "Error al suscribirse" }, { status: 500 });
    }
  }

  return data({ error: "Intent no válido" }, { status: 400 });
};

export const loader = async ({ request, params }: Route.LoaderArgs) => {
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

  const moduleNames = ["nomodules"];

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
    course.isFree ||
    isPurchased ||
    accessLevel === "public" ||
    (accessLevel === "subscriber" && isSubscribed);

  const removeStorageLink = !hasAccess;

  const videoToReturn = removeStorageLink ? { ...video, storageLink: "", m3u8: "" } : video;
  console.log("🔐 Result:", { hasAccess, removeStorageLink, returnedLink: videoToReturn.storageLink });

  // Get subscriber video titles for the drawer
  const subscriberVideos = videos
    .filter((v: any) => v.accessLevel === "subscriber")
    .map((v: any) => v.title);

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
    searchParams: {
      success: searchParams.get("success") === "1",
    },
  };
};

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
  },
}: Route.ComponentProps) {
  const [successIsOpen, setSuccessIsOpen] = useState(searchParams.success);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(serverIsSubscribed);


  // Determine which drawer to show based on accessLevel
  const hasAccess =
    course.isFree ||
    isPurchased ||
    accessLevel === "public" ||
    (accessLevel === "subscriber" && isSubscribed);

  const showSubscriptionDrawer = !hasAccess && accessLevel === "subscriber";
  const showPurchaseDrawer = !hasAccess && accessLevel === "paid";

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
          onPause={() => {
            // setIsMenuOpen(true);// @todo consider this
          }}
        />

        <UnifiedSidebarMenu
          courseTitle={course.title}
          courseSlug={course.slug}
          isOpen={isMenuOpen}
          setIsOpen={setIsMenuOpen}
          currentVideoSlug={video.slug || undefined}
          videos={videos}
          moduleNames={moduleNames.filter((n) => typeof n === "string")}
          isLocked={course.isFree ? false : !isPurchased}
          markdownBody={video.description || undefined}
          defaultTab="videos"
        />
      </article>
      {searchParams.success && <SuccessDrawer isOpen={successIsOpen} />}
      {showSubscriptionDrawer && (
        <SubscriptionDrawer
          courseSlug={course.slug}
          subscriberVideos={subscriberVideos}
        />
      )}
      {showPurchaseDrawer && <PurchaseDrawer courseSlug={course.slug} />}
    </>
  );
}
