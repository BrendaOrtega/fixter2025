import { Link } from "react-router";

interface CoachNavProps {
  active: "session" | "history" | "stories";
}

const tabs = [
  { key: "session", label: "Sesión", to: "/coach" },
  { key: "history", label: "Historial", to: "/coach/history" },
  { key: "stories", label: "Stories", to: "/coach/stories" },
] as const;

export function CoachNav({ active }: CoachNavProps) {
  return (
    <nav className="border-b border-zinc-800/60 bg-zinc-950 sticky top-0 z-20">
      <div className="max-w-2xl mx-auto px-6 flex items-center gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            to={tab.to}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              active === tab.key
                ? "text-[#CA9B77] border-[#CA9B77]"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
