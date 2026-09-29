import type { ReactNode } from "react";

// Los 4 roles de Ghosty Factory con su carita (copiada de ghosty-studio/public/avatars)
// y el color que trae cada una.
const ROLES = {
  plan: "#edc75a",
  build: "#7fbe60",
  check: "#e4ae8e",
  eval: "#9d8cf0",
} as const;

export type Role = keyof typeof ROLES;

export const RoleChip = ({ role, size = "md" }: { role: Role; size?: "sm" | "md" }) => {
  const color = ROLES[role];
  const small = size === "sm";
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border align-middle font-semibold ${
        small ? "py-px pl-px pr-1.5 text-[11px]" : "py-0.5 pl-0.5 pr-2 text-[0.92em]"
      }`}
      style={{ background: `${color}1f`, borderColor: `${color}55`, color }}
    >
      <img src={`/software-factory/factory-${role}.svg`} alt="" aria-hidden className={small ? "h-3.5 w-3.5" : "h-[1.35em] w-[1.35em]"} />
      @{role}
    </span>
  );
};

// Cambia cada «@plan», «@build», «@check» o «@eval» de un texto por su chip
export const withRoles = (text: string): ReactNode =>
  text.split(/(@(?:plan|build|check|eval)\b)/).map((part, i) =>
    part.startsWith("@") && part.slice(1) in ROLES ? <RoleChip key={i} role={part.slice(1) as Role} /> : part,
  );
