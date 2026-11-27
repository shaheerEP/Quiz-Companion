"use client";

import { useState, useEffect, useCallback } from "react";
import { Volume2, Play, Loader2 } from "lucide-react";

/**
 * Letter-to-audio mapping served directly from /public/Huroof MP3/
 */
export const ARABIC_LETTER_AUDIO_MAP: Record<string, string> = {
  // Letters with isolated Makhraj pronunciations
  'أ': '/Huroof%20MP3/hamza.mp3',
  'ا': '/Huroof%20MP3/hamza.mp3',
  'ب': '/Huroof%20MP3/ba.mp3',
  'ت': '/Huroof%20MP3/ta.mp3',
  'ث': '/Huroof%20MP3/tha.mp3',
  'ج': '/Huroof%20MP3/jeem.mp3',
  'ح': '/Huroof%20MP3/ha.mp3',
  'خ': '/Huroof%20MP3/kha.mp3',
  'د': '/Huroof%20MP3/dal.mp3',
  'ذ': '/Huroof%20MP3/dhal.mp3',
  'ر': '/Huroof%20MP3/ra.mp3',
  'ز': '/Huroof%20MP3/zay.mp3',
  'س': '/Huroof%20MP3/seen.mp3',
  'ش': '/Huroof%20MP3/sheen.mp3',
  'ص': '/Huroof%20MP3/sad.mp3',
  'ض': '/Huroof%20MP3/dad.mp3',
  'ط': '/Huroof%20MP3/taa.mp3',
  'ظ': '/Huroof%20MP3/dha.mp3',
  'ع': '/Huroof%20MP3/ain.mp3',
  'غ': '/Huroof%20MP3/ghain.mp3',
  'ف': '/Huroof%20MP3/fa.mp3',
  'ق': '/Huroof%20MP3/qaf.mp3',
  'ك': '/Huroof%20MP3/kaf.mp3',
  'ل': '/Huroof%20MP3/lam.mp3',
  'م': '/Huroof%20MP3/meem.mp3',
  'ن': '/Huroof%20MP3/noon.mp3',
  'ه': '/Huroof%20MP3/haa.mp3',
  'و': '/Huroof%20MP3/waw.mp3',
  'ي': '/Huroof%20MP3/ya.mp3',
  'ء': '/Huroof%20MP3/hamza.mp3',
  'ئ': '/Huroof%20MP3/hamza.mp3',
  'ؤ': '/Huroof%20MP3/hamza.mp3',
  'ة': '/Huroof%20MP3/haa.mp3',
  'لا': '/Huroof%20MP3/lam.mp3',
};

// ============================================================================
// SINGLETON AUDIO CACHE & CONCURRENCY CONTROLLER
// Guarantees:
// 1. Each letter audio file is fetched over the network AT MOST ONCE (cached as in-memory Blob URL).
// 2. Even if an API call is currently PENDING, clicking the button will NEVER fire another API call.
// 3. Extra clicks while playing or while an API call is pending are safely ignored/blocked.
// ============================================================================

// In-memory cache of HTMLAudioElement instances per audio source
const audioElementCache = new Map<string, HTMLAudioElement>();

// In-memory cache of Blob URLs per audio source to guarantee 0 duplicate network calls
const audioBlobCache = new Map<string, string>();

// In-flight fetch promises to prevent parallel duplicate fetches
const audioFetchPromises = new Map<string, Promise<string>>();

// Set of URLs currently being fetched
const pendingFetchUrls = new Set<string>();

// Set of letters for which a play call is currently queued waiting on a pending fetch
const playQueuedForLetter = new Set<string>();

// Global playback tracking
let activeAudioElement: HTMLAudioElement | null = null;
let currentlyPlayingLetter: string | null = null;
const activeEndCallbacks = new Set<() => void>();

/**
 * Check if a network fetch / API call is currently in-flight
 */
export function isAudioFetchPending(letter?: string): boolean {
  if (letter !== undefined) {
    const src = ARABIC_LETTER_AUDIO_MAP[letter] || ARABIC_LETTER_AUDIO_MAP['ق'];
    return pendingFetchUrls.has(src);
  }
  return pendingFetchUrls.size > 0;
}

/**
 * Preload a letter's audio into memory as a Blob URL.
 * Network request is made ONLY ONCE per audio file for the entire session.
 * If a fetch is already in-flight, it returns the existing in-flight promise.
 */
export async function preloadLetterAudio(letter: string): Promise<string> {
  if (typeof window === 'undefined') return '';
  const src = ARABIC_LETTER_AUDIO_MAP[letter] || ARABIC_LETTER_AUDIO_MAP['ق'];

  // Already cached as local Blob in memory
  if (audioBlobCache.has(src)) {
    return audioBlobCache.get(src)!;
  }

  // Already fetching? Return the existing in-flight promise to prevent duplicate API call
  if (audioFetchPromises.has(src)) {
    return audioFetchPromises.get(src)!;
  }

  pendingFetchUrls.add(src);

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
    } finally {
      pendingFetchUrls.delete(src);
      audioFetchPromises.delete(src);
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
 * - If an API call is ALREADY pending, extra clicks DO NOT fire another API call.
 * - Audio is played strictly from in-memory cached Blob instance.
 */
export async function playLetterAudio(
  letter: string,
  onEnd?: () => void
): Promise<HTMLAudioElement | null> {
  if (typeof window === 'undefined') return null;

  // RULE 1: If this letter is already playing, DO NOT duplicate or re-call!
  if (isLetterAudioPlaying(letter)) {
    if (onEnd) activeEndCallbacks.add(onEnd);
    return activeAudioElement;
  }

  const src = ARABIC_LETTER_AUDIO_MAP[letter] || ARABIC_LETTER_AUDIO_MAP['ق'];

  // RULE 2: If an API call is currently pending and a play is already queued for this letter,
  // do NOT start another API call or duplicate action!
  if (playQueuedForLetter.has(letter)) {
    if (onEnd) activeEndCallbacks.add(onEnd);
    return null;
  }

  playQueuedForLetter.add(letter);

  try {
    // If not in blob cache, wait for existing pending fetch or start single fetch
    let blobUrl = audioBlobCache.get(src);
    if (!blobUrl) {
      blobUrl = await preloadLetterAudio(letter);
    }

    // Stop another letter if it was playing
    if (activeAudioElement && !activeAudioElement.paused) {
      stopLetterAudio();
    }

    // Retrieve or create the cached HTMLAudioElement ONLY with the blobUrl
    let audio = audioElementCache.get(src);
    if (!audio) {
      audio = new Audio(blobUrl);
      audio.preload = 'auto';
      audioElementCache.set(src, audio);
    } else if (audio.src !== blobUrl) {
      audio.src = blobUrl;
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

    audio.currentTime = 0;
    await audio.play().catch(() => {
      handleEnded();
    });

    return audio;
  } catch {
    return null;
  } finally {
    playQueuedForLetter.delete(letter);
  }
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
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Preload audio blob into memory on mount or when letter changes
  useEffect(() => {
    setIsLoading(true);
    preloadLetterAudio(letter)
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
    setIsPlaying(false);
  }, [letter]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopLetterAudio();
    };
  }, []);

  const handlePlay = useCallback(async () => {
    // If already playing or fetch is pending, ignore extra clicks completely
    if (isLetterAudioPlaying(letter) || isAudioFetchPending(letter)) return;

    setIsPlaying(true);
    await playLetterAudio(letter, () => {
      setIsPlaying(false);
    });
  }, [letter]);

  const isBusy = isPlaying || isLoading;

  return (
    <div className={`w-full ${className}`}>
      <button
        type="button"
        onClick={handlePlay}
        disabled={isBusy}
        aria-label={lang === 'ar' ? `استمع لنطق الحرف ${letter}` : `Pronounce letter ${letter}`}
        className={`w-full py-2.5 px-3.5 rounded-2xl flex items-center justify-between transition-all border shadow-xs select-none ${
          isBusy
            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-400/30 cursor-not-allowed opacity-90'
            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:scale-[0.98]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              isBusy
                ? 'bg-white/20 text-white'
                : 'bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPlaying ? (
              <Volume2 className="w-4 h-4 animate-pulse" />
            ) : (
              <Play className="w-4 h-4 translate-x-[1px]" />
            )}
          </div>

          <span className="text-xs font-bold">
            {isLoading
              ? (lang === 'ar' ? 'جاري التحميل...' : lang === 'ml' ? 'ലോഡ് ചെയ്യുന്നു...' : 'Loading audio...')
              : (lang === 'ar' ? 'استمع لنطق الحرف' : lang === 'ml' ? 'ശബ്ദം കേൾക്കുക' : 'Play Pronunciation')}
          </span>
        </div>

        <span className="arabic-font text-2xl font-bold leading-none">
          {letter}
        </span>
      </button>
    </div>
  );
}
