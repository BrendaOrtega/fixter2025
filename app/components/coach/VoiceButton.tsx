import type { VoiceStatus } from "@formmy.app/chat/react";
export { useFormmyVoice } from "@formmy.app/chat/react";
export type { UseFormmyVoiceReturn, VoiceStatus } from "@formmy.app/chat/react";

// === VoiceButton Component ===

const STATUS_LABELS: Record<VoiceStatus, string> = {
  idle: "Activar voz",
  connecting: "Conectando...",
  ready: "Voz activa",
  speaking: "Hablando...",
  error: "Error",
};

interface VoiceButtonProps {
  status: VoiceStatus;
  onToggle: () => void;
}

export function VoiceButton({ status, onToggle }: VoiceButtonProps) {
  const isActive = status === "ready" || status === "speaking";
  const isConnecting = status === "connecting";

  return (
    <button
      onClick={onToggle}
      disabled={isConnecting}
      className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
        isActive
          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
          : isConnecting
          ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400 opacity-75 cursor-wait"
          : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
      }`}
      title={isActive ? "Desactivar voz" : "Activar voz"}
    >
      {isActive ? (
        <svg
          className={`w-3.5 h-3.5 ${status === "speaking" ? "animate-pulse" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
      )}
      {STATUS_LABELS[status]}
    </button>
  );
}
