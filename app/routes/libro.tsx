import { useState, useEffect } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/libro";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { HiOutlineMenuAlt3 } from "react-icons/hi";
import { motion, AnimatePresence } from "motion/react";
import BookMarkdown from "~/components/common/BookMarkdown";
import getMetaTags from "~/utils/getMetaTags";

// Lista de capítulos
const chapters = [
  { id: "prólogo", title: "Prólogo", slug: "prologo" },
  { id: "intro", title: "Introducción", slug: "introduccion" },
  { id: "01", title: "Fundamentos para administrar mejor el contexto", slug: "capitulo-01" },
  { id: "02", title: "SDK - Automatización y Scripting", slug: "capitulo-02" },
  // Añadir más capítulos aquí
];

export const meta = ({ location }: Route.MetaArgs) => {
  const url = `https://www.fixtergeek.com${location.pathname}`;

  return getMetaTags({
    title: "Libro Interactivo | Fixtergeek",
    description: "Lectura interactiva con navegación fluida",
    url,
  });
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const chapterSlug = url.searchParams.get("chapter") || "prologo";

  try {
    // Leer el archivo MD del capítulo
    const fs = await import("fs").then((m) => m.promises);
    const path = await import("path");
    const filePath = path.join(
      process.cwd(),
      "app",
      "content",
      "libro",
      `${chapterSlug}.md`
    );
    const content = await fs.readFile(filePath, "utf-8");

    // Encontrar el capítulo actual y los adyacentes
    const currentIndex = chapters.findIndex((c) => c.slug === chapterSlug);
    const currentChapter = chapters[currentIndex] || chapters[0];
    const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
    const nextChapter =
      currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

    return {
      content,
      currentChapter,
      prevChapter,
      nextChapter,
      chapters,
    };
  } catch (error) {
    // Si no se encuentra el capítulo, cargar el primero
    const fs = await import("fs").then((m) => m.promises);
    const path = await import("path");
    const filePath = path.join(
      process.cwd(),
      "app",
      "content",
      "libro",
      "prologo.md"
    );
    const content = await fs.readFile(filePath, "utf-8");

    return {
      content,
      currentChapter: chapters[0],
      prevChapter: null,
      nextChapter: chapters[1] || null,
      chapters,
    };
  }
};

export default function Libro({ loaderData }: Route.ComponentProps) {
  const { content, currentChapter, prevChapter, nextChapter, chapters } =
    loaderData;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState("");
  const [headings, setHeadings] = useState<Array<{ id: string; text: string; level: number }>>([]);

  // Extraer headings y manejar scroll
  useEffect(() => {
    const extractHeadings = () => {
      const headingElements = document.querySelectorAll("article h1, article h2, article h3");
      const extractedHeadings = Array.from(headingElements).map((heading) => {
        const text = heading.textContent || "";
        const level = parseInt(heading.tagName.charAt(1));
        const id = text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\-áéíóúñü]/g, "");
        
        if (!heading.id) {
          heading.id = id;
        }
        
        return { id: heading.id, text, level };
      });
      setHeadings(extractedHeadings);
    };

    const handleScroll = () => {
      // Progress bar
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrollTop = window.scrollY;
      setProgress((scrollTop / documentHeight) * 100);

      // Active heading detection
      const headingElements = document.querySelectorAll("article h1, article h2, article h3");
      let active = "";
      
      for (const heading of headingElements) {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 150) {
          active = heading.id;
        }
      }
      
      setActiveHeading(active);
    };

    // Initial setup
    setTimeout(extractHeadings, 200);
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, [content]);

  const scrollToHeading = (headingId: string) => {
    document.getElementById(headingId)?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra de progreso */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-600 to-purple-400"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-1 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
              >
                <HiOutlineMenuAlt3 className="w-5 h-5 text-gray-700" />
              </button>
              <Link
                to="/"
                className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors"
              >
                <IoIosArrowBack />
                <span className="text-sm font-medium">Inicio</span>
              </Link>
            </div>
            <h2 className="text-base font-semibold text-gray-900">
              {currentChapter.title}
            </h2>
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto relative">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-72 min-h-screen border-r border-gray-200 bg-white sticky top-14">
          <nav className="p-6">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-6">
              Tabla de Contenidos
            </h3>
            <ul className="space-y-1">
              {chapters.map((chapter) => (
                <li key={chapter.id}>
                  <Link
                    to={`?chapter=${chapter.slug}`}
                    className={`block px-4 py-3 rounded-lg transition-all duration-200 ${
                      currentChapter.slug === chapter.slug
                        ? "bg-purple-600 text-white font-medium shadow-lg shadow-purple-600/20"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span className="text-xs opacity-60">
                      {chapter.id === "prólogo" || chapter.id === "intro" ? "" : `Capítulo ${chapter.id}`}
                    </span>
                    <div className="font-medium mt-1">{chapter.title}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Sidebar - Mobile */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
              />
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                className="fixed left-0 top-0 w-80 h-full bg-white z-50 shadow-2xl lg:hidden"
              >
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">
                    Tabla de Contenidos
                  </h2>
                </div>
                <nav className="p-6">
                  <ul className="space-y-1">
                    {chapters.map((chapter) => (
                      <li key={chapter.id}>
                        <Link
                          to={`?chapter=${chapter.slug}`}
                          onClick={() => setSidebarOpen(false)}
                          className={`block px-4 py-3 rounded-lg transition-all duration-200 ${
                            currentChapter.slug === chapter.slug
                              ? "bg-purple-600 text-white font-medium shadow-lg shadow-purple-600/20"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <span className="text-xs opacity-60">
                            {chapter.id === "prólogo" || chapter.id === "intro" ? "" : `Capítulo ${chapter.id}`}
                          </span>
                          <div className="font-medium mt-1">
                            {chapter.title}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Contenido principal */}
        <main className="flex-1 px-4 sm:px-6 lg:px-12 py-8 lg:py-16 bg-white relative">
          <div className="flex gap-8">
            <article className="flex-1 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <BookMarkdown>{content}</BookMarkdown>
            </motion.div>

            {/* Navegación entre capítulos */}
            <nav className="mt-20 pt-12 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                {prevChapter ? (
                  <Link
                    to={`?chapter=${prevChapter.slug}`}
                    className="group flex items-center space-x-3 px-6 py-4 rounded-xl bg-gray-50 hover:bg-purple-50 transition-all duration-200 border border-gray-200"
                  >
                    <IoIosArrowBack className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                    <div className="text-left">
                      <div className="text-xs text-gray-500 uppercase tracking-wider">
                        Anterior
                      </div>
                      <div className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                        {prevChapter.title}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div />
                )}

                {nextChapter ? (
                  <Link
                    to={`?chapter=${nextChapter.slug}`}
                    className="group flex items-center space-x-3 px-6 py-4 rounded-xl bg-gray-50 hover:bg-purple-50 transition-all duration-200 border border-gray-200"
                  >
                    <div className="text-right">
                      <div className="text-xs text-gray-500 uppercase tracking-wider">
                        Siguiente
                      </div>
                      <div className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                        {nextChapter.title}
                      </div>
                    </div>
                    <IoIosArrowForward className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                  </Link>
                ) : (
                  <div />
                )}
              </div>
            </nav>
            </article>

            {/* Navegador de títulos - Tablet y Desktop */}
            <aside className="hidden md:block w-64 sticky top-20 self-start">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                  En esta sección
                </h4>
                {headings.length > 0 ? (
                  <nav className="space-y-1">
                    {headings.map((heading) => (
                      <button
                        key={heading.id}
                        onClick={() => scrollToHeading(heading.id)}
                        className={`block text-left w-full px-3 py-2 text-sm rounded-md transition-all duration-200 ${
                          activeHeading === heading.id
                            ? "bg-purple-100 text-purple-700 font-semibold border-l-2 border-purple-500"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                        style={{
                          paddingLeft: `${(heading.level - 1) * 12 + 12}px`
                        }}
                      >
                        <div className="truncate">
                          {heading.text}
                        </div>
                      </button>
                    ))}
                  </nav>
                ) : null}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
