import type { FormEvent } from "react";
import { googleLogin } from "../lib/firebase";
import { useFetcher, useSearchParams } from "react-router";
import { useToast } from "./useToaster";

export const useGoogleLogin = () => {
  const fetcher = useFetcher();
  const { error } = useToast();

  const [searchParams] = useSearchParams();

  const googleLoginHandler = async (
    event: FormEvent<HTMLFormElement | HTMLButtonElement>
  ) => {
    event.preventDefault();
    const { user } = await googleLogin();
    if (!user.accessToken || !user.email) {
      return error({
        text: "Google no quiso darnos tu correo. 🙄 Intenta con magic-link",
      });
    }
    fetcher.submit(
      {
        intent: "google_login",
        data: JSON.stringify(user),
        next: searchParams.get("next"),
      },
      { method: "POST", action: "/api/user" }
    );
  };

  return { googleLoginHandler, isLoading: fetcher.state !== "idle" };
};
