import { db } from "~/.server/db";
import type { Route } from "./+types/course";
import slugify from "slugify";
import { randomUUID } from "crypto";

export const action = async ({ request }: Route.ActionArgs) => {
  // await getAdminOrRedirect(request); @todo move to admin api

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
    const isPublic = data.isPublic === "on" ? true : undefined; // @todo validate
    return await db.video.update({
      where: { id: data.id },
      data: { ...data, index, isPublic, id: undefined },
    });
  }

  if (intent === "admin_add_video") {
    const data = JSON.parse(formData.get("data") as string);

    // Validación
    const errors: Record<string, string> = {};
    if (!data.title || String(data.title).trim() === "") {
      errors.title = "El título es requerido";
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors };
    }

    try {
      const slug = slugify(data.title) + "-" + randomUUID();
      const isPublic = data.isPublic === "on" ? true : undefined;
      const index = Number(data.index);
      const video = await db.video.create({
        data: {
          ...data,
          slug,
          index,
          isPublic,
        },
      });
      return { success: true, video };
    } catch (error) {
      console.error("Error creando video:", error);
      return {
        success: false,
        errors: { _form: "Error al guardar el video. Intenta de nuevo." },
      };
    }
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

  if (intent === "get_top_courses") {
    return await db.course.findMany({
      orderBy: { createdAt: "desc" },
      where: { published: true },
      take: 3,
      select: {
        id: true,
        title: true,
        icon: true,
        duration: true,
        level: true,
        slug: true,
      },
    });
  }

  return null;
};
