"use client";

import { useState, useRef, useEffect } from "react";
import { RotateCcw } from "lucide-react";

interface StopwatchProps {
  onScore: (seconds: number, isCorrect: boolean) => void;
  onCancel: () => void;
  isRunning: boolean;
  setIsRunning: (run: boolean) => void;
  studentStopTime?: number | null;
}

export default function Stopwatch({ onScore, onCancel, isRunning, setIsRunning, studentStopTime }: StopwatchProps) {
  const [time, setTime] = useState(0);
  const [isPendingScore, setIsPendingScore] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | null>(null);

  const updateTimer = () => {
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
    if (studentStopTime && isRunning) {
      setTime(studentStopTime);
      setIsRunning(false);
      setIsPendingScore(true);
    }
  }, [studentStopTime, isRunning, setIsRunning]);

  const handleStart = () => {
    setTime(0);
    setIsPendingScore(false);
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
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
    ? "drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]"
    : isPendingScore
    ? "drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]"
    : "drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]";

  return (
    <div className="flex flex-col items-center gap-8 bg-gray-900/50 backdrop-blur-md p-12 rounded-[2rem] border border-gray-800 shadow-2xl relative overflow-hidden w-full max-w-2xl">
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-40"></div>
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-rose-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-20"></div>

      {/* Timer display */}
      <div className={`relative z-10 text-8xl md:text-9xl font-mono font-black text-white tracking-tighter transition-all duration-300 ${glowColor}`}>
        {time.toFixed(1)}<span className="text-4xl md:text-5xl text-gray-400">s</span>
      </div>

      {/* Status badge */}
      {isPendingScore && (
        <div className={`relative z-10 font-bold px-5 py-2 rounded-full text-sm border ${
          studentStopTime
            ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
            : "bg-amber-500/20 text-amber-300 border-amber-500/30"
        }`}>
          {studentStopTime ? "⏹ Stopped by student" : "⏸ Timer stopped — Correct or Wrong?"}
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-wrap justify-center gap-4 w-full relative z-10">
        {!isRunning && !isPendingScore ? (
          <button
            onClick={handleStart}
            className="flex-1 min-w-[200px] bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-2xl py-6 px-8 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
          >
            START TIMER
          </button>
        ) : isRunning ? (
          <button
            onClick={handleStop}
            className="flex-1 min-w-[200px] bg-rose-500 hover:bg-rose-400 text-white font-black text-2xl py-6 px-8 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(244,63,94,0.4)]"
          >
            STOP TIMER
          </button>
        ) : (
          <>
            <button
              onClick={handleCorrectAndScore}
              className="flex-1 min-w-[140px] bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xl py-6 px-4 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
            >
              ✅ CORRECT
            </button>
            <button
              onClick={handleWrongAnswer}
              className="flex-1 min-w-[140px] bg-rose-500 hover:bg-rose-400 text-white font-black text-xl py-6 px-4 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(244,63,94,0.4)]"
            >
              ❌ WRONG
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-black text-lg py-6 px-6 rounded-2xl transition-all transform hover:scale-105 active:scale-95 border border-gray-600"
              title="Cancel and ask again"
            >
              <RotateCcw className="w-5 h-5" /> ASK AGAIN
            </button>
          </>
        )}
      </div>
    </div>
  );
}
