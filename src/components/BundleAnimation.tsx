"use client";

import { useEffect, useState } from "react";

export default function BundleAnimation({ itemName }: { itemName: string }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  // Extract just the emoji if possible, or use the whole name
  const isEmoji = /\p{Emoji}/u.test(itemName);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-purple-900/60 backdrop-blur-sm animate-[fadeIn_0.5s_ease-out]"></div>
      
      <div className="relative animate-[bounce_1s_infinite] flex flex-col items-center justify-center transform scale-125">
        <div className="text-[12rem] filter drop-shadow-[0_0_50px_rgba(255,255,255,0.8)] mb-8 animate-[pulse_0.5s_ease-in-out_infinite]">
          {isEmoji ? itemName.split(" ")[0] : "🎁"}
        </div>
        <h1 className="text-5xl md:text-7xl text-center font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-300 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)]">
          {itemName.toUpperCase()} BUNDLE EARNED!
        </h1>
      </div>
    </div>
  );
}
