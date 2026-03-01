import { Link, useLocation } from "react-router";
import { cn } from "~/utils/cn";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/libros", label: "Libros" },
  { href: "/admin/cursos", label: "Cursos" },
  { href: "/admin/ratings", label: "Ratings" },
  { href: "/admin/sequences", label: "Sequences" },
  { href: "/admin/magnetos", label: "Magnetos" },
  { href: "/admin/webinar", label: "Webinar" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/newsletter", label: "Newsletter" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/backups", label: "Backups" },
  { href: "/admin/404s", label: "404s" },
  { href: "/admin/mentoria", label: "MentorIA" },
];

export const AdminNav = () => {
  const location = useLocation();

  return (
    <aside className="fixed top-0 left-0 h-screen w-48 bg-gray-900 border-r border-gray-800 flex flex-col z-30">
      <div className="px-4 py-4 border-b border-gray-800">
        <Link to="/admin" className="text-sm font-bold text-white tracking-wide">
          Admin
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-0.5">
        {links.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              location.pathname === link.href
                ? "bg-purple-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
};
