import { cn } from "~/utils/cn";

export const SelectInput = ({
  options,
  label,
  className,
  defaultValue,
  name,
  value,
  onChange,
}: {
  name: string;
  defaultValue?: string;
  className?: string;
  label?: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) => {
  return (
    <label className={cn("grid gap-2 mb-2", className)}>
      <span>{label}</span>
      <select
        name={name}
        defaultValue={!value && !onChange ? (defaultValue || "") : undefined}
        value={value || ""}
        onChange={onChange}
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
