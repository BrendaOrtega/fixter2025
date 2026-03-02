import { useState, useEffect } from "react";
import type { MetaFunction } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { CoachNav } from "~/components/coach/CoachNav";

export const meta: MetaFunction = () => [
  { title: "Story Bank | MentorIA" },
];

interface Story {
  id: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  earnedSecret: string;
  primarySkill: string;
  strength: number;
  useCount: number;
  lastUsed: string | null;
}

export default function CoachStoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Story>>({});

  useEffect(() => {
    fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "get_storybank" }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStories(d.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (index: number) => {
    await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "delete_story", storyIndex: index }),
    });
    setStories((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async () => {
    if (editing === null) return;
    await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "update_story", storyIndex: editing, storyData: editData }),
    });
    setStories((prev) =>
      prev.map((s, i) => (i === editing ? { ...s, ...editData } : s))
    );
    setEditing(null);
    setEditData({});
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <CoachNav active="stories" />
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            <span className="bg-gradient-to-b from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              Story Bank
            </span>
          </h1>
          <p className="text-xs text-zinc-600">
            {stories.length} {stories.length === 1 ? "historia" : "historias"}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-zinc-500">Cargando...</p>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-zinc-500">
              Aún no tienes historias. Completa sesiones de entrevista para que el coach las extraiga automáticamente.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {stories.map((story, i) => {
              const isExpanded = expandedId === story.id;
              const isEditing = editing === i;

              return (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : story.id)}
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-zinc-900/60 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-zinc-200 truncate">
                          {story.title}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#845A8F]/10 text-[#845A8F]">
                          {story.primarySkill}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-600">
                        <span>Calidad: {story.strength}/5</span>
                        <span>Usada: {story.useCount}x</span>
                      </div>
                    </div>
                    <svg className={`w-4 h-4 text-zinc-600 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800/40 pt-3">
                          {isEditing ? (
                            <div className="space-y-3">
                              {(["situation", "task", "action", "result"] as const).map((field) => (
                                <div key={field} className="space-y-1">
                                  <label className="text-xs text-zinc-500 uppercase">
                                    {field === "situation" ? "Situación" : field === "task" ? "Tarea" : field === "action" ? "Acción" : "Resultado"}
                                  </label>
                                  <textarea
                                    value={(editData[field] as string) ?? story[field]}
                                    onChange={(e) => setEditData({ ...editData, [field]: e.target.value })}
                                    rows={2}
                                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-[#CA9B77]"
                                  />
                                </div>
                              ))}
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSaveEdit}
                                  className="px-4 py-2 rounded-lg bg-[#CA9B77] text-xs font-medium text-zinc-900 hover:bg-[#b8895f] transition"
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={() => { setEditing(null); setEditData({}); }}
                                  className="px-4 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 transition"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {(["situation", "task", "action", "result"] as const).map((field) => (
                                <div key={field}>
                                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">
                                    {field === "situation" ? "Situación" : field === "task" ? "Tarea" : field === "action" ? "Acción" : "Resultado"}
                                  </p>
                                  <p className="text-sm text-zinc-400 leading-relaxed">
                                    {story[field] || "—"}
                                  </p>
                                </div>
                              ))}
                              {story.earnedSecret && (
                                <div className="rounded-lg bg-[#CA9B77]/5 border border-[#CA9B77]/10 p-3">
                                  <p className="text-xs text-[#CA9B77] font-medium mb-1">Insight</p>
                                  <p className="text-sm text-zinc-400">{story.earnedSecret}</p>
                                </div>
                              )}
                              <div className="flex items-center gap-2 pt-2">
                                <button
                                  onClick={() => { setEditing(i); setEditData({}); }}
                                  className="text-xs text-zinc-500 hover:text-zinc-300 transition"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDelete(i)}
                                  className="text-xs text-red-500/60 hover:text-red-400 transition"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
