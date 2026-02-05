import { redirect } from "react-router";
import type { Route } from "./+types/blog-editor";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { db } from "~/.server/db";
import { MetadataPanel } from "~/components/blog/MetadataPanel";
import { useEffect, useState, useRef } from "react";
import {
  Settings,
  ArrowLeft,
  Save,
  Eye,
  Loader2,
  Check,
  Clock,
  Columns,
  Maximize2,
  Code,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";

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

  const [body, setBody] = useState(post?.body || "");
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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [viewMode, setViewMode] = useState<"split" | "editor" | "preview">("split");
  const [previewBody, setPreviewBody] = useState(post?.body || "");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Debounce preview update
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPreviewBody(body);
    }, 300);
    return () => clearTimeout(timeout);
  }, [body]);

  // Sincronizar datos del post cuando se carga
  useEffect(() => {
    if (post) {
      setBody(post.body || "");
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
    if (!body || !title || !slug) return;

    const timeoutId = setTimeout(() => {
      handleSave(true); // silent save
    }, 30000); // 30 segundos

    return () => clearTimeout(timeoutId);
  }, [body, title, slug]);

  const handleSave = async (silent = false) => {
    if (!body || !title || !slug) {
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
          body, // Markdown directo
          contentFormat: "markdown",
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setIsPanelOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [body, title, slug]);

  // Insert markdown helper
  const insertMarkdown = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.slice(start, end);

    const newText = body.slice(0, start) + before + selectedText + after + body.slice(end);
    setBody(newText);

    // Set cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800/50">
        <div className="max-w-[1800px] mx-auto px-4 h-14 flex items-center justify-between">
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

          {/* Center - View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode("editor")}
              className={`p-1.5 rounded transition ${
                viewMode === "editor"
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Solo editor"
            >
              <Code size={16} />
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`p-1.5 rounded transition ${
                viewMode === "split"
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Editor + Preview"
            >
              <Columns size={16} />
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`p-1.5 rounded transition ${
                viewMode === "preview"
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Solo preview"
            >
              <Maximize2 size={16} />
            </button>
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

            {/* Preview link */}
            {slug && (
              <a
                href={`/blog/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
                title="Ver en sitio"
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

      {/* Main Content */}
      <main className="pt-14 h-screen flex">
        {/* Editor Panel */}
        {(viewMode === "editor" || viewMode === "split") && (
          <div className={`flex flex-col ${viewMode === "split" ? "w-1/2" : "w-full"} border-r border-gray-800`}>
            {/* Title Input */}
            <div className="p-4 border-b border-gray-800">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título del post..."
                className="w-full bg-transparent text-white text-2xl font-bold placeholder-gray-600 focus:outline-none"
              />
            </div>

            {/* Markdown Toolbar */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-800 bg-gray-900/50">
              <button
                onClick={() => insertMarkdown("**", "**")}
                className="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded text-sm font-bold"
                title="Bold (⌘B)"
              >
                B
              </button>
              <button
                onClick={() => insertMarkdown("*", "*")}
                className="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded text-sm italic"
                title="Italic (⌘I)"
              >
                I
              </button>
              <button
                onClick={() => insertMarkdown("[", "](url)")}
                className="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded text-sm underline"
                title="Link"
              >
                Link
              </button>
              <div className="w-px h-4 bg-gray-700 mx-1" />
              <button
                onClick={() => insertMarkdown("## ")}
                className="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded text-sm"
                title="Heading 2"
              >
                H2
              </button>
              <button
                onClick={() => insertMarkdown("### ")}
                className="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded text-sm"
                title="Heading 3"
              >
                H3
              </button>
              <div className="w-px h-4 bg-gray-700 mx-1" />
              <button
                onClick={() => insertMarkdown("```\n", "\n```")}
                className="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded text-sm font-mono"
                title="Code Block"
              >
                {"</>"}
              </button>
              <button
                onClick={() => insertMarkdown("`", "`")}
                className="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded text-sm font-mono"
                title="Inline Code"
              >
                code
              </button>
              <div className="w-px h-4 bg-gray-700 mx-1" />
              <button
                onClick={() => insertMarkdown("- ")}
                className="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded text-sm"
                title="List"
              >
                • List
              </button>
              <button
                onClick={() => insertMarkdown("> ")}
                className="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded text-sm"
                title="Quote"
              >
                " Quote
              </button>
              <button
                onClick={() => insertMarkdown("| Col 1 | Col 2 | Col 3 |\n|-------|-------|-------|\n| A | B | C |\n")}
                className="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded text-sm"
                title="Table"
              >
                ⊞ Table
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe en markdown..."
              className="flex-1 w-full p-4 bg-gray-950 text-gray-300 font-mono text-sm leading-relaxed resize-none focus:outline-none"
              spellCheck={false}
            />
          </div>
        )}

        {/* Preview Panel */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className={`flex flex-col ${viewMode === "split" ? "w-1/2" : "w-full"} bg-gray-900`}>
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <span className="text-sm text-gray-500 font-medium">Preview</span>
              <span className="text-xs text-gray-600">Shiki + GitHub Light</span>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <article className="max-w-3xl mx-auto">
                {title && (
                  <h1 className="text-4xl font-bold text-white mb-6">{title}</h1>
                )}
                <div className="dark prose prose-lg prose-invert max-w-none">
                  <Streamdown
                    key={previewBody.slice(0, 50)}
                    plugins={{ code }}
                    shikiTheme={["dracula", "dracula"]}
                  >
                    {previewBody}
                  </Streamdown>
                </div>
              </article>
            </div>
          </div>
        )}
      </main>

      {/* Backdrop when panel is open */}
      {isPanelOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsPanelOpen(false)}
        />
      )}

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

      {/* Keyboard shortcuts hint */}
      <div className="fixed bottom-4 left-4 text-xs text-gray-600">
        <span className="hidden md:inline">⌘S guardar • ⌘, configuración</span>
      </div>
    </div>
  );
}
