import { useState, useEffect } from "react";
import { Link, data, useFetcher } from "react-router";
import type { Route } from "./+types/ai_sdk";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { HiOutlineMenuAlt3 } from "react-icons/hi";
import { FaShoppingCart } from "react-icons/fa";
import { motion, AnimatePresence } from "motion/react";
import { Streamdown } from "streamdown";
import getMetaTags from "~/utils/getMetaTags";
import {
  TableOfContents,
  HeadingsList,
  BookLayout,
  BookSubscriptionDrawer,
  BookPurchaseDrawer,
} from "~/components/book";
import {
  BOOK_CONFIG,
  getBookAccessData,
  getAllChaptersAccessInfo,
  handleBookCheckout,
  handleBookSubscribe,
  handleBookVerify,
} from "~/.server/services/book-access.server";
import { db } from "~/.server/db";
import { sendBookDownloadLink } from "~/mailSenders/sendBookDownloadLink";
import { sendVerificationCode } from "~/mailSenders/sendVerificationCode";

const BOOK_SLUG = "ai-sdk" as const;

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

// Título hardcodeado para meta (no puede acceder a BOOK_CONFIG en cliente)
// Si cambia, actualizar también en BOOK_CONFIG["ai-sdk"].title
const BOOK_TITLE = "IA aplicada con React y TypeScript";

export const meta = ({ location }: Route.MetaArgs) => {
  const url = `https://www.fixtergeek.com${location.pathname}`;

  return getMetaTags({
    title: `${BOOK_TITLE} | FixterGeek`,
    description:
      "Aprende a integrar IA en tus aplicaciones TypeScript con el AI SDK de Vercel. Sin Python, solo TypeScript.",
    url,
  });
};

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const email = (formData.get("email") as string)?.toLowerCase().trim();

  if (intent === "checkout") {
    const currency = formData.get("currency") as string | null;
    return handleBookCheckout(request, BOOK_SLUG, currency || undefined);
  }

  if (intent === "subscribe") {
    const result = await handleBookSubscribe(email, BOOK_SLUG);
    if (result.error) {
      return data({ error: result.error }, { status: 400 });
    }
    return result;
  }

  if (intent === "verify") {
    const code = formData.get("code") as string;
    const result = await handleBookVerify(email, code, BOOK_SLUG);
    if (result.error) {
      return data({ error: result.error }, { status: 400 });
    }
    if (result.headers) {
      return data({ success: true, verified: true }, { headers: result.headers });
    }
    return result;
  }

  // Reenviar link de descarga para compradores
  if (intent === "resend-link") {
    if (!email) {
      return data({ error: "Email requerido" }, { status: 400 });
    }

    // Verificar si el email tiene compra del libro
    const user = await db.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        books: { has: BOOK_SLUG },
      },
    });

    if (user) {
      // Usuario compró el libro - enviar magic link
      try {
        await sendBookDownloadLink({
          to: email,
          bookSlug: BOOK_SLUG,
          userName: user.displayName || undefined,
        });
        return data({
          success: true,
          purchased: true,
          message: "Te enviamos un email con el enlace de descarga",
        });
      } catch (error) {
        console.error("[Resend Link] Error enviando email:", error);
        return data(
          { error: "Error enviando el email. Intenta de nuevo." },
          { status: 500 }
        );
      }
    }

    // No compró - verificar si es suscriptor
    const subscriber = await db.subscriber.findUnique({ where: { email } });

    if (subscriber) {
      // Ya es suscriptor pero no compró
      return data({
        success: false,
        purchased: false,
        isSubscriber: true,
        message:
          "No encontramos una compra con este email. Puedes comprar el libro para obtener acceso completo y el EPUB.",
      });
    }

    // No es suscriptor ni compró - ofrecer suscribirse
    // Crear suscriptor y enviar código de verificación
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await db.subscriber.upsert({
      where: { email },
      create: {
        email,
        confirmed: false,
        verificationCode: code,
        tags: [`${BOOK_SLUG}-interested`],
      },
      update: {
        verificationCode: code,
      },
    });

    await sendVerificationCode(email, code);

    return data({
      success: false,
      purchased: false,
      isSubscriber: false,
      needsVerification: true,
      message:
        "No encontramos una compra con este email. Te enviamos un código para suscribirte gratis y acceder a capítulos de muestra.",
    });
  }

  return null;
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const chapterSlug = url.searchParams.get("chapter") || "prologo";

  // Get access data using the centralized service
  const accessData = await getBookAccessData(request, BOOK_SLUG, chapterSlug);
  const bookConfig = BOOK_CONFIG[BOOK_SLUG];

  // Get access info for ALL chapters (for showing locks in TOC)
  const chaptersAccessInfo = await getAllChaptersAccessInfo(request, BOOK_SLUG);

  try {
    // Leer el archivo MD del capítulo
    const fs = await import("fs").then((m) => m.promises);
    const path = await import("path");
    const filePath = path.join(
      process.cwd(),
      "app",
      "content",
      bookConfig.contentPath,
      `${chapterSlug}.md`
    );
    const rawContent = await fs.readFile(filePath, "utf-8");

    // Si no tiene acceso, no enviar contenido
    const content = accessData.hasAccess ? rawContent : "";

    // Encontrar el capítulo actual y los adyacentes (excluyendo deshabilitados)
    const currentIndex = chapters.findIndex((c) => c.slug === chapterSlug);
    const currentChapter = chapters[currentIndex] || chapters[0];
    const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
    // Solo mostrar siguiente si no está deshabilitado
    const potentialNext =
      currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;
    const nextChapter =
      potentialNext && !(potentialNext as any).disabled ? potentialNext : null;

    return {
      content,
      currentChapter,
      prevChapter,
      nextChapter,
      chapters,
      // Access control from service
      ...accessData,
      chaptersAccessInfo,
      bookSlug: BOOK_SLUG,
      bookConfig,
      searchParams: {
        success: url.searchParams.get("success") === "1",
        subscribed: url.searchParams.get("subscribed") === "1",
      },
    };
  } catch (error) {
    // Si no se encuentra el capítulo, cargar el primero
    console.error(
      `[AI SDK Book] Error loading chapter "${chapterSlug}":`,
      error
    );
    const fs = await import("fs").then((m) => m.promises);
    const path = await import("path");
    const filePath = path.join(
      process.cwd(),
      "app",
      "content",
      bookConfig.contentPath,
      "prologo.md"
    );
    const content = await fs.readFile(filePath, "utf-8");

    return {
      content,
      currentChapter: chapters[0],
      prevChapter: null,
      nextChapter: chapters[1] || null,
      chapters,
      // Access control defaults
      hasAccess: true,
      accessLevel: "public",
      isSubscribed: false,
      isPurchased: false,
      hasFullAccess: false,
      showSubscriptionDrawer: false,
      showPurchaseDrawer: false,
      userEmail: null,
      chaptersAccessInfo,
      bookSlug: BOOK_SLUG,
      bookConfig,
      searchParams: {
        success: false,
        subscribed: false,
      },
    };
  }
};

export default function LibroAiSdk({ loaderData }: Route.ComponentProps) {
  const {
    content,
    currentChapter,
    prevChapter,
    nextChapter,
    chapters,
    hasAccess,
    accessLevel,
    showSubscriptionDrawer,
    showPurchaseDrawer,
    hasFullAccess,
    chaptersAccessInfo,
    bookSlug,
    bookConfig,
    searchParams,
  } = loaderData;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState("");
  const [headings, setHeadings] = useState<
    Array<{ id: string; text: string; level: number }>
  >([]);
  const [readingMode, setReadingMode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showEpubPurchaseDrawer, setShowEpubPurchaseDrawer] = useState(false);

  const handleDownloadEpub = async () => {
    // Si no tiene acceso completo, mostrar drawer de compra
    if (!hasFullAccess) {
      setShowEpubPurchaseDrawer(true);
      return;
    }

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
                    {bookConfig.title}
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
            chaptersAccessInfo={chaptersAccessInfo}
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
          chaptersAccessInfo={chaptersAccessInfo}
        />

        <article className="prose prose-lg max-w-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="pt-4"
          >
            {hasAccess ? (
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
            ) : (
              <LockedContentPlaceholder
                accessLevel={accessLevel}
                bookTitle={bookConfig.title}
                bookPrice={bookConfig.priceUSD}
              />
            )}
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

          {/* Sección para solicitar reenvío de link de descarga */}
          {!hasFullAccess && <ResendDownloadLink />}
        </article>
      </BookLayout>

      {/* Subscription Drawer - Para capítulos con accessLevel="subscriber" */}
      <AnimatePresence>
        {showSubscriptionDrawer && (
          <BookSubscriptionDrawer bookSlug={bookSlug} />
        )}
      </AnimatePresence>

      {/* Purchase Drawer - Para capítulos con accessLevel="paid" */}
      <AnimatePresence>
        {showPurchaseDrawer && (
          <BookPurchaseDrawer
            bookSlug={bookSlug}
            bookTitle={bookConfig.title}
            bookPrice={bookConfig.priceUSD}
            chaptersCount={bookConfig.chaptersCount}
            currency="USD"
          />
        )}
      </AnimatePresence>

      {/* EPUB Purchase Drawer - Para descargar EPUB sin haberlo comprado */}
      <AnimatePresence>
        {showEpubPurchaseDrawer && (
          <BookPurchaseDrawer
            bookSlug={bookSlug}
            bookTitle={bookConfig.title}
            bookPrice={bookConfig.priceUSD}
            chaptersCount={bookConfig.chaptersCount}
            onClose={() => setShowEpubPurchaseDrawer(false)}
            forEpub
            currency="USD"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Componente para mostrar contenido bloqueado
function LockedContentPlaceholder({
  accessLevel,
  bookTitle,
  bookPrice,
}: {
  accessLevel: string;
  bookTitle: string;
  bookPrice: number;
}) {
  const isPaid = accessLevel === "paid";

  if (isPaid) {
    return (
      <div className="flex items-start gap-8 py-12 px-4">
        <img
          src="/icons/colorRobot.svg"
          alt="Contenido bloqueado"
          className="w-32 h-32 opacity-80 flex-shrink-0 hidden sm:block"
        />
        <div className="max-w-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Este capítulo requiere comprar el libro
          </h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Desbloquea todo el contenido de <strong>{bookTitle}</strong> incluyendo
            todos los capítulos, código descargable y el EPUB completo por solo{" "}
            <span className="font-bold text-[#3178C6]">
              ${(bookPrice / 100).toLocaleString("en-US")} USD
            </span>
          </p>
          <form method="post">
            <input type="hidden" name="intent" value="checkout" />
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#3178C6] text-white font-semibold rounded-xl hover:bg-[#2563eb] transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <FaShoppingCart className="w-5 h-5" />
              Comprar libro completo
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Para suscriptores: mostrar formulario de suscripción
  return <SubscriptionForm />;
}

// Formulario de suscripción inline para capítulos de suscriptor
function SubscriptionForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const fetcher = useFetcher();
  const isLoading = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.step === "verify") {
      setStep("code");
    }
    if (fetcher.data?.verified) {
      window.location.reload();
    }
  }, [fetcher.data]);

  return (
    <div className="flex items-start gap-8 py-12 px-4">
      <img
        src="/icons/colorRobot.svg"
        alt="Suscríbete"
        className="w-32 h-32 opacity-80 flex-shrink-0 hidden sm:block"
      />
      <div className="max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {step === "email"
            ? "Suscríbete gratis para leer este capítulo"
            : "Ingresa el código de verificación"}
        </h2>

        {step === "email" ? (
          <>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Ingresa tu email para desbloquear este capítulo y recibir contenido
              exclusivo sobre desarrollo con IA.
            </p>
            <fetcher.Form method="POST" className="space-y-4">
              <input type="hidden" name="intent" value="subscribe" />
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#3178C6] focus:ring-2 focus:ring-[#3178C6]/20"
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#3178C6] text-white font-semibold rounded-xl hover:bg-[#2563eb] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {isLoading ? "Enviando..." : "Suscribirme gratis"}
              </button>
            </fetcher.Form>
          </>
        ) : (
          <>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Enviamos un código de 6 dígitos a{" "}
              <strong className="text-gray-900">{email}</strong>
            </p>
            <fetcher.Form method="POST" className="space-y-4">
              <input type="hidden" name="intent" value="verify" />
              <input type="hidden" name="email" value={email} />
              <input
                type="text"
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#3178C6] focus:ring-2 focus:ring-[#3178C6]/20 text-center text-2xl tracking-widest"
                required
              />
              {fetcher.data?.error && (
                <p className="text-red-500 text-sm">{fetcher.data.error}</p>
              )}
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#3178C6] text-white font-semibold rounded-xl hover:bg-[#2563eb] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {isLoading ? "Verificando..." : "Verificar código"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  Usar otro email
                </button>
              </div>
            </fetcher.Form>
          </>
        )}
      </div>
    </div>
  );
}

// Componente para solicitar reenvío del link de descarga
function ResendDownloadLink() {
  const [email, setEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [showVerify, setShowVerify] = useState(false);
  const fetcher = useFetcher();
  const isLoading = fetcher.state !== "idle";

  const result = fetcher.data as {
    success?: boolean;
    purchased?: boolean;
    isSubscriber?: boolean;
    needsVerification?: boolean;
    message?: string;
    error?: string;
    verified?: boolean;
  } | null;

  // Si se verificó exitosamente, recargar
  useEffect(() => {
    if (result?.verified) {
      window.location.reload();
    }
  }, [result?.verified]);

  // Mostrar formulario de verificación si lo requiere
  useEffect(() => {
    if (result?.needsVerification) {
      setShowVerify(true);
    }
  }, [result?.needsVerification]);

  return (
    <div className="border-t border-gray-200 pt-8 mt-8">
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          ¿Ya compraste el libro?
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          Si compraste el libro y no encuentras tu email de descarga, ingresa tu
          email y te enviamos un nuevo enlace.
        </p>

        {!showVerify ? (
          <fetcher.Form method="POST" className="space-y-4">
            <input type="hidden" name="intent" value="resend-link" />
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#3178C6] focus:ring-2 focus:ring-[#3178C6]/20"
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50"
              >
                {isLoading ? "Verificando..." : "Reenviar enlace"}
              </button>
            </div>
          </fetcher.Form>
        ) : (
          <fetcher.Form method="POST" className="space-y-4">
            <input type="hidden" name="intent" value="verify" />
            <input type="hidden" name="email" value={email} />
            <p className="text-sm text-gray-600">
              Te enviamos un código a <strong>{email}</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                name="code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#3178C6] focus:ring-2 focus:ring-[#3178C6]/20 text-center tracking-widest"
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-[#3178C6] text-white font-medium rounded-lg hover:bg-[#2563eb] transition-all disabled:opacity-50"
              >
                {isLoading ? "Verificando..." : "Verificar"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowVerify(false);
                setVerifyCode("");
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Usar otro email
            </button>
          </fetcher.Form>
        )}

        {/* Mensajes de resultado */}
        {result?.message && (
          <div
            className={`mt-4 p-4 rounded-lg text-sm ${
              result.success
                ? "bg-green-50 text-green-800 border border-green-200"
                : result.purchased === false && !result.needsVerification
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : "bg-blue-50 text-blue-800 border border-blue-200"
            }`}
          >
            {result.message}
            {result.isSubscriber && (
              <form method="post" className="mt-3">
                <input type="hidden" name="intent" value="checkout" />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#3178C6] text-white text-sm font-medium rounded-lg hover:bg-[#2563eb] transition-all"
                >
                  <FaShoppingCart className="w-4 h-4" />
                  Comprar libro completo
                </button>
              </form>
            )}
          </div>
        )}

        {result?.error && (
          <div className="mt-4 p-4 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
            {result.error}
          </div>
        )}
      </div>
    </div>
  );
}
