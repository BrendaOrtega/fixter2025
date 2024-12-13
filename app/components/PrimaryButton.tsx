import { Link } from "react-router";

import { cn } from "../lib/utils";

export const PrimaryButton = ({
  title,
  to,
  as,
  variant,
  ...props
}: {
  variant?: "fill" | "ghost";
  as?: "Link";
  title?: string;
  to?: string;
  [x: string]: unknown;
}) => {
  const Element = as === "Link" ? Link : "button";
  return (
    <Element
      to={to || ""}
      className={cn(
        "h-12 rounded-full border-[2px] border-brand-500 text-brand-500 px-5 flex items-center",
        {
          "bg-brand-500 text-brand-900": variant === "fill",
          "bg-brand-900 border-brand-900 text-white": variant === "ghost",
        }
      )}
      {...props}
    >
      {title ? title : "Explorar cursos"}
    </Element>
  );
};
