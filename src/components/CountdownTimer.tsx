"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

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
    ? "drop-shadow-[0_0_25px_rgba(239,68,68,0.7)]"
    : isRunning
    ? "drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]"
    : "drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]";

  const borderFlash = isFinished ? "border-red-500/60 animate-pulse" : "border-gray-800";

  return (
    <div className={`flex flex-col items-center gap-6 bg-gray-900/50 backdrop-blur-md p-8 sm:p-12 rounded-[2rem] border ${borderFlash} shadow-2xl relative overflow-hidden w-full max-w-2xl transition-colors duration-300`}>
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-violet-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-40"></div>
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-amber-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-20"></div>

      {/* Progress ring */}
      <div className="relative z-10">
        <svg className="w-48 h-48 sm:w-56 sm:h-56 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(31,41,55)" strokeWidth="6" />
          <circle
            cx="60" cy="60" r="52" fill="none"
            stroke={isFinished ? "rgb(239,68,68)" : "rgb(139,92,246)"}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
            className="transition-all duration-200"
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl font-mono font-black text-white tracking-tight ${glowColor} transition-all duration-300`}>
          {formatTime(Math.ceil(remaining))}
        </div>
      </div>

      {/* Finished badge */}
      {isFinished && (
        <div className="relative z-10 font-bold px-5 py-2 rounded-full text-sm border bg-red-500/20 text-red-300 border-red-500/30 animate-pulse">
          Time&apos;s up!
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3 relative z-10">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={remaining <= 0 && !isFinished}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-950 font-black text-lg py-4 px-8 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center gap-2"
          >
            <Play className="w-5 h-5" /> {isFinished ? "RESTART" : "START"}
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-lg py-4 px-8 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(245,158,11,0.3)] flex items-center gap-2"
          >
            <Pause className="w-5 h-5" /> PAUSE
          </button>
        )}
        <button
          onClick={handleReset}
          className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-black text-lg py-4 px-6 rounded-2xl transition-all transform hover:scale-105 active:scale-95 border border-gray-600 flex items-center gap-2"
        >
          <RotateCcw className="w-5 h-5" /> RESET
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
                className={`px-4 py-2 rounded-xl font-bold text-sm border transition-all ${
                  targetSeconds === p.seconds && !isFinished
                    ? "bg-violet-500/30 text-violet-300 border-violet-500/50"
                    : "bg-gray-800/60 text-gray-400 border-gray-700 hover:bg-gray-700/60 hover:text-gray-200"
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
              className="w-14 text-center bg-gray-800 border border-gray-700 rounded-lg py-1.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-violet-500"
              placeholder="M"
            />
            <span className="text-gray-500 font-bold">:</span>
            <input
              type="number"
              min="0"
              max="59"
              value={customSec}
              onChange={(e) => setCustomSec(e.target.value)}
              className="w-14 text-center bg-gray-800 border border-gray-700 rounded-lg py-1.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-violet-500"
              placeholder="S"
            />
            <button
              onClick={applyCustom}
              className="bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 font-bold text-sm py-1.5 px-4 rounded-lg border border-violet-500/30 transition-all"
            >
              Set
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
