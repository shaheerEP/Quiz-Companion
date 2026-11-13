"use client";

import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { 
  Zap, 
  Trophy, 
  History, 
  Package, 
  PlusCircle, 
  MinusCircle, 
  User, 
  Star, 
  Check, 
  CheckCircle2, 
  Repeat, 
  Sparkles, 
  Award, 
  Calendar, 
  CalendarDays, 
  ChevronDown, 
  Square 
} from "lucide-react";
import confetti from "canvas-confetti";
import BundleAnimation from "@/components/BundleAnimation";
import StarRatingAnimation from "@/components/StarRatingAnimation";
import WrongAnswerAnimation from "@/components/WrongAnswerAnimation";
import ManualPointsAnimation from "@/components/ManualPointsAnimation";
import MysteryGiftModal from "@/components/MysteryGiftModal";
import MannersHistoryModal from "@/components/MannersHistoryModal";

export default function StudentDashboard() {
  const { user, refreshAuth } = useAuth();
  const [activeSession, setActiveSession] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [taskSuccessToast, setTaskSuccessToast] = useState<string | null>(null);
  const [liveTime, setLiveTime] = useState(0);
  const [frozenTime, setFrozenTime] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [prevBundles, setPrevBundles] = useState<number | null>(null);
  const [showBundleAnim, setShowBundleAnim] = useState(false);
  const [showRating, setShowRating] = useState<{stars: number, compliment: string, points: number} | null>(null);
  const [showWrong, setShowWrong] = useState(false);
  const [manualAnim, setManualAnim] = useState<{type: 'bonus'|'deduction', amount: number} | null>(null);
  const [showFinale, setShowFinale] = useState<"Master Mind Champion 🏆" | "Super Solver 🥇" | null>(null);
  const [questionLogs, setQuestionLogs] = useState<any[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyStats, setHistoryStats] = useState<any>(null);
  const [dailyHistory, setDailyHistory] = useState<any[]>([]);
  const [dailyDaysLimit, setDailyDaysLimit] = useState(5);
  const [hasMoreDaily, setHasMoreDaily] = useState(false);
  const [totalDailyDays, setTotalDailyDays] = useState(0);
  const [weeklyHistory, setWeeklyHistory] = useState<any[]>([]);
  const [weeklyWeeksLimit, setWeeklyWeeksLimit] = useState(4);
  const [hasMoreWeekly, setHasMoreWeekly] = useState(false);
  const [totalWeeks, setTotalWeeks] = useState(0);
  const [activeHistoryTab, setActiveHistoryTab] = useState<"daily" | "weekly">("daily");
  const [loadingMoreDaily, setLoadingMoreDaily] = useState(false);
  const [loadingMoreWeekly, setLoadingMoreWeekly] = useState(false);
  const [mannersLogs, setMannersLogs] = useState<any[]>([]);
  const [showMannersHistory, setShowMannersHistory] = useState(false);
  const lastResultIdRef = useRef<string | null>(null);
  const shownManualLogsRef = useRef<Set<string>>(new Set());
  const initialLogsFetchedRef = useRef(false);
  const initialLoadCompleteRef = useRef(false);
  const dailyLimitRef = useRef(5);
  const weeklyLimitRef = useRef(4);

  useEffect(() => {
    if (activeSession) {
      fetch(`/api/sessions/${activeSession._id}/questions`)
        .then(res => res.json())
        .then(data => {
          setQuestionLogs(data);
          if (data && data.length > 0) {
            const unseenManuals = data.filter((l: any) => 
              (l.logType === 'bonus' || l.logType === 'deduction') && !shownManualLogsRef.current.has(l._id)
            );
            if (unseenManuals.length > 0) {
              if (initialLogsFetchedRef.current) {
                const latest = unseenManuals[unseenManuals.length - 1];
                setManualAnim({ type: latest.logType, amount: latest.points });
              }
              unseenManuals.forEach((l: any) => shownManualLogsRef.current.add(l._id));
            }
          }
          initialLogsFetchedRef.current = true;
        });
    } else {
      setQuestionLogs([]);
      initialLogsFetchedRef.current = false;
    }
  }, [activeSession?._id, activeSession?.totalQuestions, activeSession?.finalScore]);

  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user || user.role !== "student") return;

    const fetchInitialData = async () => {
      try {
        const [settingsRes, tasksRes, withdrawalsRes] = await Promise.all([
          fetch("/api/settings"),
          fetch(`/api/tasks?studentId=${user.id}`),
          fetch(`/api/withdrawals?studentId=${user.id}`)
        ]);

        if (settingsRes.ok) setSettings(await settingsRes.json());
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          setTasks(tasksData.tasks || []);
        }
        if (withdrawalsRes.ok) {
          const logsData = await withdrawalsRes.json();
          setLogs(logsData.filter((log: any) => !log.rewardDescription?.includes("in World Builder")));
        }
      } catch (e) {}
    };
    fetchInitialData();

    const fetchHistoryAndManners = async () => {
      try {
        const [historyRes, mannersRes] = await Promise.all([
          fetch(`/api/history?studentId=${user.id}&dailyLimit=${dailyLimitRef.current}&weeklyLimit=${weeklyLimitRef.current}`),
          fetch(`/api/manners?studentId=${user.id}`)
        ]);

        if (historyRes.ok) {
          const histData = await historyRes.json();
          if (histData.stats) setHistoryStats(histData.stats);
          if (histData.daily) setDailyHistory(histData.daily);
          setHasMoreDaily(Boolean(histData.hasMoreDaily));
          setTotalDailyDays(histData.totalDailyDays || 0);
          if (histData.weekly) setWeeklyHistory(histData.weekly);
          setHasMoreWeekly(Boolean(histData.hasMoreWeekly));
          setTotalWeeks(histData.totalWeeks || 0);
          if (histData.items) setHistoryItems(histData.items);
        }
        if (mannersRes.ok) setMannersLogs(await mannersRes.json());
      } catch (e) {}
    };
    fetchHistoryAndManners();
    const historyInterval = setInterval(fetchHistoryAndManners, 30000);

    const checkActiveSession = async () => {
      try {
        const res = await fetch(`/api/sessions?studentId=${user.id}&activeOnly=true`);
        if (res.ok) {
          const sessions = await res.json();
          const active = sessions.find((s: any) => !s.isCompleted);
          if (active) {
            setActiveSession(active);
          } else {
            setActiveSession(null);
          }
        }
      } catch (e) {}
    };
    checkActiveSession();
    const sessionInterval = setInterval(checkActiveSession, 5000);

    return () => {
      clearInterval(historyInterval);
      clearInterval(sessionInterval);
    };
  }, [user]);

  const initialTimerSyncDoneRef = useRef(false);

  useEffect(() => {
    if (!activeSession) return;

    const syncTimer = async () => {
      try {
        const res = await fetch(`/api/sessions/timer?sessionId=${activeSession._id}`);
        const timerData = await res.json();
        
        if (timerData.isTimerRunning && timerData.currentTimerStartTime) {
          setFrozenTime(null);
          setLastResult(null);
          const updateTimer = () => {
            const msPassed = Date.now() - timerData.currentTimerStartTime;
            setLiveTime(msPassed / 1000);
            requestRef.current = requestAnimationFrame(updateTimer);
          };
          
          if (!requestRef.current) {
            requestRef.current = requestAnimationFrame(updateTimer);
          }
        } else {
          if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = null;
          }
          if (timerData.studentStopTime !== undefined && timerData.studentStopTime !== null) {
            setFrozenTime(timerData.studentStopTime);
          }
          if (timerData.lastQuestionResult) {
            const resultKey = JSON.stringify(timerData.lastQuestionResult);
            if (timerData.lastQuestionResult.cancelled) {
              setLastResult({ cancelled: true });
              setFrozenTime(null);
            } else {
              setLastResult(timerData.lastQuestionResult);
              setFrozenTime(timerData.lastQuestionResult.responseTime);
              
              if (!initialTimerSyncDoneRef.current) {
                lastResultIdRef.current = resultKey;
              } else {
                if (timerData.lastQuestionResult.isCorrect && resultKey !== lastResultIdRef.current) {
                  lastResultIdRef.current = resultKey;
                  setShowRating({
                    stars: timerData.lastQuestionResult.stars,
                    compliment: timerData.lastQuestionResult.compliment || '',
                    points: timerData.lastQuestionResult.points
                  });
                } else if (!timerData.lastQuestionResult.isCorrect && resultKey !== lastResultIdRef.current) {
                  lastResultIdRef.current = resultKey;
                  setShowWrong(true);
                }
              }
            }
          }
        }
        initialTimerSyncDoneRef.current = true;
      } catch (e) {}
    };

    syncTimer();
    const timerInterval = setInterval(syncTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [activeSession]);

  const handleAnimationComplete = () => {
    setShowRating(null);
    setShowWrong(false);
    setLastResult(null);
    setFrozenTime(null);
    
    if (activeSession && settings) {
      if (activeSession.totalQuestions >= (settings.badgeThresholds?.finaleQuestionCount ?? 10)) {
        if (activeSession.averageSpeed <= (settings.badgeThresholds?.speedThreshold ?? 5)) {
          setShowFinale("Master Mind Champion 🏆");
        } else {
          setShowFinale("Super Solver 🥇");
        }
      }
    }
  };

  const handleRemoteStop = async () => {
    if (!activeSession) return;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    await fetch("/api/sessions/timer", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        sessionId: activeSession._id, 
        isTimerRunning: false,
        stoppedByStudent: true,
        studentStopTime: liveTime
      })
    });
    setActiveSession({ ...activeSession, isTimerRunning: false });
  };

  const handleCompleteTask = async (task: any) => {
    if (completingTaskId || !user?.id) return;
    if (!task.isRepeatable && task.completed) return;

    setCompletingTaskId(task.id);
    try {
      const res = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: user.id,
          taskId: task.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        confetti({
          particleCount: 110,
          spread: 80,
          origin: { y: 0.6 },
        });

        setTaskSuccessToast(data.message || `+${task.points} pts added! 🎉`);
        setTimeout(() => setTaskSuccessToast(null), 4000);

        await refreshAuth();

        const tasksRes = await fetch(`/api/tasks?studentId=${user.id}`);
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          setTasks(tasksData.tasks || []);
        }

        const historyRes = await fetch(
          `/api/history?studentId=${user.id}&dailyLimit=${dailyLimitRef.current}&weeklyLimit=${weeklyLimitRef.current}`
        );
        if (historyRes.ok) {
          const histData = await historyRes.json();
          if (histData.stats) setHistoryStats(histData.stats);
          if (histData.daily) setDailyHistory(histData.daily);
          if (histData.weekly) setWeeklyHistory(histData.weekly);
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to complete task");
      }
    } catch (err) {
      console.error("Error completing task:", err);
    } finally {
      setCompletingTaskId(null);
    }
  };

  const bundleLimit = settings?.bundleLimit || 1000;
  const bundleItemName = settings?.bundleItemName || "🍫 Chocolate";
  const lifetimePoints = user?.student?.lifetimePoints || 0;
  const bundlesEarned = Math.floor(lifetimePoints / bundleLimit);
  const currentProgress = lifetimePoints % bundleLimit;
  const progressPercent = Math.min(100, Math.max(0, (currentProgress / bundleLimit) * 100));

  useEffect(() => {
    if (!user || !settings) return;

    if (user.student?.rewardSystem === 'tiered') {
      setPrevBundles(null);
      initialLoadCompleteRef.current = true;
      return;
    }

    const bundles = Math.floor((user.student?.lifetimePoints || 0) / (settings.bundleLimit || 1000));

    if (!initialLoadCompleteRef.current) {
      setPrevBundles(bundles);
      initialLoadCompleteRef.current = true;
    } else if (prevBundles !== null && bundles > prevBundles) {
      setShowBundleAnim(true);
      setTimeout(() => setShowBundleAnim(false), 4000);
      setPrevBundles(bundles);
    } else if (prevBundles !== bundles) {
      setPrevBundles(bundles);
    }
  }, [user?.student?.lifetimePoints, user?.student?.rewardSystem, settings?.bundleLimit, prevBundles, user]);

  const handleShowMoreDaily = async () => {
    if (loadingMoreDaily || !hasMoreDaily || !user) return;
    setLoadingMoreDaily(true);
    const nextLimit = dailyDaysLimit + 5;
    dailyLimitRef.current = nextLimit;
    setDailyDaysLimit(nextLimit);
    try {
      const res = await fetch(
        `/api/history?studentId=${user.id}&dailyLimit=${nextLimit}&weeklyLimit=${weeklyLimitRef.current}`
      );
      if (res.ok) {
        const histData = await res.json();
        if (histData.stats) setHistoryStats(histData.stats);
        if (histData.daily) setDailyHistory(histData.daily);
        setHasMoreDaily(Boolean(histData.hasMoreDaily));
        setTotalDailyDays(histData.totalDailyDays || 0);
      }
    } catch (err) {
      console.error("Failed to fetch more daily history:", err);
    } finally {
      setLoadingMoreDaily(false);
    }
  };

  const handleShowMoreWeekly = async () => {
    if (loadingMoreWeekly || !hasMoreWeekly || !user) return;
    setLoadingMoreWeekly(true);
    const nextLimit = weeklyWeeksLimit + 4;
    weeklyLimitRef.current = nextLimit;
    setWeeklyWeeksLimit(nextLimit);
    try {
      const res = await fetch(
        `/api/history?studentId=${user.id}&dailyLimit=${dailyLimitRef.current}&weeklyLimit=${nextLimit}`
      );
      if (res.ok) {
        const histData = await res.json();
        if (histData.stats) setHistoryStats(histData.stats);
        if (histData.weekly) setWeeklyHistory(histData.weekly);
        setHasMoreWeekly(Boolean(histData.hasMoreWeekly));
        setTotalWeeks(histData.totalWeeks || 0);
      }
    } catch (err) {
      console.error("Failed to fetch more weekly history:", err);
    } finally {
      setLoadingMoreWeekly(false);
    }
  };

  if (!user || user.role !== "student") return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-gray-100 flex flex-col transition-colors duration-200">
      <Navbar />

      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6">
        
        {/* Header: Student Name & Image shown once, double-sized avatar, and points with small explanatory text */}
        <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-center md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Double-sized avatar */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-indigo-200/90 dark:border-indigo-500/30 bg-slate-100 dark:bg-gray-800 flex items-center justify-center shadow-md shrink-0">
              {user.student?.profileImageUrl ? (
                <img src={user.student.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 sm:w-14 sm:h-14 text-slate-400" />
              )}
            </div>

            {/* Name & 5-Star daily rating */}
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight capitalize">
                {user.name}
              </h1>
              <div className="relative inline-block text-xl">
                <div className="flex text-slate-200 dark:text-gray-700">★★★★★</div>
                <div
                  className="flex text-yellow-400 absolute top-0 left-0 overflow-hidden whitespace-nowrap drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]"
                  style={{ width: `${Math.min(100, ((user.student?.dailyPoints || 0) / 1000) * 100)}%` }}
                >
                  ★★★★★
                </div>
              </div>
            </div>
          </div>

          {/* Points meaning with small-sized explanatory labels */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {/* Balance */}
            <div className="bg-slate-50 dark:bg-gray-800/60 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-gray-700 shadow-sm flex items-center gap-2.5 min-w-fit">
              <span className="text-xl sm:text-2xl shrink-0">💎</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                  Balance
                </span>
                <span 
                  title={(user.student?.pointsBalance || 0).toLocaleString()}
                  className="text-sm sm:text-base font-black text-slate-800 dark:text-white tabular-nums whitespace-nowrap"
                >
                  {user.student?.pointsBalance?.toLocaleString() || 0}
                </span>
              </div>
            </div>

            {/* Lifetime */}
            <div className="bg-slate-50 dark:bg-gray-800/60 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-gray-700 shadow-sm flex items-center gap-2.5 min-w-fit">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                  Lifetime
                </span>
                <span 
                  title={lifetimePoints.toLocaleString()}
                  className="text-sm sm:text-base font-black text-slate-800 dark:text-white tabular-nums whitespace-nowrap"
                >
                  {lifetimePoints.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Today */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 sm:p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-sm flex items-center gap-2.5 min-w-fit">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider leading-tight">
                  Today
                </span>
                <span 
                  title={(user.student?.dailyPoints || 0).toLocaleString()}
                  className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400 tabular-nums whitespace-nowrap"
                >
                  {user.student?.dailyPoints?.toLocaleString() || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Score History */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-sm flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-gray-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <History className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">History</h3>
                </div>

                {/* Tab Controls - icon-focused with small counts */}
                <div className="inline-flex p-1 bg-slate-100 dark:bg-gray-800 rounded-2xl border border-slate-200/60 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setActiveHistoryTab("daily")}
                    title={`Daily History (${totalDailyDays})`}
                    aria-label="Daily History"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeHistoryTab === "daily"
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                        : "text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{totalDailyDays}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveHistoryTab("weekly")}
                    title={`Weekly History (${totalWeeks})`}
                    aria-label="Weekly History"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeHistoryTab === "weekly"
                        ? "bg-fuchsia-600 text-white shadow-sm shadow-fuchsia-500/25"
                        : "text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>{totalWeeks}</span>
                  </button>
                </div>
              </div>

              {/* 1. DAILY HISTORY TAB */}
              {activeHistoryTab === "daily" && (
                <div className="flex flex-col gap-5">
                  {dailyHistory.length === 0 ? (
                    <p className="text-slate-400 italic text-sm text-center py-6">No quiz history yet.</p>
                  ) : (
                    dailyHistory.map((dayGroup: any) => (
                      <div key={dayGroup.dayString} className="flex flex-col gap-2.5">
                        <div className="flex justify-between items-center pl-2.5 border-l-2 border-indigo-500">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{dayGroup.dayString}</p>
                          <div className="flex gap-2 items-center">
                            <div className="relative inline-block text-xs" title={`${Math.min(100, Math.max(0, (dayGroup.totalPoints / 1000) * 100)).toFixed(0)}%`}>
                              <div className="flex text-slate-200 dark:text-gray-700">★★★★★</div>
                              <div
                                className="flex text-yellow-400 absolute top-0 left-0 overflow-hidden whitespace-nowrap drop-shadow-[0_0_4px_rgba(250,204,21,0.8)]"
                                style={{ width: `${Math.min(100, Math.max(0, (dayGroup.totalPoints / 1000) * 100))}%` }}
                              >
                                ★★★★★
                              </div>
                            </div>
                            <p className={`text-xs font-black ${dayGroup.totalPoints > 0 ? 'text-emerald-600' : dayGroup.totalPoints < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              {dayGroup.totalPoints > 0 ? '+' : ''}{dayGroup.totalPoints} pts
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {dayGroup.items?.map((item: any) => (
                            <div key={item._id} className="flex justify-between items-center bg-slate-50 dark:bg-gray-800/60 p-3 rounded-2xl border border-slate-100 dark:border-gray-700 hover:bg-slate-100/70 dark:hover:bg-gray-800 transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                {item.type === 'quiz' && (
                                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-600 shrink-0">
                                    <Trophy className="w-4 h-4" />
                                  </div>
                                )}
                                {item.type === 'bonus' && (
                                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-100 text-indigo-600 shrink-0">
                                    <PlusCircle className="w-4 h-4" />
                                  </div>
                                )}
                                {item.type === 'deduction' && (
                                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-100 text-rose-600 shrink-0">
                                    <MinusCircle className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{item.title}</p>
                                  {item.details && <p className="text-[11px] text-slate-400 truncate font-medium">{item.details}</p>}
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <p className={`font-black text-sm sm:text-base ${item.type === 'deduction' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {item.type === 'deduction' ? '-' : '+'}{item.points}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Show More Days Button - Icon-focused */}
                  {hasMoreDaily && (
                    <div className="pt-1 flex justify-center">
                      <button
                        type="button"
                        onClick={handleShowMoreDaily}
                        disabled={loadingMoreDaily}
                        title={`Show More (${dailyHistory.length} of ${totalDailyDays})`}
                        aria-label="Show More Days"
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>{loadingMoreDaily ? "..." : `${dailyHistory.length} / ${totalDailyDays}`}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 2. WEEKLY HISTORY TAB */}
              {activeHistoryTab === "weekly" && (
                <div className="flex flex-col gap-3">
                  {weeklyHistory.length === 0 ? (
                    <p className="text-slate-400 italic text-sm text-center py-6">No weekly history yet.</p>
                  ) : (
                    weeklyHistory.map((week: any) => (
                      <div
                        key={week.weekKey}
                        className="bg-slate-50 dark:bg-gray-800/60 border border-slate-100 dark:border-gray-700 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-fuchsia-200 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-fuchsia-100 border border-fuchsia-200 text-fuchsia-700 flex items-center justify-center font-black text-xs shrink-0">
                            📆
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-800 dark:text-white text-sm">{week.weekLabel}</h4>
                              {week.isBestWeek && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-700 text-[10px] font-black">
                                  ★ Top week
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium">
                              {week.itemsCount} events
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 self-end sm:self-auto">
                          {week.diffPrevWeek !== undefined && (
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                                week.diffPrevWeek > 0
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : week.diffPrevWeek < 0
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {week.diffPrevWeek > 0 ? `+${week.diffPrevWeek}` : week.diffPrevWeek}
                            </span>
                          )}
                          <span className="text-base font-black text-fuchsia-600">
                            {week.totalPoints > 0 ? `+${week.totalPoints}` : week.totalPoints} pts
                          </span>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Show More Weeks Button */}
                  {hasMoreWeekly && (
                    <div className="pt-1 flex justify-center">
                      <button
                        type="button"
                        onClick={handleShowMoreWeekly}
                        disabled={loadingMoreWeekly}
                        title={`Show More (${weeklyHistory.length} of ${totalWeeks})`}
                        aria-label="Show More Weeks"
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>{loadingMoreWeekly ? "..." : `${weeklyHistory.length} / ${totalWeeks}`}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Timer Sync, Tasks, Manners, Weekly Card */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Live Timer Sync Card */}
            <div className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 p-8 rounded-3xl shadow-sm flex flex-col items-center justify-center gap-4 relative overflow-hidden min-h-[220px]">
              {activeSession?.isTimerRunning ? (
                <>
                  <div className="absolute inset-0 bg-emerald-500/5 animate-pulse"></div>
                  <Zap className="w-8 h-8 text-emerald-500 animate-bounce z-10" />
                  <div className="text-6xl sm:text-7xl font-mono font-black text-slate-800 dark:text-white z-10 tracking-tight">
                    {liveTime.toFixed(1)}<span className="text-2xl text-slate-400">s</span>
                  </div>
                  {settings?.allowStudentToStopTimer && (
                    <button 
                      onClick={handleRemoteStop}
                      title="Stop Timer"
                      aria-label="Stop Timer"
                      className="z-10 w-16 h-16 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 active:scale-95 transition-all"
                    >
                      <Square className="w-7 h-7 fill-current" />
                    </button>
                  )}
                </>
              ) : lastResult?.cancelled ? (
                <>
                  <div className="text-4xl">🔄</div>
                  <div className="text-lg font-black text-amber-600">Question Cancelled</div>
                </>
              ) : lastResult ? (
                <>
                  <div className="text-5xl font-mono font-black tracking-tight text-slate-800 dark:text-white">
                    {(frozenTime ?? lastResult.responseTime).toFixed(1)}<span className="text-2xl text-slate-400">s</span>
                  </div>
                  {lastResult.isCorrect ? (
                    <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl flex items-center gap-2">
                      <span className="text-sm font-black text-emerald-700">+{lastResult.points} pts</span>
                      <span className="text-sm text-yellow-500">{"⭐".repeat(lastResult.stars)}</span>
                    </div>
                  ) : (
                    <div className="bg-rose-50 border border-rose-200 px-4 py-2 rounded-2xl">
                      <span className="text-xs font-bold text-rose-600">No points</span>
                    </div>
                  )}
                </>
              ) : frozenTime !== null ? (
                <>
                  <div className="text-6xl font-mono font-black text-slate-800 dark:text-white tracking-tight">
                    {frozenTime.toFixed(1)}<span className="text-2xl text-slate-400">s</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-400 dark:text-gray-500">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div className="text-6xl font-mono font-black text-slate-300 dark:text-gray-700 tracking-tight">
                    0.0<span className="text-2xl text-slate-300">s</span>
                  </div>
                </>
              )}
            </div>

            {/* Daily Manners (if enabled) */}
            {user.student?.mannersEnabled && (
              <div 
                onClick={() => setShowMannersHistory(true)}
                className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 p-5 rounded-3xl shadow-sm flex flex-col gap-2 relative overflow-hidden cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all group"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-slate-600 font-bold text-sm flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    Manners
                  </span>
                  <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">&rarr;</span>
                </div>
                
                <div className="relative inline-block text-3xl self-center my-1">
                  <div className="flex text-slate-200 dark:text-gray-700">★★★★★</div>
                  {(() => {
                    const todayLog = mannersLogs.find(l => new Date(l.date).toDateString() === new Date().toDateString());
                    const pct = todayLog ? todayLog.percentage : 0;
                    return (
                      <div className="flex text-yellow-400 absolute top-0 left-0 overflow-hidden whitespace-nowrap drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" style={{ width: `${pct}%` }}>
                        ★★★★★
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Tasks & Missions */}
            <div className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-800 dark:text-white font-black flex items-center gap-2 text-sm sm:text-base">
                  <Award className="w-4 h-4 text-indigo-600" />
                  Tasks
                </span>
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  {tasks.filter((t) => (!t.isRepeatable && !t.completed) || (t.isRepeatable && !t.completedToday)).length} To-Do
                </span>
              </div>

              {taskSuccessToast && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-black flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{taskSuccessToast}</span>
                </div>
              )}

              {tasks.length === 0 ? (
                <div className="py-6 text-center text-slate-400 flex flex-col items-center gap-1.5">
                  <Sparkles className="w-6 h-6 text-slate-300" />
                  <p className="text-xs font-bold">No tasks assigned yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {tasks.map((task) => {
                    const isCompleted = !task.isRepeatable && task.completed;
                    const isCompletedToday = task.isRepeatable && task.completedToday;
                    const isBusy = completingTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isCompleted
                            ? "bg-slate-50 border-slate-100 opacity-60"
                            : isCompletedToday
                            ? "bg-cyan-50/50 border-cyan-100"
                            : "bg-slate-50 dark:bg-gray-800/60 border-slate-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-500/40 shadow-sm"
                        }`}
                      >
                        {/* Check button */}
                        <button
                          type="button"
                          onClick={() => handleCompleteTask(task)}
                          disabled={isCompleted || isBusy}
                          title={
                            isCompleted
                              ? "Task Completed"
                              : isCompletedToday
                              ? "Completed today (Click to complete again)"
                              : `Click to claim +${task.points} pts!`
                          }
                          aria-label={`Complete task ${task.title}`}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-600 cursor-default"
                              : isCompletedToday
                              ? "bg-cyan-100 text-cyan-700 hover:scale-105 active:scale-95"
                              : "bg-white dark:bg-gray-800 hover:bg-emerald-600 text-slate-500 dark:text-gray-400 hover:text-white border border-slate-200 dark:border-gray-700 shadow-sm active:scale-95"
                          }`}
                        >
                          <Check className={`w-4 h-4 ${isCompleted ? "stroke-[3]" : "stroke-[2.5]"}`} />
                        </button>

                        {/* Task details */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs sm:text-sm font-bold truncate ${isCompleted ? "line-through text-slate-400" : "text-slate-800"}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black">
                              +{task.points} pts
                            </span>
                            {task.isRepeatable && (
                              <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[9px] font-bold flex items-center gap-0.5">
                                <Repeat className="w-2.5 h-2.5" /> Repeat
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Weekly Progress Card */}
            <div className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-800 dark:text-white font-black flex items-center gap-2 text-sm sm:text-base">
                  <Zap className="w-4 h-4 text-fuchsia-600" />
                  Weekly Progress
                </span>
                <span className="text-2xl font-black text-fuchsia-600">
                  {historyStats ? historyStats.thisWeekPoints : (user.student?.weeklyPoints || 0)} pts
                </span>
              </div>

              {/* Comparisons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-50 dark:bg-gray-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-gray-700 flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">vs Last Week</span>
                  <span className={`text-xs font-black ${(historyStats?.diffLastWeek ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {(historyStats?.diffLastWeek ?? 0) > 0 ? `+${historyStats?.diffLastWeek}` : (historyStats?.diffLastWeek ?? 0)} pts
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-gray-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-gray-700 flex flex-col">
                  <span className="text-[10px] font-bold text-amber-600 uppercase">Top Record</span>
                  <span className="text-xs font-black text-slate-800 dark:text-white">
                    {historyStats?.bestWeekPoints ?? 0} pts
                  </span>
                </div>
              </div>
            </div>

            {/* Classic Bundle Progress (if applicable) */}
            {user.student?.rewardSystem !== 'tiered' && settings && (
              <div className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 p-5 rounded-3xl shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-bold text-xs flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-purple-600" />
                    {settings.bundleItemName || "🍫 Chocolate"}
                  </span>
                  <span className="text-sm font-black text-purple-700">
                    x{bundlesEarned}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <div className="text-[10px] text-right text-slate-400 font-bold">
                  {currentProgress} / {bundleLimit}
                </div>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Modals & Animations */}
      {showBundleAnim && <BundleAnimation itemName={bundleItemName} />}

      {showRating && (
        <StarRatingAnimation 
          stars={showRating.stars}
          compliment={showRating.compliment}
          points={showRating.points}
          onComplete={handleAnimationComplete}
        />
      )}

      {showWrong && (
        <WrongAnswerAnimation 
          onComplete={handleAnimationComplete}
        />
      )}

      {manualAnim && (
        <ManualPointsAnimation 
          type={manualAnim.type}
          amount={manualAnim.amount}
          onComplete={() => setManualAnim(null)}
        />
      )}

      {showFinale && settings && (
        <MysteryGiftModal
          badgeType={showFinale}
          gifts={settings.mysteryGifts}
          onClose={() => setShowFinale(null)}
        />
      )}

      {showMannersHistory && user && user.id && (
        <MannersHistoryModal studentId={user.id} onClose={() => setShowMannersHistory(false)} />
      )}
    </div>
  );
}
