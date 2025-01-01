import { cn } from "~/utils/cn";

export const Triangle = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "w-0 h-0",
        "border-8",
        "border-t-[0] ",
        "border-b-brand-700",
        "absolute top-[-8px] left-[45%]",
        "border-l-transparent border-r-transparent",
        className
      )}
    />
  );
};
