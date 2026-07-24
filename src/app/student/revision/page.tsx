"use client";

import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle, XCircle, BookOpen, Flame, ChevronRight } from "lucide-react";

interface DueCard {
  reviewId: string;
  noteId: string;
  front: string;
  back: string;
  subject: string;
  intervalIndex: number;
  currentInterval: number;
  nextInterval: number | null;
}

const INTERVAL_LABELS = [1, 2, 7, 14, 30, 90];

export default function StudentRevisionPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<DueCard[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [done, setDone] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

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
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          <div className="bg-violet-600 p-5 rounded-full mb-6 shadow-2xl shadow-violet-500/30 animate-bounce">
            <Flame className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            {cards.length === 0 ? "All caught up!" : "Session complete!"}
          </h1>
          <p className="text-gray-400 text-center max-w-sm mb-2">
            {cards.length === 0
              ? "No cards are due for revision today. Come back later!"
              : `You reviewed ${done} card${done !== 1 ? "s" : ""} today. Great work!`}
          </p>

          {/* Interval reminder */}
          <div className="mt-8 bg-gray-900 border border-gray-800 rounded-2xl p-5 max-w-sm w-full">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Review schedule
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              {INTERVAL_LABELS.map((day, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="px-2.5 py-1 bg-violet-900/40 text-violet-300 rounded-lg text-sm font-bold">
                    {day}d
                  </span>
                  {i < INTERVAL_LABELS.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-gray-700" />
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
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-violet-400" />
            <span className="font-bold text-white">Revision</span>
          </div>
          <span className="text-sm text-gray-500">
            {current + 1} / {cards.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-800 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Subject pill */}
        <div className="text-center mb-4">
          <span className="inline-block px-3 py-1 bg-violet-500/10 text-violet-400 text-xs font-bold rounded-full">
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
              className="absolute inset-0 bg-gray-900 border border-gray-800 rounded-3xl flex flex-col items-center justify-center p-8 shadow-2xl"
              style={{ backfaceVisibility: "hidden" }}
            >
              <p className="text-white text-xl font-bold text-center leading-snug">
                {card?.front}
              </p>
              <p className="mt-6 text-gray-600 text-sm">Tap to reveal answer</p>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-violet-950 to-indigo-950 border border-violet-800/60 rounded-3xl flex flex-col items-center justify-center p-8 shadow-2xl"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <p className="text-violet-100 text-xl font-semibold text-center leading-snug">
                {card?.back}
              </p>
              <p className="mt-6 text-violet-400/50 text-sm">Tap to flip back</p>
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
          <p className="text-center text-sm text-gray-500 mb-4">How well did you remember?</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={advanceCard}
              className="flex-1 max-w-[180px] flex items-center justify-center gap-2 px-5 py-3 bg-rose-600/10 border border-rose-800/40 hover:bg-rose-600 text-rose-400 hover:text-white rounded-2xl font-bold transition-all active:scale-95"
            >
              <XCircle className="w-5 h-5" />
              Again
            </button>
            <button
              onClick={() => handleMark(card.reviewId)}
              className="flex-1 max-w-[180px] flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600/10 border border-emerald-800/40 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-2xl font-bold transition-all active:scale-95"
            >
              <CheckCircle className="w-5 h-5" />
              Got it
            </button>
          </div>

          {/* Next interval hint */}
          {card?.nextInterval && (
            <p className="text-center text-xs text-gray-600 mt-4">
              "Got it" → next review in <span className="text-violet-400 font-semibold">{card.nextInterval} day{card.nextInterval !== 1 ? "s" : ""}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
