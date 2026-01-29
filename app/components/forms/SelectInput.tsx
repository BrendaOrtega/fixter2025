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
  const isControlled = value !== undefined && onChange !== undefined;

  return (
    <label className={cn("grid gap-2 mb-2", className)}>
      <span>{label}</span>
      <select
        name={name}
        {...(isControlled
          ? { value, onChange }
          : { defaultValue: defaultValue ?? "" }
        )}
        className="rounded-lg text-black"
      >
        <option value="">Selecciona una opción</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
};
