// import { Link } from "react-router";
// import { Youtube } from "../icons/Youtube";
// import type { ReactNode } from "react";
// import { Discord } from "../icons/Discord";
// import type { User } from "@prisma/client";
// import { useGoogleLogin } from "~/hooks/useGoogleLogin";
// import { cn } from "~/utils/cn";

// export const NavBar = ({ user }: { user?: Partial<User> }) => {
//   const { googleLoginHandler } = useGoogleLogin();
//   return (
//     <nav className="h-20 px-6 items-center fixed top-0 w-full backdrop-blur-md z-10">
//       <section className=" max-w-7xl flex justify-between items-center h-full mx-auto">
//         <NavLink to="/">
//           <img className="h-10" src="/logo.svg" alt="logo" />
//         </NavLink>
//         <div className="flex text-white  gap-6">
//           <a
//             href="https://www.youtube.com/@fixtergeek8057"
//             rel="noreferrer"
//             target="_blank"
//             className="place-content-center hover:scale-105 transition-all sm:grid hidden"
//           >
//             <Youtube />
//           </a>
//           {/* <a
//             href="https://www.youtube.com/@fixtergeek8057"
//             rel="noreferrer"
//             target="_blank"
//             className="place-content-center hover:scale-105 transition-all hidden md:grid"
//           >
//             <Discord />
//           </a> */}
//           <NavLink
//             className={cn("hidden md:block", {
//               "sm:block": !user?.email,
//             })}
//             to="/cursos"
//           >
//             Cursos
//           </NavLink>
//           <NavLink
//             className={cn("hidden md:block", {
//               "sm:block": user?.email,
//             })}
//             to="/blog"
//           >
//             Blog
//           </NavLink>

//           {user?.email ? (
//             <NavLink
//               className="py-2 px-4 rounded-full bg-brand-900/60 font-normal w-max"
//               to="/mis-cursos"
//             >
//               Tus cursos
//             </NavLink>
//           ) : (
//             <button
//               className="py-2 px-4 text-base rounded-full bg-brand-900/60 font-normal "
//               onClick={googleLoginHandler}
//             >
//               Inicia sesión
//             </button>
//           )}
//         </div>
//       </section>
//     </nav>
//   );
// };

// const NavLink = ({
//   children,
//   to = "",
//   className,
// }: {
//   children?: ReactNode;
//   to: string;
//   className?: string;
// }) => {
//   return (
//     <Link
//       className={cn(
//         "grid text-base place-content-center hover:scale-105 transition-all",
//         className
//       )}
//       to={to}
//     >
//       {children}
//     </Link>
//   );
// };

import { useEffect, useState } from "react";
import { motion, useAnimate, useMotionValue, useSpring } from "motion/react";
import { Link, NavLink, useLocation, useParams } from "react-router";
import { motionValue } from "motion";
import { Youtube } from "../icons/Youtube";
import { useGoogleLogin } from "~/hooks/useGoogleLogin";
import type { User } from "@prisma/client";
import { FaFacebook, FaYoutube } from "react-icons/fa";
import { FaSquareXTwitter } from "react-icons/fa6";
import { BsLinkedin } from "react-icons/bs";
import { AiFillInstagram } from "react-icons/ai";
import { cn } from "~/utils/cn";

const navigation = [
  { name: "Cursos", link: "/cursos" },
  { name: "Blog", link: "/blog" },
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

export const NavBar = ({ user }: { user?: Partial<User> }) => {
  const { googleLoginHandler } = useGoogleLogin();
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

  const [scope, animate] = useAnimate();

  return (
    <section
      ref={scope}
      className=" w-full px-6 md:px-[12%] lg:px-[5%] xl:px-0  fixed backdrop-blur  z-[100]"
    >
      <nav className="flex relative z-[120] max-w-7xl mx-auto py-2 md:py-4 items-center justify-between ">
        <Link to="/">
          <img className="h-10" src="/logo.svg" alt="logo" />
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
            <NavLink
              className="py-2 px-4 rounded-full text-white font-normal w-max bg-brand-900/60"
              to="/mis-cursos"
            >
              Tus cursos
            </NavLink>
          ) : (
            <button
              className="py-2 px-4 text-base rounded-full text-white font-normal bg-brand-900/60"
              onClick={googleLoginHandler}
            >
              Inicia sesión
            </button>
          )}
        </div>

        <Burger onClick={toggleMenu} isOpen={isOpen} />
      </nav>
      <motion.div
        id="drawer"
        style={{
          y: "-100%",
        }}
        className="bg-bloob bg-cover px-6 inset-0 w-full h-screen absolute "
      >
        <div className="text-center mt-48 !text-white ">
          <NavItem
            onClick={toggleMenu}
            link="/cursos"
            index={1}
            isOpen={isOpen}
            title="Cursos"
          />
          <NavItem
            onClick={toggleMenu}
            link="/blog"
            index={2}
            isOpen={isOpen}
            title="Blog"
          />
          {user?.email ? (
            <NavItem
              link="/mis-cursos"
              index={3}
              isOpen={isOpen}
              title="Mis cursos"
            />
          ) : (
            <NavItem
              index={3}
              isOpen={isOpen}
              title="Iniciar sesión"
              className="text-4xl my-0 font-light "
              onClick={googleLoginHandler}
            />
          )}
        </div>
        <div className="flex justify-center items-center gap-6 mt-40">
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
      </motion.div>
    </section>
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
  link,
  className,
  onClick,
}: {
  title: string;
  isOpen?: boolean;
  index: number;
  link?: string;
  className?: string;
  onClick?: () => void;
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
  return (
    <Link to={link}>
      <h3
        ref={scope}
        style={{
          opacity: 0,
          transform: "translateY(20px)",
          filter: "blur(9px)",
        }}
        className={cn("text-4xl my-10 font-light ", className)}
        onClick={onClick}
      >
        {title}
      </h3>
    </Link>
  );
};
