import { redirect } from "react-router";
import type { Route } from "./+types/blog-editor";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { db } from "~/.server/db";
import { ModernEditor } from "~/components/blog/ModernEditor";
import { MetadataPanel } from "~/components/blog/MetadataPanel";
import { useEffect, useState, useCallback } from "react";
import {
  Settings,
  ArrowLeft,
  Save,
  Eye,
  Loader2,
  Check,
  Clock,
  Sparkles,
} from "lucide-react";

// Convertir markdown a Tiptap JSON
function markdownToTiptap(markdown: string) {
  if (!markdown) return null;

  const lines = markdown.split("\n");
  const content: any[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Headings (H1-H6)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      content.push({
        type: "heading",
        attrs: { level },
        content: parseInlineMarks(text),
      });
      i++;
      continue;
    }

    // Code block
    if (line.startsWith("```")) {
      const langMatch = line.match(/^```(\w*)$/);
      const language = langMatch?.[1] || "";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      content.push({
        type: "codeBlock",
        attrs: { language },
        content: codeLines.length > 0 ? [{ type: "text", text: codeLines.join("\n") }] : [],
      });
      i++;
      continue;
    }

    // Blockquote (puede ser multi-línea)
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      content.push({
        type: "blockquote",
        content: quoteLines.map((ql) => ({
          type: "paragraph",
          content: parseInlineMarks(ql),
        })),
      });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: any[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s/, "");
        items.push({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: parseInlineMarks(itemText),
            },
          ],
        });
        i++;
      }
      content.push({
        type: "orderedList",
        content: items,
      });
      continue;
    }

    // Bullet list
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: any[] = [];
      while (
        i < lines.length &&
        (lines[i].startsWith("- ") || lines[i].startsWith("* "))
      ) {
        const itemText = lines[i].slice(2);
        items.push({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: parseInlineMarks(itemText),
            },
          ],
        });
        i++;
      }
      content.push({
        type: "bulletList",
        content: items,
      });
      continue;
    }

    // Image
    const imageMatch = line.match(/^!\[(.*?)\]\((.*?)(?:\s+"(.*?)")?\)$/);
    if (imageMatch) {
      content.push({
        type: "image",
        attrs: {
          src: imageMatch[2],
          alt: imageMatch[1] || "",
          title: imageMatch[3] || null,
        },
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (line === "---" || line === "***" || line === "___") {
      content.push({ type: "horizontalRule" });
      i++;
      continue;
    }

    // Regular paragraph
    if (line.trim()) {
      content.push({
        type: "paragraph",
        content: parseInlineMarks(line),
      });
    }

    i++;
  }

  return { type: "doc", content };
}

// Parsear marks inline: **bold**, *italic*, `code`, [link](url), ~~strike~~
function parseInlineMarks(text: string): any[] {
  if (!text) return [];

  const result: any[] = [];
  let remaining = text;

  // Regex para detectar patrones inline
  const patterns = [
    // Links: [text](url)
    { regex: /\[([^\]]+)\]\(([^)]+)\)/, type: "link" },
    // Bold: **text** o __text__
    { regex: /\*\*([^*]+)\*\*|__([^_]+)__/, type: "bold" },
    // Italic: *text* o _text_
    { regex: /\*([^*]+)\*|_([^_]+)_/, type: "italic" },
    // Code: `text`
    { regex: /`([^`]+)`/, type: "code" },
    // Strike: ~~text~~
    { regex: /~~([^~]+)~~/, type: "strike" },
  ];

  while (remaining.length > 0) {
    let earliestMatch: { index: number; length: number; content: string; type: string; href?: string } | null = null;

    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex);
      if (match && match.index !== undefined) {
        const matchContent = match[1] || match[2];
        if (!earliestMatch || match.index < earliestMatch.index) {
          earliestMatch = {
            index: match.index,
            length: match[0].length,
            content: matchContent,
            type: pattern.type,
            href: pattern.type === "link" ? match[2] : undefined,
          };
        }
      }
    }

    if (earliestMatch) {
      // Añadir texto antes del match
      if (earliestMatch.index > 0) {
        result.push({ type: "text", text: remaining.slice(0, earliestMatch.index) });
      }

      // Añadir el texto con mark
      const marks: any[] = [];
      if (earliestMatch.type === "bold") {
        marks.push({ type: "bold" });
      } else if (earliestMatch.type === "italic") {
        marks.push({ type: "italic" });
      } else if (earliestMatch.type === "code") {
        marks.push({ type: "code" });
      } else if (earliestMatch.type === "strike") {
        marks.push({ type: "strike" });
      } else if (earliestMatch.type === "link") {
        marks.push({ type: "link", attrs: { href: earliestMatch.href } });
      }

      result.push({
        type: "text",
        text: earliestMatch.content,
        marks,
      });

      remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
    } else {
      // No más matches, añadir el resto como texto plano
      result.push({ type: "text", text: remaining });
      break;
    }
  }

  return result.length > 0 ? result : [{ type: "text", text: "" }];
}

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  await getAdminOrRedirect(request);

  let post = null;
  if (params.postId && params.postId !== "new") {
    post = await db.post.findUnique({
      where: { id: params.postId },
    });
    if (!post) throw new Response("Post not found", { status: 404 });
  }

  return { post };
};

export const action = async ({ request, params }: Route.ActionArgs) => {
  await getAdminOrRedirect(request);
  return new Response(null);
};

export default function BlogEditor({ loaderData }: Route.ComponentProps) {
  const { post } = loaderData;

  // Si es post antiguo con markdown, convertir a Tiptap
  const contentToUse =
    post?.content || (post?.body ? markdownToTiptap(post.body) : null);

  const [content, setContent] = useState(contentToUse);
  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [youtubeLink, setYoutubeLink] = useState(
    post?.youtubeLink && post.youtubeLink !== "youtubeLink"
      ? post.youtubeLink
      : ""
  );
  const [metaImage, setMetaImage] = useState(
    post?.metaImage && post.metaImage !== "youtubeLink"
      ? post.metaImage
      : post?.coverImage || ""
  );
  const [author, setAuthor] = useState(
    post?.authorName === "BrendaGo" ? "brendi" : post?.authorName === "David Zavala" ? "david" : "bliss"
  );
  const [tags, setTags] = useState<string[]>(
    Array.isArray(post?.tags) ? post.tags : []
  );
  const [mainTag, setMainTag] = useState(post?.mainTag || "");

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );

  // Sincronizar datos del post cuando se carga
  useEffect(() => {
    if (post) {
      const contentData =
        post.content || (post.body ? markdownToTiptap(post.body) : null);
      setContent(contentData);
      setTitle(post.title || "");
      setSlug(post.slug || "");
      setYoutubeLink(
        post.youtubeLink && post.youtubeLink !== "youtubeLink"
          ? post.youtubeLink
          : ""
      );
      setMetaImage(
        post.metaImage && post.metaImage !== "youtubeLink"
          ? post.metaImage
          : post.coverImage || ""
      );
      setAuthor(post.authorName === "BrendaGo" ? "brendi" : post.authorName === "David Zavala" ? "david" : "bliss");
      setTags(Array.isArray(post.tags) ? post.tags : []);
      setMainTag(post.mainTag || "");
    }
  }, [post]);

  // Auto-save (debounced)
  useEffect(() => {
    if (!content || !title || !slug) return;

    const timeoutId = setTimeout(() => {
      handleSave(true); // silent save
    }, 30000); // 30 segundos

    return () => clearTimeout(timeoutId);
  }, [content, title, slug]);

  const handleSave = async (silent = false) => {
    if (!content || !title || !slug) {
      if (!silent) alert("Título, slug y contenido son requeridos");
      return;
    }

    setIsSaving(true);
    setSaveStatus("saving");

    try {
      const response = await fetch("/api/blog.save-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post?.id || null,
          title,
          slug,
          content,
          contentFormat: "tiptap",
          youtubeLink: youtubeLink || null,
          metaImage: metaImage || null,
          author,
          tags,
          mainTag,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error saving post");
      }

      setLastSaved(new Date());
      setSaveStatus("saved");

      if (!silent) {
        const result = await response.json();
        // Update URL if it's a new post
        if (!post?.id && result.id) {
          window.history.replaceState(null, "", `/admin/blog-editor/${result.id}`);
        }
      }

      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Save error:", error);
      if (!silent) {
        alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
      setSaveStatus("idle");
    } finally {
      setIsSaving(false);
    }
  };

  // AI Command handler
  const handleAICommand = useCallback(
    async (command: string, text: string): Promise<string> => {
      const prompts: Record<string, string> = {
        continue: `Continúa escribiendo este texto de manera natural y coherente. Mantén el mismo tono y estilo:\n\n${text}\n\nContinuación:`,
        improve: `Mejora este texto sin cambiar el significado. Enfócate en claridad, tono profesional y fluidez:\n\n${text}`,
        expand: `Expande este párrafo con más detalles, ejemplos prácticos y contexto:\n\n${text}`,
        shorten: `Condensa este texto manteniendo la idea principal. Sé conciso:\n\n${text}`,
        translate: `Traduce este texto del inglés al español de manera natural:\n\n${text}`,
      };

      const response = await fetch("/api/ai.text-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command,
          text,
          prompt: prompts[command] || text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const { result } = await response.json();
      return result;
    },
    []
  );

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top Bar - Minimal */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800/50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left - Back + Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <a
              href="/admin/posts"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition shrink-0"
            >
              <ArrowLeft size={18} />
              <span className="text-sm hidden sm:inline">Posts</span>
            </a>

            {title && (
              <>
                <span className="text-gray-700">/</span>
                <span className="text-gray-400 text-sm truncate max-w-[200px] md:max-w-[300px]">
                  {title}
                </span>
              </>
            )}
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-2">
            {/* Save Status */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mr-2">
              {saveStatus === "saving" && (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span className="hidden sm:inline">Guardando...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <Check size={14} className="text-green-500" />
                  <span className="hidden sm:inline text-green-500">Guardado</span>
                </>
              )}
              {saveStatus === "idle" && lastSaved && (
                <>
                  <Clock size={14} />
                  <span className="hidden sm:inline">
                    {lastSaved.toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </>
              )}
            </div>

            {/* Preview */}
            {slug && (
              <a
                href={`/blog/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
                title="Preview"
              >
                <Eye size={18} />
              </a>
            )}

            {/* Settings */}
            <button
              onClick={() => setIsPanelOpen(true)}
              className={`p-2 rounded-lg transition ${
                isPanelOpen
                  ? "text-indigo-400 bg-indigo-600/20"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
              title="Configuración (⌘,)"
            >
              <Settings size={18} />
            </button>

            {/* Save */}
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving || !title || !slug}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition text-white text-sm font-medium"
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              <span className="hidden sm:inline">Guardar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Editor */}
      <main className="pt-20 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Title - Large */}
          <textarea
            rows={1}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título del post..."
            className="w-full bg-transparent text-white text-4xl md:text-5xl font-bold placeholder-gray-700 focus:outline-none mb-8 leading-tight resize-none overflow-hidden"
            onInput={(e) => {
              const target = e.currentTarget;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
          />

          {/* Subtitle/Meta line */}
          <div className="flex items-center gap-4 mb-8 text-sm text-gray-500">
            <span>
              Por{" "}
              <span className="text-gray-400">
                {author === "bliss" ? "Héctorbliss" : author === "david" ? "David Zavala" : "BrendaGo"}
              </span>
            </span>
            {tags.length > 0 && (
              <>
                <span>•</span>
                <span className="text-indigo-400">#{mainTag || tags[0]}</span>
              </>
            )}
            {!slug && (
              <>
                <span>•</span>
                <button
                  onClick={() => setIsPanelOpen(true)}
                  className="text-orange-400 hover:text-orange-300"
                >
                  Configura el slug para publicar →
                </button>
              </>
            )}
          </div>

          {/* Editor */}
          <div className="prose-container">
            <ModernEditor
              content={content || undefined}
              onChange={setContent}
              onAICommand={handleAICommand}
            />
          </div>
        </div>
      </main>

      {/* Metadata Panel */}
      <MetadataPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title={title}
        setTitle={setTitle}
        slug={slug}
        setSlug={setSlug}
        metaImage={metaImage}
        setMetaImage={setMetaImage}
        youtubeLink={youtubeLink}
        setYoutubeLink={setYoutubeLink}
        author={author}
        setAuthor={setAuthor}
        tags={tags}
        setTags={setTags}
        mainTag={mainTag}
        setMainTag={setMainTag}
      />

      {/* Backdrop when panel is open */}
      {isPanelOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsPanelOpen(false)}
        />
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="fixed bottom-4 right-4 z-20">
        <button
          onClick={() => {}}
          className="group relative p-2 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition text-gray-500 hover:text-gray-300"
          title="Atajos de teclado"
        >
          <Sparkles size={16} />
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl text-xs text-left whitespace-nowrap">
              <div className="font-medium text-white mb-2">Atajos</div>
              <div className="space-y-1 text-gray-400">
                <div>
                  <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300">
                    /
                  </kbd>{" "}
                  Insertar bloque
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300">
                    ⌘B
                  </kbd>{" "}
                  Bold
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300">
                    ⌘I
                  </kbd>{" "}
                  Italic
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300">
                    ⌘K
                  </kbd>{" "}
                  Link
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Custom styles for the editor */}
      <style>{`
        .prose-container {
          font-size: 1.125rem;
          line-height: 1.75;
        }

        .prose-container h2 {
          font-size: 1.875rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: white;
        }

        .prose-container h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: white;
        }

        .prose-container p {
          color: #d1d5db;
          margin-bottom: 1rem;
        }

        .prose-container a {
          color: #818cf8;
          text-decoration: underline;
        }

        .prose-container code {
          background: #1f2937;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }

        .prose-container pre {
          background: #111827;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
        }

        .prose-container pre code {
          background: transparent;
          padding: 0;
        }

        .prose-container blockquote {
          border-left: 4px solid #6366f1;
          padding-left: 1rem;
          font-style: italic;
          color: #9ca3af;
        }

        .prose-container ul,
        .prose-container ol {
          padding-left: 1.5rem;
          color: #d1d5db;
        }

        .prose-container li {
          margin-bottom: 0.25rem;
        }

        .prose-container hr {
          border-color: #374151;
          margin: 2rem 0;
        }

        .prose-container img {
          border-radius: 0.5rem;
          margin: 1.5rem 0;
        }

        /* Task list styles */
        .prose-container ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }

        .prose-container li[data-type="taskItem"] {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .prose-container li[data-type="taskItem"] input[type="checkbox"] {
          margin-top: 0.25rem;
          accent-color: #6366f1;
        }

        /* Placeholder styles */
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #4b5563;
          pointer-events: none;
          height: 0;
        }

        /* Focus styles */
        .ProseMirror:focus {
          outline: none;
        }

        /* Selection highlight */
        .ProseMirror ::selection {
          background: rgba(99, 102, 241, 0.3);
        }
      `}</style>
    </div>
  );
}
