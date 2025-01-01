import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useFetcher } from "react-router";
import { useToast } from "~/hooks/useToaster";

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

export default function useRecaptcha(onSubmit: EV) {
  // Estados 💾
  const siteKey = "6Lex6agqAAAAAIUn17dFeTIxrMQrJn2qMAjHm-dL",
    options = { action: "submit" };

  const [isReady, setIsReady] = useState(false);
  const fetcher = useFetcher<{ success: boolean }>();
  const { error } = useToast();
  const eventRef = useRef<EV>(null);

  // Carga 🔋 1.
  useEffect(() => {
    if (!siteKey && typeof siteKey !== "string") return setIsReady(true);
    // noop ^for testing (su no hay key no rompe)
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

  // Se ejecuta al usuario accionar 👨🏻‍💻
  const execute = useCallback(async () => {
    if (!siteKey) return;

    if (!isReady) throw new Error("Recaptcha no cargó");

    return await window.grecaptcha.execute(siteKey, options);
  }, [siteKey, options, isReady]);

  // proxy para el form
  type EV = FormEvent<HTMLFormElement> | SubmitEvent;
  const handleSubmit = async (event: EV) => {
    event.preventDefault();
    const token = (await execute()) as string;
    fetcher.submit(
      { intent: "recaptcha_verify_token", token },
      { method: "POST", action: "/api/user" }
    );
    eventRef.current = event;
  };

  useEffect(() => {
    if (!fetcher.data) return;

    if (fetcher.data.success) {
      onSubmit(eventRef.current);
    } else {
      error({
        text: "Lo sentimos, creemos que eres un robot. 🤖 Intenta de nuevo.",
      });
    }
  }, [fetcher]);

  return {
    handleSubmit,
    isReady,
  };
}
