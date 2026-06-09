"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { PlusCircle, MinusCircle } from "lucide-react";

interface ManualPointsProps {
  type: 'bonus' | 'deduction';
  amount: number;
  onComplete: () => void;
}

export default function ManualPointsAnimation({ type, amount, onComplete }: ManualPointsProps) {
  useEffect(() => {
    // Play sound effect
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const now = ctx.currentTime;
        
        if (type === 'bonus') {
          // Cash register / happy ding
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          osc1.type = "sine";
          osc2.type = "sine";
          
          osc1.frequency.setValueAtTime(880, now); // A5
          osc2.frequency.setValueAtTime(1108.73, now); // C#6
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.5);
          osc2.stop(now + 0.5);
        } else {
          // Error buzz / downslide
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
          
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          
          osc.start(now);
          osc.stop(now + 0.4);
        }
      }
    } catch (e) {}

    // Auto-close after 3.5 seconds
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 3500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBonus = type === 'bonus';
  const colorClass = isBonus ? "rose-500" : "rose-500"; // Wait, bonus should be indigo or emerald
  const bgColor = isBonus ? "bg-indigo-950/90" : "bg-rose-950/90";
  const borderColor = isBonus ? "border-indigo-500/50" : "border-rose-500/50";
  const shadowColor = isBonus ? "shadow-[0_0_50px_rgba(99,102,241,0.3)]" : "shadow-[0_0_50px_rgba(244,63,94,0.3)]";
  const textColor = isBonus ? "text-indigo-400" : "text-rose-400";
  const glowColor = isBonus ? "drop-shadow-[0_0_20px_rgba(99,102,241,0.5)]" : "drop-shadow-[0_0_20px_rgba(244,63,94,0.5)]";

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${bgColor} backdrop-blur-md`}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.5, y: isBonus ? 50 : -50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        exit={{ opacity: 0, scale: 0.8, y: isBonus ? -50 : 50 }}
        className={`bg-gray-900 border-2 ${borderColor} p-12 rounded-[3rem] ${shadowColor} flex flex-col items-center text-center max-w-lg w-full mx-4`}
      >
        <motion.div
          initial={{ scale: 0, rotate: isBonus ? -180 : 180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.2 }}
          className="mb-6"
        >
          {isBonus ? (
            <PlusCircle className={`w-28 h-28 ${textColor} ${glowColor}`} />
          ) : (
            <MinusCircle className={`w-28 h-28 ${textColor} ${glowColor}`} />
          )}
        </motion.div>
        
        <motion.h2 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-4xl md:text-5xl font-black mb-4 text-white drop-shadow-sm uppercase tracking-widest"
        >
          {isBonus ? "Bonus!" : "Deduction"}
        </motion.h2>
        
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
          className={`text-6xl md:text-7xl font-black ${textColor} mb-10 tracking-tighter ${glowColor}`}
        >
          {isBonus ? "+" : "-"}{amount} <span className="text-3xl text-gray-500">pts</span>
        </motion.div>

        <motion.button 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={onComplete}
          className="px-10 py-5 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl font-black text-xl transition-all transform hover:scale-105 active:scale-95 border border-gray-700 w-full"
        >
          Continue
        </motion.button>
      </motion.div>
    </div>
  );
}
