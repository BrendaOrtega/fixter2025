import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Youtube from '@tiptap/extension-youtube';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Extension } from '@tiptap/core';
import { AIAutocomplete, AIAutocompletePluginKey } from './extensions/AIAutocomplete';
import { useCallback, useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bold,
  Italic,
  Code,
  Link as LinkIcon,
  Strikethrough,
  Highlighter,
  Sparkles,
  Type,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code2,
  Image as ImageIcon,
  Youtube as YoutubeIcon,
  Minus,
  CheckSquare,
  Loader2,
  GripVertical,
  Wand2,
  X,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';

interface ModernEditorProps {
  content?: Record<string, any>;
  onChange?: (content: Record<string, any>) => void;
  onAICommand?: (command: string, text: string) => Promise<string>;
}

// Custom extension for drag handles
const DragHandle = Extension.create({
  name: 'dragHandle',
  addOptions() {
    return {
      onDragStart: () => {},
    };
  },
});

// Slash command items organized by category
const SLASH_COMMANDS = {
  basic: [
    { id: 'paragraph', label: 'Texto', description: 'Párrafo normal', icon: Type },
    { id: 'heading2', label: 'Título', description: 'Sección principal', icon: Heading2 },
    { id: 'heading3', label: 'Subtítulo', description: 'Subsección', icon: Heading3 },
  ],
  lists: [
    { id: 'bulletList', label: 'Lista', description: 'Lista con viñetas', icon: List },
    { id: 'orderedList', label: 'Numerada', description: 'Lista ordenada', icon: ListOrdered },
    { id: 'taskList', label: 'Checklist', description: 'Lista de tareas', icon: CheckSquare },
  ],
  blocks: [
    { id: 'blockquote', label: 'Cita', description: 'Bloque de cita', icon: Quote },
    { id: 'codeBlock', label: 'Código', description: 'Bloque de código', icon: Code2 },
    { id: 'callout', label: 'Callout', description: 'Nota destacada', icon: AlertCircle },
  ],
  media: [
    { id: 'image', label: 'Imagen', description: 'Desde URL o drag & drop', icon: ImageIcon },
    { id: 'youtube', label: 'YouTube', description: 'Embed de video', icon: YoutubeIcon },
  ],
  other: [
    { id: 'horizontalRule', label: 'Divisor', description: 'Línea horizontal', icon: Minus },
  ],
  ai: [
    { id: 'ai-write', label: 'Escribir con IA', description: 'Genera contenido', icon: Wand2 },
    { id: 'ai-brainstorm', label: 'Brainstorm', description: 'Ideas sobre un tema', icon: MessageSquare },
  ],
};

const ALL_COMMANDS = Object.values(SLASH_COMMANDS).flat();

const AI_INLINE_COMMANDS = [
  { id: 'continue', label: 'Continuar', description: 'IA completa el texto', icon: Wand2 },
  { id: 'improve', label: 'Mejorar', description: 'Claridad y fluidez', icon: Sparkles },
  { id: 'expand', label: 'Expandir', description: 'Más detalles', icon: MessageSquare },
  { id: 'shorten', label: 'Condensar', description: 'Versión corta', icon: Code },
];

export function ModernEditor({ content, onChange, onAICommand }: ModernEditorProps) {
  // Slash menu state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [slashFilter, setSlashFilter] = useState('');
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);

  // Bubble menu state
  const [showBubbleMenu, setShowBubbleMenu] = useState(false);
  const [bubbleMenuPosition, setBubbleMenuPosition] = useState({ top: 0, left: 0 });
  const [showAIDropdown, setShowAIDropdown] = useState(false);

  // AI inline suggestion state
  const [aiSuggestion, setAISuggestion] = useState<string | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPromptText, setAIPromptText] = useState('');

  // Drag state
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Stats
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // AI autocomplete state
  const [hasAISuggestion, setHasAISuggestion] = useState(false);
  const [isAIAutocompleteLoading, setIsAIAutocompleteLoading] = useState(false);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const aiPromptInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-[#0d1117] text-[#c9d1d9] p-4 rounded-xl font-mono text-sm overflow-x-auto my-4 border border-gray-800',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-indigo-500/70 pl-4 italic text-gray-400 my-4 bg-indigo-500/5 py-2 rounded-r-lg',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc list-inside space-y-1.5 my-3 text-gray-300',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal list-inside space-y-1.5 my-3 text-gray-300',
          },
        },
        horizontalRule: {
          HTMLAttributes: {
            class: 'border-gray-800 my-8',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-400 underline decoration-indigo-400/30 underline-offset-2 hover:decoration-indigo-400 transition-all cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-xl my-6 shadow-lg shadow-black/20',
        },
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return '¿De qué trata esta sección?';
          }
          return 'Escribe algo increíble... o presiona / para comandos';
        },
        emptyEditorClass: 'is-editor-empty',
      }),
      Typography,
      Youtube.configure({
        HTMLAttributes: {
          class: 'w-full aspect-video rounded-xl my-6 shadow-lg shadow-black/20',
        },
        width: 0,
        height: 0,
      }),
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'bg-yellow-400/20 rounded px-1 py-0.5',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'space-y-2 my-3 not-prose',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-3 text-gray-300',
        },
      }),
      DragHandle,
      // AI Autocomplete - ghost text suggestions
      ...(onAICommand
        ? [
            AIAutocomplete.configure({
              debounceMs: 2000,
              minChars: 30,
              getSuggestion: async (context: string) => {
                try {
                  const response = await fetch('/api/ai.text-command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      prompt: `Continue this text naturally with 1-2 short sentences. Only output the continuation, nothing else. Keep the same tone and language (Spanish if the text is in Spanish):\n\n"${context}"`,
                    }),
                  });
                  if (!response.ok) return null;
                  const { result } = await response.json();
                  // Return only if it's a reasonable continuation
                  if (result && result.length > 5 && result.length < 200) {
                    return ' ' + result.trim();
                  }
                  return null;
                } catch {
                  return null;
                }
              },
            }),
          ]
        : []),
    ],
    content: content || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[60vh] focus:outline-none leading-relaxed',
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files.length) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of items) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) handleImageUpload(file);
              return true;
            }
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
      updateStats(editor);

      // Check for AI autocomplete state
      if (onAICommand) {
        const pluginState = AIAutocompletePluginKey.getState(editor.state);
        setHasAISuggestion(!!pluginState?.suggestion);
        setIsAIAutocompleteLoading(!!pluginState?.loading);
      }
    },
    onTransaction: ({ editor }) => {
      // Also update on transaction for more responsive UI
      if (onAICommand) {
        const pluginState = AIAutocompletePluginKey.getState(editor.state);
        setHasAISuggestion(!!pluginState?.suggestion);
        setIsAIAutocompleteLoading(!!pluginState?.loading);
      }
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      if (hasSelection) {
        try {
          const coords = editor.view.coordsAtPos(from);
          const containerRect = editorContainerRef.current?.getBoundingClientRect();

          if (containerRect && coords) {
            setBubbleMenuPosition({
              top: Math.max(0, coords.top - containerRect.top - 48),
              left: Math.max(0, Math.min(coords.left - containerRect.left, containerRect.width - 300)),
            });
            setShowBubbleMenu(true);
          }
        } catch {
          setShowBubbleMenu(false);
        }
      } else {
        setShowBubbleMenu(false);
        setShowAIDropdown(false);
      }
    },
  });

  // Update word and character count
  const updateStats = (editor: any) => {
    const text = editor.state.doc.textContent;
    const words = text.split(/\s+/).filter((w: string) => w.length > 0).length;
    setWordCount(words);
    setCharCount(text.length);
  };

  // Handle image upload (paste/drop)
  const handleImageUpload = async (file: File) => {
    // Convert to base64 for now (in production, upload to S3)
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      editor?.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
  };

  // Handle slash menu keyboard navigation
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Tab to accept AI suggestion
      if (event.key === 'Tab' && aiSuggestion) {
        event.preventDefault();
        event.stopPropagation();
        editor.chain().focus().insertContent(aiSuggestion).run();
        setAISuggestion(null);
        return;
      }

      // Escape to dismiss AI suggestion
      if (event.key === 'Escape' && aiSuggestion) {
        setAISuggestion(null);
        return;
      }

      // Open slash menu on /
      if (event.key === '/' && !showSlashMenu && !showAIPrompt) {
        const coords = editor.view.coordsAtPos(editor.state.selection.$from.pos);
        const containerRect = editorContainerRef.current?.getBoundingClientRect();

        if (containerRect) {
          setSlashMenuPosition({
            top: coords.top - containerRect.top + 28,
            left: Math.max(0, coords.left - containerRect.left),
          });
          setShowSlashMenu(true);
          setSlashFilter('');
          setSelectedSlashIndex(0);
        }
        return;
      }

      // Handle slash menu navigation
      if (showSlashMenu) {
        if (event.key === 'Escape') {
          event.preventDefault();
          setShowSlashMenu(false);
          return;
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedSlashIndex((prev) =>
            Math.min(prev + 1, filteredCommands.length - 1)
          );
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedSlashIndex((prev) => Math.max(prev - 1, 0));
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          const cmd = filteredCommands[selectedSlashIndex];
          if (cmd) executeSlashCommand(cmd.id);
          return;
        }
        if (event.key === 'Backspace') {
          if (slashFilter === '') {
            setShowSlashMenu(false);
          } else {
            setSlashFilter((prev) => prev.slice(0, -1));
          }
          return;
        }
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
          setSlashFilter((prev) => prev + event.key);
          setSelectedSlashIndex(0);
        }
      }

      // Handle AI prompt
      if (showAIPrompt && event.key === 'Escape') {
        setShowAIPrompt(false);
        setAIPromptText('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor, showSlashMenu, slashFilter, selectedSlashIndex, aiSuggestion, showAIPrompt]);

  // Close menus on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (slashMenuRef.current && !slashMenuRef.current.contains(e.target as Node)) {
        setShowSlashMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Focus AI prompt input
  useEffect(() => {
    if (showAIPrompt && aiPromptInputRef.current) {
      aiPromptInputRef.current.focus();
    }
  }, [showAIPrompt]);

  // Sync content
  useEffect(() => {
    if (editor && content && typeof content === 'object') {
      const currentJSON = JSON.stringify(editor.getJSON());
      const newJSON = JSON.stringify(content);
      if (currentJSON !== newJSON) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  // Filter slash commands
  const filteredCommands = ALL_COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(slashFilter.toLowerCase()) ||
      cmd.id.toLowerCase().includes(slashFilter.toLowerCase())
  );

  // Execute slash command
  const executeSlashCommand = useCallback(
    (commandId: string) => {
      if (!editor) return;

      // Delete the slash character and filter
      const from = editor.state.selection.$from.pos - 1 - slashFilter.length;
      const to = editor.state.selection.$from.pos;
      if (from >= 0) {
        editor.chain().focus().deleteRange({ from, to }).run();
      }

      switch (commandId) {
        case 'paragraph':
          editor.chain().focus().setParagraph().run();
          break;
        case 'heading2':
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case 'heading3':
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case 'bulletList':
          editor.chain().focus().toggleBulletList().run();
          break;
        case 'orderedList':
          editor.chain().focus().toggleOrderedList().run();
          break;
        case 'taskList':
          editor.chain().focus().toggleTaskList().run();
          break;
        case 'blockquote':
          editor.chain().focus().toggleBlockquote().run();
          break;
        case 'codeBlock':
          editor.chain().focus().toggleCodeBlock().run();
          break;
        case 'callout':
          editor.chain().focus().toggleBlockquote().run();
          break;
        case 'image': {
          const url = window.prompt('URL de la imagen (o arrastra una imagen al editor):');
          if (url) editor.chain().focus().setImage({ src: url }).run();
          break;
        }
        case 'youtube': {
          const url = window.prompt('URL del video de YouTube:');
          if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
          break;
        }
        case 'horizontalRule':
          editor.chain().focus().setHorizontalRule().run();
          break;
        case 'ai-write':
        case 'ai-brainstorm':
          setShowSlashMenu(false);
          setShowAIPrompt(true);
          return;
      }

      setShowSlashMenu(false);
      setSlashFilter('');
    },
    [editor, slashFilter]
  );

  // Handle link
  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  // Handle AI command from bubble menu
  const handleAICommand = useCallback(
    async (commandId: string) => {
      if (!editor || !onAICommand) return;

      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, ' ');

      if (!selectedText) {
        alert('Selecciona texto para usar este comando');
        return;
      }

      setIsAILoading(true);
      setShowAIDropdown(false);
      setShowBubbleMenu(false);

      try {
        const result = await onAICommand(commandId, selectedText);
        // Convertir markdown a HTML
        const html = marked.parse(result);
        // Insertar HTML - Tiptap lo parsea usando DOMParser internamente
        editor
          .chain()
          .focus()
          .deleteSelection()
          .insertContent(html, {
            parseOptions: { preserveWhitespace: false },
          })
          .run();
      } catch (error) {
        console.error('AI error:', error);
      } finally {
        setIsAILoading(false);
      }
    },
    [editor, onAICommand]
  );

  // Handle AI prompt submission
  const handleAIPromptSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editor || !onAICommand || !aiPromptText.trim()) return;

      setIsAILoading(true);
      setShowAIPrompt(false);

      try {
        const result = await onAICommand('generate', aiPromptText);
        // Convertir markdown a HTML
        const html = marked.parse(result);
        // Insertar HTML - Tiptap lo parsea usando DOMParser internamente
        editor
          .chain()
          .focus()
          .insertContent(html, {
            parseOptions: { preserveWhitespace: false },
          })
          .run();
      } catch (error) {
        console.error('AI error:', error);
      } finally {
        setIsAILoading(false);
        setAIPromptText('');
      }
    },
    [editor, onAICommand, aiPromptText]
  );

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        <Loader2 className="animate-spin mr-2" size={20} />
        <span className="text-sm">Cargando editor...</span>
      </div>
    );
  }

  return (
    <div
      ref={editorContainerRef}
      className={`relative transition-all duration-300 ${isDraggingOver ? 'ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-gray-950 rounded-xl' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={() => setIsDraggingOver(false)}
    >
      {/* Bubble Menu - Modern floating toolbar */}
      <AnimatePresence>
        {showBubbleMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50"
            style={{ top: bubbleMenuPosition.top, left: bubbleMenuPosition.left }}
          >
            <div className="flex items-center gap-0.5 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl shadow-black/50 p-1">
              {/* Text formatting */}
              <ToolbarButton
                active={editor.isActive('bold')}
                onClick={() => editor.chain().focus().toggleBold().run()}
                title="Bold (⌘B)"
              >
                <Bold size={15} />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive('italic')}
                onClick={() => editor.chain().focus().toggleItalic().run()}
                title="Italic (⌘I)"
              >
                <Italic size={15} />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive('strike')}
                onClick={() => editor.chain().focus().toggleStrike().run()}
                title="Strikethrough"
              >
                <Strikethrough size={15} />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive('code')}
                onClick={() => editor.chain().focus().toggleCode().run()}
                title="Code"
              >
                <Code size={15} />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive('highlight')}
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                title="Highlight"
              >
                <Highlighter size={15} />
              </ToolbarButton>

              <div className="w-px h-5 bg-gray-700 mx-1" />

              <ToolbarButton
                active={editor.isActive('link')}
                onClick={setLink}
                title="Link (⌘K)"
              >
                <LinkIcon size={15} />
              </ToolbarButton>

              {onAICommand && (
                <>
                  <div className="w-px h-5 bg-gray-700 mx-1" />
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAIDropdown(!showAIDropdown)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
                        showAIDropdown
                          ? 'bg-indigo-500 text-white'
                          : 'text-indigo-400 hover:bg-gray-800'
                      }`}
                    >
                      <Sparkles size={14} />
                      <span className="text-xs font-medium">IA</span>
                    </button>

                    <AnimatePresence>
                      {showAIDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.95 }}
                          transition={{ duration: 0.1 }}
                          className="absolute top-full left-0 mt-2 bg-gray-900 border border-gray-700/50 rounded-xl shadow-2xl shadow-black/50 p-1 min-w-[180px] z-50"
                        >
                          {AI_INLINE_COMMANDS.map((cmd) => (
                            <button
                              key={cmd.id}
                              type="button"
                              onClick={() => handleAICommand(cmd.id)}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 transition flex items-center gap-2.5"
                            >
                              <cmd.icon size={14} className="text-indigo-400" />
                              <div>
                                <div className="text-sm text-white">{cmd.label}</div>
                                <div className="text-xs text-gray-500">{cmd.description}</div>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slash Command Menu - Notion-style */}
      <AnimatePresence>
        {showSlashMenu && (
          <motion.div
            ref={slashMenuRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl shadow-black/50 w-80 max-h-96 overflow-hidden"
            style={{ top: slashMenuPosition.top, left: Math.min(slashMenuPosition.left, 100) }}
          >
            {/* Search header */}
            <div className="p-3 border-b border-gray-800">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Insertar</span>
                {slashFilter && (
                  <span className="text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">
                    {slashFilter}
                  </span>
                )}
              </div>
            </div>

            {/* Commands list */}
            <div className="p-2 max-h-72 overflow-y-auto">
              {filteredCommands.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <div className="text-gray-500 text-sm">No hay comandos que coincidan</div>
                </div>
              ) : (
                filteredCommands.map((cmd, index) => (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => executeSlashCommand(cmd.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all ${
                      index === selectedSlashIndex
                        ? 'bg-indigo-500/20 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${index === selectedSlashIndex ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                      <cmd.icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{cmd.label}</div>
                      <div className={`text-xs truncate ${index === selectedSlashIndex ? 'text-indigo-300' : 'text-gray-500'}`}>
                        {cmd.description}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer hints */}
            <div className="p-2 border-t border-gray-800 flex justify-between text-[10px] text-gray-600">
              <div className="flex gap-3">
                <span><kbd className="px-1 py-0.5 bg-gray-800 rounded">↑↓</kbd> navegar</span>
                <span><kbd className="px-1 py-0.5 bg-gray-800 rounded">↵</kbd> insertar</span>
              </div>
              <span><kbd className="px-1 py-0.5 bg-gray-800 rounded">esc</kbd> cerrar</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Prompt Modal */}
      <AnimatePresence>
        {showAIPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAIPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 size={18} className="text-indigo-400" />
                  <span className="font-medium text-white">Generar con IA</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAIPrompt(false)}
                  className="p-1.5 hover:bg-gray-800 rounded-lg transition"
                >
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleAIPromptSubmit} className="p-4">
                <input
                  ref={aiPromptInputRef}
                  type="text"
                  value={aiPromptText}
                  onChange={(e) => setAIPromptText(e.target.value)}
                  placeholder="Escribe una introducción sobre React hooks..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Powered by Claude
                  </span>
                  <button
                    type="submit"
                    disabled={!aiPromptText.trim() || isAILoading}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition flex items-center gap-2"
                  >
                    {isAILoading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        Generar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Loading Overlay */}
      <AnimatePresence>
        {isAILoading && !showAIPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-950/50 backdrop-blur-sm flex items-center justify-center rounded-xl z-40"
          >
            <div className="bg-gray-900 border border-gray-700 px-5 py-3 rounded-xl flex items-center gap-3 shadow-xl">
              <Loader2 className="animate-spin text-indigo-400" size={18} />
              <span className="text-sm text-gray-300">Procesando con IA...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag overlay */}
      <AnimatePresence>
        {isDraggingOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-indigo-500/10 border-2 border-dashed border-indigo-500/50 rounded-xl flex items-center justify-center z-30 pointer-events-none"
          >
            <div className="bg-gray-900/90 px-6 py-4 rounded-xl flex items-center gap-3">
              <ImageIcon size={24} className="text-indigo-400" />
              <span className="text-white font-medium">Suelta la imagen aquí</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Content */}
      <EditorContent editor={editor} className="editor-content" />

      {/* Bottom Stats Bar */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-800/50 text-xs text-gray-600">
        <div className="flex items-center gap-4">
          <span>{wordCount} palabras</span>
          <span>{charCount} caracteres</span>

          {/* AI autocomplete indicator */}
          {onAICommand && (
            <AnimatePresence mode="wait">
              {isAIAutocompleteLoading && (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-1.5 text-indigo-400"
                >
                  <Loader2 size={12} className="animate-spin" />
                  <span>IA pensando...</span>
                </motion.span>
              )}
              {hasAISuggestion && !isAIAutocompleteLoading && (
                <motion.span
                  key="suggestion"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-1.5 text-green-400"
                >
                  <Sparkles size={12} />
                  <span>Tab para aceptar sugerencia</span>
                </motion.span>
              )}
            </AnimatePresence>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-gray-800/50 rounded text-[10px]">/</kbd>
            <span>comandos</span>
          </span>
          {hasAISuggestion && (
            <span className="flex items-center gap-1.5 text-green-400">
              <kbd className="px-1.5 py-0.5 bg-green-900/50 border border-green-700/50 rounded text-[10px]">Tab</kbd>
              <span>IA</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-gray-800/50 rounded text-[10px]">⌘B</kbd>
            <span>bold</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// Toolbar button component
function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-all ${
        active
          ? 'bg-indigo-500/20 text-indigo-400'
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
