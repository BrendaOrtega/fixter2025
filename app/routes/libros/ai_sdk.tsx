import { useState, useEffect } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/ai_sdk";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { HiOutlineMenuAlt3 } from "react-icons/hi";
import { motion } from "motion/react";
import { Streamdown } from "streamdown";
import getMetaTags from "~/utils/getMetaTags";
import TableOfContents from "~/components/book/TableOfContents";
import HeadingsList from "~/components/book/HeadingsList";
import BookLayout from "~/components/book/BookLayout";

// Helper para generar IDs desde texto
function generateId(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\sáéíóúñü-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "heading";
}

// Lista de capítulos
const chapters = [
  { id: "prólogo", title: "Prólogo", slug: "prologo" },
  { id: "intro", title: "Introducción", slug: "introduccion" },
  { id: "01", title: "Tu Primera Inferencia con IA", slug: "capitulo-01" },
  { id: "02", title: "React y el Hook useChat", slug: "capitulo-02" },
  { id: "03", title: "Dentro del Streaming", slug: "capitulo-03" },
  { id: "04", title: "React Router v7 — Tu Chat Full-Stack", slug: "capitulo-04" },
  { id: "05", title: "Structured Output — Respuestas Tipadas", slug: "capitulo-05" },
  { id: "06", title: "Tools — Dándole Manos al Modelo", slug: "capitulo-06" },
  { id: "07", title: "Agentes — Encapsulando la Inteligencia", slug: "capitulo-07" },
  { id: "08", title: "generateImage — Creando Imágenes con Código", slug: "capitulo-08" },
  { id: "09", title: "Embeddings — Búsqueda Semántica", slug: "capitulo-09" },
  { id: "10", title: "RAG — Retrieval Augmented Generation", slug: "capitulo-10" },
  { id: "11", title: "Agentic RAG — Agentes con Conocimiento", slug: "capitulo-11" },
  { id: "12", title: "Audio y Speech — Voz e IA", slug: "capitulo-12" },
];

export const meta = ({ location }: Route.MetaArgs) => {
  const url = `https://www.fixtergeek.com${location.pathname}`;

  return getMetaTags({
    title: "AI SDK con React Router v7 | FixterGeek",
    description:
      "Aprende a integrar IA en tus aplicaciones TypeScript con el AI SDK de Vercel. Sin Python, solo TypeScript.",
    url,
  });
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const chapterSlug = url.searchParams.get("chapter") || "prologo";

  console.log(`[AI SDK Book] Loading chapter: "${chapterSlug}" from URL: ${url.pathname}${url.search}`);

  try {
    // Leer el archivo MD del capítulo
    const fs = await import("fs").then((m) => m.promises);
    const path = await import("path");
    const filePath = path.join(
      process.cwd(),
      "app",
      "content",
      "ai-sdk",
      `${chapterSlug}.md`
    );
    const content = await fs.readFile(filePath, "utf-8");

    // Encontrar el capítulo actual y los adyacentes (excluyendo deshabilitados)
    const currentIndex = chapters.findIndex((c) => c.slug === chapterSlug);
    const currentChapter = chapters[currentIndex] || chapters[0];
    const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
    // Solo mostrar siguiente si no está deshabilitado
    const potentialNext = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;
    const nextChapter = potentialNext && !potentialNext.disabled ? potentialNext : null;

    return {
      content,
      currentChapter,
      prevChapter,
      nextChapter,
      chapters,
    };
  } catch (error) {
    // Si no se encuentra el capítulo, cargar el primero
    console.error(`[AI SDK Book] Error loading chapter "${chapterSlug}":`, error);
    const fs = await import("fs").then((m) => m.promises);
    const path = await import("path");
    const filePath = path.join(
      process.cwd(),
      "app",
      "content",
      "ai-sdk",
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

export default function LibroAiSdk({ loaderData }: Route.ComponentProps) {
  const { content, currentChapter, prevChapter, nextChapter, chapters } =
    loaderData;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState("");
  const [headings, setHeadings] = useState<
    Array<{ id: string; text: string; level: number }>
  >([]);
  const [readingMode, setReadingMode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadEpub = async () => {
    try {
      setIsDownloading(true);

      // Usar el archivo estático
      const link = document.createElement("a");
      link.href = "/ai-sdk-react-router.epub";
      link.download = "ai-sdk-react-router.epub";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error descargando EPUB:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Scroll to top when chapter changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentChapter.slug]);

  // Extraer headings, asignar IDs y manejar scroll
  useEffect(() => {
    const extractHeadings = () => {
      const headingElements = document.querySelectorAll(
        "article h1, article h2, article h3, article h4, article h5, article h6"
      );

      const extractedHeadings = Array.from(headingElements).map(
        (heading, index) => {
          const text = heading.textContent || "";
          const level = parseInt(heading.tagName.charAt(1));

          // Generar y asignar ID si no tiene
          if (!heading.id) {
            heading.id = generateId(text) || `heading-${index}`;
          }

          return { id: heading.id, text, level };
        }
      );

      setHeadings(extractedHeadings);
    };

    const handleScroll = () => {
      // Progress bar
      const windowHeight = window.innerHeight;
      const documentHeight =
        document.documentElement.scrollHeight - windowHeight;
      const scrollTop = window.scrollY;
      setProgress((scrollTop / documentHeight) * 100);

      // Active heading detection
      const headingElements = document.querySelectorAll(
        "article h1, article h2, article h3, article h4, article h5, article h6"
      );

      let active = "";

      for (let i = headingElements.length - 1; i >= 0; i--) {
        const heading = headingElements[i] as HTMLElement;
        const rect = heading.getBoundingClientRect();

        if (rect.top <= 200) {
          active = heading.id;
          break;
        }
      }

      if (!active && headingElements.length > 0) {
        const firstHeading = headingElements[0] as HTMLElement;
        const firstRect = firstHeading.getBoundingClientRect();
        if (firstRect.top <= window.innerHeight) {
          active = firstHeading.id;
        }
      }

      if (active !== activeHeading) {
        setActiveHeading(active);
      }
    };

    const timeoutId = setTimeout(extractHeadings, 500);
    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
    };
  }, [content]);

  const scrollToHeading = (headingId: string) => {
    const element = document.getElementById(headingId);

    if (element) {
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset + rect.top - 120;

      window.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: "smooth",
      });

      setTimeout(() => {
        setActiveHeading(headingId);
      }, 300);
    }
  };

  // Color TypeScript: #3178C6
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra de progreso - Azul TypeScript */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-[#3178C6] to-[#4B8FD9]"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-1 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
              >
                <HiOutlineMenuAlt3 className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={() => setReadingMode(!readingMode)}
                className="flex items-center space-x-1 px-2 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 text-gray-600 hover:text-[#3178C6] lg:hidden"
                title={readingMode ? "Salir modo lectura" : "Modo lectura"}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </button>
              <button
                onClick={handleDownloadEpub}
                disabled={isDownloading}
                className="flex items-center space-x-1 px-2 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 text-gray-600 hover:text-[#3178C6] lg:hidden disabled:opacity-50"
                title="Descargar EPUB"
              >
                {isDownloading ? (
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                    />
                  </svg>
                )}
              </button>
              <Link
                to="/"
                className="flex items-center space-x-2 text-gray-600 hover:text-[#3178C6] transition-colors"
              >
                <IoIosArrowBack />
                <span className="text-sm font-medium">Inicio</span>
              </Link>
              <div className="hidden lg:flex items-center space-x-3 ml-6 pl-6 border-l border-gray-200">
                <img src="/logo.png" alt="FixterGeek" className="h-7" />
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">
                    AI SDK con React Router v7
                  </div>
                  <div className="text-xs text-gray-500">
                    IA con TypeScript, sin Python
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <h2 className="text-base font-semibold text-gray-900">
                {currentChapter.title}
              </h2>
              <div className="hidden lg:flex items-center space-x-3">
                <button
                  onClick={() => setReadingMode(!readingMode)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 text-gray-600 hover:text-[#3178C6]"
                  title={readingMode ? "Salir modo lectura" : "Modo lectura"}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  <span className="text-xs font-medium">
                    {readingMode ? "Salir" : "Modo lectura"}
                  </span>
                </button>
                <button
                  onClick={handleDownloadEpub}
                  disabled={isDownloading}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 text-gray-600 hover:text-[#3178C6] disabled:opacity-50"
                  title="Descargar EPUB"
                >
                  {isDownloading ? (
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                      />
                    </svg>
                  )}
                  <span className="text-xs font-medium">
                    {isDownloading ? "Descargando..." : "Descargar EPUB"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <BookLayout
        readingMode={readingMode}
        sidebar={
          <TableOfContents
            chapters={chapters}
            currentChapter={currentChapter}
            readingMode={readingMode}
            accentColor="#3178C6"
          />
        }
        headingsList={
          <HeadingsList
            headings={headings}
            activeHeading={activeHeading}
            onHeadingClick={scrollToHeading}
            readingMode={readingMode}
            accentColor="#3178C6"
          />
        }
      >
        <TableOfContents
          chapters={chapters}
          currentChapter={currentChapter}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isMobile
          accentColor="#3178C6"
        />

        <article className="prose prose-lg max-w-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="pt-4"
          >
            <div className={`prose prose-lg max-w-none
              prose-headings:text-gray-900 prose-p:text-gray-700
              prose-a:text-[#3178C6] prose-strong:text-gray-900
              prose-blockquote:border-[#3178C6] prose-blockquote:bg-blue-50/50
              prose-code:text-[#3178C6] prose-code:bg-blue-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-table:border-collapse prose-th:bg-gray-100 prose-th:border prose-th:border-gray-300 prose-th:px-4 prose-th:py-2
              prose-td:border prose-td:border-gray-300 prose-td:px-4 prose-td:py-2
              ${readingMode ? "prose-2xl [&_p]:text-2xl [&_p]:leading-relaxed [&_li]:text-xl [&_h1]:text-5xl [&_h2]:text-4xl [&_h3]:text-3xl" : ""}
            `}>
              <Streamdown
                shikiTheme={["github-light", "github-dark"]}
                controls={{ table: false, code: true }}
              >{content}</Streamdown>
            </div>
          </motion.div>

          {/* Navegación entre capítulos */}
          <nav className="mt-20 pt-12 border-t border-gray-100 dark:border-gray-800">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              {prevChapter ? (
                <Link
                  to={`?chapter=${prevChapter.slug}`}
                  className="group flex items-center space-x-3 px-6 py-4 rounded-xl bg-gray-50 hover:bg-blue-50 transition-all duration-200 border border-gray-200 w-full sm:w-auto"
                >
                  <IoIosArrowBack className="w-5 h-5 text-gray-400 group-hover:text-[#3178C6] transition-colors" />
                  <div className="text-left">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">
                      Anterior
                    </div>
                    <div className="font-semibold text-gray-900 group-hover:text-[#3178C6] transition-colors">
                      {prevChapter.title}
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="hidden sm:block" />
              )}

              {nextChapter ? (
                <Link
                  to={`?chapter=${nextChapter.slug}`}
                  className="group flex items-center space-x-3 px-6 py-4 rounded-xl bg-gray-50 hover:bg-blue-50 transition-all duration-200 border border-gray-200 w-full sm:w-auto"
                >
                  <div className="text-left sm:text-right">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">
                      Siguiente
                    </div>
                    <div className="font-semibold text-gray-900 group-hover:text-[#3178C6] transition-colors">
                      {nextChapter.title}
                    </div>
                  </div>
                  <IoIosArrowForward className="w-5 h-5 text-gray-400 group-hover:text-[#3178C6] transition-colors" />
                </Link>
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>
          </nav>
        </article>
      </BookLayout>
    </div>
  );
}
