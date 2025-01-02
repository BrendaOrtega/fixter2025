import { PrimaryButton } from "./common/PrimaryButton";

export const CourseBanner = () => {
  return (
    <div className="px-8 md:px-[5%] xl:px-0 max-w-3xl mx-auto">
      <div className="p-6 md:p-8 xl:p-12 rounded-3xl bg-animationsBannerMobile md:bg-animationsBanner bg-cover bg-right  h-[280px] my-16">
        <div className="w-full md:w-[60%]">
          <span className="text-brand-500 text-2xl font-semibold">
            ¡Nuevo curso!
          </span>
          <h3 className="text-2xl md:text-3xl  xl:text-4xl text-white mt-2 font-bold mb-6 leading-snug">
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
