import { useRef, useEffect, useCallback } from "react";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { indentWithTab } from "@codemirror/commands";

interface CodeEditorProps {
  onSubmit: (code: string) => void;
  language?: string;
}

const languageExtension = (lang: string) => {
  switch (lang) {
    case "python":
      return python();
    case "javascript":
    case "react":
    case "node":
    default:
      return javascript({ jsx: true, typescript: true });
  }
};

export function CodeEditor({ onSubmit, language = "javascript" }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const handleSubmit = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const code = view.state.doc.toString();
    if (!code.trim()) return;
    onSubmitRef.current(code);
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: "" } });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const submitKeymap = keymap.of([
      {
        key: "Ctrl-Enter",
        run: () => { handleSubmit(); return true; },
      },
      {
        key: "Mod-Enter",
        run: () => { handleSubmit(); return true; },
      },
    ]);

    const theme = EditorView.theme({
      "&": {
        height: "200px",
        fontSize: "13px",
        backgroundColor: "rgb(9 9 11)", // zinc-950
      },
      ".cm-scroller": { overflow: "auto" },
      ".cm-gutters": {
        backgroundColor: "rgb(24 24 27)", // zinc-900
        borderRight: "1px solid rgb(39 39 42)", // zinc-800
      },
      ".cm-content": { padding: "8px 0" },
      "&.cm-focused": { outline: "none" },
    });

    const state = EditorState.create({
      doc: "",
      extensions: [
        basicSetup,
        keymap.of([indentWithTab]),
        submitKeymap,
        languageExtension(language),
        oneDark,
        theme,
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, handleSubmit]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">
          Editor
        </span>
        <span className="text-[10px] text-zinc-600 font-mono">{language}</span>
      </div>

      <div ref={containerRef} />

      <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-800">
        <span className="text-[10px] text-zinc-600">
          Ctrl+Enter para enviar
        </span>
        <button
          onClick={handleSubmit}
          className="text-xs px-3 py-1.5 rounded-lg bg-[#CA9B77]/10 border border-[#CA9B77]/20 text-[#CA9B77] hover:bg-[#CA9B77]/20 transition"
        >
          Enviar codigo
        </button>
      </div>
    </div>
  );
}
