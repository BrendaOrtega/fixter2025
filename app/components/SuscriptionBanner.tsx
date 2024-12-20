import { useFetcher } from "react-router";
import { Banner } from "./common/Banner";
import { PrimaryButton } from "./common/PrimaryButton";

// Beautiful declarative form 🫦

export const SuscriptionBanner = () => {
  const fetcher = useFetcher();
  return (
    <Banner>
      <fetcher.Form
        className="w-full md:w-[60%]"
        method="POST"
        action="/api/user"
      >
        <h3 className="text-3xl md:text-3xl lg:text-4xl text-white font-bold mb-10 !leading-snug">
          Suscríbete a nuestro Newsletter y mantente al tanto de lo nuevo
        </h3>
        <div className="rounded-full overflow-hidden bg-brand-500/5 w-fit flex">
          <input
            required
            name="email"
            className="border-none bg-transparent placeholder:text-white/20 font-light"
            placeholder="tucorreo@gmail.com"
          />
          <PrimaryButton
            isLoading={fetcher.state !== "idle"}
            // isLoading={true}
            isDisabled={fetcher.state !== "idle"}
            name="intent"
            value="suscription"
            type="submit"
            variant="fill"
            title="Suscribirme"
          />
        </div>
      </fetcher.Form>
    </Banner>
  );
};
