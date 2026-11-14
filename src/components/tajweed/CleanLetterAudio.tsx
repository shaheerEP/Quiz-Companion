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

// ============================================================================
// SINGLETON AUDIO CACHE & CONCURRENCY CONTROLLER
// Guarantees:
// 1. Each letter audio file is fetched over the network AT MOST ONCE (cached as in-memory Blob URL).
// 2. Extra clicks while playing are ignored ("should call one time and play also only one time").
// ============================================================================

// In-memory cache of HTMLAudioElement instances per audio source
const audioElementCache = new Map<string, HTMLAudioElement>();

// In-memory cache of Blob URLs per audio source to guarantee 0 duplicate network calls
const audioBlobCache = new Map<string, string>();

// In-flight fetch promises to prevent parallel duplicate fetches
const audioFetchPromises = new Map<string, Promise<string>>();

// Global playback lock & tracking
let activeAudioElement: HTMLAudioElement | null = null;
let currentlyPlayingLetter: string | null = null;
const activeEndCallbacks = new Set<() => void>();

/**
 * Preload a letter's audio into memory as a Blob URL.
 * Network request is made ONLY ONCE per audio file for the entire session.
 */
export async function preloadLetterAudio(letter: string): Promise<string> {
  if (typeof window === 'undefined') return '';
  const src = ARABIC_LETTER_AUDIO_MAP[letter] || ARABIC_LETTER_AUDIO_MAP['ق'];

  // Already cached as local Blob in memory
  if (audioBlobCache.has(src)) {
    return audioBlobCache.get(src)!;
  }

  // Already fetching? Return existing promise to prevent duplicate network call
  if (audioFetchPromises.has(src)) {
    return audioFetchPromises.get(src)!;
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(src, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      audioBlobCache.set(src, blobUrl);

      // Initialize or update the cached HTMLAudioElement with this blobUrl
      let audio = audioElementCache.get(src);
      if (!audio) {
        audio = new Audio(blobUrl);
        audio.preload = 'auto';
        audioElementCache.set(src, audio);
      } else if (audio.src !== blobUrl) {
        audio.src = blobUrl;
      }

      return blobUrl;
    } catch {
      // Fallback to static src path
      return src;
    }
  })();

  audioFetchPromises.set(src, fetchPromise);
  return fetchPromise;
}

/**
 * Check if audio is currently playing (optionally for a specific letter)
 */
export function isLetterAudioPlaying(letter?: string): boolean {
  if (!activeAudioElement || activeAudioElement.paused || activeAudioElement.ended) {
    return false;
  }
  if (letter !== undefined) {
    return currentlyPlayingLetter === letter;
  }
  return true;
}

/**
 * Stop any currently playing letter audio immediately
 */
export function stopLetterAudio(): void {
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch {}
  }
  activeAudioElement = null;
  currentlyPlayingLetter = null;
  activeEndCallbacks.forEach(fn => {
    try { fn(); } catch {}
  });
  activeEndCallbacks.clear();
}

/**
 * Play letter audio imperatively.
 * Strict rules:
 * - If this letter is ALREADY playing, extra clicks are IGNORED (plays only 1 time).
 * - Audio is played from in-memory cached instance (API called only 1 time).
 */
export function playLetterAudio(letter: string, onEnd?: () => void): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;

  // RULE: If this letter is already playing, DO NOT duplicate or re-call!
  if (isLetterAudioPlaying(letter)) {
    if (onEnd) activeEndCallbacks.add(onEnd);
    return activeAudioElement;
  }

  // If another letter was playing, stop it first
  if (activeAudioElement && !activeAudioElement.paused) {
    stopLetterAudio();
  }

  const src = ARABIC_LETTER_AUDIO_MAP[letter] || ARABIC_LETTER_AUDIO_MAP['ق'];
  let audio = audioElementCache.get(src);

  if (!audio) {
    const cachedBlobUrl = audioBlobCache.get(src);
    audio = new Audio(cachedBlobUrl || src);
    audio.preload = 'auto';
    audioElementCache.set(src, audio);

    // If blob was not yet cached, fetch once in background for all future plays
    if (!cachedBlobUrl) {
      preloadLetterAudio(letter).catch(() => {});
    }
  }

  activeAudioElement = audio;
  currentlyPlayingLetter = letter;
  if (onEnd) activeEndCallbacks.add(onEnd);

  const handleEnded = () => {
    if (currentlyPlayingLetter === letter) {
      currentlyPlayingLetter = null;
      activeAudioElement = null;
    }
    activeEndCallbacks.forEach(fn => {
      try { fn(); } catch {}
    });
    activeEndCallbacks.clear();
  };

  audio.onended = handleEnded;
  audio.onerror = handleEnded;

  try {
    audio.currentTime = 0;
    audio.play().catch(() => {
      handleEnded();
    });
  } catch {
    handleEnded();
  }

  return audio;
}

// ============================================================================
// CLEAN LETTER AUDIO COMPONENT
// ============================================================================

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

  // Preload audio blob into memory on mount or when letter changes
  useEffect(() => {
    preloadLetterAudio(letter).catch(() => {});
    setIsPlaying(false);
  }, [letter]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopLetterAudio();
    };
  }, []);

  const handlePlay = useCallback(() => {
    // Ignore extra clicks while already playing
    if (isLetterAudioPlaying(letter)) return;

    setIsPlaying(true);
    playLetterAudio(letter, () => {
      setIsPlaying(false);
    });
  }, [letter]);

  return (
    <div className={`w-full ${className}`}>
      <button
        type="button"
        onClick={handlePlay}
        disabled={isPlaying}
        aria-label={lang === 'ar' ? `استمع لنطق الحرف ${letter}` : `Pronounce letter ${letter}`}
        className={`w-full py-2.5 px-3.5 rounded-2xl flex items-center justify-between transition-all border shadow-xs select-none ${
          isPlaying
            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-400/30 cursor-not-allowed opacity-90'
            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:scale-[0.98]'
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
