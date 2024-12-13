import { Link } from "react-router";

import { cn } from "../lib/utils";

export const PrimaryButton = ({
  title,
  link,
  type,
}: {
  title?: string;
  link?: string;
  type?: string;
}) => {
  return (
    <Link to={link ? link : "/cursos"}>
      <button
        className={cn(
          "h-12 rounded-full border-[2px] border-brand-500 text-brand-500 px-5",
          {
            "bg-brand-500 text-brand-900": type === "fill",
            "bg-brand-900 border-brand-900 text-white": type === "ghost",
          }
        )}
      >
        {title ? title : "Explorar cursos"}
      </button>
    </Link>
  );
};
