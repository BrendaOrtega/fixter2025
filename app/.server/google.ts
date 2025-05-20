import type { User } from "@prisma/client";
import { db } from "./db";
import { commitSession, getSession } from "~/sessions";
import { redirect } from "react-router";

type GoogleUserData = {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
};

export const googleHandler = async (request: Request, nextURL: string) => {
  const url = new URL(request.url);
  const { searchParams } = url;
  // new google login
  if (
    searchParams.has("auth") &&
    searchParams.has("code") &&
    searchParams.get("auth") === "google"
  ) {
    const next = searchParams.get("next") || nextURL || "/mis-cursos";
    const code = searchParams.get("code")!;
    const session = await createGoogleSession(code, request);
    throw redirect(next, {
      headers: {
        "Set-Cookie": await commitSession(session!),
      },
    });
  }
};

const location =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://www.fixtergeek.com";
// step 1
export const getGoogleURL = () => {
  const url = new URL("https://accounts.google.com/o/oauth2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID as string);
  url.searchParams.set("redirect_uri", location + "/login?auth=google");
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
  );
  return url.toString();
};

const validateGoogleCode = (code: string) => {
  const url = new URL("https://oauth2.googleapis.com/token");
  url.searchParams.set("code", code);
  url.searchParams.set("grant_type", "authorization_code");
  url.searchParams.set("redirect_uri", location + "/login?auth=google");
  const options: RequestInit = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Basic ${btoa(
        process.env.GOOGLE_CLIENT_ID + ":" + process.env.GOOGLE_SECRET
      )}`,
    },
  };
  return fetch(url.toString(), options)
    .then((r) => r.json())
    .catch((e) => console.error(e));
};

export const createGoogleSession = async (code: string, request: Request) => {
  // @todo: save refresh_t
  const { error, access_token, refresh_token } = await validateGoogleCode(code);

  if (!access_token || error) {
    throw new Error("There is a problem with google code::" + error);
  }

  const userData = (await getGoogleExtraData(access_token)) as GoogleUserData;
  const partial = {
    username: userData.email,
    displayName: userData.name,
    confirmed: userData.verified_email,
    email: userData.email,
    photoURL: userData.picture,
  } as Partial<User>;

  await db.user.upsert({
    where: {
      email: partial.email,
    },
    create: partial,
    update: partial,
  }); // @todo: revisit to send welcome email
  // sendWelcome(email)

  const session = await getSession(request.headers.get("Cookie"));
  session.set("email", partial.email);
  return session;
};

const getGoogleExtraData = (access_token: string): Promise<unknown> => {
  const url = new URL("https://www.googleapis.com/oauth2/v2/userinfo");
  const options: RequestInit = {
    headers: { Authorization: `Bearer ${access_token}` },
  };
  return fetch(url.toString(), options)
    .then((r) => r.json())
    .catch((e) => console.error(e));
};
