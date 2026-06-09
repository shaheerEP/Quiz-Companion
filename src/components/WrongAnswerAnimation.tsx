"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { XCircle } from "lucide-react";

interface WrongAnswerProps {
  onComplete: () => void;
}

export default function WrongAnswerAnimation({ onComplete }: WrongAnswerProps) {
  useEffect(() => {
    // Play error sound effect
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const playBuzz = (freq: number, startTime: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, startTime);
          
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          
          // Add some dissonance
          const osc2 = ctx.createOscillator();
          osc2.type = "square";
          osc2.frequency.setValueAtTime(freq * 0.95, startTime);
          osc2.connect(gain);
          osc2.start(startTime);
          osc2.stop(startTime + duration);

          osc.start(startTime);
          osc.stop(startTime + duration);
        };
        const now = ctx.currentTime;
        playBuzz(150, now, 0.3);
        playBuzz(100, now + 0.2, 0.5);
      }
    } catch (e) {}

    // Auto-close after 3 seconds
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-rose-950/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8, x: 0 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          x: [0, -15, 15, -10, 10, -5, 5, 0] // Shake effect
        }}
        transition={{ 
          opacity: { duration: 0.2 },
          scale: { duration: 0.2, type: "spring", stiffness: 200 },
          x: { duration: 0.5, delay: 0.1 }
        }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="bg-gray-900 border-2 border-rose-500/50 p-12 rounded-[2rem] shadow-[0_0_50px_rgba(244,63,94,0.3)] flex flex-col items-center text-center max-w-lg w-full mx-4"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.2 }}
          className="mb-6"
        >
          <XCircle className="w-24 h-24 text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
        </motion.div>
        
        <motion.h2 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-4xl font-black mb-4 text-white drop-shadow-sm"
        >
          Incorrect!
        </motion.h2>
        
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xl font-bold text-rose-400 mb-10"
        >
          Better luck next time. No points awarded.
        </motion.p>

        <motion.button 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={onComplete}
          className="px-10 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl font-bold text-lg transition-colors border border-gray-700 w-full"
        >
          Continue
        </motion.button>
      </motion.div>
    </div>
  );
}
