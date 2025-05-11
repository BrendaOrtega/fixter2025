import { useEffect, useRef, useState } from "react";
import { useFetcher, useSearchParams } from "react-router";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import { PrimaryButton } from "~/components/common/PrimaryButton";
import useRecaptcha from "~/lib/useRecaptcha";
import getMetaTags from "~/utils/getMetaTags";

export const meta = () =>
  getMetaTags({
    title: "Suscripción",
    description: " No te salgas del loop: Actualízate ",
  });

export default function Route() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const success = searchParams.has("success");
  const fetcher = useFetcher();

  const onSubmit = (_: SubmitEvent) => {
    if (!inputRef.current) return;

    fetcher.submit(
      {
        intent: "suscription",
        email: inputRef.current.value,
      },
      { method: "POST", action: "/api/user" }
    );
  };

  const { handleSubmit } = useRecaptcha(onSubmit);

  // const errors = fetcher.data || {}; // errors.email.message
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (fetcher.data?.errors) {
      setErrors(fetcher.data.errors);
    }
  }, [fetcher]);

  const isLoading = fetcher.state !== "idle";

  return (
    <>
      {success && <EmojiConfetti emojis={false} />}
      <article className="py-24 ">
        <section className="max-w-xl flex justify-center flex-col items-center gap-8 mx-auto pt-28 px-4 md:px-[5%] xl:px-0">
          <img className="w-52" src="/full-logo.svg" alt="robot" />
          <h1 className="text-3xl md:text-5xl text-center text-white">
            No te salgas del loop: Actualízate
          </h1>
          <p className="text-center text-lg md:text-xl text-brand-100 font-light">
            <span>
              {" "}
              Estas a punto de ser parte de una lista exclusiva para geeks.
            </span>{" "}
            <span>
              Así no te perderás nada de todo lo nuevo que se traen entre manos:
              Brendi 👩🏻‍💻 y bliss. 🤓
            </span>
          </p>
        </section>
        {success ? (
          <div>
            <p className="max-w-xl mx-auto my-8 text-center text-brand-100 font-light">
              Te hemos enviado un email de confirmación, una vez que confirmes
              de recibido serás parte de la lista. 👍🏼
              <br />
              <a
                rel="noreferrer"
                target="_blank"
                href="https://gmail.com"
                className="text-xs underline text-brand-500"
              >
                {" "}
                Checa aquí tu Gmail
              </a>
            </p>
          </div>
        ) : (
          <fetcher.Form
            onSubmit={handleSubmit}
            className="flex justify-center mt-12 ring-4 ring-brand-700 rounded-full mx-auto w-max overflow-hidden"
          >
            <input
              ref={inputRef}
              type="email"
              required
              name="email"
              className="bg-transparent border-none focus:ring-0 text-gray-400"
            />
            <PrimaryButton isLoading={isLoading} type="submit">
              Unirme
            </PrimaryButton>
          </fetcher.Form>
        )}
        <>
          {errors.email && (
            <p className="text-red-500 text-md mt-2 text-center">
              Este email no es válido
            </p>
          )}
        </>
        {!success && (
          <p className="mx-auto max-w-xl text-center mt-3 text-xs text-brand-500">
            Puedes desuscribirte en cualquier momento. 😇
          </p>
        )}
      </article>
    </>
  );
}
