import type { Course, User, Video } from "@prisma/client";
import { createSearchParams, data, redirect } from "react-router";
import { db } from "~/.server/db";
import { sendConfirmation } from "~/mailSenders/sendConfirmation";
import { sendWelcome } from "~/mailSenders/sendWelcome";
import { commitSession, getSession } from "~/sessions";
import { generateUserToken } from "~/utils/tokens";

// welcome or not
export const createAndWelcomeUser = async (data: User) => {
  const exists = await db.user.findUnique({
    where: {
      email: data.email,
    },
  });
  if (!exists) {
    const user = await db.user.create({
      data,
    });
    await sendWelcome(user.email);
  }
};

///util
const getAllVideos = async (courseId: string) => {
  const freeVideos = await db.video.findMany({
    where: {
      courseIds: {
        has: courseId,
      },
      isPublic: true,
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
      // m3u8 excluido - algunos videos tienen datos corruptos
    },
    orderBy: { index: "asc" },
  });
  const nakedVideos = await db.video.findMany({
    where: {
      courseIds: {
        has: courseId,
      },
    },
    select: {
      index: true,
      id: true,
      slug: true,
      title: true,
      duration: true,
      description: true,
      module: true,
      isPublic: true,
      moduleName: true,
      accessLevel: true,
      youtubeUrl: true,
      storageLink: true,
    },
    orderBy: { index: "asc" },
  });
  return nakedVideos.map((v, i) =>
    freeVideos.find((fv) => fv.id === v.id)
      ? freeVideos.find((fv) => fv.id === v.id)
      : v
  );
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
  // free videos only
  if (!user) {
    course = await db.course.findUnique({
      where: {
        slug,
      },
      select: {
        isFree: true,
        id: true,
        title: true,
        authorName: true,
        slug: true,
        version: true,
      },
    });
    if (!course) throw data("Course not found", { status: 404 });
    // free course
    if (course.isFree) {
      const videosForFreeCourse = await db.video.findMany({
        where: {
          courseIds: {
            has: course.id,
          },
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
          // m3u8 excluido - algunos videos tienen datos corruptos
        },
        orderBy: { index: "asc" },
      });
      return { course, videos: videosForFreeCourse };
    }
    const videos = await getAllVideos(course.id);
    return { course, videos };
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
    } as { videos: Partial<Video>[]; course: Partial<Course> };
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

export const getAdminOrRedirect = async (
  request: Request,
  config?: { redirectURL?: string; next?: string }
) => {
  // Usar la URL actual como default para next (en lugar de "/")
  const currentPath = new URL(request.url).pathname;
  const { redirectURL = "/login", next = currentPath } = config || {};
  const searchParams = createSearchParams([["next", next]]);
  const cookie = request.headers.get("cookie");
  const session = await getSession(cookie);
  if (!session.has("email")) {
    throw redirect(redirectURL + "?" + searchParams.toString());
  }
  const email = session.get("email");
  const user = await db.user.findUnique({
    where: {
      email,
    },
  });
  if (!user || user.role !== "ADMIN") {
    // admin only
    throw redirect(redirectURL + "?" + searchParams.toString());
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
  const { request, redirectUrl = "/mis-cursos" } = options || {};
  await db.user.upsert({
    where: {
      email,
    },
    update: { photoURL, displayName, metadata },
    create: { email, photoURL, displayName, username: email, metadata },
    // select: { id: true },
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

  exists = await db.user.findUnique({
    where: { email },
  });
  if (exists) {
    exists = await db.user.update({
      where: { email },
      data: {
        confirmed,
        tags: { push: tags },
      },
    }); // confirming
    return exists;
  }
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

// Check if email is subscribed with course-specific tag
// IMPORTANTE: Solo retorna true si el subscriber está CONFIRMADO
export const checkSubscriptionByEmail = async (
  email: string,
  courseSlug: string
): Promise<boolean> => {
  const tag = `${courseSlug}-free-access`;
  const subscriber = await db.subscriber.findFirst({
    where: {
      email,
      confirmed: true, // Solo subscribers confirmados tienen acceso
      tags: { has: tag },
    },
  });
  return !!subscriber;
};

// Create or update subscription for free course access
export const subscribeForFreeAccess = async (
  email: string,
  courseSlug: string
) => {
  const tag = `${courseSlug}-free-access`;
  const existing = await db.subscriber.findUnique({ where: { email } });

  if (existing) {
    // Check if already has the tag
    if (existing.tags.includes(tag)) {
      return existing;
    }
    // Add the tag
    return await db.subscriber.update({
      where: { email },
      data: { tags: { push: tag } },
    });
  }

  // Create new subscriber with the tag
  return await db.subscriber.create({
    data: {
      email,
      tags: [tag],
      confirmed: true, // Auto-confirm for free access
    },
  });
};
