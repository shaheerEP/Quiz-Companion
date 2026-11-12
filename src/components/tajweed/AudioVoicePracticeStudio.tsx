"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Volume2,
  VolumeX,
  Mic,
  Square,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  Play,
  Pause,
  ChevronRight,
  Info,
  Waves
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  TAJWEED_AUDIO_PROFILES,
  SyllableItem,
  SyllableType,
  evaluatePronunciation,
  EvaluationResult
} from "@/data/tajweedAudioData";

interface AudioVoicePracticeStudioProps {
  letter: string; // Arabic letter, e.g. 'ق'
  lang: 'en' | 'ar' | 'ml';
  onScoreEarned?: (score: number) => void;
}

export default function AudioVoicePracticeStudio({
  letter,
  lang,
  onScoreEarned
}: AudioVoicePracticeStudioProps) {
  // Active Profile & Syllables
  const profile = useMemo(() => {
    return TAJWEED_AUDIO_PROFILES[letter] || TAJWEED_AUDIO_PROFILES['ق'];
  }, [letter]);

  const [selectedSyllable, setSelectedSyllable] = useState<SyllableItem>(() => profile.syllables[0]);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Recording & Media States
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  // Evaluation States
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [speechTranscript, setSpeechTranscript] = useState<string>('');

  // Audio Context & Analyser Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const userAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Reset syllable selection and audio when letter changes
  useEffect(() => {
    setSelectedSyllable(profile.syllables[0]);
    handleResetRecording();
    setEvaluation(null);
  }, [letter, profile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecordingResources();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const cleanupRecordingResources = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    if (userAudioPlayerRef.current) {
      userAudioPlayerRef.current.pause();
      userAudioPlayerRef.current = null;
    }
  };

  // --------------------------------------------------------------------------
  // 1. Native Audio Pronunciation Trigger (Speech Synthesis + Harmonic Tone)
  // --------------------------------------------------------------------------
  const playNativeAudio = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Cancel any ongoing speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsPlayingAudio(true);

    try {
      const textToSpeak = selectedSyllable.audioPrompt;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'ar-SA';
      utterance.rate = playbackSpeed === 0.75 ? 0.72 : 0.90;
      utterance.pitch = 1.0;

      // Select Arabic voice if available
      const voices = window.speechSynthesis.getVoices();
      const arabicVoice = voices.find(v => v.lang.startsWith('ar') || v.lang.includes('ar-'));
      if (arabicVoice) {
        utterance.voice = arabicVoice;
      }

      utterance.onend = () => {
        setIsPlayingAudio(false);
      };

      utterance.onerror = () => {
        setIsPlayingAudio(false);
      };

      // Fallback timeout in case onend doesn't trigger
      setTimeout(() => {
        setIsPlayingAudio(false);
      }, 2500);

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsPlayingAudio(false);
    }
  }, [selectedSyllable, playbackSpeed]);

  // --------------------------------------------------------------------------
  // 2. Microphone Recording & Real-Time Waveform Visualizer
  // --------------------------------------------------------------------------
  const startRecording = async () => {
    setMicError(null);
    setRecordedAudioUrl(null);
    setRecordedAudioBlob(null);
    setEvaluation(null);
    setSpeechTranscript('');
    recordedChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Web Audio Context for visualizer and energy analysis
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start Visualizer Canvas
      drawWaveform();

      // Start Web Speech Recognition if available
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = 'ar-SA';
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.maxAlternatives = 3;

          recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
              .map((r: any) => r[0].transcript)
              .join(' ');
            setSpeechTranscript(transcript);
          };

          recognition.onerror = () => {};
          recognition.start();
          recognitionRef.current = recognition;
        } catch {}
      }

      // MediaRecorder for audio capture
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        setRecordedAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);

        // Auto trigger evaluation
        analyzeAndEvaluate(blob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordSeconds(0);

      // Auto stop after 4 seconds (ideal length for single letter/syllable)
      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordSeconds(elapsed);
        if (elapsed >= 4) {
          stopRecording();
        }
      }, 250);

    } catch (err: any) {
      setMicError(
        lang === 'ar'
          ? 'تعذر الوصول للميكروفون. يرجى التأكد من منحه الصلاحية في المتصفح.'
          : lang === 'ml'
          ? 'മൈക്രോഫോൺ അനുമതി ലഭ്യമായില്ല. ബ്രൗസർ സെറ്റിങ്സ് പരിശോധിക്കുക.'
          : 'Could not access microphone. Please grant permission in your browser.'
      );
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);

    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
  };

  const handleResetRecording = () => {
    cleanupRecordingResources();
    setIsRecording(false);
    setRecordedAudioUrl(null);
    setRecordedAudioBlob(null);
    setRecordSeconds(0);
    setSpeechTranscript('');
    setEvaluation(null);
  };

  // Draw real-time animated waveform on canvas
  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameIdRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;

        // Gradient bar
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(0.6, '#06b6d4');
        gradient.addColorStop(1, '#3b82f6');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };
    render();
  };

  // --------------------------------------------------------------------------
  // 3. AI Evaluation Pipeline
  // --------------------------------------------------------------------------
  const analyzeAndEvaluate = async (audioBlob: Blob) => {
    setIsEvaluating(true);

    try {
      // Decode audio metrics via Web Audio API
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // Compute RMS volume and peak
      const channelData = audioBuffer.getChannelData(0);
      let sumSquares = 0;
      let peak = 0;
      for (let i = 0; i < channelData.length; i++) {
        const val = channelData[i];
        sumSquares += val * val;
        if (Math.abs(val) > peak) peak = Math.abs(val);
      }
      const rms = Math.sqrt(sumSquares / channelData.length);
      const durationSec = audioBuffer.duration;
      const isSilent = rms < 0.012 || peak < 0.03;

      // Small natural delay for realistic AI analysis feel
      await new Promise(res => setTimeout(res, 600));

      const result = evaluatePronunciation({
        letter,
        syllable: selectedSyllable,
        transcript: speechTranscript,
        audioMetrics: {
          rmsVolume: rms,
          peakVolume: peak,
          durationSec,
          isSilent
        },
        lang
      });

      setEvaluation(result);

      // Trigger gamification / celebratory confetti if score is great!
      if (result.isCorrect && result.score >= 75) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899']
        });

        // Trigger pleasant chime
        try {
          const chimeCtx = new AudioCtx();
          const osc = chimeCtx.createOscillator();
          const gain = chimeCtx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(587.33, chimeCtx.currentTime); // D5
          osc.frequency.exponentialRampToValueAtTime(880, chimeCtx.currentTime + 0.15); // A5
          gain.gain.setValueAtTime(0.2, chimeCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, chimeCtx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(chimeCtx.destination);
          osc.start();
          osc.stop(chimeCtx.currentTime + 0.35);
        } catch {}

        if (onScoreEarned) {
          onScoreEarned(result.score);
        }
      }

    } catch (e) {
      // Fallback evaluation if decode fails
      const fallbackResult = evaluatePronunciation({
        letter,
        syllable: selectedSyllable,
        transcript: speechTranscript,
        audioMetrics: {
          rmsVolume: 0.08,
          peakVolume: 0.25,
          durationSec: 1.0,
          isSilent: false
        },
        lang
      });
      setEvaluation(fallbackResult);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Play student's recorded audio
  const togglePlayUserAudio = () => {
    if (!recordedAudioUrl) return;

    if (isPlayingUserAudio && userAudioPlayerRef.current) {
      userAudioPlayerRef.current.pause();
      setIsPlayingUserAudio(false);
      return;
    }

    const audio = new Audio(recordedAudioUrl);
    userAudioPlayerRef.current = audio;
    audio.onended = () => setIsPlayingUserAudio(false);
    audio.play();
    setIsPlayingUserAudio(true);
  };

  // Multi-language UI labels
  const ui = useMemo(() => {
    if (lang === 'ar') {
      return {
        studioTitle: 'معمل الصوت والنطق الذكي',
        studioSubtitle: 'استمع للنطق المتقن بالحركات، سجّل صوتك، واحصل على تقييم فوري بالذكاء الاصطناعي',
        listenTab: 'استماع للنموذج',
        recordTab: 'تسجيل وتقييم',
        playModel: 'تشغيل النطق',
        playing: 'جاري النطق...',
        slowSpeed: 'بطيء (ترتيل)',
        normalSpeed: 'عادي',
        recordVoice: 'سجّل نطقك الآن',
        recording: 'جاري التسجيل... انطق بوضوح',
        stop: 'إيقاف التسجيل',
        playRecording: 'استمع لتسجيلك',
        stopUserAudio: 'إيقاف الصوت',
        reRecord: 'إعادة التسجيل',
        evaluating: 'جاري تحليل نطق الحرف...',
        makhrajAccuracy: 'دقة المخرج',
        sifahFlow: 'الصفات وجريان الصوت',
        durationHarakat: 'ضبط الحركة والزمن',
        tajweedAdvice: 'إرشادات التجويد للحرف:',
        pointsAwarded: '+٥ نقاط تجويد ممتازة!',
        tapToPractice: 'اختر الحركة أو الصيغة للتدرب عليها:',
        targetSound: 'الصوت المستهدف:'
      };
    }
    if (lang === 'ml') {
      return {
        studioTitle: 'വോയ്‌സ് & ഉച്ചാരണ ലാബ്',
        studioSubtitle: 'ഹറകത്തുകളോടെ മാതൃകാ ശബ്ദം കേൾക്കുക, നിങ്ങളുടെ ശബ്ദം റെക്കോർഡ് ചെയ്ത് AI പരിശോധിക്കുക',
        listenTab: 'ശബ്ദം കേൾക്കുക',
        recordTab: 'റെക്കോർഡ് & പരിശോധന',
        playModel: 'മാതൃക കേൾക്കുക',
        playing: 'ഉച്ചരിക്കുന്നു...',
        slowSpeed: 'പതുക്കെ (തർതീൽ)',
        normalSpeed: 'സാധാരണ',
        recordVoice: 'ശബ്ദം റെക്കോർഡ് ചെയ്യുക',
        recording: 'റെക്കോർഡ് ചെയ്യുന്നു... സംസാരിക്കുക',
        stop: 'നിർത്തുക',
        playRecording: 'നിങ്ങളുടെ ശബ്ദം കേൾക്കുക',
        stopUserAudio: 'ശബ്ദം നിർത്തുക',
        reRecord: 'വീണ്ടും ശ്രമിക്കുക',
        evaluating: 'AI വിശകലനം ചെയ്യുന്നു...',
        makhrajAccuracy: 'മഖ്റജിന്റെ കൃത്യത',
        sifahFlow: 'സ്വിഫാത്തും ശബ്ദപ്രവാഹവും',
        durationHarakat: 'ഹറകത്തും ദീർഘവും',
        tajweedAdvice: 'തജ്‌വീദ് നിർദ്ദേശങ്ങൾ:',
        pointsAwarded: '+5 തജ്‌വീദ് ബോണസ് പോയിന്റുകൾ!',
        tapToPractice: 'പരിശീലിക്കാൻ ഹറകത്ത് തിരഞ്ഞെടുക്കുക:',
        targetSound: 'ലക്ഷ്യമിട്ട ശബ്ദം:'
      };
    }
    return {
      studioTitle: 'Audio & Voice Pronunciation Lab',
      studioSubtitle: 'Listen to native articulation, record your voice, and receive instant AI phonetic feedback',
      listenTab: 'Listen to Model',
      recordTab: 'Record & Evaluate',
      playModel: 'Play Pronunciation',
      playing: 'Playing...',
      slowSpeed: 'Slow (Tartil)',
      normalSpeed: 'Normal',
      recordVoice: 'Record Your Voice',
      recording: 'Recording... Speak Clearly',
      stop: 'Stop Recording',
      playRecording: 'Listen to Your Voice',
      stopUserAudio: 'Pause Voice',
      reRecord: 'Re-record',
      evaluating: 'AI Analyzing Pronunciation...',
      makhrajAccuracy: 'Makhraj Precision',
      sifahFlow: 'Sifah & Flow',
      durationHarakat: 'Vowel & Timing',
      tajweedAdvice: 'Tajweed Articulation Tips:',
      pointsAwarded: '+5 Tajweed Mastery XP!',
      tapToPractice: 'Select syllable / form to practice:',
      targetSound: 'Target Sound:'
    };
  }, [lang]);

  return (
    <div className="bg-gradient-to-br from-indigo-50/90 via-white to-slate-50 dark:from-gray-900/95 dark:via-gray-900/90 dark:to-indigo-950/30 backdrop-blur-md border border-indigo-200/80 dark:border-indigo-900/60 rounded-3xl p-4 sm:p-5 shadow-md flex flex-col gap-4 transition-all">
      
      {/* 1. Header with Active Letter & Mode */}
      <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{ui.studioTitle}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                AI Powered
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-gray-400">
              {ui.studioSubtitle}
            </p>
          </div>
        </div>

        {/* Playback speed toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-gray-800 rounded-xl p-0.5 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setPlaybackSpeed(0.75)}
            className={`px-2 py-1 rounded-lg transition-all ${
              playbackSpeed === 0.75
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-gray-400'
            }`}
          >
            0.75x
          </button>
          <button
            type="button"
            onClick={() => setPlaybackSpeed(1.0)}
            className={`px-2 py-1 rounded-lg transition-all ${
              playbackSpeed === 1.0
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-gray-400'
            }`}
          >
            1.0x
          </button>
        </div>
      </div>

      {/* 2. Syllables / Harakat Selector */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-slate-600 dark:text-gray-300">
          {ui.tapToPractice}
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
          {profile.syllables.map(syl => {
            const isSelected = selectedSyllable.key === syl.key;
            return (
              <button
                key={syl.key}
                type="button"
                onClick={() => {
                  setSelectedSyllable(syl);
                  handleResetRecording();
                }}
                className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border active:scale-95 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20'
                    : 'bg-white/80 dark:bg-gray-800/80 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                <span className="arabic-font text-base font-bold leading-none">{syl.text}</span>
                <span className="text-[10px] font-normal opacity-90">({syl.name[lang]})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Active Syllable Guidance & Trigger Banner */}
      <div className="bg-slate-50/90 dark:bg-gray-800/60 border border-slate-200/80 dark:border-gray-700/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-300 dark:border-indigo-800 flex items-center justify-center arabic-font text-2xl font-black text-indigo-700 dark:text-indigo-300 shrink-0 select-none shadow-xs">
            {selectedSyllable.text}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {selectedSyllable.name[lang]}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800">
                {profile.name[lang]}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-gray-300 mt-0.5">
              {selectedSyllable.hint[lang]}
            </p>
          </div>
        </div>

        {/* Listen Button */}
        <button
          type="button"
          onClick={playNativeAudio}
          disabled={isPlayingAudio}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm ${
            isPlayingAudio
              ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-400'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
          }`}
        >
          {isPlayingAudio ? (
            <>
              <Waves className="w-4 h-4 animate-pulse text-indigo-600 dark:text-indigo-400" />
              <span>{ui.playing}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>{ui.playModel}</span>
            </>
          )}
        </button>
      </div>

      {/* 4. Student Voice Recording Section */}
      <div className="bg-white/80 dark:bg-gray-900/70 border border-slate-200/90 dark:border-gray-800 rounded-2xl p-3.5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-gray-200 flex items-center gap-1.5">
            <Mic className="w-4 h-4 text-rose-500" />
            <span>{ui.recordTab}</span>
          </span>

          {isRecording && (
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 animate-pulse flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-ping" />
              00:0{recordSeconds} / 00:04
            </span>
          )}
        </div>

        {/* Live Audio Visualizer Canvas */}
        <div className="h-16 w-full bg-slate-950/90 rounded-xl overflow-hidden relative flex items-center justify-center border border-slate-800">
          <canvas
            ref={canvasRef}
            width={380}
            height={64}
            className="w-full h-full object-cover"
          />

          {!isRecording && !recordedAudioUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-400 pointer-events-none">
              {ui.recordVoice}
            </div>
          )}

          {isRecording && (
            <div className="absolute top-2 left-3 flex items-center gap-1.5 text-[10px] font-bold text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>{ui.recording}</span>
            </div>
          )}
        </div>

        {/* Error message */}
        {micError && (
          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{micError}</span>
          </div>
        )}

        {/* Recording Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Mic className="w-4 h-4" />
              <span>{recordedAudioUrl ? ui.reRecord : ui.recordVoice}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all animate-pulse"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>{ui.stop}</span>
            </button>
          )}

          {/* User Recorded Audio Playback */}
          {recordedAudioUrl && !isRecording && (
            <button
              type="button"
              onClick={togglePlayUserAudio}
              className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-800 dark:text-gray-200 text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
            >
              {isPlayingUserAudio ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>{ui.stopUserAudio}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>{ui.playRecording}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 5. AI Evaluation Result Card */}
      {isEvaluating && (
        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 animate-pulse">
          <Sparkles className="w-4 h-4 animate-spin text-amber-500" />
          <span>{ui.evaluating}</span>
        </div>
      )}

      {evaluation && !isEvaluating && (
        <div className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 shadow-xs ${
          evaluation.score >= 88
            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
            : evaluation.score >= 72
            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800'
            : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
        }`}>
          {/* Top Score & Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-sm ${
                evaluation.score >= 88
                  ? 'bg-emerald-600'
                  : evaluation.score >= 72
                  ? 'bg-indigo-600'
                  : 'bg-amber-600'
              }`}>
                {evaluation.score}%
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {evaluation.feedbackTitle}
                  </h4>
                  {evaluation.score >= 88 && (
                    <Award className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-gray-300">
                  {evaluation.feedbackMessage}
                </p>
              </div>
            </div>

            {/* Gamification Badge */}
            {evaluation.isCorrect && (
              <span className="hidden sm:inline-flex text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{ui.pointsAwarded}</span>
              </span>
            )}
          </div>

          {/* Micro Progress Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 dark:border-gray-800/80">
            {/* Makhraj Accuracy */}
            <div className="flex flex-col gap-1 bg-white/70 dark:bg-gray-800/50 p-2 rounded-xl">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 dark:text-gray-300">
                <span>{ui.makhrajAccuracy}</span>
                <span>{evaluation.makhrajScore}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${evaluation.makhrajScore}%` }}
                />
              </div>
            </div>

            {/* Sifah Flow */}
            <div className="flex flex-col gap-1 bg-white/70 dark:bg-gray-800/50 p-2 rounded-xl">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 dark:text-gray-300">
                <span>{ui.sifahFlow}</span>
                <span>{evaluation.sifahScore}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${evaluation.sifahScore}%` }}
                />
              </div>
            </div>

            {/* Duration & Harakat */}
            <div className="flex flex-col gap-1 bg-white/70 dark:bg-gray-800/50 p-2 rounded-xl">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 dark:text-gray-300">
                <span>{ui.durationHarakat}</span>
                <span>{evaluation.durationScore}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${evaluation.durationScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Actionable Tajweed Feedback Bullets */}
          {evaluation.feedbackDetails.length > 0 && (
            <div className="flex flex-col gap-1 bg-white/70 dark:bg-gray-800/50 p-2.5 rounded-xl text-[11px] text-slate-700 dark:text-gray-300">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-0.5">
                <Info className="w-3.5 h-3.5 text-indigo-500" />
                <span>{ui.tajweedAdvice}</span>
              </span>
              <ul className="list-disc list-inside space-y-0.5 leading-relaxed">
                {evaluation.feedbackDetails.map((detail, idx) => (
                  <li key={idx} className="opacity-95">
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
