import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useFetcher } from "react-router";
import { useToast } from "~/hooks/useToaster";
import type { action } from "~/routes/api/user";

declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      execute: (
        siteKey: string,
        options?: { action: string }
      ) => Promise<string>;
    };
  }
}

export type UseRecaptchaParams = {
  siteKey?: string;
  options?: { action: string };
};

export default function useRecaptcha(args?: UseRecaptchaParams) {
  const {
    siteKey = "6Lex6agqAAAAAIUn17dFeTIxrMQrJn2qMAjHm-dL",
    options = { action: "submit" },
  } = args || {};
  const [isReady, setIsReady] = useState(false);
  const fetcher = useFetcher<typeof action>();
  const { error } = useToast();

  useEffect(() => {
    if (!siteKey && typeof siteKey !== "string") return setIsReady(true);
    // noop ^for testing
    const scriptURL = new URL("https://www.google.com/recaptcha/api.js");
    scriptURL.searchParams.set("render", siteKey);

    const script = document.createElement("script");
    script.src = scriptURL.toString();
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.debug("recaptcha cargado");
      window.grecaptcha.ready(() => {
        setIsReady(true);
      });
    };
    document.head.appendChild(script);
    return () => {
      setIsReady(false);
      console.debug("recaptcha eliminado");
      document.head.removeChild(script);
    };
  }, [siteKey]);

  //user action score
  const execute = useCallback(async () => {
    if (!siteKey) return;

    if (!isReady) throw new Error("Recaptcha no cargó");

    return await window.grecaptcha.execute(siteKey, options);
  }, [siteKey, options, isReady]);

  type EV = FormEvent<HTMLFormElement>;
  const handleSubmit = (cb?: (arg0: EV) => void) => async (event: EV) => {
    event.preventDefault();
    const token = (await execute()) as string;
    await fetcher.submit(
      { intent: "recaptcha_verify_token", token },
      { method: "POST", action: "/api/user" }
    );
    const { success } = fetcher.data || {};
    if (!success) {
      error({ text: "Lo siento, creemos que eres un robot 🤖" });
      return;
    }
    cb?.(event);
  };

  return {
    handleSubmit,
    isReady,
  };
}
