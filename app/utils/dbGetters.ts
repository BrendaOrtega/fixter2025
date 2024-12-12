import type { User } from "@prisma/client";
import { redirect } from "react-router";
import { db } from "~/.server/db";
import { commitSession, getSession } from "~/sessions";

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

export const getOrCreateUser = async (email: string) => {
  const exists = await db.user.findUnique({ where: { email } });
  if (exists) return exists;

  return await db.user.create({
    data: { username: email, email, tags: ["magic_link"] },
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
