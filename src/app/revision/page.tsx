"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Plus, Trash2, BookOpen, ChevronDown, ChevronUp, Layers, ArrowLeft, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface ReviewState {
  status: "due" | "upcoming" | "done";
  intervalIndex: number;
  currentInterval: number;
  nextDueDate: string | null;
  completed: boolean;
}

interface RevisionNote {
  _id: string;
  front: string;
  back: string;
  subject: string;
  createdAt: string;
  review: ReviewState | null;
}

interface FlipCard {
  note: RevisionNote;
  flipped: boolean;
}

const INTERVALS = [1, 2, 7, 14, 30, 90];

function statusBadge(review: ReviewState | null) {
  if (!review) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-500 font-bold">Not started</span>;
  if (review.status === "done") return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Complete</span>;
  if (review.status === "due") return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-400 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" />Due now</span>;
  const daysUntil = review.nextDueDate
    ? Math.ceil((new Date(review.nextDueDate).getTime() - Date.now()) / 86400000)
    : null;
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-400 font-bold flex items-center gap-1">
      <Clock className="w-3 h-3" />
      {daysUntil != null ? `In ${daysUntil}d` : `Day ${INTERVALS[review.intervalIndex]}`}
    </span>
  );
}

function RevisionPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get("studentId");

  const [studentName, setStudentName] = useState<string | null>(null);
  const [notes, setNotes] = useState<RevisionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [subject, setSubject] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [cards, setCards] = useState<FlipCard[]>([]);
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterStatus, setFilterStatus] = useState<"all" | "due" | "upcoming" | "done">("all");

  // Fetch student name
  useEffect(() => {
    if (!studentId) return;
    fetch("/api/students")
      .then((r) => r.json())
      .then((students: any[]) => {
        const s = students.find((s) => String(s._id) === studentId);
        setStudentName(s?.name ?? null);
      })
      .catch(() => {});
  }, [studentId]);

  const fetchNotes = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    const url = `/api/revision/notes?studentId=${studentId}`;
    const res = await fetch(url);
    const data = await res.json();
    setNotes(data);
    setCards(data.map((n: RevisionNote) => ({ note: n, flipped: false })));
    setLoading(false);
  }, [studentId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleAdd = async () => {
    if (!front.trim() || !back.trim() || !studentId) return;
    setSaving(true);
    await fetch("/api/revision/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ front, back, subject: subject || "General", studentId }),
    });
    setFront("");
    setBack("");
    setSubject("");
    setShowForm(false);
    setSaving(false);
    fetchNotes();
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm("Delete this revision card? This will also remove it from the student's schedule.")) return;
    await fetch("/api/revision/notes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId }),
    });
    fetchNotes();
  };

  const toggleFlip = (idx: number) => {
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, flipped: !c.flipped } : c)));
  };

  if (!studentId) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500 gap-4">
          <BookOpen className="w-12 h-12 opacity-20" />
          <p className="text-lg font-semibold">No student selected.</p>
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Go back
          </button>
        </div>
      </div>
    );
  }

  const subjects = ["All", ...Array.from(new Set(notes.map((n) => n.subject || "General")))];

  const dueCount = notes.filter((n) => n.review?.status === "due").length;
  const doneCount = notes.filter((n) => n.review?.status === "done").length;

  const filteredCards = cards.filter((c) => {
    const subjectMatch = filterSubject === "All" || (c.note.subject || "General") === filterSubject;
    const statusMatch =
      filterStatus === "all" ||
      (filterStatus === "due" && c.note.review?.status === "due") ||
      (filterStatus === "upcoming" && c.note.review?.status === "upcoming") ||
      (filterStatus === "done" && c.note.review?.status === "done");
    return subjectMatch && statusMatch;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back + Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => router.back()}
              className="mt-1 p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="bg-violet-600 p-2 rounded-lg shadow-lg shadow-violet-500/20">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-black text-white">Revision Cards</h1>
              </div>
              {studentName && (
                <p className="text-gray-400 text-sm ml-11">
                  for <span className="text-violet-400 font-semibold capitalize">{studentName}</span>
                  <span className="mx-2 text-gray-700">·</span>
                  <span className="text-gray-500">1 → 2 → 7 → 14 → 30 → 90 days</span>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-violet-500/20 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Card
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-sm font-semibold text-gray-400">
            {notes.length} card{notes.length !== 1 ? "s" : ""} total
          </div>
          {dueCount > 0 && (
            <div className="px-4 py-2 bg-amber-900/30 border border-amber-800/50 rounded-xl text-sm font-semibold text-amber-400">
              {dueCount} due now
            </div>
          )}
          {doneCount > 0 && (
            <div className="px-4 py-2 bg-emerald-900/30 border border-emerald-800/50 rounded-xl text-sm font-semibold text-emerald-400">
              {doneCount} complete
            </div>
          )}
        </div>

        {/* Add Card Form */}
        {showForm && (
          <div className="mb-8 bg-gray-900 border border-gray-800 rounded-2xl p-6" style={{ animation: "slideDown 0.2s ease" }}>
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

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {/* Status filter */}
          {(["all", "due", "upcoming", "done"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all capitalize ${
                filterStatus === s
                  ? s === "due"
                    ? "bg-amber-600 text-white"
                    : s === "done"
                    ? "bg-emerald-600 text-white"
                    : "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                  : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              {s === "all" ? "All" : s === "due" ? `Due (${dueCount})` : s === "done" ? `Complete (${doneCount})` : "Upcoming"}
            </button>
          ))}

          {/* Subject filter */}
          {subjects.length > 1 && (
            <>
              <span className="text-gray-700 self-center">|</span>
              {subjects.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterSubject(s)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    filterSubject === s
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  {s}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Card grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-52 bg-gray-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-semibold">No cards here</p>
            <p className="text-sm">
              {notes.length === 0 ? 'Click "Add Card" to create the first revision card.' : "Try a different filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCards.map((card) => {
              const realIdx = cards.indexOf(card);
              const review = card.note.review;
              const isDue = review?.status === "due";
              const isDone = review?.status === "done";

              return (
                <div key={card.note._id} className="group relative" style={{ perspective: "1000px" }}>
                  <div
                    onClick={() => toggleFlip(realIdx)}
                    className="relative w-full cursor-pointer"
                    style={{
                      height: "220px",
                      transformStyle: "preserve-3d",
                      transform: card.flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                      transition: "transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1)",
                    }}
                  >
                    {/* Front face */}
                    <div
                      className={`absolute inset-0 rounded-2xl p-5 flex flex-col justify-between overflow-hidden border ${
                        isDue
                          ? "bg-amber-950/30 border-amber-800/40"
                          : isDone
                          ? "bg-emerald-950/20 border-emerald-900/40"
                          : "bg-gray-900 border-gray-800"
                      }`}
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <div>
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <span className="inline-block px-2 py-0.5 bg-violet-500/10 text-violet-400 text-xs font-bold rounded-full">
                            {card.note.subject || "General"}
                          </span>
                          {statusBadge(review)}
                        </div>
                        <p className="text-white font-semibold text-base leading-snug line-clamp-4 mt-2">
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

                  {/* Due indicator glow */}
                  {isDue && (
                    <div className="absolute -inset-px rounded-2xl border border-amber-500/40 pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RevisionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RevisionPageInner />
    </Suspense>
  );
}
