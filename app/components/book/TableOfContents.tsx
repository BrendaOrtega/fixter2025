import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";

interface Chapter {
  id: string;
  title: string;
  slug: string;
}

interface TableOfContentsProps {
  chapters: Chapter[];
  currentChapter: Chapter;
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
  readingMode?: boolean;
  accentColor?: string;
}

export default function TableOfContents({
  chapters,
  currentChapter,
  isOpen = true,
  onClose,
  isMobile = false,
  readingMode = false,
  accentColor = "#9333ea",
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
        <ChapterList chapters={chapters} currentChapter={currentChapter} accentColor={accentColor} />
      </div>
    </aside>
  );
}

function ChapterList({
  chapters,
  currentChapter,
  onChapterClick,
  accentColor = "#9333ea",
}: {
  chapters: Chapter[];
  currentChapter: Chapter;
  onChapterClick?: () => void;
  accentColor?: string;
}) {
  return (
    <ul className="space-y-1">
      {chapters.map((chapter) => (
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
                ? { backgroundColor: accentColor, boxShadow: `0 10px 15px -3px ${accentColor}33` }
                : undefined
            }
          >
            <span className="text-xs opacity-60">
              {chapter.id === "prólogo" || chapter.id === "intro"
                ? ""
                : `Capítulo ${chapter.id}`}
            </span>
            <div className="font-medium mt-1">{chapter.title}</div>
          </Link>
        </li>
      ))}
    </ul>
  );
}