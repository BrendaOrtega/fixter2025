import { Link } from "react-router";
import { Youtube } from "../icons/Youtube";
import type { ReactNode } from "react";
import { cn } from "~/lib/utils";
import { Discord } from "../icons/Discord";
import type { User } from "@prisma/client";

export const NavBar = ({ user }: { user?: Partial<User> }) => {
  return (
    <nav className="h-20 px-6 items-center fixed top-0 w-full">
      <section className="backdrop-blur-md max-w-4xl flex justify-between items-center h-full mx-auto">
        <NavLink to="/">
          <img className="h-10" src="/logo.svg" alt="logo" />
        </NavLink>
        <div className="flex text-white text-lg gap-6">
          <a
            href="https://www.youtube.com/@fixtergeek8057"
            rel="noreferrer"
            target="_blank"
            className="grid place-content-center hover:scale-105 transition-all"
          >
            <Youtube />
          </a>
          <a
            href="https://www.youtube.com/@fixtergeek8057"
            rel="noreferrer"
            target="_blank"
            className="place-content-center hover:scale-105 transition-all hidden md:grid"
          >
            <Discord />
          </a>
          <NavLink className="" to="/cursos">
            Cursos
          </NavLink>
          <NavLink className="md:block hidden" to="/blog">
            Blog
          </NavLink>
          <NavLink
            className="py-2 px-4 rounded-full bg-brand-900/60 font-normal "
            to="/login"
          >
            {user?.email ? "Tu perfil" : "Iniciar sesión"}
          </NavLink>
        </div>
      </section>
    </nav>
  );
};

const NavLink = ({
  children,
  to = "",
  className,
}: {
  children?: ReactNode;
  to: string;
  className?: string;
}) => {
  return (
    <Link
      className={cn(
        "grid place-content-center hover:scale-105 transition-all",
        className
      )}
      to={to}
    >
      {children}
    </Link>
  );
};
