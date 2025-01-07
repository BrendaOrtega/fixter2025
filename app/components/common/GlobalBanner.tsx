import type { ReactNode } from "react";
import { cn } from "~/utils/cn";
import { PrimaryButton } from "./PrimaryButton";

export const GlobalBanner = ({
  children,
  className,
  variant,
}: {
  children?: ReactNode;
  className?: string;
  variant?: string;
}) => {
  return (
    <div className="fixed bottom-0 w-full z-[999] ">
      <div
        className={cn(
          "bg-gradient-to-r  from-brand-500 to-brand-800  h-[80px] rounded-t-xl px-20  items-center justify-between hidden md:flex ",
          {
            "bg-bannerHome ": variant === "home",
          }
        )}
      >
        <div className="flex items-center justify-start">
          <img
            className="h-[72px] animate-rotate"
            src="https://i.imgur.com/aThPBNV.png"
          />
          <div className="ml-8">
            <h2 className="font-bold text-xl">
              Compra el curso de Animaciones con React + Motion a precio
              especial 🔥🔥🔥
            </h2>
            <p>
              Aprevecha el{" "}
              <span className="font-bold text-brand-800">
                30% y 40% de descuento
              </span>{" "}
              durante el mes de Enero 🎟️
            </p>{" "}
          </div>{" "}
        </div>
        <PrimaryButton variant="fill" className="bg-white border-none">
          <span>Ver curso</span>
        </PrimaryButton>
      </div>{" "}
    </div>
  );
};
