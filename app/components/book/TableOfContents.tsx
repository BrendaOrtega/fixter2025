import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { FaLock, FaEnvelope, FaCheck, FaShoppingCart } from "react-icons/fa";

interface Chapter {
  id: string;
  title: string;
  slug: string;
  disabled?: boolean;
}

interface ChapterAccessInfo {
  [chapterSlug: string]: {
    accessLevel: string;
    isLocked: boolean;
  };
}

interface TableOfContentsProps {
  chapters: Chapter[];
  currentChapter: Chapter;
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
  readingMode?: boolean;
  accentColor?: string;
  chaptersAccessInfo?: ChapterAccessInfo;
}

export default function TableOfContents({
  chapters,
  currentChapter,
  isOpen = true,
  onClose,
  isMobile = false,
  readingMode = false,
  accentColor = "#9333ea",
  chaptersAccessInfo,
}: TableOfContentsProps) {
  const handleChapterClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed left-0 top-0 w-96 h-full bg-white z-50 shadow-2xl lg:hidden"
            >
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">
                  Tabla de Contenidos
                </h2>
              </div>
              <nav className="p-6 h-full overflow-y-auto">
                <ChapterList
                  chapters={chapters}
                  currentChapter={currentChapter}
                  onChapterClick={handleChapterClick}
                  accentColor={accentColor}
                  chaptersAccessInfo={chaptersAccessInfo}
                />
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <aside
      className={`hidden lg:block border-r border-gray-200 bg-white transition-all duration-300 ${
        readingMode ? "w-0 overflow-hidden opacity-0" : "w-80 opacity-100"
      }`}
    >
      <div className="p-6">
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-6">
          Tabla de Contenidos
        </h3>
        <ChapterList
          chapters={chapters}
          currentChapter={currentChapter}
          accentColor={accentColor}
          chaptersAccessInfo={chaptersAccessInfo}
        />
      </div>
    </aside>
  );
}

function ChapterList({
  chapters,
  currentChapter,
  onChapterClick,
  accentColor = "#9333ea",
  chaptersAccessInfo,
}: {
  chapters: Chapter[];
  currentChapter: Chapter;
  onChapterClick?: () => void;
  accentColor?: string;
  chaptersAccessInfo?: ChapterAccessInfo;
}) {
  return (
    <ul className="space-y-1">
      {chapters.map((chapter) => {
        const accessInfo = chaptersAccessInfo?.[chapter.slug];
        const isLocked = accessInfo?.isLocked || false;
        const accessLevel = accessInfo?.accessLevel || "public";
        const isRestricted = accessLevel === "paid" || accessLevel === "subscriber";

        if (chapter.disabled) {
          return (
            <li key={chapter.id}>
              <div className="block px-4 py-3 rounded-lg bg-gray-50 border border-dashed border-gray-200 cursor-not-allowed opacity-60">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {chapter.id === "prólogo" || chapter.id === "intro"
                      ? ""
                      : `Capítulo ${chapter.id}`}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Próximamente
                  </span>
                </div>
                <div className="font-medium mt-1 text-gray-400">
                  {chapter.title}
                </div>
              </div>
            </li>
          );
        }

        return (
          <li key={chapter.id}>
            <Link
              to={`?chapter=${chapter.slug}`}
              onClick={onChapterClick}
              className={`block px-4 py-3 rounded-lg transition-all duration-200 ${
                currentChapter.slug === chapter.slug
                  ? "text-white font-medium shadow-lg"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
              style={
                currentChapter.slug === chapter.slug
                  ? {
                      backgroundColor: accentColor,
                      boxShadow: `0 10px 15px -3px ${accentColor}33`,
                    }
                  : undefined
              }
            >
              <div className="flex items-center justify-between">
                <span className="text-xs opacity-60">
                  {chapter.id === "prólogo" || chapter.id === "intro"
                    ? ""
                    : `Capítulo ${chapter.id}`}
                </span>
                {isRestricted && (
                  <span
                    className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      currentChapter.slug === chapter.slug
                        ? "bg-white/20 text-white"
                        : isLocked
                          ? accessLevel === "paid"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {accessLevel === "paid" ? (
                      <>
                        {isLocked ? <FaShoppingCart className="w-2.5 h-2.5" /> : <FaCheck className="w-2.5 h-2.5" />}
                        {isLocked ? "Comprar" : "Comprado"}
                      </>
                    ) : (
                      <>
                        {isLocked ? <FaEnvelope className="w-2.5 h-2.5" /> : <FaCheck className="w-2.5 h-2.5" />}
                        {isLocked ? "Suscríbete" : "Suscrito"}
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className="font-medium mt-1">{chapter.title}</div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}