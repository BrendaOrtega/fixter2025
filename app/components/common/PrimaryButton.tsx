import { Link } from "react-router";
import React, { type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export const PrimaryButton = ({
  className,
  children,
  isDisabled,
  isLoading,
  as,
  to = "",
  onClick,
  ...props
}: {
  onClick?: () => void;
  as?: "Link";
  to?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  className?: string;
  children: ReactNode;
  [x: string]: any;
}) => {
  const Element = as === "Link" ? Link : "button";
  return (
    <Element
      onClick={onClick}
      to={to}
      disabled={isDisabled}
      {...props}
      className={twMerge(
        "rounded-full enabled:hover:px-8 transition-all bg-fish text-base md:text-lg text-white h-12 md:h-14 px-6 flex gap-2 items-center justify-center font-light",
        "disabled:bg-slate-300 disabled:pointer-events-none",
        className
      )}
    >
      {!isLoading && children}
      {isLoading && (
        <div className="w-6 h-6 rounded-full animate-spin border-4 border-t-indigo-500" />
      )}
    </Element>
  );
};
