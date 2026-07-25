"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Plus, Trash2, BookOpen, Layers, ArrowLeft, Clock, CheckCircle2, AlertCircle, HelpCircle, X, Copy, Check, MoreVertical, Edit3 } from "lucide-react";

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
  explanation?: string;
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
  const [studentRewindDays, setStudentRewindDays] = useState<number[] | null>(null);
  const [notes, setNotes] = useState<RevisionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [explanation, setExplanation] = useState("");
  const [subject, setSubject] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [activeModalNote, setActiveModalNote] = useState<RevisionNote | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Edit card state
  const [editingNote, setEditingNote] = useState<RevisionNote | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editExplanation, setEditExplanation] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [activeMenuNoteId, setActiveMenuNoteId] = useState<string | null>(null);

  const [cards, setCards] = useState<FlipCard[]>([]);
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterStatus, setFilterStatus] = useState<"all" | "due" | "upcoming" | "done">("all");

  // Fetch student details
  useEffect(() => {
    if (!studentId) return;
    fetch("/api/students")
      .then((r) => r.json())
      .then((students: any[]) => {
        const s = students.find((s) => String(s._id) === studentId);
        setStudentName(s?.name ?? null);
        setStudentRewindDays(s?.revisionRewindDays ?? null);
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
      body: JSON.stringify({
        front,
        back,
        explanation: explanation || undefined,
        subject: subject || "General",
        studentId,
      }),
    });
    setFront("");
    setBack("");
    setExplanation("");
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

  const handleSaveEdit = async () => {
    if (!editingNote || !editFront.trim() || !editBack.trim()) return;
    setSavingEdit(true);
    await fetch("/api/revision/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        noteId: editingNote._id,
        front: editFront.trim(),
        back: editBack.trim(),
        explanation: editExplanation.trim() || undefined,
        subject: editSubject.trim() || "General",
      }),
    });
    setEditingNote(null);
    setSavingEdit(false);
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
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Back (Answer / Code Key)
                </label>
                <textarea
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  rows={4}
                  placeholder="The process by which plants convert sunlight..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none transition-colors text-sm font-mono"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Explanation (Optional detailed code / solution breakdown)</span>
                <span className="text-[11px] text-violet-400 font-normal">Clicking answer opens explanation dialog</span>
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={3}
                placeholder="e.g. Detailed step-by-step explanation or complete code example..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none transition-colors text-sm font-mono"
              />
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
              const lineCount = (card.note.back || "").split("\n").length;
              const isLongAnswer = lineCount > 5;
              const hasExplanation = Boolean(card.note.explanation?.trim());
              const showExplanationIcon = hasExplanation || isLongAnswer;

              return (
                <div key={card.note._id} className="relative" style={{ perspective: "1000px" }}>
                  {/* Options 3-dots menu button (positioned outside card top-right boundary) */}
                  <div className="absolute -top-3 -right-2 z-30">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuNoteId((prev) => (prev === card.note._id ? null : card.note._id));
                      }}
                      className="p-1.5 rounded-full bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-700 transition-all shadow-lg hover:scale-110 active:scale-95"
                      title="Card options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {activeMenuNoteId === card.note._id && (
                      <div
                        className="absolute right-0 mt-1.5 w-32 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl py-1 z-40 animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setActiveMenuNoteId(null);
                            setEditingNote(card.note);
                            setEditFront(card.note.front);
                            setEditBack(card.note.back);
                            setEditExplanation(card.note.explanation || "");
                            setEditSubject(card.note.subject || "");
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-200 hover:bg-violet-600/20 hover:text-violet-300 flex items-center gap-2 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit Card
                        </button>
                        <button
                          onClick={() => {
                            setActiveMenuNoteId(null);
                            handleDelete(card.note._id);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-400 hover:bg-rose-600/20 hover:text-rose-300 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Card
                        </button>
                      </div>
                    )}
                  </div>

                  <div
                    onClick={() => {
                      setActiveMenuNoteId(null);
                      toggleFlip(realIdx);
                    }}
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
                        <p className="text-white font-semibold text-base leading-snug line-clamp-5 mt-2 whitespace-pre-wrap">
                          {card.note.front}
                        </p>
                      </div>
                    </div>

                    {/* Back face */}
                    <div
                      className="absolute inset-0 bg-violet-950/70 border border-violet-800/60 rounded-2xl p-5 flex flex-col justify-between overflow-hidden"
                      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    >
                      <div className="flex-1 flex flex-col">
                        {showExplanationIcon && (
                          <div className="flex justify-end mb-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveModalNote(card.note);
                              }}
                              title="Detailed Explanation"
                              className="p-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/40 text-violet-300 hover:text-white border border-violet-400/30 transition-all shadow-sm active:scale-95"
                            >
                              <HelpCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <div className="flex-1 flex items-center">
                          <p className="text-violet-100 font-medium text-base leading-relaxed line-clamp-5 font-mono w-full whitespace-pre-wrap">
                            {card.note.back}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

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

        {/* Explanation Dialog Box Modal */}
        {activeModalNote && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setActiveModalNote(null)}
          >
            <div
              className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col overflow-hidden text-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-violet-600/20 text-violet-400 p-2.5 rounded-xl border border-violet-500/30">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white leading-snug line-clamp-1">
                    {activeModalNote.front}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveModalNote(null)}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto pr-1 space-y-3 flex-1">
                {/* Short Answer / Code */}
                <div className="bg-violet-950/40 border border-violet-800/40 rounded-xl p-4 text-violet-100 font-mono text-sm leading-relaxed whitespace-pre-wrap select-text">
                  {activeModalNote.back}
                </div>

                {/* Detailed Explanation */}
                <div className="relative">
                  {activeModalNote.explanation && (
                    <div className="flex justify-end mb-1">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activeModalNote.explanation || "");
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        className="p-1.5 text-violet-400 hover:text-violet-300 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                        title="Copy Explanation"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}

                  <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 text-gray-200 leading-relaxed font-mono text-sm whitespace-pre-wrap select-text">
                    {activeModalNote.explanation ? (
                      activeModalNote.explanation
                    ) : (
                      <div className="text-gray-500 italic text-xs font-sans">
                        No additional detailed explanation was added for this card. The primary answer is displayed above.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Card Modal */}
        {editingNote && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setEditingNote(null)}
          >
            <div
              className="bg-gray-900 border border-gray-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col overflow-hidden text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-gray-800 pb-4 mb-4 shrink-0">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-violet-400" />
                  Edit Revision Card
                </h3>
                <button
                  onClick={() => setEditingNote(null)}
                  className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Front (Question / Term)
                  </label>
                  <textarea
                    value={editFront}
                    onChange={(e) => setEditFront(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Back (Answer / Code Key)
                  </label>
                  <textarea
                    value={editBack}
                    onChange={(e) => setEditBack(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none transition-colors text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Explanation (Optional detailed code / solution breakdown)
                  </label>
                  <textarea
                    value={editExplanation}
                    onChange={(e) => setEditExplanation(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none transition-colors text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Subject / Topic
                  </label>
                  <input
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-gray-800 pt-4 mt-4 flex justify-end gap-2 shrink-0">
                <button
                  onClick={() => setEditingNote(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit || !editFront.trim() || !editBack.trim()}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-xl font-semibold transition-all text-sm active:scale-95"
                >
                  {savingEdit ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}
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
