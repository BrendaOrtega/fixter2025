import type { ReactNode } from "react";

/** Interruptor (sin casilla): el valor viaja en un input oculto. */
export function Switch({
  name,
  on,
  disabled,
  onChange,
  children,
}: {
  name: string;
  on: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="flex items-center gap-3 text-left text-sm disabled:cursor-not-allowed"
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-brand-500" : "bg-colorOutline"} ${disabled ? "opacity-60" : ""}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`}
        />
      </span>
      {children}
      {on && <input type="hidden" name={name} value="on" />}
    </button>
  );
}
