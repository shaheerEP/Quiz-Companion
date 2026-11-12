"use client";

import { useState, useRef, useEffect } from "react";
import { Volume2, Loader2 } from "lucide-react";
import { TAJWEED_AUDIO_PROFILES, SyllableItem } from "@/data/tajweedAudioData";

interface CleanLetterAudioProps {
  letter: string;
}

export default function CleanLetterAudio({ letter }: CleanLetterAudioProps) {
  const profile = TAJWEED_AUDIO_PROFILES[letter] || TAJWEED_AUDIO_PROFILES['ق'];
  const [activeSyllable, setActiveSyllable] = useState<SyllableItem>(profile.syllables[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync active syllable when letter changes
  useEffect(() => {
    setActiveSyllable(profile.syllables[0]);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, [letter, profile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const playSound = (syl: SyllableItem) => {
    setActiveSyllable(syl);
    setIsPlaying(true);

    const soundText = syl.audioPrompt || syl.text;

    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // 1. Primary: Same-Origin API Proxy (Bypasses all Google referrer / CORS blocks)
    try {
      const url = `/api/tajweed/audio?text=${encodeURIComponent(soundText)}`;
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };

      audio.onerror = () => {
        fallbackSpeechSynthesis(soundText);
      };

      audio.play().catch(() => {
        fallbackSpeechSynthesis(soundText);
      });
    } catch {
      fallbackSpeechSynthesis(soundText);
    }
  };

  const fallbackSpeechSynthesis = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsPlaying(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ar-SA";
      utterance.rate = 0.85;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const arVoice = voices.find(v => v.lang.startsWith("ar"));
      if (arVoice) utterance.voice = arVoice;

      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      {profile.syllables.map((syl) => {
        const isSelected = activeSyllable.text === syl.text;
        const isCurrentPlaying = isSelected && isPlaying;

        return (
          <button
            key={syl.key}
            type="button"
            onClick={() => playSound(syl)}
            aria-label={syl.text}
            className={`h-11 min-w-[46px] px-3 rounded-2xl flex items-center justify-center transition-all select-none border active:scale-95 shadow-xs ${
              isSelected
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20'
                : 'bg-slate-50 dark:bg-gray-800/80 text-slate-800 dark:text-gray-100 border-slate-200 dark:border-gray-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-white dark:hover:bg-gray-800'
            }`}
          >
            <span className="arabic-font text-2xl font-bold leading-none translate-y-[-1px]">
              {syl.text}
            </span>
            {isCurrentPlaying && (
              <span className="ml-1.5 inline-flex items-center">
                <Volume2 className="w-3.5 h-3.5 animate-pulse text-white" />
              </span>
            )}
          </button>
        );
      })}

      {/* Quick Replay button */}
      <button
        type="button"
        onClick={() => playSound(activeSyllable)}
        disabled={isPlaying}
        aria-label="Play sound"
        className="h-11 w-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all active:scale-95 shrink-0"
      >
        {isPlaying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
