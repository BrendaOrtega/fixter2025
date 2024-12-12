import { createCookieSessionStorage } from "react-router";

export const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    // @todo improve, upgrade
    cookie: {
      name: "__session",
      expires: new Date("2050-12-12"),
      path: "/",
      sameSite: "lax",
      secrets: ["blissmo"],
    },
  });
