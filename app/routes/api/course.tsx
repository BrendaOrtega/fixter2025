import { type ActionFunctionArgs } from "react-router";
import { db } from "~/.server/db";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

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
