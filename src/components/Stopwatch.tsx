"use client";

import { useState, useRef, useEffect } from "react";
import { RotateCcw, Play, Square, Check, X } from "lucide-react";

interface StopwatchProps {
  onScore: (seconds: number, isCorrect: boolean) => void;
  onCancel: () => void;
  isRunning: boolean;
  setIsRunning: (run: boolean, time?: number, startTime?: number) => void;
  studentStopTime?: number | null;
}

export default function Stopwatch({ onScore, onCancel, isRunning, setIsRunning, studentStopTime }: StopwatchProps) {
  const [time, setTime] = useState(0);
  const [isPendingScore, setIsPendingScore] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastProcessedStopTime = useRef<number | null>(null);
  const isStoppedRef = useRef<boolean>(false);

  const updateTimer = () => {
    if (isStoppedRef.current) return;
    if (startTimeRef.current !== null) {
      const currentTime = performance.now();
      setTime((currentTime - startTimeRef.current) / 1000);
      requestRef.current = requestAnimationFrame(updateTimer);
    }
  };

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(updateTimer);
      setIsPendingScore(false);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning]);

  useEffect(() => {
    if (studentStopTime && studentStopTime !== lastProcessedStopTime.current && isRunning) {
      isStoppedRef.current = true;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      lastProcessedStopTime.current = studentStopTime;
      setTime(studentStopTime);
      setIsRunning(false);
      setIsPendingScore(true);
    }
    if (!studentStopTime) {
      lastProcessedStopTime.current = null;
    }
  }, [studentStopTime, isRunning, setIsRunning]);

  const handleStart = () => {
    isStoppedRef.current = false;
    setTime(0);
    setIsPendingScore(false);
    lastProcessedStopTime.current = null;
    const now = Date.now();
    setIsRunning(true, undefined, now);
  };

  const handleStop = () => {
    isStoppedRef.current = true;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setIsRunning(false, time);
    setIsPendingScore(true);
  };

  const handleCancel = () => {
    setTime(0);
    setIsPendingScore(false);
    setIsRunning(false);
    onCancel();
  };

  const handleCorrectAndScore = () => {
    setIsPendingScore(false);
    onScore(time, true);
  };

  const handleWrongAnswer = () => {
    setIsPendingScore(false);
    onScore(time, false);
  };

  // Determine glow color based on state
  const glowColor = isRunning
    ? "drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]"
    : isPendingScore
    ? "drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]"
    : "";

  return (
    <div className="flex flex-col items-center gap-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-md relative overflow-hidden w-full max-w-xl transition-all">
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-100 dark:bg-indigo-950/40 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] opacity-70 dark:opacity-40 pointer-events-none"></div>
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-rose-100 dark:bg-rose-950/40 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] opacity-70 dark:opacity-40 pointer-events-none"></div>

      {/* Timer display */}
      <div className={`relative z-10 text-7xl sm:text-8xl md:text-9xl font-mono font-black text-slate-900 dark:text-white tracking-tighter transition-all duration-300 ${glowColor}`}>
        {time.toFixed(1)}<span className="text-4xl sm:text-5xl md:text-5xl text-slate-400 dark:text-slate-500">s</span>
      </div>

      {/* Status badge */}
      {isPendingScore && (
        <div className={`relative z-10 font-bold px-4 py-1.5 rounded-full text-xs border ${
          studentStopTime
            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40"
            : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40"
        }`}>
          {studentStopTime ? "⏹ Stopped by student" : "⏸ Stopped"}
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-wrap justify-center items-center gap-4 w-full relative z-10">
        {!isRunning && !isPendingScore ? (
          <button
            onClick={handleStart}
            title="Start Timer"
            aria-label="Start Timer"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/25"
          >
            <Play className="w-10 h-10 sm:w-11 sm:h-11 fill-current ml-1" />
          </button>
        ) : isRunning ? (
          <button
            onClick={handleStop}
            title="Stop Timer"
            aria-label="Stop Timer"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-rose-500/25 animate-pulse"
          >
            <Square className="w-9 h-9 sm:w-10 sm:h-10 fill-current" />
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <button
              onClick={handleCorrectAndScore}
              title="Correct"
              aria-label="Correct"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/25"
            >
              <Check className="w-9 h-9 sm:w-10 sm:h-10 stroke-[3]" />
            </button>
            <button
              onClick={handleWrongAnswer}
              title="Wrong"
              aria-label="Wrong"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-rose-500/25"
            >
              <X className="w-9 h-9 sm:w-10 sm:h-10 stroke-[3]" />
            </button>
            <button
              onClick={handleCancel}
              title="Reset"
              aria-label="Reset"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 border border-slate-200 dark:border-gray-700"
            >
              <RotateCcw className="w-7 h-7 sm:w-8 sm:h-8" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
