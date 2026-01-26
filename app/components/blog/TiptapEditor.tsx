import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useCallback, useEffect } from 'react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Heading2,
  Heading3,
} from 'lucide-react';

interface TiptapEditorProps {
  content?: Record<string, any>;
  onChange?: (content: Record<string, any>) => void;
  placeholder?: string;
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = 'Escribe aquí...',
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            class: 'my-2',
          },
        },
        heading: {
          HTMLAttributes: {
            class: 'font-bold my-4',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc list-inside my-2',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal list-inside my-2',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-gray-100 p-4 rounded font-mono text-sm my-2 overflow-x-auto',
          },
        },
        code: {
          HTMLAttributes: {
            class: 'bg-gray-200 px-1 rounded font-mono text-sm',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer hover:text-blue-800',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
    ],
    content: content || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
  });

  useEffect(() => {
    if (editor && content && typeof content === 'object' && content !== editor.getJSON()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    const url = window.prompt('URL:');
    if (url) {
      editor
        ?.chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt('URL de imagen:');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return <div className="p-4 text-gray-400">Cargando editor...</div>;
  }

  const buttonClasses =
    'p-2 hover:bg-gray-200 rounded transition-colors text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed';
  const separatorClasses = 'w-px h-6 bg-gray-300 mx-1';

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0 bg-gray-50 border-b p-2">
        {/* Text formatting */}
        <div className="flex gap-0">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`${buttonClasses} ${
              editor.isActive('bold') ? 'bg-gray-300' : ''
            }`}
            title="Bold (Cmd+B)"
          >
            <Bold size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={`${buttonClasses} ${
              editor.isActive('italic') ? 'bg-gray-300' : ''
            }`}
            title="Italic (Cmd+I)"
          >
            <Italic size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`${buttonClasses} ${
              editor.isActive('codeBlock') ? 'bg-gray-300' : ''
            }`}
            title="Code Block"
          >
            <Code size={18} />
          </button>
        </div>

        <div className={separatorClasses} />

        {/* Headings */}
        <div className="flex gap-0">
          <button
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={`${buttonClasses} ${
              editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''
            }`}
            title="Heading 2"
          >
            <Heading2 size={18} />
          </button>
          <button
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            className={`${buttonClasses} ${
              editor.isActive('heading', { level: 3 }) ? 'bg-gray-300' : ''
            }`}
            title="Heading 3"
          >
            <Heading3 size={18} />
          </button>
        </div>

        <div className={separatorClasses} />

        {/* Lists */}
        <div className="flex gap-0">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`${buttonClasses} ${
              editor.isActive('bulletList') ? 'bg-gray-300' : ''
            }`}
            title="Bullet List"
          >
            <List size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`${buttonClasses} ${
              editor.isActive('orderedList') ? 'bg-gray-300' : ''
            }`}
            title="Ordered List"
          >
            <ListOrdered size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`${buttonClasses} ${
              editor.isActive('blockquote') ? 'bg-gray-300' : ''
            }`}
            title="Quote"
          >
            <Quote size={18} />
          </button>
        </div>

        <div className={separatorClasses} />

        {/* Media */}
        <div className="flex gap-0">
          <button
            onClick={setLink}
            className={`${buttonClasses} ${
              editor.isActive('link') ? 'bg-gray-300' : ''
            }`}
            title="Add Link"
          >
            <LinkIcon size={18} />
          </button>
          <button onClick={addImage} className={buttonClasses} title="Add Image">
            <ImageIcon size={18} />
          </button>
        </div>

        <div className={separatorClasses} />

        {/* History */}
        <div className="flex gap-0">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            className={buttonClasses}
            title="Undo"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            className={buttonClasses}
            title="Redo"
          >
            <Redo2 size={18} />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="prose prose-sm max-w-none p-4 h-96 overflow-y-auto border-t border-b bg-white relative">
        <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
          {!editor?.view.state.doc.content.size && placeholder}
        </div>
        <EditorContent editor={editor} className="outline-none text-gray-900" />
      </div>

      {/* Character counter */}
      <div className="text-xs text-gray-500 bg-gray-50 border-t p-2">
        {editor.storage.characterCount?.characters?.() || 0} caracteres
      </div>
    </div>
  );
}
