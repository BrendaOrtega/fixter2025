import { useRef, useState } from "react";
import { Form, useSearchParams } from "react-router";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import { PrimaryButton } from "~/components/common/PrimaryButton";

export default function Route() {
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const [searchParams] = useSearchParams();
  const success = searchParams.has("success");
  return (
    <>
      {success && <EmojiConfetti emojis={false} />}
      <article className="py-24 text-gray-300">
        <section className="max-w-xl flex justify-center flex-col items-center gap-8 mx-auto">
          <img src="/full-logo.svg" alt="robot" />
          <h1 className="text-5xl text-center">
            No te salgas del loop: Actualízate
          </h1>
          <p className="text-center text-2xl">
            <span> Unete a nuestra lista exclusiva para geeks.</span>{" "}
            <span>
              Así no te pierdes nada de los nuevo que se traen entre manos
              Brendi 👩🏻‍💻 y bliss. 🤓
            </span>
          </p>
        </section>
        {success ? (
          <div>
            <p className="max-w-xl mx-auto my-8 text-center">
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
          <Form
            method="POST"
            action="/api/user"
            className="flex justify-center mt-12 ring-4 ring-brand-700 rounded-full mx-auto w-max overflow-hidden"
          >
            <input
              ref={inputRef}
              type="email"
              required
              name="email"
              className="bg-transparent border-none focus:ring-0 "
            />
            <PrimaryButton
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 3000);
              }}
              isLoading={isLoading}
              name="intent"
              type="submit"
              value="suscription"
            >
              Unirme
            </PrimaryButton>
          </Form>
        )}
        {!success && (
          <p className="mx-auto max-w-xl text-center mt-3 text-xs text-brand-500">
            Puedes desuscribirte en cualquier momento. 😇
          </p>
        )}
      </article>
    </>
  );
}
