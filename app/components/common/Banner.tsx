import type { ReactNode } from "react";
import { cn } from "~/utils/cn";

export const Banner = ({
  children,
  className,
  variant,
}: {
  children: ReactNode;
  className?: string;
  variant?: string;
}) => {
  return (
    <div className="px-4 md:px-[5%] lg:px-0 max-w-7xl mx-auto">
      <div
        className={cn(
          "bg-bannerOne  bg-contain md:bg-cover bg-no-repeat  bg-right-bottom h-[300px] my-32 md:my-60 p-6 md:p-12 rounded-3xl border-[2px] border-brand-500",
          {
            "bg-bannerHome ": variant === "home",
          }
        )}
      >
        {children}
      </div>{" "}
    </div>
  );
};
