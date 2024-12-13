import { Link } from "react-router";
import { Youtube } from "../icons/Youtube";
import type { ReactNode } from "react";
import { Discord } from "../icons/Discord";
import type { User } from "@prisma/client";
import { useGoogleLogin } from "~/hooks/useGoogleLogin";
import { cn } from "~/utils/cn";

export const NavBar = ({ user }: { user?: Partial<User> }) => {
  const { googleLoginHandler } = useGoogleLogin();
  return (
    <nav className="h-20 px-6 items-center fixed top-0 w-full backdrop-blur-md z-10">
      <section className=" max-w-7xl flex justify-between items-center h-full mx-auto">
        <NavLink to="/">
          <img className="h-10" src="/logo.svg" alt="logo" />
        </NavLink>
        <div className="flex text-white  gap-6">
          <a
            href="https://www.youtube.com/@fixtergeek8057"
            rel="noreferrer"
            target="_blank"
            className="place-content-center hover:scale-105 transition-all sm:grid hidden"
          >
            <Youtube />
          </a>
          {/* <a
            href="https://www.youtube.com/@fixtergeek8057"
            rel="noreferrer"
            target="_blank"
            className="place-content-center hover:scale-105 transition-all hidden md:grid"
          >
            <Discord />
          </a> */}
          <NavLink
            className={cn("hidden md:block", {
              "sm:block": !user?.email,
            })}
            to="/cursos"
          >
            Cursos
          </NavLink>
          <NavLink
            className={cn("hidden md:block", {
              "sm:block": user?.email,
            })}
            to="/blog"
          >
            Blog
          </NavLink>

          {user?.email ? (
            <NavLink
              className="py-2 px-4 rounded-full bg-brand-900/60 font-normal w-max"
              to="/mis-cursos"
            >
              Tus cursos
            </NavLink>
          ) : (
            <button
              className="py-2 px-4 text-base rounded-full bg-brand-900/60 font-normal "
              onClick={googleLoginHandler}
            >
              Inicia sesión
            </button>
          )}
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
        "grid text-base place-content-center hover:scale-105 transition-all",
        className
      )}
      to={to}
    >
      {children}
    </Link>
  );
};
