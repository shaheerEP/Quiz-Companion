"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import {
  Plus,
  Trash2,
  BookOpen,
  Layers,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  MoreVertical,
  Edit3,
  Play,
  WifiOff,
  RefreshCw,
  Cloud,
  Users
} from "lucide-react";
import {
  RevisionNote,
  ReviewState,
  getCachedNotes,
  saveCachedNotes,
  getCachedStudentMeta,
  saveCachedStudentMeta,
  getCachedStudentsList,
  getOfflineQueue,
  addOfflineQueueItem,
  removeOfflineQueueItem,
  updateOfflineQueueItemPayload,
  getPendingQueueCount,
  syncOfflineQueue
} from "@/lib/revision-offline";

interface FlipCard {
  note: RevisionNote;
  flipped: boolean;
}

const INTERVALS = [1, 2, 7, 14, 30, 90];

function renderTextWithLinks(text?: string) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith("www.") ? `https://${part}` : part;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-violet-400 hover:text-violet-300 underline underline-offset-2 break-all font-semibold"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

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

function SelfRevisionPageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // If teacher or admin, allow studentId from query params; if student, use session studentId
  const paramStudentId = searchParams.get("studentId");
  const authStudentId = user?.role === "student" ? (user.student?._id || user.id) : null;
  const studentId = paramStudentId || authStudentId || null;

  const [studentName, setStudentName] = useState<string | null>(
    user?.role === "student" ? (user.name || user.student?.name || null) : null
  );
  const [studentRewindDays, setStudentRewindDays] = useState<number[] | null>(null);
  const [notes, setNotes] = useState<RevisionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Offline & Sync state
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncNotification, setSyncNotification] = useState<string | null>(null);
  const [cachedStudents, setCachedStudents] = useState<any[]>([]);

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [explanation, setExplanation] = useState("");
  const [subject, setSubject] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [activeModalNote, setActiveModalNote] = useState<RevisionNote | null>(null);

  // Edit card state
  const [editingNote, setEditingNote] = useState<RevisionNote | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editExplanation, setEditExplanation] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [activeMenuNoteId, setActiveMenuNoteId] = useState<string | null>(null);

  // Interactive Deck Player state
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [deckCards, setDeckCards] = useState<RevisionNote[]>([]);
  const [deckIndex, setDeckIndex] = useState(0);
  const [deckFlipped, setDeckFlipped] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  const [cards, setCards] = useState<FlipCard[]>([]);
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterStatus, setFilterStatus] = useState<"all" | "due" | "upcoming" | "done">("all");

  // Track online/offline status
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
    }
  }, []);

  // Fetch student details & cache them
  useEffect(() => {
    let mounted = true;

    getCachedStudentsList().then((cached) => {
      if (mounted && cached.length > 0) setCachedStudents(cached);
    });

    if (!studentId) return;

    if (navigator.onLine) {
      fetch("/api/students")
        .then((r) => r.json())
        .then((students: any[]) => {
          if (!mounted || !Array.isArray(students)) return;
          const s = students.find((item) => String(item._id) === studentId);
          if (s) {
            setStudentName(s.name ?? null);
            setStudentRewindDays(s.revisionRewindDays ?? null);
            saveCachedStudentMeta(studentId, {
              name: s.name ?? null,
              rewindDays: s.revisionRewindDays ?? null,
            });
          }
        })
        .catch(() => {});
    }

    return () => {
      mounted = false;
    };
  }, [studentId]);

  // Load self-revision notes from local cache first, then fetch from server
  const fetchNotes = useCallback(async () => {
    if (!studentId) return;

    // Load from local self-revision cache
    const cached = await getCachedNotes(studentId, true);
    if (cached.length > 0) {
      setNotes(cached);
      setCards(cached.map((n) => ({ note: n, flipped: false })));
      setLoading(false);
    }

    const pCount = await getPendingQueueCount(studentId, true);
    setPendingSyncCount(pCount);

    if (navigator.onLine) {
      try {
        const url = `/api/self-revision/notes?studentId=${studentId}`;
        const res = await fetch(url);
        if (res.ok) {
          const serverData: RevisionNote[] = await res.json();

          const queue = await getOfflineQueue();
          const offlineDrafts: RevisionNote[] = queue
            .filter((q) => q.studentId === studentId && q.isSelfRevision && q.action === "CREATE")
            .map((q) => ({
              _id: q.payload.tempId || q.id,
              front: q.payload.front,
              back: q.payload.back,
              explanation: q.payload.explanation,
              subject: q.payload.subject || "",
              createdAt: new Date(q.createdAt).toISOString(),
              review: {
                status: "due",
                intervalIndex: 0,
                currentInterval: 1,
                nextDueDate: new Date().toISOString(),
                completed: false,
              },
              _isOffline: true,
            }));

          const combined = [...offlineDrafts, ...serverData];
          setNotes(combined);
          setCards(combined.map((n) => ({ note: n, flipped: false })));
          await saveCachedNotes(studentId, combined, true);
        }
      } catch (err) {
        console.warn("[SelfRevision] Network fetch failed, relying on offline cache:", err);
      }
    }

    setLoading(false);
  }, [studentId]);

  // Sync offline self-revision queue with server
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || syncing) return;
    setSyncing(true);

    try {
      const result = await syncOfflineQueue(studentId || undefined, true);
      if (result.syncedCount > 0) {
        setSyncNotification(`✓ Synced ${result.syncedCount} self-revision card${result.syncedCount > 1 ? "s" : ""} with server!`);
        setTimeout(() => setSyncNotification(null), 5000);
      }
      const remaining = await getPendingQueueCount(studentId || undefined, true);
      setPendingSyncCount(remaining);

      if (studentId) {
        await fetchNotes();
      }
    } catch (err) {
      console.error("[SelfRevision] Sync error:", err);
    } finally {
      setSyncing(false);
    }
  }, [studentId, syncing, fetchNotes]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [triggerSync]);

  // Initial load
  useEffect(() => {
    let mounted = true;

    if (studentId) {
      getCachedStudentMeta(studentId).then((meta) => {
        if (mounted && meta) {
          if (meta.name && !studentName) setStudentName(meta.name);
          if (meta.rewindDays) setStudentRewindDays(meta.rewindDays);
        }
      });
      fetchNotes();
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [studentId, fetchNotes, studentName]);

  // Add Card
  const handleAdd = async () => {
    if (!front.trim() || !back.trim() || !studentId) return;
    setSaving(true);

    const tempId = `offline_self_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const offlineNote: RevisionNote = {
      _id: tempId,
      front: front.trim(),
      back: back.trim(),
      explanation: explanation.trim() || undefined,
      subject: subject.trim() || undefined,
      createdAt: new Date().toISOString(),
      review: {
        status: "due",
        intervalIndex: 0,
        currentInterval: 1,
        nextDueDate: new Date().toISOString(),
        completed: false,
      },
      _isOffline: true,
    };

    let savedOnServer = false;

    if (navigator.onLine) {
      try {
        const res = await fetch("/api/self-revision/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            front: front.trim(),
            back: back.trim(),
            explanation: explanation.trim() || undefined,
            subject: subject.trim() || undefined,
            studentId,
          }),
        });

        if (res.ok) {
          savedOnServer = true;
          setSyncNotification("Self-revision card created and saved on server.");
          setTimeout(() => setSyncNotification(null), 3000);
        }
      } catch (err) {
        console.warn("[SelfRevision] Online save failed, saving offline:", err);
      }
    }

    if (!savedOnServer) {
      await addOfflineQueueItem({
        action: "CREATE",
        studentId,
        isSelfRevision: true,
        payload: {
          front: offlineNote.front,
          back: offlineNote.back,
          explanation: offlineNote.explanation,
          subject: offlineNote.subject,
          studentId,
          tempId,
        },
      });

      const updatedNotes = [offlineNote, ...notes];
      setNotes(updatedNotes);
      setCards(updatedNotes.map((n) => ({ note: n, flipped: false })));
      await saveCachedNotes(studentId, updatedNotes, true);
      setPendingSyncCount((prev) => prev + 1);

      setSyncNotification("Card saved offline! Will sync automatically when connected to internet.");
      setTimeout(() => setSyncNotification(null), 5000);
    }

    setFront("");
    setBack("");
    setExplanation("");
    setSubject("");
    setShowForm(false);
    setSaving(false);

    if (savedOnServer) {
      fetchNotes();
    }
  };

  // Delete Card
  const handleDelete = async (noteId: string) => {
    if (!confirm("Delete this personal revision card?")) return;

    const targetNote = notes.find((n) => n._id === noteId);
    const isTempNote = targetNote?._isOffline || noteId.startsWith("offline_");

    let deletedOnServer = false;

    if (navigator.onLine && !isTempNote) {
      try {
        const res = await fetch("/api/self-revision/notes", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteId }),
        });
        if (res.ok) deletedOnServer = true;
      } catch (err) {
        console.warn("[SelfRevision] Server delete failed, queuing delete offline:", err);
      }
    }

    if (!deletedOnServer) {
      if (isTempNote) {
        const queue = await getOfflineQueue();
        const item = queue.find((q) => q.payload?.tempId === noteId || q.id === noteId);
        if (item) {
          await removeOfflineQueueItem(item.id);
          setPendingSyncCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        await addOfflineQueueItem({
          action: "DELETE",
          studentId: studentId!,
          isSelfRevision: true,
          payload: { noteId },
        });
        setPendingSyncCount((prev) => prev + 1);
      }

      const updatedNotes = notes.filter((n) => n._id !== noteId);
      setNotes(updatedNotes);
      setCards(updatedNotes.map((n) => ({ note: n, flipped: false })));
      if (studentId) {
        await saveCachedNotes(studentId, updatedNotes, true);
      }
    } else {
      fetchNotes();
    }
  };

  // Edit Card
  const handleSaveEdit = async () => {
    if (!editingNote || !editFront.trim() || !editBack.trim()) return;
    setSavingEdit(true);

    const updatedNote: RevisionNote = {
      ...editingNote,
      front: editFront.trim(),
      back: editBack.trim(),
      explanation: editExplanation.trim() || undefined,
      subject: editSubject.trim() || undefined,
    };

    const isTempNote = editingNote._isOffline || editingNote._id.startsWith("offline_");
    let savedOnServer = false;

    if (navigator.onLine && !isTempNote) {
      try {
        const res = await fetch("/api/self-revision/notes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noteId: editingNote._id,
            front: editFront.trim(),
            back: editBack.trim(),
            explanation: editExplanation.trim() || undefined,
            subject: editSubject.trim() || undefined,
          }),
        });
        if (res.ok) savedOnServer = true;
      } catch (err) {
        console.warn("[SelfRevision] Online edit failed, falling back to offline edit:", err);
      }
    }

    if (!savedOnServer) {
      if (isTempNote) {
        await updateOfflineQueueItemPayload(editingNote._id, {
          front: updatedNote.front,
          back: updatedNote.back,
          explanation: updatedNote.explanation,
          subject: updatedNote.subject,
        });
      } else {
        await addOfflineQueueItem({
          action: "UPDATE",
          studentId: studentId!,
          isSelfRevision: true,
          payload: {
            noteId: editingNote._id,
            front: updatedNote.front,
            back: updatedNote.back,
            explanation: updatedNote.explanation,
            subject: updatedNote.subject,
          },
        });
        setPendingSyncCount((prev) => prev + 1);
      }

      const updatedNotes = notes.map((n) => (n._id === editingNote._id ? updatedNote : n));
      setNotes(updatedNotes);
      setCards(updatedNotes.map((n) => ({ note: n, flipped: false })));
      if (studentId) {
        await saveCachedNotes(studentId, updatedNotes, true);
      }
      setSyncNotification("Card edit saved locally.");
      setTimeout(() => setSyncNotification(null), 3000);
    }

    setEditingNote(null);
    setSavingEdit(false);
    if (savedOnServer) {
      fetchNotes();
    }
  };

  const toggleFlip = (idx: number) => {
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, flipped: !c.flipped } : c)));
  };

  const startRevisionDeck = (startNoteId?: string) => {
    const dueNotes = notes.filter((n) => {
      const isDueNote = n.review?.status === "due";
      const matchesSubject = filterSubject === "All" || n.subject === filterSubject;
      return isDueNote && matchesSubject;
    });

    if (dueNotes.length === 0) return;

    let initialIndex = 0;
    if (startNoteId) {
      const idx = dueNotes.findIndex((n) => n._id === startNoteId);
      if (idx !== -1) initialIndex = idx;
    }

    setDeckCards(dueNotes);
    setDeckIndex(initialIndex);
    setDeckFlipped(false);
    setShowDeckModal(true);
  };

  // Rate card in deck session
  const handleRateCard = async (rating: "bad" | "good" | "awesome" | "excellent") => {
    const currentNote = deckCards[deckIndex];
    if (!currentNote || !currentNote.review?._id || submittingRating) return;

    setSubmittingRating(true);

    let ratedOnServer = false;
    if (navigator.onLine) {
      try {
        const res = await fetch("/api/self-revision/due", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewId: currentNote.review._id,
            rating,
          }),
        });
        if (res.ok) ratedOnServer = true;
      } catch {}
    }

    if (!ratedOnServer) {
      await addOfflineQueueItem({
        action: "RATE",
        studentId: studentId!,
        isSelfRevision: true,
        payload: {
          reviewId: currentNote.review._id,
          rating,
        },
      });
      setPendingSyncCount((prev) => prev + 1);
    }

    setSubmittingRating(false);

    if (deckIndex + 1 < deckCards.length) {
      setDeckIndex((prev) => prev + 1);
      setDeckFlipped(false);
    } else {
      setShowDeckModal(false);
    }

    if (ratedOnServer) {
      fetchNotes();
    }
  };

  if (!studentId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white transition-colors duration-200">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center text-center">
          <div className="bg-violet-600/10 text-violet-400 p-4 rounded-2xl mb-4 border border-violet-500/20">
            <Layers className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Self Revision</h1>
          <p className="text-gray-400 text-sm max-w-md mb-8">
            Please log in as a student to access your personal revision cards, or select a student below.
          </p>

          {cachedStudents.length > 0 && (
            <div className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-6 text-left mb-6">
              <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" />
                Select Student Deck
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cachedStudents.map((s) => (
                  <button
                    key={s._id}
                    onClick={() => router.push(`/self-revision?studentId=${s._id}`)}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-gray-800/80 hover:bg-violet-600/20 border border-gray-700 hover:border-violet-500/50 text-white transition-all text-left group"
                  >
                    <span className="font-semibold text-sm capitalize group-hover:text-violet-300">
                      {s.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700/80 text-gray-300">
                      Open &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go back
          </button>
        </div>
      </div>
    );
  }

  const existingSubjects = Array.from(new Set(notes.map((n) => n.subject?.trim()).filter(Boolean))) as string[];
  const subjects = ["All", ...existingSubjects];

  const dueCount = notes.filter((n) => n.review?.status === "due").length;
  const doneCount = notes.filter((n) => n.review?.status === "done").length;

  const filteredCards = cards.filter((c) => {
    const subjectMatch = filterSubject === "All" || c.note.subject === filterSubject;
    const statusMatch =
      filterStatus === "all" ||
      (filterStatus === "due" && c.note.review?.status === "due") ||
      (filterStatus === "upcoming" && c.note.review?.status === "upcoming") ||
      (filterStatus === "done" && c.note.review?.status === "done");
    return subjectMatch && statusMatch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white transition-colors duration-200">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Offline & Sync Status Banner */}
        {!isOnline && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 text-amber-300 animate-in fade-in">
            <div className="flex items-center gap-3">
              <WifiOff className="w-5 h-5 shrink-0 text-amber-400" />
              <div>
                <p className="font-bold text-sm">Offline Mode Active</p>
                <p className="text-xs text-amber-300/80">
                  You are reading your cached self-revision cards. You can add new cards and review offline — all changes will sync automatically once reconnected.
                </p>
              </div>
            </div>
            {pendingSyncCount > 0 && (
              <span className="shrink-0 px-3 py-1 rounded-full bg-amber-500/20 text-xs font-bold border border-amber-500/40">
                {pendingSyncCount} unsynced {pendingSyncCount === 1 ? "card" : "cards"}
              </span>
            )}
          </div>
        )}

        {isOnline && pendingSyncCount > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-between gap-4 text-violet-300 animate-in fade-in">
            <div className="flex items-center gap-3">
              <Cloud className="w-5 h-5 shrink-0 text-violet-400" />
              <div>
                <p className="font-bold text-sm">Offline changes ready to sync</p>
                <p className="text-xs text-violet-300/80">
                  {syncing
                    ? "Syncing self-revision cards with server..."
                    : `You have ${pendingSyncCount} offline card${pendingSyncCount > 1 ? "s" : ""} saved locally.`}
                </p>
              </div>
            </div>
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        )}

        {syncNotification && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <p className="font-bold text-sm">{syncNotification}</p>
          </div>
        )}

        {/* Back + Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => router.back()}
              className="mt-1 p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-2 rounded-lg shadow-lg shadow-violet-500/20">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-black text-white">Self Revision Cards</h1>
                {!isOnline && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                    <WifiOff className="w-3 h-3" /> Offline
                  </span>
                )}
              </div>
              {studentName && (
                <p className="text-gray-400 text-sm ml-11">
                  Personal deck for <span className="text-violet-400 font-semibold capitalize">{studentName}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {dueCount > 0 && (
              <button
                onClick={() => startRevisionDeck()}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 text-sm"
              >
                <Play className="w-4 h-4 fill-white" />
                Start Revision ({dueCount})
              </button>
            )}
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-violet-500/20 active:scale-95 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Card {!isOnline && "(Offline)"}
            </button>
          </div>
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
          {pendingSyncCount > 0 && (
            <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm font-semibold text-amber-300 flex items-center gap-1.5">
              <Cloud className="w-4 h-4" />
              {pendingSyncCount} saved offline
            </div>
          )}
        </div>

        {/* Add Card Form */}
        {showForm && (
          <div className="mb-8 bg-gray-900 border border-gray-800 rounded-2xl p-6" style={{ animation: "slideDown 0.2s ease" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-violet-400" />
                New Personal Revision Card
              </h2>
              {!isOnline && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                  <WifiOff className="w-3 h-3" /> Offline Mode (Will sync later)
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Front (Question / Term)
                </label>
                <textarea
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  rows={4}
                  placeholder="Enter your question, vocabulary, or concept..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Back (Answer / Key Definition)
                </label>
                <textarea
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  rows={4}
                  placeholder="Enter the correct answer or code solution..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none transition-colors text-sm font-mono"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Explanation (Optional detailed notes / hints)</span>
                <span className="text-[11px] text-violet-400 font-normal">Clicking answer opens explanation dialog</span>
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={3}
                placeholder="Optional notes, mnemonics, or complete explanation..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none transition-colors text-sm font-mono"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Subject / Topic (optional)
                </label>
                <input
                  list="existing-subjects-add-self"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Select existing subject or type a new one..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
                />
                <datalist id="existing-subjects-add-self">
                  {existingSubjects.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {existingSubjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {existingSubjects.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSubject(s)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          subject === s
                            ? "bg-violet-600 border-violet-500 text-white font-bold"
                            : "bg-gray-800/80 hover:bg-gray-700 text-gray-300 border-gray-700"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
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
                  {saving ? "Saving…" : isOnline ? "Save Card" : "Save Card (Offline)"}
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
            <p className="text-lg font-semibold">No self-revision cards here</p>
            <p className="text-sm">
              {notes.length === 0 ? 'Click "Add Card" to create your first personal revision card.' : "Try a different filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCards.map((card) => {
              const realIdx = cards.indexOf(card);
              const review = card.note.review;
              const isDue = review?.status === "due";
              const isDone = review?.status === "done";
              const isOfflineDraft = Boolean(card.note._isOffline);
              const lineCount = (card.note.back || "").split("\n").length;
              const isLongAnswer = lineCount > 5;
              const hasExplanation = Boolean(card.note.explanation?.trim());
              const showExplanationIcon = hasExplanation || isLongAnswer;

              return (
                <div key={card.note._id} className="relative" style={{ perspective: "1000px" }}>
                  {/* Options 3-dots menu button */}
                  {filterStatus !== "due" && (
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
                  )}

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
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {card.note.subject?.trim() ? (
                              <span className="inline-block px-2 py-0.5 bg-violet-500/10 text-violet-400 text-xs font-bold rounded-full">
                                {card.note.subject}
                              </span>
                            ) : null}
                            {isOfflineDraft && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center gap-1 border border-amber-500/30">
                                <WifiOff className="w-2.5 h-2.5" />
                                Offline draft
                              </span>
                            )}
                          </div>
                          {filterStatus !== "due" && statusBadge(review)}
                        </div>
                        <p className="text-white font-semibold text-base leading-snug line-clamp-5 mt-2 whitespace-pre-wrap">
                          {renderTextWithLinks(card.note.front)}
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
                            {renderTextWithLinks(card.note.back)}
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

      {/* Interactive Revision Deck Player Modal */}
      {showDeckModal && deckCards.length > 0 && deckCards[deckIndex] && (() => {
        const ratingIntervals = studentRewindDays?.length ? studentRewindDays : [1, 2, 7, 14, 30, 90];
        const curIdx = deckCards[deckIndex]?.review?.intervalIndex ?? 0;

        const badDays = `${ratingIntervals[0]}d`;

        const gIdx = curIdx + 1;
        const goodDays = gIdx >= ratingIntervals.length ? "Done" : `${ratingIntervals[gIdx]}d`;

        const aIdx = curIdx + 2;
        const awesomeDays = aIdx >= ratingIntervals.length ? "Done" : `${ratingIntervals[aIdx]}d`;

        const eIdx = curIdx + 3;
        const excellentDays = eIdx >= ratingIntervals.length ? "Done" : `${ratingIntervals[eIdx]}d`;

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setShowDeckModal(false)}
          >
            <div
              className="bg-gray-900 border border-gray-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative flex flex-col items-center overflow-hidden text-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Bar */}
              <div className="w-full flex items-center justify-between border-b border-gray-800 pb-3 mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600/20 text-emerald-400 p-2.5 rounded-xl border border-emerald-500/30">
                    <Play className="w-4 h-4 fill-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Interactive Self-Revision Session</h3>
                    <p className="text-xs text-gray-400">
                      Card {deckIndex + 1} of {deckCards.length}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeckModal(false)}
                  className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mb-5">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${((deckIndex + 1) / deckCards.length) * 100}%` }}
                />
              </div>

              {/* Interactive 3D Flashcard */}
              <div
                className="w-full relative cursor-pointer mb-6"
                style={{ perspective: "1000px", height: "230px" }}
                onClick={() => setDeckFlipped((prev) => !prev)}
              >
                <div
                  className="w-full h-full relative"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: deckFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    transition: "transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1)",
                  }}
                >
                  {/* Card Front */}
                  <div
                    className="absolute inset-0 bg-gray-950 border border-gray-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="px-2.5 py-1 bg-violet-500/10 text-violet-400 font-bold rounded-full">
                        {deckCards[deckIndex].subject || "Question"}
                      </span>
                    </div>
                    <p className="text-white text-lg font-bold text-center leading-relaxed whitespace-pre-wrap my-auto">
                      {renderTextWithLinks(deckCards[deckIndex].front)}
                    </p>
                  </div>

                  {/* Card Back */}
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-violet-950/90 to-indigo-950/90 border border-violet-800/60 rounded-2xl p-6 flex flex-col justify-between shadow-xl"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    <div className="flex justify-end">
                      {(Boolean(deckCards[deckIndex].explanation?.trim()) ||
                        (deckCards[deckIndex].back || "").split("\n").length > 5) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveModalNote(deckCards[deckIndex]);
                          }}
                          title="Detailed Explanation"
                          className="p-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/40 text-violet-300 hover:text-white border border-violet-400/30 transition-all shadow-sm"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-violet-100 text-base font-medium text-center leading-relaxed font-mono line-clamp-6 w-full whitespace-pre-wrap">
                        {renderTextWithLinks(deckCards[deckIndex].back)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Memory Rating Buttons */}
              <div className="w-full flex flex-col items-center">
                {!deckFlipped ? (
                  <button
                    onClick={() => setDeckFlipped(true)}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-violet-500/20 active:scale-95 text-sm"
                  >
                    Flip Card / Reveal Answer
                  </button>
                ) : (
                  <div className="w-full">
                    <div className="grid grid-cols-4 gap-2 w-full">
                      <button
                        onClick={() => handleRateCard("bad")}
                        disabled={submittingRating}
                        className="flex flex-col items-center justify-center py-2.5 px-2 bg-rose-600/10 hover:bg-rose-600 border border-rose-500/40 text-rose-400 hover:text-white rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50"
                      >
                        <span className="text-sm">🔴</span>
                        <span className="text-xs font-extrabold mt-0.5">Bad</span>
                        <span className="text-[10px] opacity-75 font-mono">{badDays}</span>
                      </button>
                      <button
                        onClick={() => handleRateCard("good")}
                        disabled={submittingRating}
                        className="flex flex-col items-center justify-center py-2.5 px-2 bg-amber-600/10 hover:bg-amber-600 border border-amber-500/40 text-amber-400 hover:text-white rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50"
                      >
                        <span className="text-sm">🟡</span>
                        <span className="text-xs font-extrabold mt-0.5">Good</span>
                        <span className="text-[10px] opacity-75 font-mono">{goodDays}</span>
                      </button>
                      <button
                        onClick={() => handleRateCard("awesome")}
                        disabled={submittingRating}
                        className="flex flex-col items-center justify-center py-2.5 px-2 bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-400 hover:text-white rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50"
                      >
                        <span className="text-sm">⚡</span>
                        <span className="text-xs font-extrabold mt-0.5">Awesome</span>
                        <span className="text-[10px] opacity-75 font-mono">{awesomeDays}</span>
                      </button>
                      <button
                        onClick={() => handleRateCard("excellent")}
                        disabled={submittingRating}
                        className="flex flex-col items-center justify-center py-2.5 px-2 bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-400 hover:text-white rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50"
                      >
                        <span className="text-sm">🌟</span>
                        <span className="text-xs font-extrabold mt-0.5">Excellent</span>
                        <span className="text-[10px] opacity-75 font-mono">{excellentDays}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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
                  {renderTextWithLinks(activeModalNote.front)}
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
              <div className="bg-violet-950/40 border border-violet-800/40 rounded-xl p-4 text-violet-100 font-mono text-sm leading-relaxed whitespace-pre-wrap select-text">
                {renderTextWithLinks(activeModalNote.back)}
              </div>

              {activeModalNote.explanation && (
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 text-gray-200 leading-relaxed font-mono text-sm whitespace-pre-wrap select-text">
                  {renderTextWithLinks(activeModalNote.explanation)}
                </div>
              )}
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
                Edit Self-Revision Card
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
                  Explanation (Optional detailed notes / hints)
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
                  list="existing-subjects-edit-self"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="Select existing subject or type a new one..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
                />
                <datalist id="existing-subjects-edit-self">
                  {existingSubjects.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {existingSubjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {existingSubjects.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditSubject(s)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          editSubject === s
                            ? "bg-violet-600 border-violet-500 text-white font-bold"
                            : "bg-gray-800/80 hover:bg-gray-700 text-gray-300 border-gray-700"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
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

export default function SelfRevisionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white transition-colors duration-200 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SelfRevisionPageInner />
    </Suspense>
  );
}
