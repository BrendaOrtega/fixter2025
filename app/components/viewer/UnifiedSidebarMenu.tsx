import { type Video } from "@prisma/client";
import { Link } from "react-router";
import {
  AnimatePresence,
  motion,
  MotionValue,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { BsMenuButtonWide, BsMarkdown } from "react-icons/bs";
import { FaPlay, FaVideo } from "react-icons/fa6";
import { IoMdLock, IoMdClose } from "react-icons/io";
import {
  MdMenuOpen,
  MdOutlineRadioButtonChecked,
  MdOutlineRadioButtonUnchecked,
} from "react-icons/md";
import { useClickOutside } from "~/hooks/useClickOutside";
import { cn } from "~/utils/cn";
import Markdown from "../common/Markdown";

type TabType = "videos" | "notes";

interface UnifiedSidebarProps {
  // Videos props
  courseSlug: string;
  courseTitle?: string;
  isLocked?: boolean;
  currentVideoSlug?: string;
  moduleNames: string[];
  videos: Partial<Video>[];
  // Notes props
  markdownBody?: string;
  // Unified props
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  defaultTab?: TabType;
}

export const UnifiedSidebarMenu = ({
  courseSlug,
  courseTitle,
  isLocked,
  currentVideoSlug,
  moduleNames,
  videos,
  markdownBody,
  isOpen,
  setIsOpen,
  defaultTab = "videos",
}: UnifiedSidebarProps) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [completed, setCompleted] = useState<string[]>([]);
  const [videosCompleted, setVideosCompleted] = useState<string[]>([]);

  // Animation setup
  const x = useMotionValue(0);
  const springX = useSpring(x, { bounce: 0.2 });
  const menuWidth =
    typeof window !== "undefined" && window.innerWidth >= 768 ? 400 : 320;
  const buttonX = useTransform(springX, [-menuWidth, 0], [0, menuWidth - 56]);

  useEffect(() => {
    isOpen ? x.set(0) : x.set(-menuWidth);
  }, [isOpen, x, menuWidth]);

  // Video completion logic
  const checkIfWatched = (slug: string) => {
    if (typeof window === "undefined") return false;
    let list = localStorage.getItem("watched") || "[]";
    list = JSON.parse(list);
    return list.includes(slug);
  };

  useEffect(() => {
    const list: string[] = [];
    moduleNames.map((moduleName) => {
      const allCompleted = videos
        .filter((vi) => vi?.moduleName === moduleName)
        .every((v) => checkIfWatched(v?.slug));
      allCompleted && list.push(moduleName);
    });
    setCompleted(list);

    let watchedList = localStorage.getItem("watched") || "[]";
    watchedList = JSON.parse(watchedList);
    setVideosCompleted(watchedList);
  }, [moduleNames, videos]);

  const tabs = [
    {
      id: "videos" as TabType,
      label: "Videos",
      icon: <FaVideo className="text-sm" />,
      available: videos.length > 0,
    },
    {
      id: "notes" as TabType,
      label: "Notas",
      icon: <BsMarkdown className="text-sm" />,
      available: !!markdownBody,
    },
  ];

  return (
    <>
      {/* Unified Menu Button */}
      <UnifiedMenuButton
        x={buttonX}
        onToggle={() => setIsOpen(!isOpen)}
        isOpen={isOpen}
      />

      {/* Unified Menu Container */}
      <UnifiedMenuContainer
        isOpen={isOpen}
        x={springX}
        onOutsideClick={() => setIsOpen(false)}
        menuWidth={menuWidth}
      >
        {/* Header with tabs */}
        <div className="px-4 py-4 border-b border-gray-700/50">
          <h2 className="text-lg font-semibold text-white mb-3 truncate">
            {courseTitle}
          </h2>

          {/* Tabs Navigation */}
          <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1">
            {tabs
              .filter((tab) => tab.available)
              .map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
                    {
                      "bg-brand-500 text-white": activeTab === tab.id,
                      "text-gray-400 hover:text-gray-200": activeTab !== tab.id,
                    }
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === "videos" && (
              <motion.div
                key="videos"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="p-4"
              >
                <VideosContent
                  moduleNames={moduleNames}
                  videos={videos}
                  courseSlug={courseSlug}
                  courseTitle={courseTitle}
                  currentVideoSlug={currentVideoSlug}
                  isLocked={isLocked}
                  completed={completed}
                  videosCompleted={videosCompleted}
                  checkIfWatched={checkIfWatched}
                />
              </motion.div>
            )}

            {activeTab === "notes" && markdownBody && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="p-4"
              >
                <NotesContent body={markdownBody} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom spacer */}
        <div className="h-20" />
      </UnifiedMenuContainer>
    </>
  );
};

// Subcomponents
const UnifiedMenuButton = ({
  isOpen,
  x = 0,
  onToggle,
}: {
  x?: MotionValue | number;
  onToggle?: () => void;
  isOpen?: boolean;
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      style={{ x }}
      onClick={onToggle}
      className={cn(
        "fixed bg-[#0C1115] border border-gray-600/40 text-4xl w-14 h-14 text-white top-20 p-2 z-[70] flex items-center justify-center hover:bg-gray-800/80 transition-colors shadow-lg",
        {
          "rounded-r-2xl left-0": !isOpen,
          "rounded-2xl": isOpen,
        }
      )}
    >
      <AnimatePresence mode="popLayout">
        {isOpen ? (
          <motion.span
            key="close"
            initial={{ filter: "blur(9px)", opacity: 0 }}
            animate={{ filter: "blur(0px)", opacity: 1 }}
            exit={{ filter: "blur(9px)", opacity: 0 }}
          >
            <IoMdClose className="text-2xl" />
          </motion.span>
        ) : (
          <motion.span
            key="open"
            initial={{ filter: "blur(9px)", opacity: 0 }}
            animate={{ filter: "blur(0px)", opacity: 1 }}
            exit={{ filter: "blur(9px)", opacity: 0 }}
          >
            <BsMenuButtonWide className="text-2xl" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

const UnifiedMenuContainer = ({
  children,
  x = 0,
  onOutsideClick,
  isOpen = false,
  menuWidth,
}: {
  children: ReactNode;
  isOpen?: boolean;
  x?: MotionValue | number;
  onOutsideClick?: () => void;
  menuWidth: number;
}) => {
  const ref = useClickOutside({ isActive: isOpen, onOutsideClick });
  const maskImage = useMotionTemplate`linear-gradient(to bottom, white 90%, transparent 100%)`;

  return (
    <motion.div
      ref={ref}
      style={{
        x,
        maskImage,
        width: menuWidth,
      }}
      className={cn(
        "fixed z-[60] h-screen bg-[#0C1115]/95 backdrop-blur-sm top-0 left-0 flex flex-col",
        "shadow-2xl border-r border-gray-700/50"
      )}
    >
      {children}
    </motion.div>
  );
};

// Content Components
const VideosContent = ({
  moduleNames,
  videos,
  courseSlug,
  courseTitle,
  currentVideoSlug,
  isLocked,
  completed,
  videosCompleted,
  checkIfWatched,
}: {
  moduleNames: string[];
  videos: Partial<Video>[];
  courseSlug: string;
  courseTitle?: string;
  currentVideoSlug?: string;
  isLocked?: boolean;
  completed: string[];
  videosCompleted: string[];
  checkIfWatched: (slug: string) => boolean;
}) => {
  return (
    <div className="space-y-4">
      {moduleNames.map((moduleName, index) => (
        <div key={index}>
          <ModuleHeader
            title={moduleName === "nomodules" ? courseTitle : moduleName}
            subtitle={
              moduleName === "nomodules"
                ? "Lecciones del curso"
                : `Capítulo ${String(index + 1).padStart(2, "0")}`
            }
            isCompleted={completed.includes(moduleName)}
          />

          <div className="space-y-2">
            {videos
              .filter((vid) =>
                moduleName === "nomodules"
                  ? true
                  : vid.moduleName === moduleName
              )
              .sort((a, b) => (a.index < b.index ? -1 : 1))
              .map((v) => (
                <VideoListItem
                  key={v?.id}
                  isLocked={v?.isPublic ? false : isLocked}
                  isCompleted={videosCompleted.includes(v?.slug)}
                  isCurrent={currentVideoSlug === v?.slug}
                  slug={v?.slug || ""}
                  title={v?.title || ""}
                  duration={v?.duration || 60}
                  courseSlug={courseSlug}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const NotesContent = ({ body }: { body: string }) => {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <Markdown>{body}</Markdown>
    </div>
  );
};

const ModuleHeader = ({
  title,
  subtitle,
  isCompleted,
}: {
  isCompleted?: boolean;
  title: string;
  subtitle?: string;
}) => {
  return (
    <header className="bg-[#1a2332] rounded-lg p-3 mb-3 border border-gray-700/30">
      <p className="text-gray-400 text-xs font-semibold text-brand-400 uppercase tracking-wider">
        {subtitle}
      </p>
      <h3
        className={cn(
          "text-base font-bold mt-1",
          isCompleted ? "text-green-400" : "text-white"
        )}
      >
        {title}
      </h3>
    </header>
  );
};

const VideoListItem = ({
  isCompleted,
  courseSlug,
  duration,
  title,
  isCurrent,
  slug,
  isLocked,
}: {
  courseSlug?: string;
  isLocked?: boolean;
  slug: string;
  isCurrent?: boolean;
  duration: number | string;
  isCompleted?: boolean;
  title: string;
}) => {
  const formatDuration = (mins: number | string) => {
    mins = +mins / 60;
    return Number(mins).toFixed(0) + "m";
  };

  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (isCurrent && ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [isCurrent]);

  return (
    <Link
      reloadDocument
      ref={ref}
      to={`/cursos/${courseSlug}/viewer?videoSlug=${slug}`}
      className={cn(
        "group relative flex items-center p-3 rounded-lg transition-all hover:bg-gray-800/50",
        {
          "bg-[#1a2332] ring-1 ring-brand-500/30": isCurrent,
          "cursor-pointer": !isLocked,
          "cursor-not-allowed opacity-60": isLocked,
        }
      )}
    >
      <span
        className={cn("text-lg mr-3", {
          "text-green-500": isCompleted,
          "text-brand-500": isCurrent && !isCompleted,
          "text-gray-500": !isCurrent && !isCompleted,
        })}
      >
        {isCurrent ? (
          <div className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
            <FaPlay className="text-xs text-white ml-0.5" />
          </div>
        ) : isCompleted ? (
          <MdOutlineRadioButtonChecked />
        ) : (
          <MdOutlineRadioButtonUnchecked />
        )}
      </span>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-200 truncate">
          {title}
        </div>
      </div>

      {isLocked ? (
        <IoMdLock className="text-gray-500 ml-2" />
      ) : (
        <div className="text-xs text-gray-500 ml-2">
          {formatDuration(duration)}
        </div>
      )}
    </Link>
  );
};
