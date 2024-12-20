import type { User, Video } from "@prisma/client";
import { redirect } from "react-router";
import { db } from "~/.server/db";
import { sendConfirmation } from "~/mailSenders/sendConfirmation";
import { commitSession, getSession } from "~/sessions";
import { generateUserToken } from "~/utils/tokens";

///util
const getAllVideos = async (courseId: string) => {
  const freeVideos = await db.video.findMany({
    where: {
      courseIds: {
        has: courseId,
      },
      isPublic: true,
    },
  });
  const nakedVideos = await db.video.findMany({
    where: {
      courseIds: {
        has: courseId,
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      duration: true,
      description: true,
      module: true,
      isPublic: true,
      moduleName: true,
    },
  });
  return nakedVideos.map((v, i) =>
    freeVideos.map((fv) => fv.id).includes(v.id) ? freeVideos[i] : v
  ) as Partial<Video>[];
};
// courses
export const getVideoTitles = async (courseId: string) => {
  return await db.video.findMany({
    where: {
      courseIds: { has: courseId },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      isPublic: true,
    },
  });
};

export const getFreeOrEnrolledCourseFor = async (
  user: Partial<User> | null,
  slug: string
) => {
  let course;
  // free only
  if (!user) {
    course = await db.course.findUnique({
      where: {
        slug,
      },
      select: { id: true, title: true, authorName: true, slug: true },
    });
    if (!course) return null;
    const videos = await getAllVideos(course.id);
    return { course, videos }; // could be null
  } else {
    // check if enrolled
    const course = await db.course.findFirst({
      where: {
        slug,
        // id: { in: user.courses },
      },
    });
    if (!course) return null;
    return {
      videos: await getAllVideos(course.id),
      course,
    };
  }
};

export const getUserOrNull = async (request: Request) => {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.has("email")) return null;
  const user = await db.user.findUnique({
    where: { email: session.get("email") },
  });
  if (!user) return null;
  return user;
};

export const getUserOrRedirect = async (
  request: Request,
  config = { redirectURL: "/login" }
) => {
  const cookie = request.headers.get("cookie");
  const session = await getSession(cookie);
  if (!session.has("email")) {
    throw redirect(config.redirectURL);
  }
  const email = session.get("email");
  const user = await db.user.findUnique({
    where: {
      email,
    },
  });
  if (!user) {
    throw redirect(config.redirectURL);
  }
  return user;
};

export const updateUserAndSetSession = async (
  {
    email,
    photoURL,
    displayName,
    metadata,
  }: {
    email: string;
    photoURL: string;
    displayName: string;
    metadata: any;
  },
  options: { request: Request; redirectUrl?: string }
) => {
  const { request, redirectUrl = "/perfil" } = options || {};
  await db.user.upsert({
    where: {
      email,
    },
    update: { photoURL, displayName, metadata },
    create: { email, photoURL, displayName, username: email, metadata },
    select: { id: true },
  });
  const session = await placeSession(request, email);
  throw redirect(redirectUrl, {
    headers: { "Set-Cookie": await commitSession(session) },
  });
};

export const ifUserRedirect = async (
  request: Request,
  options?: { redirectURL?: string }
) => {
  const { redirectURL = "/perfil" } = options || {};
  const session = await getSession(request.headers.get("Cookie"));
  if (session.has("email")) {
    throw redirect(redirectURL);
  }
  return Promise.resolve(0);
};

export const getOrCreateUser = async (
  email: string,
  options?: { confirmed: boolean; tags?: string[] }
) => {
  const { confirmed, tags = [] } = options || {};

  let exists;
  if (confirmed) {
    exists = await db.user.update({
      where: { email },
      data: {
        confirmed,
        tags: { push: tags },
      },
    }); // confirming
  } else {
    exists = await db.user.findUnique({ where: { email } });
  }
  if (exists) return exists;

  return await db.user.create({
    data: {
      username: email,
      email,
      tags: [...(tags || [])], // @todo improve
      confirmed: confirmed ? confirmed : undefined,
    },
  });
};

export const placeSession = async (request: Request, email: string) => {
  const session = await getSession(request.headers.get("Cookie"));
  session.set("email", email); // I like email more...
  return session;
};

export const createOrUpdateUser = async (
  request: Request,
  {
    redirectUrl = "/my-courses",
    data,
    setSession,
  }: {
    redirectUrl?: string;
    data: User;
    setSession?: boolean;
  }
) => {
  const user = await db.user.upsert({
    where: {
      email: data.email,
    },
    create: data,
    update: { ...data, roles: { push: data.roles?.[0] || "magic_link" } },
  });
  if (setSession) {
    const session = await placeSession(request, data.email);
    throw redirect(redirectUrl, {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }
  return user;
};

// at subscribe we send confirmation email
export const sendConfirmationEmail = async (email: string) => {
  const token = generateUserToken({ email });
  return await sendConfirmation(email, token); // @detached
};

export const updateOrCreateSuscription = async (
  email: string,
  data: { confirmed: boolean; tags?: string[] }
) => {
  const { confirmed = false, tags = [] } = data || {};
  let exists;
  if (confirmed) {
    exists = await db.subscriber.update({
      where: { email },
      data: {
        confirmed,
        tags: { push: tags },
      },
    }); // confirming
  } else {
    exists = await db.subscriber.findUnique({ where: { email } });
  }
  if (exists) return exists;

  return await db.subscriber.create({
    data: {
      email,
      tags: [...(tags || [])], // @todo improve
      confirmed: confirmed ? confirmed : undefined,
    },
  });
};
