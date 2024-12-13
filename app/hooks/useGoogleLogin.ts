import type { FormEvent } from "react";
import { googleLogin } from "../lib/firebase";
import { useFetcher } from "react-router";

export const useGoogleLogin = () => {
  const fetcher = useFetcher();
  const googleLoginHandler = async (
    event: FormEvent<HTMLFormElement | HTMLButtonElement>
  ) => {
    console.log("login");
    event.preventDefault();
    const { user } = await googleLogin();
    if (!user.accessToken) return;
    fetcher.submit(
      { intent: "google_login", data: JSON.stringify(user) },
      { method: "POST", action: "/api/user" }
    );
  };
  return { googleLoginHandler };
};
