import { useEffect, useState, useRef, useCallback } from "react";
import { Sparkles } from "lucide-react";

interface AICommandPaletteProps {
  content: any;
  onContentUpdate: (content: any) => void;
  children: React.ReactNode;
}

const PROMPTS = {
  improve: {
    name: "/improve",
    description: "Mejora claridad, tono y estructura",
    icon: "✨",
  },
  expand: {
    name: "/expand",
    description: "Añade más detalles y ejemplos",
    icon: "📝",
  },
  shorten: {
    name: "/shorten",
    description: "Condensa el contenido",
    icon: "⚡",
  },
  tone: {
    name: "/tone",
    description: "Cambia el tono (técnico/casual/formal)",
    icon: "🎙️",
  },
} as const;

export function AICommandPalette({
  content,
  onContentUpdate,
  children,
}: AICommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<keyof typeof PROMPTS | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Detectar Cmd+K y Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        
        // Extraer texto seleccionado del editor
        const selection = window.getSelection();
        const text = selection?.toString() || "";
        
        if (text.length > 0) {
          setSelectedText(text);
          setIsOpen(true);
        }
      }
      
      // Cerrar con Esc
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setSelectedText("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const extractTextFromContent = () => {
    // Convierte Tiptap JSON a texto plano
    if (!content?.content) return "";

    const getText = (node: any): string => {
      if (node.type === "text") return node.text || "";
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(getText).join("");
      }
      return "";
    };

    return content.content.map((node: any) => getText(node)).join("\n");
  };

  const handleAICommand = useCallback(
    async (command: keyof typeof PROMPTS) => {
      if (!selectedText) return;
      setSelectedCommand(command);
      setIsProcessing(true);

      try {
        const prompts: Record<keyof typeof PROMPTS, string> = {
          improve: `Mejora este texto sin cambiar el significado. Enfócate en claridad, tono profesional y fluidez:\n\n${selectedText}`,
          expand: `Expande este párrafo con más detalles, ejemplos prácticos y contexto:\n\n${selectedText}`,
          shorten: `Condensa este texto manteniendo la idea principal. Sé conciso:\n\n${selectedText}`,
          tone: `Reescribe este texto en un tono más casual y conversacional:\n\n${selectedText}`,
        };

        const response = await fetch("/api/ai.text-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            command,
            text: selectedText,
            prompt: prompts[command],
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        const { result: aiResponse } = await response.json();

        // Reemplaza el texto seleccionado en el editor
        if (aiResponse) {
          const currentText = extractTextFromContent();
          const newText = currentText.replace(selectedText, aiResponse);
          
          // Reconstruye el content JSON (simplificado)
          const updatedContent = {
            ...content,
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: newText }],
              },
            ],
          };
          
          onContentUpdate(updatedContent);
          setIsOpen(false);
          setSelectedText("");
        }
      } catch (error) {
        console.error("AI error:", error);
        alert("Error al procesar comando IA");
      } finally {
        setIsProcessing(false);
        setSelectedCommand(null);
      }
    },
    [selectedText, content, onContentUpdate]
  );

  return (
    <div ref={editorRef} className="relative">
      {children}

      {/* Command Palette Modal */}
      {isOpen && selectedText && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsOpen(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-96 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} />
                <h3 className="font-semibold">Comandos IA</h3>
              </div>
              <p className="text-xs text-blue-100 truncate">
                "{selectedText.substring(0, 50)}{selectedText.length > 50 ? "..." : ""}"
              </p>
            </div>

            {/* Commands List */}
            <div className="p-2 max-h-96 overflow-y-auto">
              {Object.entries(PROMPTS).map(([key, cmd]) => (
                <button
                  key={key}
                  onClick={() => handleAICommand(key as keyof typeof PROMPTS)}
                  disabled={isProcessing}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    isProcessing
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-gray-800 active:bg-gray-700"
                  } ${
                    selectedCommand === key
                      ? "bg-blue-600/30 border border-blue-500"
                      : "border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-lg">{cmd.icon}</span>
                      <div>
                        <div className="font-semibold text-sm">{cmd.name}</div>
                        <div className="text-xs text-gray-400">{cmd.description}</div>
                      </div>
                    </div>
                    {selectedCommand === key && isProcessing && (
                      <div className="animate-spin">⚙️</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="bg-gray-800 border-t border-gray-700 px-4 py-3 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>
                  Powered by{" "}
                  <span className="text-blue-400 font-semibold">Claude 3.5</span>
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-300"
                >
                  Esc para cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Hint */}
      {!isOpen && (
        <div className="absolute -bottom-8 left-0 text-xs text-gray-500 pointer-events-none">
          💡 Selecciona texto + Cmd+K para comandos IA
        </div>
      )}
    </div>
  );
}

