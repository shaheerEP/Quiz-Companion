"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Volume2, Play } from "lucide-react";

/**
 * Letter-to-audio mapping from razunatmohammed88-cyber/arabic-alphabet-audio
 * Static human-recorded native pronunciations served directly from /public/audio/letters/
 */
export const ARABIC_LETTER_AUDIO_MAP: Record<string, string> = {
  // Letters with authentic native recordings
  'أ': '/audio/letters/alif.mp3',
  'ا': '/audio/letters/alif.mp3',
  'ب': '/audio/letters/baa.mp3',
  'ت': '/audio/letters/taa.mp3',
  'ث': '/audio/letters/thaa.mp3',
  'ج': '/audio/letters/jiim.mp3',
  'ح': '/audio/letters/haa_pharyngeal.mp3',
  'خ': '/audio/letters/khaa.mp3',
  'د': '/audio/letters/daal.mp3',
  'ذ': '/audio/letters/thaal.mp3',
  'ر': '/audio/letters/raa.mp3',
  'ز': '/audio/letters/zaay.mp3',
  'س': '/audio/letters/siin.mp3',
  'ش': '/audio/letters/shiin.mp3',
  'ص': '/audio/letters/saad.mp3',
  'ض': '/audio/letters/daad.mp3',
  'ط': '/audio/letters/taa_heavy.mp3',
  'ظ': '/audio/letters/thaa_heavy.mp3',
  'ع': '/audio/letters/ayn.mp3',
  'غ': '/audio/letters/ghayn.mp3',
  'ف': '/audio/letters/faa.mp3',
  'ق': '/audio/letters/qaaf.mp3',
  'ك': '/audio/letters/kaaf.mp3',
  'ل': '/audio/letters/laam.mp3',
  'م': '/audio/letters/miim.mp3',
  'ن': '/audio/letters/nuun.mp3',
  'ه': '/audio/letters/haa_light.mp3',
  'و': '/audio/letters/waaw.mp3',
  'ي': '/audio/letters/yaa.mp3',
  'ء': '/audio/letters/hamzah.mp3',
  'ئ': '/audio/letters/hamzah.mp3',
  'ؤ': '/audio/letters/hamzah.mp3',
  'ة': '/audio/letters/haa_light.mp3',
  'لا': '/audio/letters/laam_alif.mp3',
};

/**
 * Play letter audio anywhere imperatively
 */
export function playLetterAudio(letter: string): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  const audioSrc = ARABIC_LETTER_AUDIO_MAP[letter] || ARABIC_LETTER_AUDIO_MAP['ق'];
  try {
    const audio = new Audio(audioSrc);
    audio.play().catch(() => {});
    return audio;
  } catch {
    return null;
  }
}

interface CleanLetterAudioProps {
  letter: string;
  lang?: 'en' | 'ar' | 'ml';
  className?: string;
}

export default function CleanLetterAudio({
  letter,
  lang = 'en',
  className = "",
}: CleanLetterAudioProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop previous letter's audio whenever the selected letter changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, [letter]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playAudio = useCallback(() => {
    const audioSrc = ARABIC_LETTER_AUDIO_MAP[letter] || ARABIC_LETTER_AUDIO_MAP['ق'];

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    try {
      const audio = new Audio(audioSrc);
      audioRef.current = audio;
      setIsPlaying(true);

      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };

      audio.play().catch(() => {
        setIsPlaying(false);
        audioRef.current = null;
      });
    } catch {
      setIsPlaying(false);
    }
  }, [letter]);

  return (
    <div className={`w-full ${className}`}>
      <button
        type="button"
        onClick={playAudio}
        aria-label={lang === 'ar' ? `استمع لنطق الحرف ${letter}` : `Pronounce letter ${letter}`}
        className={`w-full py-2.5 px-3.5 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98] border shadow-xs select-none ${
          isPlaying
            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-400/30'
            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              isPlaying
                ? 'bg-white/20 text-white'
                : 'bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {isPlaying ? (
              <Volume2 className="w-4 h-4 animate-pulse" />
            ) : (
              <Play className="w-4 h-4 translate-x-[1px]" />
            )}
          </div>

          <span className="text-xs font-bold">
            {lang === 'ar'
              ? 'استمع لنطق الحرف'
              : lang === 'ml'
              ? 'ശബ്ദം കേൾക്കുക'
              : 'Play Pronunciation'}
          </span>
        </div>

        <span className="arabic-font text-2xl font-bold leading-none">
          {letter}
        </span>
      </button>
    </div>
  );
}
