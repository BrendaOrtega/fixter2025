import { Form, useFetcher } from "react-router";
import { Banner } from "./common/Banner";
import { PrimaryButton } from "./common/PrimaryButton";
import useRecaptcha from "~/lib/useRecaptcha";
import { useRef } from "react";
import { useBotTrap } from "~/hooks/useBotTrap";

// Beautiful declarative form 🫦

export const SuscriptionBanner = () => {
  const fetcher = useFetcher();
  const inputRef = useRef<HTMLInputElement>(null);
  const { trap, fields } = useBotTrap();

  const onSubmit = () => {
    if (!inputRef.current?.value) return; // guard

    fetcher.submit(
      {
        email: inputRef.current.value,
        intent: "suscription",
        ...fields(),
      },
      {
        method: "POST",
        action: "/api/user",
      }
    );
  };

  const { handleSubmit } = useRecaptcha(onSubmit);

  const isLoading = fetcher.state !== "idle";

  return (
    <Banner>
      <Form onSubmit={handleSubmit} className="w-full md:w-[60%]">
        {trap}
        <h3 className="text-[28px] md:text-3xl lg:text-4xl text-white font-bold mb-10 !leading-snug">
          Suscríbete a nuestro Newsletter y mantente al tanto de lo nuevo
        </h3>
        <div className="rounded-full overflow-hidden bg-brand-500/5 w-fit flex">
          <input
            ref={inputRef}
            required
            name="email"
            className="border-none !w-[60%] md:w-auto bg-transparent placeholder:text-white/20 font-light"
            placeholder="tucorreo@gmail.com"
          />
          <PrimaryButton
            isLoading={isLoading}
            isDisabled={isLoading}
            type="submit"
            variant="fill"
            title="Suscribirme"
          />
        </div>
      </Form>
    </Banner>
  );
};
