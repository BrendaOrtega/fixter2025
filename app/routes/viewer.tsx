import {
  data,
  useLoaderData,
  useNavigate,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { useState } from "react";
import { db } from "~/.server/db";
import { VideoPlayer } from "~/components/viewer/VideoPlayer";
import { VideosMenu } from "~/components/viewer/VideoPlayerMenu";
import { SuccessDrawer } from "~/components/viewer/SuccessDrawer";
import { PurchaseDrawer } from "~/components/viewer/PurchaseDrawer";
import { getFreeOrEnrolledCourseFor, getUserOrNull } from "~/utils/dbGetters";
import type { Route } from "./+types/viewer";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "checkout") {
    // const url = await get40Checkout(); // @todo checkout update
    // return redirect(url);
  }
  return null;
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const user = await getUserOrNull(request);
  const { course, videos } = await getFreeOrEnrolledCourseFor(
    user,
    params.slug || ""
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

  if (!video) throw data(null, { status: 404 });
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
  //   const moduleNames = [...new Set(videos.map((video) => video.moduleName))];

  const moduleNames = ["nomodules"];

  return {
    course,
    nextVideo,
    user,
    isPurchased,
    video:
      !isPurchased && !video.isPublic ? { ...video, storageLink: "" } : video,
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
  const navigate = useNavigate();

  const [successIsOpen, setSuccessIsOpen] = useState(searchParams.success);

  const [isMenuOpen, setIsMenuOpen] = useState(true);

  const nextIndex = ((video.index || 0) + 1) % videos.length;
  // const nextVideo = videos[nextIndex];

  const handleClickEnding = () => {
    const url = new URL(location.href);
    url.pathname = "/player";
    url.searchParams.set("videoSlug", nextVideo.slug);
    // @todo: fix it (change for a link)
    // setIsMenuOpen(true);
    // navigate(url.pathname + url.search, { replace: true, flushSync: true });
    location.href = url.toString();
  };
  console.log("Course:", course);
  return (
    <>
      {/* <NavBar mode="player" className="m-0" /> */}
      <article className="bg-dark relative overflow-x-hidden pt-20">
        <VideoPlayer
          video={video}
          // @todo visit and refactor please
          onClickNextVideo={handleClickEnding}
          // type={video.type || undefined}
          src={video.storageLink || undefined}
          //   src={"/playlist/" + video.storageKey + "/index.m3u8"}
          //   type={"application/x-mpegURL"}
          type={"video/mp4"}
          poster={video.poster || undefined}
          nextVideo={nextVideo || undefined}
          slug={video.slug}
          onPause={() => {
            setIsMenuOpen(true);
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
          isLocked={!isPurchased}
        />
      </article>
      {searchParams.success && <SuccessDrawer isOpen={successIsOpen} />}
      {!isPurchased && !video.isPublic && <PurchaseDrawer />}
    </>
  );
}
