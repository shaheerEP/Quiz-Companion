"use client";

import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle, XCircle, BookOpen, Flame, ChevronRight, HelpCircle, X, Copy, Check } from "lucide-react";

interface DueCard {
  reviewId: string;
  noteId: string;
  front: string;
  back: string;
  explanation?: string;
  subject: string;
  intervalIndex: number;
  currentInterval: number;
  nextInterval: number | null;
}

const INTERVAL_LABELS = [1, 2, 7, 14, 30, 90];

function renderTextWithLinks(text?: string, isDarkSurface = false) {
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
          className={`${
            isDarkSurface
              ? "text-violet-300 hover:text-violet-200"
              : "text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
          } underline underline-offset-2 break-all font-semibold`}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export default function StudentRevisionPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<DueCard[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [done, setDone] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const studentId = user?.student?._id || user?.id;

  const fetchDue = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    const res = await fetch(`/api/revision/due?studentId=${studentId}`);
    const data = await res.json();
    setCards(data);
    setCurrent(0);
    setFlipped(false);
    setFinished(data.length === 0);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { fetchDue(); }, [fetchDue]);

  const handleFlip = () => {
    if (flipping) return;
    setFlipping(true);
    setTimeout(() => {
      setFlipped((v) => !v);
      setFlipping(false);
    }, 10);
  };

  const handleMark = async (reviewId: string) => {
    await fetch("/api/revision/due", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId }),
    });
    setDone((d) => d + 1);
    advanceCard();
  };

  const advanceCard = () => {
    setFlipped(false);
    setShowExplanationModal(false);
    const next = current + 1;
    if (next >= cards.length) {
      setFinished(true);
    } else {
      setCurrent(next);
    }
  };

  const card = cards[current];
  const progress = cards.length > 0 ? Math.round((done / cards.length) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white transition-colors duration-200">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white transition-colors duration-200">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          <div className="bg-violet-600 p-5 rounded-full mb-6 shadow-2xl shadow-violet-500/30 animate-bounce">
            <Flame className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
            {cards.length === 0 ? "All caught up!" : "Session complete!"}
          </h1>
          <p className="text-slate-600 dark:text-gray-400 text-center max-w-sm mb-2">
            {cards.length === 0
              ? "No cards are due for revision today. Come back later!"
              : `You reviewed ${done} card${done !== 1 ? "s" : ""} today. Great work!`}
          </p>

          {/* Interval reminder */}
          <div className="mt-8 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-5 max-w-sm w-full shadow-sm">
            <p className="text-xs font-bold text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-3">
              Review schedule
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              {INTERVAL_LABELS.map((day, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="px-2.5 py-1 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded-lg text-sm font-bold border border-violet-200/50 dark:border-transparent">
                    {day}d
                  </span>
                  {i < INTERVAL_LABELS.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-slate-300 dark:text-gray-700" />
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white transition-colors duration-200">
      <Navbar />

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <span className="font-bold text-slate-900 dark:text-white">Revision</span>
          </div>
          <span className="text-sm font-medium text-slate-500 dark:text-gray-400">
            {current + 1} / {cards.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-200 dark:bg-gray-800 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-violet-600 dark:bg-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Subject pill */}
        <div className="text-center mb-4">
          <span className="inline-block px-3 py-1 bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 text-xs font-bold rounded-full border border-violet-200/50 dark:border-transparent">
            {card?.subject || "General"}
          </span>
        </div>

        {/* Flip card */}
        <div
          className="mx-auto mb-8 cursor-pointer select-none"
          style={{ perspective: "1200px", maxWidth: "480px" }}
          onClick={handleFlip}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "280px",
              transformStyle: "preserve-3d",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              transition: "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)",
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-3xl flex flex-col items-center justify-center p-8 shadow-xl text-slate-900 dark:text-white"
              style={{ backfaceVisibility: "hidden" }}
            >
              <p className="text-slate-900 dark:text-white text-xl font-bold text-center leading-snug whitespace-pre-wrap">
                {renderTextWithLinks(card?.front, false)}
              </p>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-violet-900 to-indigo-950 border border-violet-700/60 rounded-3xl flex flex-col justify-between p-7 shadow-xl overflow-hidden text-white"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <div className="flex-1 flex flex-col">
                {(() => {
                  const lineCount = (card?.back || "").split("\n").length;
                  const isLongAnswer = lineCount > 5;
                  const hasExplanation = Boolean(card?.explanation?.trim());
                  return (hasExplanation || isLongAnswer) ? (
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowExplanationModal(true);
                        }}
                        title="Detailed Explanation"
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-violet-200 hover:text-white border border-white/20 transition-all shadow-sm active:scale-95"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null;
                })()}
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-violet-50 text-lg font-medium text-center leading-relaxed font-mono line-clamp-6 w-full whitespace-pre-wrap">
                    {renderTextWithLinks(card?.back, true)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons — shown once flipped */}
        <div
          style={{
            opacity: flipped ? 1 : 0,
            transform: flipped ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.3s ease 0.2s, transform 0.3s ease 0.2s",
            pointerEvents: flipped ? "auto" : "none",
          }}
        >
          <p className="text-center text-sm font-medium text-slate-500 dark:text-gray-400 mb-4">How well did you remember?</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={advanceCard}
              className="flex-1 max-w-[180px] flex items-center justify-center gap-2 px-5 py-3 bg-rose-50 hover:bg-rose-600 border border-rose-200 dark:bg-rose-600/10 dark:border-rose-800/40 dark:hover:bg-rose-600 text-rose-700 hover:text-white dark:text-rose-400 dark:hover:text-white rounded-2xl font-bold transition-all active:scale-95 shadow-sm"
            >
              <XCircle className="w-5 h-5" />
              Again
            </button>
            <button
              onClick={() => handleMark(card.reviewId)}
              className="flex-1 max-w-[180px] flex items-center justify-center gap-2 px-5 py-3 bg-emerald-50 hover:bg-emerald-600 border border-emerald-200 dark:bg-emerald-600/10 dark:border-emerald-800/40 dark:hover:bg-emerald-600 text-emerald-700 hover:text-white dark:text-emerald-400 dark:hover:text-white rounded-2xl font-bold transition-all active:scale-95 shadow-sm"
            >
              <CheckCircle className="w-5 h-5" />
              Got it
            </button>
          </div>

          {/* Next interval hint */}
          {card?.nextInterval && (
            <p className="text-center text-xs font-medium text-slate-500 dark:text-gray-400 mt-4">
              "Got it" → next review in <span className="text-violet-600 dark:text-violet-400 font-bold">{card.nextInterval} day{card.nextInterval !== 1 ? "s" : ""}</span>
            </p>
          )}
        </div>
      </div>

      {/* Explanation Dialog Box Modal */}
      {showExplanationModal && card && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowExplanationModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col overflow-hidden text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-800 pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-violet-100 dark:bg-violet-600/20 text-violet-700 dark:text-violet-400 p-2.5 rounded-xl border border-violet-200 dark:border-violet-500/30">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
                  {renderTextWithLinks(card.front, false)}
                </h3>
              </div>
              <button
                onClick={() => setShowExplanationModal(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto pr-1 space-y-3 flex-1">
              {/* Short Answer / Code */}
              <div className="bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/40 rounded-xl p-4 text-violet-900 dark:text-violet-100 font-mono text-sm leading-relaxed whitespace-pre-wrap select-text">
                {renderTextWithLinks(card.back, false)}
              </div>

              {/* Detailed Explanation */}
              {card.explanation && (
                <div className="bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl p-5 text-slate-800 dark:text-gray-200 leading-relaxed font-mono text-sm whitespace-pre-wrap select-text">
                  {renderTextWithLinks(card.explanation, false)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
