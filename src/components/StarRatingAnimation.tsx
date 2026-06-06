"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Star } from "lucide-react";

interface StarRatingProps {
  stars: number;
  compliment: string;
  points: number;
  onComplete: () => void;
}

export default function StarRatingAnimation({ stars, compliment, points, onComplete }: StarRatingProps) {
  useEffect(() => {
    const duration = 2500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ffb703', '#fb8500', '#023047']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ffb703', '#fb8500', '#023047']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Auto-close after 4 seconds
    const timer = setTimeout(onComplete, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="bg-gray-900 border border-gray-800 p-12 rounded-[2rem] shadow-2xl flex flex-col items-center text-center max-w-lg w-full mx-4"
      >
        <div className="flex gap-4 mb-8">
          {[1, 2, 3].map((starIndex) => (
            <motion.div
              key={starIndex}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: starIndex <= stars ? [0, 1.4, 1] : 1,
                rotate: starIndex <= stars ? 0 : 0
              }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 10,
                delay: starIndex <= stars ? starIndex * 0.15 : 0 
              }}
            >
              <Star 
                className={`w-20 h-20 ${starIndex <= stars ? 'fill-yellow-400 text-yellow-400 filter drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]' : 'text-gray-800'}`} 
              />
            </motion.div>
          ))}
        </div>
        
        <motion.h2 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, type: "spring" }}
          className="text-5xl font-black mb-3 bg-gradient-to-r from-yellow-300 via-orange-400 to-rose-400 bg-clip-text text-transparent drop-shadow-sm"
        >
          {compliment}
        </motion.h2>
        
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-3xl font-black text-emerald-400 mb-10"
        >
          +{points} Points
        </motion.p>

        <motion.button 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          onClick={onComplete}
          className="px-10 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl font-bold text-lg transition-colors border border-gray-700"
        >
          Continue
        </motion.button>
      </motion.div>
    </div>
  );
}
