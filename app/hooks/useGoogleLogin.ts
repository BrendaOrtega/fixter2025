import type { FormEvent } from "react";
import { useFetcher } from "react-router";

export const useGoogleLogin = () => {
  const fetcher = useFetcher();
  const clientHandler = async (
    event: FormEvent<HTMLFormElement | HTMLButtonElement>
  ) => {
    event.preventDefault();

    fetcher.submit(
      {
        intent: "google_login_redirect",
      },
      { method: "POST", action: "/api/user" }
    );
  };

  return { clientHandler, isLoading: fetcher.state !== "idle" };
};
