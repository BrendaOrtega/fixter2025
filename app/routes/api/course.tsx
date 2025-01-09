import { db } from "~/.server/db";
import type { Route } from "./+types/course";
import slugify from "slugify";
import { randomUUID } from "crypto";
import { getAdminOrRedirect } from "~/.server/dbGetters";

export const action = async ({ request }: Route.ActionArgs) => {
  await getAdminOrRedirect(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "admin_update_course") {
    const data = JSON.parse(formData.get("data") as string);
    // const slug = slugify(data.title) + randomUUID();
    return await db.course.update({
      where: { id: data.id },
      data: {
        ...data,
        id: undefined,
      },
    });
  }

  if (intent === "admin_delete_video") {
    const videoId = formData.get("videoId") as string;
    return await db.video.delete({ where: { id: videoId } });
  }

  if (intent === "admin_update_video") {
    const data = JSON.parse(formData.get("data") as string);
    const index = Number(data.index);
    const isPublic = data.isPublic === "on" ? true : undefined;
    return await db.video.update({
      where: { id: data.id },
      data: { ...data, index, isPublic, id: undefined },
    });
  }

  if (intent === "admin_add_video") {
    const data = JSON.parse(formData.get("data") as string);
    const slug = slugify(data.title) + "-" + randomUUID();
    const isPublic = data.isPublic === "on" ? true : undefined;
    const index = Number(data.index);
    return await db.video.create({
      data: {
        ...data,
        slug,
        index,
        isPublic,
      },
    });
  }

  if (intent === "admin_get_videos_for_course") {
    const courseId = formData.get("courseId") as string;
    const allVideosForCourse = await db.video.findMany({
      orderBy: { index: "desc" },
      where: {
        courseIds: { has: courseId },
      },
    });
    return { videos: allVideosForCourse };
  }

  if (intent === "videos_length") {
    const courseId = formData.get("courseId") as string;
    const videosLength = await db.video.count({
      where: {
        courseIds: { has: courseId },
      },
    });
    return { videosLength };
  }

  return null;
};
