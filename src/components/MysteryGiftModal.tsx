"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import confetti from "canvas-confetti";
import { Gift, Trophy, Medal } from "lucide-react";

interface MysteryGiftModalProps {
  gifts: string[];
  badgeType: "Master Mind Champion 🏆" | "Super Solver 🥇";
  onClose: () => void;
}

export default function MysteryGiftModal({ gifts, badgeType, onClose }: MysteryGiftModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGift, setSelectedGift] = useState("");

  const handleOpenGift = () => {
    if (isOpen) return;
    const randomGift = gifts[Math.floor(Math.random() * gifts.length)];
    setSelectedGift(randomGift);
    setIsOpen(true);
    
    // Grand explosion
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b']
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/90 backdrop-blur-md">
      <div className="flex flex-col items-center max-w-3xl w-full p-8 text-center">
        
        <motion.div
          initial={{ scale: 0, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0.5, duration: 1 }}
          className="mb-12"
        >
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-rose-500 mb-6 drop-shadow-lg">
            Surprise Unlocked! 🎁
          </h1>
          <div className="inline-flex items-center justify-center gap-4 text-3xl font-bold text-white bg-gray-900/50 p-6 rounded-3xl border border-gray-700 shadow-xl">
            {badgeType === "Master Mind Champion 🏆" ? (
              <Trophy className="w-12 h-12 text-yellow-400" />
            ) : (
              <Medal className="w-12 h-12 text-blue-400" />
            )}
            {badgeType}
          </div>
        </motion.div>

        <div className="relative w-72 h-96" style={{ perspective: "1000px" }}>
          <motion.div
            className="w-full h-full relative cursor-pointer"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: isOpen ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 60, damping: 20 }}
            onClick={handleOpenGift}
          >
            {/* Front of card */}
            <div 
              className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] shadow-[0_20px_50px_rgba(99,102,241,0.3)] border-4 border-indigo-400/50 ${isOpen ? 'invisible' : 'visible'}`}
              style={{ backfaceVisibility: "hidden" }}
            >
              <Gift className="w-24 h-24 text-white mb-6 animate-pulse" />
              <p className="text-2xl font-black text-white uppercase tracking-widest text-center px-4 leading-tight">
                Open Mystery Gift
              </p>
              <p className="text-indigo-200 mt-4 text-sm font-bold">Click to reveal!</p>
            </div>

            {/* Back of card */}
            <div 
              className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 rounded-[2rem] shadow-[0_20px_50px_rgba(250,204,21,0.3)] border-4 border-yellow-300 ${!isOpen ? 'invisible' : 'visible'}`}
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <div className="bg-white/20 p-6 rounded-full mb-6">
                <Trophy className="w-20 h-20 text-white" />
              </div>
              <p className="text-3xl font-black text-white text-center px-6 leading-tight drop-shadow-md">
                {selectedGift}
              </p>
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              onClick={onClose}
              className="mt-16 px-10 py-5 bg-white hover:bg-gray-100 text-gray-900 font-black text-xl rounded-full shadow-2xl shadow-white/10 transition-all transform hover:scale-105 active:scale-95"
            >
              Continue to Dashboard
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
