import { Link, useLocation } from "react-router";
import { cn } from "~/utils/cn";

export const AdminNav = () => {
  const location = useLocation();
  
  const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/webinar", label: "Webinar" },
    { href: "/admin/cursos", label: "Cursos" },
    { href: "/admin/posts", label: "Posts" },
    { href: "/admin/talleres", label: "Talleres" },
    { href: "/admin/newsletter", label: "Newsletter" },
    { href: "/admin/analytics", label: "Analytics" },
  ];

  return (
    <nav className="bg-gray-900 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-4 overflow-x-auto py-3">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                location.pathname === link.href
                  ? "bg-brand-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};