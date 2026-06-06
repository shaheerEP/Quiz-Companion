"use client";

import { useState, useRef, useEffect } from "react";

interface StopwatchProps {
  onScore: (seconds: number, isCorrect: boolean) => void;
  isRunning: boolean;
  setIsRunning: (run: boolean) => void;
}

export default function Stopwatch({ onScore, isRunning, setIsRunning }: StopwatchProps) {
  const [time, setTime] = useState(0);
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
      startTimeRef.current = performance.now() - time * 1000;
      requestRef.current = requestAnimationFrame(updateTimer);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning, time]);

  const handleStart = () => setIsRunning(true);

  const handleCorrectAndScore = () => {
    setIsRunning(false);
    onScore(time, true);
  };

  const handleWrongAnswer = () => {
    setIsRunning(false);
    onScore(time, false);
  };

  return (
    <div className="flex flex-col items-center gap-10 bg-gray-900/50 backdrop-blur-md p-12 rounded-[2rem] border border-gray-800 shadow-2xl relative overflow-hidden w-full max-w-2xl">
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-40"></div>
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-rose-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-20"></div>

      <div className="relative z-10 text-8xl md:text-9xl font-mono font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
        {time.toFixed(1)}<span className="text-4xl md:text-5xl text-gray-400">s</span>
      </div>
      
      <div className="flex flex-wrap justify-center gap-4 w-full relative z-10">
        {!isRunning ? (
          <button 
            onClick={handleStart}
            className="flex-1 min-w-[200px] bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-2xl py-6 px-8 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
          >
            START TIMER
          </button>
        ) : (
          <>
            <button 
              onClick={handleCorrectAndScore}
              className="flex-1 min-w-[150px] bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xl py-6 px-4 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
            >
              CORRECT (SCORE)
            </button>
            <button 
              onClick={handleWrongAnswer}
              className="flex-1 min-w-[150px] bg-rose-500 hover:bg-rose-400 text-white font-black text-xl py-6 px-4 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(244,63,94,0.4)]"
            >
              WRONG ANSWER
            </button>
          </>
        )}
      </div>
    </div>
  );
}
