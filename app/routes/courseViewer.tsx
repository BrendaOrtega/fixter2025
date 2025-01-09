import { redirect } from "react-router";
import { useState } from "react";
import { db } from "~/.server/db";
import { VideoPlayer } from "~/components/viewer/VideoPlayer";
import { VideosMenu } from "~/components/viewer/VideoPlayerMenu";
import { SuccessDrawer } from "~/components/viewer/SuccessDrawer";
import { PurchaseDrawer } from "~/components/viewer/PurchaseDrawer";
import { getFreeOrEnrolledCourseFor, getUserOrNull } from "~/.server/dbGetters";
import type { Route } from "./+types/courseViewer";

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const user = await getUserOrNull(request);

  const { course, videos } = await getFreeOrEnrolledCourseFor(
    user,
    params.courseSlug as string
  );
  const isPurchased = user ? user.courses.includes(course.id) : false;
  let video;
  if (searchParams.has("videoSlug")) {
    video = await db.video.findUnique({
      where: {
        slug: searchParams.get("videoSlug") as string,
      },
    });
  } else {
    video = videos[0];
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
    },
  });

  const moduleNames = ["nomodules"];
  const removeStorageLink = !isPurchased && !video.isPublic && !course.isFree;
  return {
    course,
    nextVideo,
    user,
    isPurchased,
    video: removeStorageLink ? { ...video, storageLink: "" } : video,
    videos,
    moduleNames,
    searchParams: {
      success: searchParams.get("success") === "1",
    },
  };
};

export default function Route({
  loaderData: {
    nextVideo,
    isPurchased,
    video,
    videos,
    searchParams,
    moduleNames,
    course,
  },
}: Route.ComponentProps) {
  const [successIsOpen, setSuccessIsOpen] = useState(searchParams.success);
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const showPurchaseDrawer = !isPurchased && !video.isPublic && !course.isFree;

  return (
    <>
      <article className="bg-dark relative overflow-x-hidden pt-20">
        <VideoPlayer
          video={video}
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

        <VideosMenu
          courseTitle={course.title}
          courseSlug={course.slug}
          isOpen={isMenuOpen}
          setIsOpen={setIsMenuOpen}
          currentVideoSlug={video.slug || undefined}
          videos={videos}
          moduleNames={moduleNames.filter((n) => typeof n === "string")}
          defaultOpen={!searchParams.success}
          isLocked={course.isFree ? false : !isPurchased}
        />
      </article>
      {searchParams.success && <SuccessDrawer isOpen={successIsOpen} />}
      {showPurchaseDrawer && <PurchaseDrawer courseSlug={course.slug} />}
    </>
  );
}
