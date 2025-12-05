import { useGoogleLogin } from "~/hooks/useGoogleLogin";
import { FaFacebook, FaYoutube } from "react-icons/fa";
import { FaSquareXTwitter, FaUserAstronaut } from "react-icons/fa6";
import { motion, stagger, useAnimate } from "motion/react";
import { Link, useLocation, useNavigate, type To } from "react-router";
import { AiFillInstagram } from "react-icons/ai";
import { BsLinkedin } from "react-icons/bs";
import { useEffect, useState } from "react";
import type { User } from "~/types/models";
import { Youtube } from "../icons/Youtube";
import { useSelf } from "~/hooks/useSelf";
import { cn } from "~/utils/cn";
import { Triangle } from "./Triangle";
import { FiLogOut } from "react-icons/fi";
import { IoIosVideocam } from "react-icons/io";

const navigation = [
  { name: "Cursos", link: "/cursos" },
  { name: "Blog", link: "/blog" },
  { name: "Claude Code", link: "/claude" },
  { name: "Agentes IA", link: "/agentes" },
  { name: "Taller sabatino | AI-SDK", link: "/ai-sdk" },
];

export const SquigglyUnderline = () => {
  const [selectedLink, setSelectedLink] = useState("Home");
  const [isHover, setIsHover] = useState<number | null>(null);
  const location = useLocation();
  return (
    <div className="flex gap-3 md:gap-6 lg:gap-8">
      {navigation.map((item, i) => {
        const isCurrent = isHover === i;
        const isCurrentRoute = location.pathname.includes(item.link);
        return (
          <Link
            key={item.name}
            to={item.link}
            className={`relative text-sm leading-6 no-underline ${
              isCurrent || isCurrentRoute
                ? "font-semibold text-white"
                : "text-white"
            }`}
            onClick={() => setSelectedLink(item.name)}
            onMouseEnter={() => {
              setIsHover(i);
            }}
            onMouseLeave={() => {
              setIsHover(null);
            }}
          >
            {item.name}
            {isCurrent || isCurrentRoute ? (
              <motion.div className="absolute -bottom-[1px] left-0 right-0 h-[1px]">
                <svg width="37" height="8" viewBox="0 0 37 8" fill="none">
                  <motion.path
                    d="M1 5.39971C7.48565 -1.08593 6.44837 -0.12827 8.33643 6.47992C8.34809 6.52075 11.6019 2.72875 12.3422 2.33912C13.8991 1.5197 16.6594 2.96924 18.3734 2.96924C21.665 2.96924 23.1972 1.69759 26.745 2.78921C29.7551 3.71539 32.6954 3.7794 35.8368 3.7794"
                    stroke="#51B4A0"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{
                      strokeDasharray: 84.20591735839844,
                      strokeDashoffset: 84.20591735839844,
                    }}
                    animate={{
                      strokeDashoffset: 0,
                    }}
                    transition={{
                      duration: 1,
                    }}
                  />
                </svg>
              </motion.div>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
};

export const NavBar = ({ user }: { user?: User }) => {
  const [scope, animate] = useAnimate();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    if (isOpen) {
      setIsOpen(false);
      animate("#drawer", { y: "-100%" }, { duration: 1, type: "tween" });
    } else {
      setIsOpen(true);
      animate("#drawer", { y: "0%" }, { duration: 0.5, type: "tween" });
    }
  };

  return (
    <section
      ref={scope}
      className=" w-full px-6 md:px-[5%] xl:px-0 fixed backdrop-blur z-[200]"
    >
      <nav className="flex relative z-[210] max-w-7xl mx-auto py-2 md:py-4 items-center justify-between ">
        <Link to="/">
          <img className="h-7" src="/logo.png" alt="logo" />
        </Link>
        <div className="md:flex items-center gap-8 hidden ">
          <a
            href="https://www.youtube.com/@fixtergeek8057"
            rel="noreferrer"
            target="_blank"
            className="place-content-center hover:scale-105 transition-all sm:grid text-white hidden"
          >
            <Youtube />
          </a>
          <SquigglyUnderline />
          {user?.email ? (
            <UserMenu user={user} />
          ) : (
            <Link to="/login">
              <button className="py-2 px-4 text-base rounded-full text-white font-normal bg-brand-900/60">
                Iniciar sesión
              </button>{" "}
            </Link>
          )}
        </div>

        <Burger onClick={toggleMenu} isOpen={isOpen} />
      </nav>
      <MobileMenu user={user} isOpen={isOpen} toggleMenu={toggleMenu} />
    </section>
  );
};
// @todo: improve animation
const UserMenu = ({ user }: { user: Partial<User> }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [scope, animate] = useAnimate();

  const toggleMenu = async () => {
    setIsOpen((o) => !o);
  };

  useEffect(() => {
    if (isOpen) {
      animate(
        scope.current,
        { filter: "blur(0px)", y: 0, opacity: 1, pointerEvents: "inherit" },
        {
          type: "spring",
          bounce: 0.7,
        }
      );
      animate(
        "button",
        { x: 0, opacity: 1, filter: "blur(0px)" },
        { delay: stagger(0.2) }
      );
    } else {
      animate("button", { x: -10, opacity: 0, filter: "blur(4px)" });
      animate(
        scope.current,
        { opacity: 0, filter: "blur(4px)", y: -10, pointerEvents: "none" },
        { type: "spring", bounce: 0, duration: 0.25 }
      );
    }
  }, [isOpen]);

  const handleNavigation = (path: To) => {
    toggleMenu();
    navigate(path);
  };

  return (
    <section>
      <Avatar onClick={toggleMenu} user={user} />
      <aside
        ref={scope}
        className={cn(
          "opacity-0",
          "bg-background",
          "border border-brand-100/10",
          "grid place-items-start rounded-xl shadow-md",
          "absolute w-[200px] -right-20 top-[95%]"
        )}
      >
        <Triangle className="border-b-brand-500" />
        <button
          onClick={() => handleNavigation("/perfil")}
          className="flex gap-3 items-center text-white hover:bg-brand-100/5 w-full p-4 rounded-xl"
        >
          <span>
            <FaUserAstronaut />
          </span>
          <span>Perfil</span>
        </button>
        <button
          onClick={() => handleNavigation("/mis-cursos")}
          className="flex gap-3 items-center text-white hover:bg-brand-100/5 w-full p-4 rounded-xl"
        >
          <span>
            <IoIosVideocam />
          </span>
          <span>Mis cursos</span>
        </button>
        <Link
          reloadDocument
          to="/logout"
          onClick={() => handleNavigation("/api/user?signout=1")}
          className="flex gap-3 items-center text-white hover:bg-brand-100/5 w-full p-4 rounded-xl"
        >
          <span>
            <FiLogOut />
          </span>
          <span>Cerrar sesión</span>
        </Link>
      </aside>
    </section>
  );
};

export const Avatar = ({
  user,
  onClick,
}: {
  onClick?: () => void;
  user: Partial<User>;
}) => {
  return (
    <button onClick={onClick} className="w-10 hover:scale-105 active:scale-100">
      <img
        onError={({ currentTarget }) => {
          currentTarget.onerror = undefined;
          currentTarget.src = "/avatar-default.png";
        }}
        src={user.photoURL || `/api/file?storageKey=${user.email}`}
        alt="avatar"
        className="rounded-full"
      />
    </button>
  );
};

const MobileMenu = ({
  toggleMenu,
  isOpen,
  user,
}: {
  user?: Partial<User>;
  toggleMenu: () => void;
  isOpen: boolean;
}) => {
  const { googleLoginHandler } = useGoogleLogin();
  const navigate = useNavigate();
  const handleNavigation = (path: To) => {
    toggleMenu();
    navigate(path);
  };
  return (
    <motion.div
      id="drawer"
      style={{
        y: "-120%",
      }}
      className="bg-bloob bg-cover px-6 inset-0 w-full h-screen absolute md:hidden flex items-center justify-center"
    >
      <div className="text-center flex flex-col  !text-white -mt-10 md: ">
        <NavItem
          onClick={toggleMenu}
          as="Link"
          to="/cursos"
          index={1}
          isOpen={isOpen}
          title="Cursos"
        />
        <NavItem
          onClick={toggleMenu}
          as="Link"
          to="/blog"
          index={2}
          isOpen={isOpen}
          title="Blog"
        />
        <NavItem
          onClick={toggleMenu}
          as="Link"
          to="/claude"
          index={3}
          isOpen={isOpen}
          title="Claude Code"
        />
        <NavItem
          onClick={toggleMenu}
          as="Link"
          to="/agentes"
          index={4}
          isOpen={isOpen}
          title="Agentes IA"
        />
        <NavItem
          onClick={toggleMenu}
          as="Link"
          to="/ai-sdk"
          index={5}
          isOpen={isOpen}
          title="Taller sabatino | AI-SDK"
        />
        {user?.email ? (
          <>
            <NavItem
              as="Link"
              to="/mis-cursos"
              index={6}
              isOpen={isOpen}
              title="Mis cursos"
            />
            <NavItem
              // onClick={() => handleNavigation("/api/user?signout=1")}
              to="/logout"
              reloadDocument
              as="Link"
              index={7}
              isOpen={isOpen}
              title="Cerrar sesión"
            />
          </>
        ) : (
          <NavItem
            onClick={toggleMenu}
            as="Link"
            to="/login"
            index={6}
            isOpen={isOpen}
            title="Iniciar sesión"
            className="text-3xl my-4 font-light "
          />
        )}
        <div className="flex justify-center items-center gap-6 mt-10">
          <a
            rel="noreferrer"
            href="https://www.facebook.com/fixterme"
            target="_blank"
          >
            <FaFacebook className="text-white text-4xl hover:opacity-40" />
          </a>
          <a
            rel="noreferrer"
            href="https://twitter.com/FixterGeek"
            target="_blank"
          >
            <FaSquareXTwitter className="text-white text-4xl hover:opacity-40" />
          </a>
          <a
            rel="noreferrer"
            href="https://www.linkedin.com/company/fixtergeek/"
            target="_blank"
          >
            <BsLinkedin className="text-white text-3xl hover:opacity-40" />
          </a>
          <a
            rel="noreferrer"
            href="https://www.instagram.com/fixtergeek/"
            target="_blank"
          >
            <AiFillInstagram className="text-white text-4xl hover:opacity-40" />
          </a>
          <a
            rel="noreferrer"
            href="https://www.youtube.com/channel/UC2cNZUym14-K-yGgOEAFh6g"
            target="_blank"
          >
            <FaYoutube className="text-white text-4xl hover:opacity-40" />
          </a>
        </div>
      </div>
    </motion.div>
  );
};

const Burger = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => {
  const [scope, animate] = useAnimate();
  useEffect(() => {
    if (isOpen) {
      animate("#top", { rotateZ: -135, y: 6 });
      animate("#bottom", { rotateZ: 135, y: -5 });
    } else {
      animate("#top", { rotateZ: 0, y: 0 });
      animate("#bottom", { rotateZ: 0, y: 0 });
    }
  }, [isOpen]);
  return (
    <button
      onClick={onClick}
      ref={scope}
      className="flex md:hidden flex-col gap-2 relative"
    >
      <div
        id="top"
        className={cn(" w-8 h-[3px] bg-gray-300 rounded-full", {
          "bg-white": isOpen,
        })}
      ></div>
      <div
        id="bottom"
        className={cn("w-8 h-[3px] bg-gray-300 rounded-full", {
          "bg-white": isOpen,
        })}
      ></div>
    </button>
  );
};

const NavItem = ({
  title,
  isOpen,
  index,
  reloadDocument,
  className,
  onClick,
  as = "button",
  to = "",
}: {
  title: string;
  isOpen?: boolean;
  index: number;
  reloadDocument?: boolean;
  className?: string;
  onClick?: () => void;
  as?: "button" | "Link";
  to?: string;
}) => {
  const [scope, animate] = useAnimate();
  useEffect(() => {
    if (isOpen) {
      animate(
        scope.current,
        { y: 0, opacity: 1, filter: "blur(0px)" },
        { delay: 0.25 * index, duration: 0.3 }
      );
    } else {
      animate(scope.current, { y: 20, opacity: 0, filter: "blur(9px)" });
    }
  }, [isOpen]);

  const Element = as === "Link" ? Link : "button";

  return (
    <Element
      reloadDocument={reloadDocument}
      to={to}
      ref={scope}
      style={{
        opacity: 0,
        transform: "translateY(20px)",
        filter: "blur(9px)",
      }}
      className={cn("text-3xl my-4 font-light ", className)}
      onClick={onClick}
    >
      {title}
    </Element>
  );
};
