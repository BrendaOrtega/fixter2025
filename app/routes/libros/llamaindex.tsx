import { useState, useEffect } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/llamaindex";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { HiOutlineMenuAlt3 } from "react-icons/hi";
import { motion } from "motion/react";
import BookMarkdown from "~/components/common/BookMarkdown";
import getMetaTags from "~/utils/getMetaTags";
import TableOfContents from "~/components/book/TableOfContents";
import HeadingsList from "~/components/book/HeadingsList";
import BookLayout from "~/components/book/BookLayout";

// Lista de capítulos del libro de LlamaIndex
const chapters = [
  { id: "prólogo", title: "Prólogo", slug: "prologo" },
  { id: "intro", title: "Introducción", slug: "introduccion" },
  {
    id: "01",
    title: "¿Qué son los Agent Workflows?",
    slug: "capitulo-01",
  },
  {
    id: "02",
    title: "Tu Primer Workflow",
    slug: "capitulo-02",
  },
  {
    id: "03",
    title: "Steps y Eventos",
    slug: "capitulo-03",
  },
  {
    id: "04",
    title: "Workflows con Múltiples Steps",
    slug: "capitulo-04",
  },
  {
    id: "05",
    title: "Streaming en Tiempo Real",
    slug: "capitulo-05",
  },
  {
    id: "06",
    title: "Integrando Tools Externos",
    slug: "capitulo-06",
  },
  {
    id: "07",
    title: "Patrones y Mejores Prácticas",
    slug: "capitulo-07",
  },
];

export const meta = ({ location }: Route.MetaArgs) => {
  const url = `https://www.fixtergeek.com${location.pathname}`;

  return getMetaTags({
    title: "Agent Workflows de LlamaIndex TypeScript | Fixtergeek",
    description:
      "Aprende a crear workflows inteligentes con ejemplos prácticos mexicanos",
    url,
  });
};

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "download-epub") {
    // TODO: Implementar generación de EPUB para LlamaIndex
    // const epubBuffer = await generateLlamaIndexEpub();

    // Por ahora, retornamos un error amigable
    return new Response(JSON.stringify({ error: "EPUB en desarrollo" }), {
      headers: { "Content-Type": "application/json" },
      status: 501,
    });
  }

  return null;
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const chapterSlug = url.searchParams.get("chapter") || "prologo";

  console.log("🔍 Loading chapter:", chapterSlug);

  // Función helper para leer archivos
  const readChapterFile = async (slug: string) => {
    try {
      const fs = await import("fs").then((m) => m.promises);
      const path = await import("path");
      const filePath = path.join(
        process.cwd(),
        "app",
        "content",
        "llamaindex",
        `${slug}.md`
      );

      console.log("📁 Reading file:", filePath);
      const content = await fs.readFile(filePath, "utf-8");
      console.log("✅ Content loaded, length:", content.length);
      return content;
    } catch (error) {
      console.error("❌ Error reading file:", error);
      throw error;
    }
  };

  try {
    // Intentar leer el archivo solicitado
    const content = await readChapterFile(chapterSlug);

    // Encontrar el capítulo actual y los adyacentes
    const currentIndex = chapters.findIndex((c) => c.slug === chapterSlug);
    const currentChapter = chapters[currentIndex] || chapters[0];
    const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
    const nextChapter =
      currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

    console.log("📖 Chapter found:", currentChapter.title);

    return {
      content,
      currentChapter,
      prevChapter,
      nextChapter,
      chapters,
    };
  } catch (error) {
    console.error("❌ Error loading chapter, falling back to prologo:", error);

    try {
      // Fallback: cargar el prólogo
      const content = await readChapterFile("prologo");

      return {
        content,
        currentChapter: chapters[0],
        prevChapter: null,
        nextChapter: chapters[1] || null,
        chapters,
      };
    } catch (fallbackError) {
      console.error("❌ Error loading fallback:", fallbackError);

      // Último recurso: contenido hardcodeado
      return {
        content: "# Error\n\nNo se pudo cargar el contenido del capítulo.",
        currentChapter: chapters[0],
        prevChapter: null,
        nextChapter: chapters[1] || null,
        chapters,
      };
    }
  }
};

export default function LibroLlamaIndex({ loaderData }: Route.ComponentProps) {
  const { content, currentChapter, prevChapter, nextChapter, chapters } =
    loaderData;

  console.log("🎨 Component rendering with:", {
    contentLength: content?.length,
    currentChapter: currentChapter?.title,
    hasContent: !!content,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState("");
  const [headings, setHeadings] = useState<
    Array<{ id: string; text: string; level: number }>
  >([]);
  const [readingMode, setReadingMode] = useState(false);
  const [isGeneratingEpub, setIsGeneratingEpub] = useState(false);

  const handleDownloadEpub = async () => {
    try {
      setIsGeneratingEpub(true);

      // TODO: Implementar descarga de EPUB para LlamaIndex
      alert("La descarga de EPUB estará disponible pronto 📚");
    } catch (error) {
      console.error("Error descargando EPUB:", error);
    } finally {
      setIsGeneratingEpub(false);
    }
  };

  // Scroll to top when chapter changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentChapter.slug]);

  // Extraer headings y manejar scroll
  useEffect(() => {
    const extractHeadings = () => {
      const headingElements = document.querySelectorAll(
        "article h1, article h2, article h3, article h4, article h5, article h6"
      );

      const extractedHeadings = Array.from(headingElements).map(
        (heading, index) => {
          const text = heading.textContent || "";
          const level = parseInt(heading.tagName.charAt(1));
          const id = heading.id || `heading-${index}`;

          return { id, text, level };
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

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Barra de progreso */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
              >
                <HiOutlineMenuAlt3 className="w-5 h-5 text-gray-800" />
              </button>
              <button
                onClick={() => setReadingMode(!readingMode)}
                className="flex items-center space-x-1 px-2 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 text-gray-700 hover:text-blue-600 lg:hidden"
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
                disabled={isGeneratingEpub}
                className="flex items-center space-x-1 px-2 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 text-gray-700 hover:text-blue-600 lg:hidden disabled:opacity-50"
                title="Descargar EPUB"
              >
                {isGeneratingEpub ? (
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
                className="flex items-center space-x-2 text-gray-800 hover:text-blue-600 transition-colors"
              >
                <IoIosArrowBack />
                <span className="text-sm font-medium">Inicio</span>
              </Link>
              <div className="hidden lg:flex items-center space-x-3 ml-6 pl-6 border-l border-gray-200">
                <img src="/logo.png" alt="FixterGeek" className="h-7" />
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">
                    Agent Workflows LlamaIndex
                  </div>
                  <div className="text-xs text-gray-500">
                    TypeScript para Desarrolladores
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
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 text-gray-600 hover:text-blue-600"
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
                  disabled={isGeneratingEpub}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 text-gray-600 hover:text-blue-600 disabled:opacity-50"
                  title="Descargar EPUB"
                >
                  {isGeneratingEpub ? (
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
                    {isGeneratingEpub ? "Generando..." : "Descargar EPUB"}
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
          />
        }
        headingsList={
          <HeadingsList
            headings={headings}
            activeHeading={activeHeading}
            onHeadingClick={scrollToHeading}
            readingMode={readingMode}
          />
        }
      >
        <TableOfContents
          chapters={chapters}
          currentChapter={currentChapter}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isMobile
        />

        <article className="prose prose-lg max-w-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="prose prose-lg max-w-none">
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: "12px",
                  background: "#f5f5f5",
                  padding: "10px",
                }}
              >
                DEBUG - Content length: {content?.length || 0}
                {"\n"}
                Content preview: {content?.substring(0, 200) || "NO CONTENT"}
              </pre>
              <BookMarkdown readingMode={readingMode}>{content}</BookMarkdown>
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
                  <IoIosArrowBack className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  <div className="text-left">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">
                      Anterior
                    </div>
                    <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
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
                    <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {nextChapter.title}
                    </div>
                  </div>
                  <IoIosArrowForward className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
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
