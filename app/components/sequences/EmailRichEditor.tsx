import { useCallback, useEffect, useMemo, useRef } from "react";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  Heading2,
  Heading3,
  List,
  Quote,
} from "lucide-react";
import { splitEmailBody, joinEmailBody } from "~/utils/emailBody";
import {
  PreserveStyles,
  RawHtmlBlock,
  serializeEmailHtml,
} from "./emailTiptapExtensions";

/**
 * Editor rico para el cuerpo de un correo de secuencia, al estilo de Notion:
 * sin barra fija, con el menú apareciendo sobre la selección.
 *
 * Trabaja SOLO con el cuerpo. Lo que se guarda en la base es un documento
 * completo —doctype, tablas del layout, logo, footer— y eso ni se muestra ni se
 * toca: se parte al abrir y se vuelve a armar al escribir. Ver `emailBody.ts`.
 */
export function EmailRichEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  // El shell se calcula una vez por documento y se conserva íntegro.
  const shell = useMemo(() => splitEmailBody(value), [value]);
  const shellRef = useRef(shell);
  shellRef.current = shell;

  // Guarda del ciclo: lo que el editor emite vuelve como `value`. Sin esto,
  // cada tecleo remontaría el contenido y el cursor saltaría al inicio.
  const lastEmitted = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      PreserveStyles,
      RawHtmlBlock,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener", target: "_blank" },
      }),
      Image,
      Placeholder.configure({
        placeholder: "Escribe el correo… selecciona texto para darle formato.",
      }),
    ],
    content: shell.body,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "outline-none min-h-[50vh] px-6 py-5",
      },
    },
    onUpdate: ({ editor }) => {
      const body = serializeEmailHtml(editor.getHTML());
      const full = joinEmailBody(shellRef.current, body);
      lastEmitted.current = full;
      onChange(full);
    },
  });

  // Cambios que vienen de fuera (generación con IA, edición en la pestaña de
  // HTML) sí deben repintar el editor.
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    const next = splitEmailBody(value).body;
    if (next !== serializeEmailHtml(editor.getHTML())) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href;
    const url = window.prompt("URL del enlace:", previous || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="border border-brand-100/20 rounded-lg bg-white p-6 text-gray-400 text-sm">
        Cargando editor…
      </div>
    );
  }

  const item = (active: boolean) =>
    `p-2 rounded transition-colors ${
      active ? "bg-gray-700 text-white" : "text-gray-200 hover:bg-gray-700"
    }`;

  return (
    <div className="border border-brand-100/20 rounded-lg bg-white overflow-hidden">
      <BubbleMenu
        editor={editor}
        className="flex items-center gap-0.5 rounded-lg bg-gray-900 shadow-xl px-1 py-1"
      >
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={item(editor.isActive("bold"))}
          title="Negrita"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={item(editor.isActive("italic"))}
          title="Cursiva"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={setLink}
          className={item(editor.isActive("link"))}
          title="Enlace"
        >
          <LinkIcon size={16} />
        </button>
        <span className="w-px h-5 bg-gray-700 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={item(editor.isActive("heading", { level: 2 }))}
          title="Título"
        >
          <Heading2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={item(editor.isActive("heading", { level: 3 }))}
          title="Subtítulo"
        >
          <Heading3 size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={item(editor.isActive("bulletList"))}
          title="Lista"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={item(editor.isActive("blockquote"))}
          title="Cita"
        >
          <Quote size={16} />
        </button>
      </BubbleMenu>

      <EditorContent
        editor={editor}
        className="text-gray-900 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_p]:mb-3 [&_a]:text-blue-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_blockquote]:text-gray-600"
      />

      {shell.hasShell && (
        <p className="text-[11px] text-gray-500 px-6 py-2 border-t border-gray-100 bg-gray-50">
          Estás editando el cuerpo; el encabezado, el logo y el pie se conservan
          intactos. Los bloques con borde punteado (botones, callouts, cards) se
          mueven completos — para cambiarlos por dentro, usa la pestaña HTML.
        </p>
      )}
    </div>
  );
}
