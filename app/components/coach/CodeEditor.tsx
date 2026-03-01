import { useState, useRef } from "react";

interface CodeEditorProps {
  onSubmit: (code: string) => void;
  language?: string;
}

export function CodeEditor({ onSubmit, language = "javascript" }: CodeEditorProps) {
  const [code, setCode] = useState("");
  const [height, setHeight] = useState(200);
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const handleSubmit = () => {
    if (!code.trim()) return;
    onSubmit(code);
    setCode("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab support
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newCode = code.substring(0, start) + "  " + code.substring(end);
      setCode(newCode);
      // Set cursor position after the inserted spaces
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }

    // Cmd/Ctrl + Enter to submit
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current = { startY: e.clientY, startHeight: height };

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const diff = e.clientY - resizeRef.current.startY;
      setHeight(Math.max(100, Math.min(500, resizeRef.current.startHeight + diff)));
    };

    const handleMouseUp = () => {
      resizeRef.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">
          Editor
        </span>
        <span className="text-[10px] text-zinc-600 font-mono">{language}</span>
      </div>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe tu código aquí..."
        spellCheck={false}
        style={{ height }}
        className="w-full bg-zinc-950 text-zinc-200 text-sm font-mono p-3 resize-none focus:outline-none placeholder-zinc-700 leading-relaxed"
      />

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        className="h-1.5 bg-zinc-900 cursor-row-resize hover:bg-zinc-700 transition"
      />

      <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-800">
        <span className="text-[10px] text-zinc-600">
          Ctrl+Enter para enviar
        </span>
        <button
          onClick={handleSubmit}
          disabled={!code.trim()}
          className="text-xs px-3 py-1.5 rounded-lg bg-[#CA9B77]/10 border border-[#CA9B77]/20 text-[#CA9B77] hover:bg-[#CA9B77]/20 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Enviar código
        </button>
      </div>
    </div>
  );
}
