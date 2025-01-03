import { Link } from "react-router";
import type { ReactNode } from "react";
import Spinner from "./Spinner";
import { cn } from "~/utils/cn";

export const PrimaryButton = ({
  title,
  to,
  as,
  variant,
  children,
  isLoading,
  isDisabled,

  className,
  ...props
}: {
  isDisabled?: boolean;
  className?: string;
  isLoading?: boolean;
  children?: ReactNode;
  variant?: "fill" | "ghost";
  as?: "Link";
  title?: string;
  to?: string;
  [x: string]: unknown;
}) => {
  const Element = as === "Link" ? Link : "button";
  const content = isLoading ? (
    <Spinner />
  ) : children ? (
    children
  ) : title ? (
    title
  ) : (
    "Explorar cursos"
  );
  return (
    <Element
      disabled={isDisabled}
      to={to || ""}
      className={cn(
        "h-12 rounded-full border-[2px] hover:-translate-y-1 transition-all border-brand-500 text-center text-brand-500 px-4 inline-grid place-content-center items-center",
        {
          "bg-brand-100 text-gray-400 pointer-events-none": isDisabled,
          "bg-brand-500 text-brand-900": variant === "fill",
          "bg-brand-900 border-brand-900 text-white": variant === "ghost",
        },
        className
      )}
      {...props}
    >
      {content}
    </Element>
  );
};
