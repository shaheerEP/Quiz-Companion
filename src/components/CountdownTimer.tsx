"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, Check } from "lucide-react";

const PRESETS = [
  { label: "1:00", seconds: 60 },
  { label: "2:00", seconds: 120 },
  { label: "3:00", seconds: 180 },
  { label: "5:00", seconds: 300 },
  { label: "10:00", seconds: 600 },
];

function playBellSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(830, now + i * 0.35);
      osc.frequency.exponentialRampToValueAtTime(415, now + i * 0.35 + 0.6);
      gain.gain.setValueAtTime(0.4, now + i * 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.35 + 0.8);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.35);
      osc.stop(now + i * 0.35 + 0.8);
    }

    setTimeout(() => ctx.close(), 3000);
  } catch {}
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CountdownTimer() {
  const [targetSeconds, setTargetSeconds] = useState(60);
  const [remaining, setRemaining] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [customMin, setCustomMin] = useState("1");
  const [customSec, setCustomSec] = useState("00");

  const startTimeRef = useRef<number | null>(null);
  const remainingAtStartRef = useRef<number>(0);
  const requestRef = useRef<number | null>(null);
  const hasPlayedBell = useRef(false);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = null;
  }, []);

  const tick = useCallback(() => {
    if (startTimeRef.current === null) return;
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const left = Math.max(0, remainingAtStartRef.current - elapsed);
    setRemaining(left);

    if (left <= 0) {
      stop();
      setIsFinished(true);
      if (!hasPlayedBell.current) {
        hasPlayedBell.current = true;
        playBellSound();
      }
      return;
    }
    requestRef.current = requestAnimationFrame(tick);
  }, [stop]);

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const handleStart = () => {
    const startFrom = isFinished ? targetSeconds : remaining;
    if (startFrom <= 0) return;
    if (isFinished) setRemaining(targetSeconds);
    hasPlayedBell.current = false;
    setIsFinished(false);
    startTimeRef.current = performance.now();
    remainingAtStartRef.current = startFrom;
    requestRef.current = requestAnimationFrame(tick);
    setIsRunning(true);
  };

  const handlePause = () => stop();

  const handleReset = () => {
    stop();
    setRemaining(targetSeconds);
    setIsFinished(false);
    hasPlayedBell.current = false;
  };

  const selectPreset = (seconds: number) => {
    if (isRunning) return;
    setTargetSeconds(seconds);
    setRemaining(seconds);
    setIsFinished(false);
    hasPlayedBell.current = false;
  };

  const applyCustom = () => {
    if (isRunning) return;
    const m = Math.max(0, parseInt(customMin) || 0);
    const s = Math.max(0, Math.min(59, parseInt(customSec) || 0));
    const total = m * 60 + s;
    if (total <= 0) return;
    setTargetSeconds(total);
    setRemaining(total);
    setIsFinished(false);
    hasPlayedBell.current = false;
  };

  const progress = targetSeconds > 0 ? (remaining / targetSeconds) * 100 : 0;

  const glowColor = isFinished
    ? "drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]"
    : isRunning
    ? "drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]"
    : "";

  const borderFlash = isFinished ? "border-rose-400 ring-2 ring-rose-200" : "border-slate-200/80";

  return (
    <div className={`flex flex-col items-center gap-6 bg-white/90 backdrop-blur-md p-6 sm:p-8 rounded-3xl border ${borderFlash} shadow-md relative overflow-hidden w-full max-w-xl transition-all duration-300`}>
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-100 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 pointer-events-none"></div>
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-amber-100 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 pointer-events-none"></div>

      {/* Progress ring */}
      <div className="relative z-10">
        <svg className="w-48 h-48 sm:w-56 sm:h-56 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(241,245,249)" strokeWidth="6" />
          <circle
            cx="60" cy="60" r="52" fill="none"
            stroke={isFinished ? "rgb(244,63,94)" : "rgb(99,102,241)"}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl font-mono font-black text-slate-900 tracking-tight ${glowColor}`}>
          {formatTime(Math.ceil(remaining))}
        </div>
      </div>

      {/* Finished badge */}
      {isFinished && (
        <div className="relative z-10 font-bold px-4 py-1.5 rounded-full text-xs border bg-rose-50 text-rose-600 border-rose-200 animate-pulse">
          Time&apos;s up!
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 relative z-10">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={remaining <= 0 && !isFinished}
            title={isFinished ? "Restart" : "Start"}
            aria-label={isFinished ? "Restart" : "Start"}
            className="w-14 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-md shadow-emerald-500/25"
          >
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </button>
        ) : (
          <button
            onClick={handlePause}
            title="Pause"
            aria-label="Pause"
            className="w-14 h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-md shadow-amber-500/25"
          >
            <Pause className="w-6 h-6 fill-current" />
          </button>
        )}
        <button
          onClick={handleReset}
          title="Reset"
          aria-label="Reset"
          className="w-14 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center transition-all transform hover:scale-105 active:scale-95"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Presets + custom input */}
      {!isRunning && (
        <div className="flex flex-col items-center gap-3 relative z-10 w-full">
          <div className="flex flex-wrap justify-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.seconds}
                onClick={() => selectPreset(p.seconds)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                  targetSeconds === p.seconds && !isFinished
                    ? "bg-indigo-50 text-indigo-600 border-indigo-300 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="99"
              value={customMin}
              onChange={(e) => setCustomMin(e.target.value)}
              className="w-12 text-center bg-slate-50 border border-slate-200 rounded-lg py-1.5 text-slate-800 font-mono font-bold text-xs focus:outline-none focus:border-indigo-500"
              placeholder="M"
            />
            <span className="text-slate-400 font-bold">:</span>
            <input
              type="number"
              min="0"
              max="59"
              value={customSec}
              onChange={(e) => setCustomSec(e.target.value)}
              className="w-12 text-center bg-slate-50 border border-slate-200 rounded-lg py-1.5 text-slate-800 font-mono font-bold text-xs focus:outline-none focus:border-indigo-500"
              placeholder="S"
            />
            <button
              onClick={applyCustom}
              title="Set custom time"
              aria-label="Set custom time"
              className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 flex items-center justify-center transition-all"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
