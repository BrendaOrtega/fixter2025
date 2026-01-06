import { useState } from "react";
import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import type { Route } from "./+types/libros";
import { useFetcher } from "react-router";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { db } from "~/.server/db";
import { BOOK_CONFIG } from "~/.server/services/book-access.server";
import { AdminNav } from "~/components/admin/AdminNav";
import { cn } from "~/utils/cn";
import { FaBook, FaLock, FaEnvelope, FaGlobe, FaSave, FaExternalLinkAlt } from "react-icons/fa";
import { Link } from "react-router";
import { motion } from "motion/react";

// Definición de libros y sus capítulos (títulos desde BOOK_CONFIG)
const BOOKS = [
  {
    slug: "ai-sdk" as const,
    title: BOOK_CONFIG["ai-sdk"].title,
    url: "/libros/ai_sdk",
    chapters: [
      { slug: "prologo", title: "Prólogo" },
      { slug: "introduccion", title: "Introducción" },
      { slug: "capitulo-01", title: "Tu Primera Inferencia con IA" },
      { slug: "capitulo-02", title: "React y el Hook useChat" },
      { slug: "capitulo-03", title: "Dentro del Streaming" },
      { slug: "capitulo-04", title: "React Router v7 — Tu Chat Full-Stack" },
      { slug: "capitulo-05", title: "Structured Output — Respuestas Tipadas" },
      { slug: "capitulo-06", title: "Tools — Dándole Manos al Modelo" },
      { slug: "capitulo-07", title: "Agentes — Encapsulando la Inteligencia" },
      { slug: "capitulo-08", title: "generateImage — Creando Imágenes con Código" },
      { slug: "capitulo-09", title: "Embeddings — Búsqueda Semántica" },
      { slug: "capitulo-10", title: "RAG — Retrieval Augmented Generation" },
      { slug: "capitulo-11", title: "Agentic RAG — Agentes con Conocimiento" },
      { slug: "capitulo-12", title: "Audio y Speech — Voz e IA" },
    ],
  },
  {
    slug: "domina-claude-code" as const,
    title: BOOK_CONFIG["domina-claude-code"].title,
    url: "/libros/domina_claude_code",
    chapters: [
      { slug: "prologo", title: "Prólogo" },
      { slug: "introduccion", title: "Introducción" },
      { slug: "capitulo-01", title: "Fundamentos para administrar mejor el contexto" },
      { slug: "capitulo-02", title: "SDK - Automatización y Scripting" },
      { slug: "capitulo-03", title: "CLAUDE.md - La Memoria Persistente" },
      { slug: "capitulo-04", title: "Comandos CLI Básicos" },
      { slug: "capitulo-05", title: "Slash Commands Completos" },
      { slug: "capitulo-06", title: "Git Worktree - Desarrollo en paralelo" },
      { slug: "capitulo-07", title: "Usando GitHub MCP Básicamente" },
      { slug: "capitulo-08", title: "Usando GitHub MCP de Forma Avanzada" },
      { slug: "capitulo-09", title: "Entendiendo los JSON MCPs" },
      { slug: "capitulo-10", title: "Fundamentos de SubAgentes" },
      { slug: "capitulo-11", title: "SubAgentes Avanzados" },
      { slug: "capitulo-12", title: "El Camino Hacia Adelante" },
    ],
  },
  {
    slug: "llamaindex" as const,
    title: BOOK_CONFIG["llamaindex"].title,
    url: "/libros/llamaindex",
    chapters: [
      { slug: "prologo", title: "Prólogo" },
      { slug: "introduccion", title: "Introducción" },
      { slug: "capitulo-01", title: "Primeros Pasos" },
      { slug: "capitulo-02", title: "Documentos y Nodos" },
      { slug: "capitulo-03", title: "Índices y Retrievers" },
      { slug: "capitulo-04", title: "Query Engines" },
      { slug: "capitulo-05", title: "Agentes con LlamaIndex" },
      { slug: "capitulo-06", title: "Workflows" },
      { slug: "capitulo-07", title: "Proyecto Final" },
    ],
  },
];

type AccessLevel = "public" | "subscriber" | "paid";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await getAdminOrRedirect(request);

  // Obtener todos los accesos configurados
  const accessLevels = await db.bookChapterAccess.findMany();

  // Crear un mapa para fácil acceso
  const accessMap: Record<string, AccessLevel> = {};
  accessLevels.forEach((a) => {
    accessMap[`${a.bookSlug}:${a.chapterSlug}`] = a.accessLevel as AccessLevel;
  });

  return { accessMap };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await getAdminOrRedirect(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "update_access") {
    const bookSlug = formData.get("bookSlug") as string;
    const chapterSlug = formData.get("chapterSlug") as string;
    const accessLevel = formData.get("accessLevel") as AccessLevel;

    await db.bookChapterAccess.upsert({
      where: {
        bookSlug_chapterSlug: {
          bookSlug,
          chapterSlug,
        },
      },
      create: {
        bookSlug,
        chapterSlug,
        accessLevel,
      },
      update: {
        accessLevel,
      },
    });

    return { success: true, message: `Acceso actualizado: ${chapterSlug} → ${accessLevel}` };
  }

  if (intent === "bulk_update") {
    const bookSlug = formData.get("bookSlug") as string;
    const updates = JSON.parse(formData.get("updates") as string) as Array<{
      chapterSlug: string;
      accessLevel: AccessLevel;
    }>;

    // Actualizar todos los capítulos
    for (const update of updates) {
      await db.bookChapterAccess.upsert({
        where: {
          bookSlug_chapterSlug: {
            bookSlug,
            chapterSlug: update.chapterSlug,
          },
        },
        create: {
          bookSlug,
          chapterSlug: update.chapterSlug,
          accessLevel: update.accessLevel,
        },
        update: {
          accessLevel: update.accessLevel,
        },
      });
    }

    return { success: true, message: `${updates.length} capítulos actualizados` };
  }

  return { error: "Intent no reconocido" };
};

export default function AdminLibros({ loaderData }: Route.ComponentProps) {
  const { accessMap } = loaderData;
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [localAccess, setLocalAccess] = useState<Record<string, AccessLevel>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const fetcher = useFetcher();

  const book = BOOKS.find((b) => b.slug === selectedBook);

  const getAccessLevel = (bookSlug: string, chapterSlug: string): AccessLevel => {
    const key = `${bookSlug}:${chapterSlug}`;
    return localAccess[key] ?? accessMap[key] ?? "public";
  };

  const handleAccessChange = (chapterSlug: string, level: AccessLevel) => {
    if (!selectedBook) return;
    const key = `${selectedBook}:${chapterSlug}`;
    setLocalAccess((prev) => ({ ...prev, [key]: level }));
    setHasChanges(true);
  };

  const handleSaveAll = () => {
    if (!selectedBook || !book) return;

    const updates = book.chapters.map((chapter) => ({
      chapterSlug: chapter.slug,
      accessLevel: getAccessLevel(selectedBook, chapter.slug),
    }));

    fetcher.submit(
      {
        intent: "bulk_update",
        bookSlug: selectedBook,
        updates: JSON.stringify(updates),
      },
      { method: "POST" }
    );

    setHasChanges(false);
  };

  const getAccessIcon = (level: AccessLevel) => {
    switch (level) {
      case "public":
        return <FaGlobe className="text-green-500" />;
      case "subscriber":
        return <FaEnvelope className="text-blue-500" />;
      case "paid":
        return <FaLock className="text-amber-500" />;
    }
  };

  const getAccessColor = (level: AccessLevel) => {
    switch (level) {
      case "public":
        return "bg-green-100 border-green-300 text-green-800";
      case "subscriber":
        return "bg-blue-100 border-blue-300 text-blue-800";
      case "paid":
        return "bg-amber-100 border-amber-300 text-amber-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <AdminNav />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FaBook className="text-purple-400" />
            Admin de Libros
          </h1>
          <p className="text-gray-400 mt-2">
            Gestiona los niveles de acceso por capítulo
          </p>
        </header>

        {/* Selector de libro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {BOOKS.map((b) => (
            <div
              key={b.slug}
              className={cn(
                "p-4 rounded-lg border-2 transition-all",
                selectedBook === b.slug
                  ? "border-purple-500 bg-purple-900/30"
                  : "border-gray-700 bg-gray-800 hover:border-gray-600"
              )}
            >
              <button
                onClick={() => {
                  setSelectedBook(b.slug);
                  setHasChanges(false);
                  setLocalAccess({});
                }}
                className="w-full text-left"
              >
                <h3 className="font-semibold text-white">{b.title}</h3>
                <p className="text-sm text-gray-400">{b.chapters.length} capítulos</p>
              </button>
              <Link
                to={b.url}
                target="_blank"
                className="mt-3 flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                <FaExternalLinkAlt className="w-3 h-3" />
                Ver libro
              </Link>
            </div>
          ))}
        </div>

        {/* Lista de capítulos */}
        {book && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">{book.title}</h2>
              {hasChanges && (
                <button
                  onClick={handleSaveAll}
                  disabled={fetcher.state !== "idle"}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg transition-colors"
                >
                  <FaSave />
                  {fetcher.state !== "idle" ? "Guardando..." : "Guardar cambios"}
                </button>
              )}
            </div>

            {/* Leyenda */}
            <div className="px-6 py-3 bg-gray-750 border-b border-gray-700 flex gap-6 text-sm">
              <span className="flex items-center gap-2 text-green-400">
                <FaGlobe /> Public - Gratis
              </span>
              <span className="flex items-center gap-2 text-blue-400">
                <FaEnvelope /> Subscriber - Con email
              </span>
              <span className="flex items-center gap-2 text-amber-400">
                <FaLock /> Paid - De pago
              </span>
            </div>

            <div className="divide-y divide-gray-700">
              {book.chapters.map((chapter, index) => {
                const level = getAccessLevel(book.slug, chapter.slug);
                return (
                  <div
                    key={chapter.slug}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500 text-sm w-8">
                        {index + 1}.
                      </span>
                      <div>
                        <h3 className="text-white font-medium">{chapter.title}</h3>
                        <p className="text-xs text-gray-500">{chapter.slug}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(["public", "subscriber", "paid"] as AccessLevel[]).map(
                        (accessLevel) => (
                          <button
                            key={accessLevel}
                            onClick={() =>
                              handleAccessChange(chapter.slug, accessLevel)
                            }
                            className={cn(
                              "px-3 py-1.5 rounded-lg border text-sm font-medium transition-all flex items-center gap-1.5",
                              level === accessLevel
                                ? getAccessColor(accessLevel)
                                : "bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600"
                            )}
                          >
                            {getAccessIcon(accessLevel)}
                            <span className="capitalize">{accessLevel}</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Mensaje de éxito */}
        {fetcher.data?.success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg"
          >
            {fetcher.data.message}
          </motion.div>
        )}
      </div>
    </div>
  );
}
