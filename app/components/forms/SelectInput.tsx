import { cn } from "~/utils/cn";

export const SelectInput = ({
  options,
  label,
  className,
  defaultValue,
  name,
}: {
  name: string;
  defaultValue?: string;
  className?: string;
  label?: string;
  options: { value: string; label: string }[];
}) => {
  return (
    <label className={cn("grid gap-2 mb-2", className)}>
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="rounded-lg text-black"
      >
        <option value="">Selecciona un autor</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
};
