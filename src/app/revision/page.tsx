"use client";

import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { Plus, Trash2, BookOpen, ChevronDown, ChevronUp, Layers } from "lucide-react";

interface RevisionNote {
  _id: string;
  front: string;
  back: string;
  subject: string;
  createdAt: string;
}

interface FlipCard {
  note: RevisionNote;
  flipped: boolean;
}

export default function RevisionPage() {
  const [notes, setNotes] = useState<RevisionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [subject, setSubject] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [cards, setCards] = useState<FlipCard[]>([]);
  const [filterSubject, setFilterSubject] = useState("All");

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/revision/notes");
    const data = await res.json();
    setNotes(data);
    setCards(data.map((n: RevisionNote) => ({ note: n, flipped: false })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleAdd = async () => {
    if (!front.trim() || !back.trim()) return;
    setSaving(true);
    await fetch("/api/revision/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ front, back, subject: subject || "General" }),
    });
    setFront("");
    setBack("");
    setSubject("");
    setShowForm(false);
    setSaving(false);
    fetchNotes();
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm("Delete this revision card? This will also remove it from all student schedules.")) return;
    await fetch("/api/revision/notes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId }),
    });
    fetchNotes();
  };

  const toggleFlip = (idx: number) => {
    setCards((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, flipped: !c.flipped } : c))
    );
  };

  const subjects = ["All", ...Array.from(new Set(notes.map((n) => n.subject || "General")))];
  const filtered = filterSubject === "All"
    ? cards
    : cards.filter((c) => (c.note.subject || "General") === filterSubject);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-violet-600 p-2.5 rounded-xl shadow-lg shadow-violet-500/20">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Revision Cards</h1>
              <p className="text-gray-400 text-sm">Spaced-repetition flashcards · 1 → 2 → 7 → 14 → 30 → 90 days</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-violet-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Card
          </button>
        </div>

        {/* Add Card Form */}
        {showForm && (
          <div className="mb-8 bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-[slideDown_0.2s_ease]">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-400" />
              New Revision Card
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Front (Question / Term)
                </label>
                <textarea
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  rows={4}
                  placeholder="What is photosynthesis?"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Back (Answer / Definition)
                </label>
                <textarea
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  rows={4}
                  placeholder="The process by which plants convert sunlight..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Subject / Topic (optional)
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Biology, Maths, General"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div className="flex gap-2 pt-6">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={saving || !front.trim() || !back.trim()}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-xl font-semibold transition-all active:scale-95"
                >
                  {saving ? "Saving…" : "Save Card"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subject filter pills */}
        {subjects.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setFilterSubject(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  filterSubject === s
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                    : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Stats bar */}
        <div className="flex items-center gap-3 mb-6 text-sm text-gray-500">
          <span>{notes.length} card{notes.length !== 1 ? "s" : ""} total</span>
          <span>·</span>
          <span>Click a card to reveal answer</span>
        </div>

        {/* Card grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-52 bg-gray-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-semibold">No cards yet</p>
            <p className="text-sm">Click "Add Card" to create your first revision card.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((card, idx) => {
              const realIdx = cards.indexOf(card);
              return (
                <div key={card.note._id} className="group relative" style={{ perspective: "1000px" }}>
                  {/* Flip container */}
                  <div
                    onClick={() => toggleFlip(realIdx)}
                    className="relative w-full cursor-pointer"
                    style={{
                      height: "210px",
                      transformStyle: "preserve-3d",
                      transform: card.flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                      transition: "transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1)",
                    }}
                  >
                    {/* Front face */}
                    <div
                      className="absolute inset-0 bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col justify-between overflow-hidden"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <div>
                        <span className="inline-block px-2 py-0.5 bg-violet-500/10 text-violet-400 text-xs font-bold rounded-full mb-3">
                          {card.note.subject || "General"}
                        </span>
                        <p className="text-white font-semibold text-base leading-snug line-clamp-4">
                          {card.note.front}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-600">Click to reveal</span>
                        <ChevronDown className="w-4 h-4 text-gray-600 group-hover:text-violet-400 transition-colors" />
                      </div>
                    </div>

                    {/* Back face */}
                    <div
                      className="absolute inset-0 bg-violet-950/60 border border-violet-800/50 rounded-2xl p-5 flex flex-col justify-between overflow-hidden"
                      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    >
                      <div>
                        <span className="inline-block px-2 py-0.5 bg-violet-500/20 text-violet-300 text-xs font-bold rounded-full mb-3">
                          Answer
                        </span>
                        <p className="text-violet-100 font-medium text-base leading-snug line-clamp-4">
                          {card.note.back}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-violet-400/60">Click to flip back</span>
                        <ChevronUp className="w-4 h-4 text-violet-400/60" />
                      </div>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(card.note._id); }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg transition-all z-10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
