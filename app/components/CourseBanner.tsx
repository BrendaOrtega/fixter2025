import { PrimaryButton } from "./common/PrimaryButton";

export const CourseBanner = () => {
  return (
    <div className="px-8 md:px-[5%] lg:px-0 max-w-7xl mx-auto">
      <div className="p-6 md:p-12 rounded-3xl bg-animationsBannerMobile md:bg-animationsBanner bg-cover bg-right  h-[320px] my-60">
        <div className="w-full md:w-[60%]">
          <span className="text-brand-500 text-2xl font-light">
            ¡Nuevo curso!
          </span>
          <h3 className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl text-white mt-2 font-bold mb-6 leading-snug">
            Animaciones web con React + Motion 🧙🏻{" "}
          </h3>{" "}
          <a
            href="https://animaciones.fixtergeek.com/"
            target="_blank"
            title="curso animaciones"
          >
            <PrimaryButton variant="fill" title="Ver curso" />
          </a>
        </div>
      </div>{" "}
    </div>
  );
};
