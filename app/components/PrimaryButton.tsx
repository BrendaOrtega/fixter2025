import { Link } from "react-router";

import { cn } from "../lib/utils";

export const PrimaryButton = ({
  title,
  to,
  type,
  as,
}: {
  as?: "Link";
  title?: string;
  to?: string;
  type?: string;
}) => {
  const Element = as === "Link" ? Link : "button";
  return (
    <Element
      to={to || ""}
      className={cn(
        "h-12 rounded-full border-[2px] border-brand-500 text-brand-500 px-5 flex items-center",
        {
          "bg-brand-500 text-brand-900": type === "fill",
          "bg-brand-900 border-brand-900 text-white": type === "ghost",
        }
      )}
    >
      {title ? title : "Explorar cursos"}
    </Element>
  );
};
