"use client";

import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Zap, Trophy, History, Package, ListChecks, PlusCircle, MinusCircle, User, Star } from "lucide-react";
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
            // Find the most recent manual log that hasn't been shown
            const unseenManuals = data.filter((l: any) => 
              (l.logType === 'bonus' || l.logType === 'deduction') && !shownManualLogsRef.current.has(l._id)
            );
            if (unseenManuals.length > 0) {
              if (initialLogsFetchedRef.current) {
                const latest = unseenManuals[unseenManuals.length - 1]; // Assume last is newest
                setManualAnim({ type: latest.logType, amount: latest.points });
              }
              
              // Also add all others to the shown set so we don't queue them forever
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

    const fetchDashboardData = async () => {
      // Find active session
      const res = await fetch(`/api/sessions?studentId=${user.id}`);
        const sessions = await res.json();
        
        const active = sessions.find((s: any) => !s.isCompleted);
        
        const historyRes = await fetch(
          `/api/history?studentId=${user.id}&dailyLimit=${dailyLimitRef.current}&weeklyLimit=${weeklyLimitRef.current}`
        );
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

        if (active) {
          setActiveSession(active);
        } else {
          setActiveSession(null);
        }
      
        const mannersRes = await fetch(`/api/manners?studentId=${user.id}`);
        if (mannersRes.ok) setMannersLogs(await mannersRes.json());
      
      // Fetch withdrawals
      const logsRes = await fetch(`/api/withdrawals?studentId=${user.id}`);
      const logsData = await logsRes.json();
      setLogs(logsData.filter((log: any) => !log.rewardDescription?.includes("in World Builder")));
      
      const setRes = await fetch("/api/settings");
      setSettings(await setRes.json());
      
      refreshAuth();
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000); // Polling every 3s
    return () => clearInterval(interval);
  }, [user]);

  const initialTimerSyncDoneRef = useRef(false);

  useEffect(() => {
    if (!activeSession) return;

    // Check timer state fast polling (every 1s)
    const syncTimer = async () => {
      try {
        const res = await fetch(`/api/sessions/timer?sessionId=${activeSession._id}`);
        const timerData = await res.json();
        
        if (timerData.isTimerRunning && timerData.currentTimerStartTime) {
          setFrozenTime(null);
          setLastResult(null);
          // Sync local clock
          const updateTimer = () => {
            const msPassed = Date.now() - timerData.currentTimerStartTime;
            setLiveTime(msPassed / 1000);
            requestRef.current = requestAnimationFrame(updateTimer);
          };
          
          if (!requestRef.current) {
            requestRef.current = requestAnimationFrame(updateTimer);
          }
        } else {
          // Timer stopped
          if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = null;
          }
          // Show frozen time if stopped by anyone
          if (timerData.studentStopTime !== undefined && timerData.studentStopTime !== null) {
            setFrozenTime(timerData.studentStopTime);
          }
          // Show last question result when available
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
                // Trigger star animation once per result
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
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full flex flex-col gap-10">
        
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-[6px] border-indigo-500/50 bg-gray-800 flex items-center justify-center shadow-2xl relative z-10">
                {user.student?.profileImageUrl ? (
                  <img src={user.student.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 md:w-20 md:h-20 text-gray-500" />
                )}
              </div>
              
              {/* 5 Star Daily Fill */}
              <div className="relative inline-block text-3xl md:text-4xl">
                <div className="flex text-gray-700">★★★★★</div>
                <div className="flex text-yellow-400 absolute top-0 left-0 overflow-hidden whitespace-nowrap drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" style={{ width: `${Math.min(100, ((user.student?.dailyPoints || 0) / 1000) * 100)}%` }}>
                  ★★★★★
                </div>
              </div>
            </div>
            <div className="text-center md:text-left">
              <p className="text-indigo-400 font-bold uppercase tracking-widest mb-2 text-sm md:text-base">Welcome back,</p>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tight capitalize drop-shadow-lg">{user.name}</h1>
              <p className="text-sm text-gray-400 mt-1 font-bold">Today's Points: <span className="text-emerald-400">{user.student?.dailyPoints || 0}</span></p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          
          <div className="flex-1 flex flex-col gap-8">
            {/* Main Stats Card */}
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 border border-indigo-500/30 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full filter blur-3xl mix-blend-overlay"></div>
            
            <div className="flex flex-col gap-4 relative z-10 h-full">
              <div>
                <h2 className="text-2xl font-black text-indigo-200 mb-2 uppercase tracking-widest">Points Balance</h2>
                <div className="text-8xl md:text-[8rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300 drop-shadow-lg mb-4">
                  {user.student?.pointsBalance?.toLocaleString() || 0} <span className="text-4xl text-indigo-300">pts</span>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-black/30 p-5 rounded-2xl w-fit border border-white/10 backdrop-blur-md mb-2">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-sm font-bold text-indigo-200 uppercase tracking-wider">Lifetime Earnings</p>
                  <p className="text-2xl font-black text-white">{lifetimePoints.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
            
          {/* Dual-Tab History Section: Daily History & Weekly History */}
          <div className="bg-black/40 p-6 sm:p-8 rounded-3xl border border-white/5 shadow-inner flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <History className="w-6 h-6 text-indigo-400" />
                <h3 className="text-xl font-black text-white">Score History</h3>
              </div>

              {/* Segmented Tab Controls */}
              <div className="inline-flex p-1 bg-gray-900 border border-white/10 rounded-2xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveHistoryTab("daily")}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeHistoryTab === "daily"
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Daily History ({totalDailyDays})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveHistoryTab("weekly")}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeHistoryTab === "weekly"
                      ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/30"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Weekly History ({totalWeeks})
                </button>
              </div>
            </div>

            {/* 1. DAILY HISTORY TAB */}
            {activeHistoryTab === "daily" && (
              <div className="flex flex-col gap-6">
                {dailyHistory.length === 0 ? (
                  <p className="text-gray-500 italic text-sm text-center py-6">No daily quiz history yet.</p>
                ) : (
                  dailyHistory.map((dayGroup: any) => (
                    <div key={dayGroup.dayString} className="flex flex-col gap-3">
                      <div className="flex justify-between items-center pl-3 border-l-2 border-indigo-500/60">
                        <p className="text-sm font-bold text-gray-300 uppercase tracking-wider">{dayGroup.dayString}</p>
                        <div className="flex gap-2 items-center">
                          <div className="relative inline-block text-sm mr-2" title={`${Math.min(100, Math.max(0, (dayGroup.totalPoints / 1000) * 100)).toFixed(0)}% of daily goal`}>
                            <div className="flex text-gray-700">★★★★★</div>
                            <div
                              className="flex text-yellow-400 absolute top-0 left-0 overflow-hidden whitespace-nowrap drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]"
                              style={{ width: `${Math.min(100, Math.max(0, (dayGroup.totalPoints / 1000) * 100))}%` }}
                            >
                              ★★★★★
                            </div>
                          </div>
                          <p className={`text-sm font-black ${dayGroup.totalPoints > 0 ? 'text-emerald-400' : dayGroup.totalPoints < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                            {dayGroup.totalPoints > 0 ? '+' : ''}{dayGroup.totalPoints} pts
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {dayGroup.items?.map((item: any) => (
                          <div key={item._id} className="flex justify-between items-center bg-gray-900/60 p-4 rounded-2xl border border-gray-800/60 hover:bg-gray-800/50 transition-colors">
                            <div className="flex items-center gap-3.5">
                              {item.type === 'quiz' && (
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/20 text-emerald-400 shrink-0">
                                  <Trophy className="w-4 h-4" />
                                </div>
                              )}
                              {item.type === 'bonus' && (
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-500/20 text-indigo-400 shrink-0">
                                  <PlusCircle className="w-4 h-4" />
                                </div>
                              )}
                              {item.type === 'deduction' && (
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/20 text-rose-400 shrink-0">
                                  <MinusCircle className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-gray-200 text-sm sm:text-base">{item.title}</p>
                                {item.details && <p className="text-xs text-gray-400 font-medium">{item.details}</p>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`font-black text-lg ${item.type === 'deduction' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {item.type === 'deduction' ? '-' : '+'}{item.points}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}

                {/* Show More Days Button */}
                {hasMoreDaily && (
                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={handleShowMoreDaily}
                      disabled={loadingMoreDaily}
                      className="px-6 py-2.5 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      {loadingMoreDaily ? "Fetching days..." : `Show More Days (${dailyHistory.length} of ${totalDailyDays})`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 2. WEEKLY HISTORY TAB */}
            {activeHistoryTab === "weekly" && (
              <div className="flex flex-col gap-4">
                {weeklyHistory.length === 0 ? (
                  <p className="text-gray-500 italic text-sm text-center py-6">No weekly history recorded yet.</p>
                ) : (
                  weeklyHistory.map((week: any) => (
                    <div
                      key={week.weekKey}
                      className="bg-gray-900/70 border border-gray-800/80 p-5 rounded-2xl flex flex-col gap-3 hover:border-fuchsia-500/30 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-300 font-black text-xs shrink-0">
                            📆
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-sm sm:text-base">{week.weekLabel}</h4>
                              {week.isBestWeek && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black flex items-center gap-1">
                                  ★ Top week
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 font-medium">
                              {week.itemsCount} total quiz events
                            </p>
                          </div>
                        </div>

                        {/* Points & Difference vs previous week */}
                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          {week.diffPrevWeek !== undefined && (
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                week.diffPrevWeek > 0
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : week.diffPrevWeek < 0
                                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                  : 'bg-gray-800 text-gray-500'
                              }`}
                            >
                              {week.diffPrevWeek > 0 ? `+${week.diffPrevWeek}` : week.diffPrevWeek} vs prev
                            </span>
                          )}
                          <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-pink-400">
                            {week.totalPoints > 0 ? `+${week.totalPoints}` : week.totalPoints} pts
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Show More Weeks Button */}
                {hasMoreWeekly && (
                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={handleShowMoreWeekly}
                      disabled={loadingMoreWeekly}
                      className="px-6 py-2.5 rounded-2xl bg-fuchsia-600/20 hover:bg-fuchsia-600/30 text-fuchsia-300 hover:text-white border border-fuchsia-500/30 text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      {loadingMoreWeekly ? "Fetching weeks..." : `Show More Weeks (${weeklyHistory.length} of ${totalWeeks})`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

          {/* Live Timer Sync Card */}
          <div className="w-full md:w-96 flex flex-col gap-8">
            <div className="bg-gray-900 border border-gray-800 p-10 rounded-[3rem] shadow-xl flex flex-col items-center justify-center gap-4 relative overflow-hidden">
               {activeSession?.isTimerRunning ? (
                <>
                  <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>
                  <Zap className="w-12 h-12 text-emerald-400 mb-2 animate-bounce z-10" />
                  <p className="text-emerald-400 font-bold uppercase tracking-widest z-10">Live Timer Running</p>
                  <div className="text-6xl font-mono font-black text-white z-10 tracking-tighter drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] mb-2">
                    {liveTime.toFixed(1)}<span className="text-3xl text-gray-500">s</span>
                  </div>
                  {settings?.allowStudentToStopTimer && (
                    <button 
                      onClick={handleRemoteStop}
                      className="z-10 w-full bg-rose-500 hover:bg-rose-400 text-white font-black text-2xl py-6 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(244,63,94,0.4)] border border-rose-400/50"
                    >
                      STOP TIMER
                    </button>
                  )}
                </>
             ) : lastResult?.cancelled ? (
                <>
                  <div className="absolute inset-0 bg-amber-500/10"></div>
                  <div className="z-10 text-center flex flex-col items-center gap-3">
                    <div className="text-5xl">🔄</div>
                    <div className="text-2xl font-black text-amber-400">Question Cancelled</div>
                    <p className="text-gray-400 font-bold">Teacher will ask again!</p>
                  </div>
                </>
             ) : lastResult ? (
                <>
                  <div className={`absolute inset-0 ${lastResult.isCorrect ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}></div>
                  <div className="z-10 text-center flex flex-col items-center gap-3">
                    <div className={`text-5xl font-mono font-black tracking-tighter ${lastResult.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {(frozenTime ?? lastResult.responseTime).toFixed(1)}<span className="text-2xl text-gray-500">s</span>
                    </div>
                    <div className={`text-4xl font-black ${lastResult.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {lastResult.isCorrect ? '✅ Correct!' : '❌ Wrong!'}
                    </div>
                    {lastResult.isCorrect && lastResult.points > 0 && (
                      <div className="bg-emerald-500/20 border border-emerald-500/40 px-6 py-3 rounded-2xl">
                        <span className="text-2xl font-black text-emerald-400">+{lastResult.points} pts</span>
                        <span className="ml-2 text-yellow-400">{"⭐".repeat(lastResult.stars)}</span>
                      </div>
                    )}
                    {!lastResult.isCorrect && (
                      <div className="bg-rose-500/20 border border-rose-500/30 px-6 py-3 rounded-2xl">
                        <span className="text-lg font-bold text-rose-300">No points this round</span>
                      </div>
                    )}
                  </div>
                </>
             ) : frozenTime !== null ? (
                <>
                  <div className="absolute inset-0 bg-amber-500/10"></div>
                  <p className="text-amber-400 font-bold uppercase tracking-widest z-10">Stopped</p>
                  <div className="text-6xl font-mono font-black text-white z-10 tracking-tighter">
                    {frozenTime.toFixed(1)}<span className="text-3xl text-gray-500">s</span>
                  </div>
                  <p className="text-gray-500 text-sm font-bold z-10">Waiting for result...</p>
                </>
             ) : (
                <>
                  <div className="bg-gray-800 p-6 rounded-full mb-2">
                    <Zap className="w-12 h-12 text-gray-600" />
                  </div>
                  <div className="text-6xl font-mono font-black text-gray-600 z-10 tracking-tighter mb-2">
                    0.0<span className="text-3xl text-gray-700">s</span>
                  </div>
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-center">Ready for next question!</p>
                </>
             )}
            </div>

            {settings && (
              <div className="flex flex-col gap-4">
                {user.student?.mannersEnabled && (
                  <div 
                    onClick={() => setShowMannersHistory(true)}
                    className="bg-gray-900 border border-gray-800 p-8 rounded-[3rem] shadow-xl flex flex-col items-center justify-center gap-2 relative overflow-hidden cursor-pointer hover:bg-gray-800/80 transition-colors group"
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="text-gray-400 font-bold flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        Daily Manners
                      </span>
                      <span className="text-xs font-bold text-gray-500 group-hover:text-white transition-colors">History &rarr;</span>
                    </div>
                    
                    <div className="relative inline-block text-5xl md:text-6xl mb-2">
                      <div className="flex text-gray-800">★★★★★</div>
                      {(() => {
                        const todayLog = mannersLogs.find(l => new Date(l.date).toDateString() === new Date().toDateString());
                        const pct = todayLog ? todayLog.percentage : 0;
                        return (
                          <div className="flex text-yellow-400 absolute top-0 left-0 overflow-hidden whitespace-nowrap drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" style={{ width: `${pct}%` }}>
                            ★★★★★
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
                {/* Unlimited Weekly Progress & Comparisons (replaces Tiered Reward Levels) */}
                <div className="bg-gray-900 border border-gray-800 p-8 rounded-[3rem] shadow-xl flex flex-col gap-4 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-black flex items-center gap-2 text-base">
                      <Zap className="w-5 h-5 text-fuchsia-400" />
                      Weekly Progress
                    </span>
                    <span className="text-xs font-bold text-gray-500 bg-gray-950 px-3 py-1 rounded-full border border-gray-800">
                      Resets Monday
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mt-1">
                    <div>
                      <span className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-400">
                        {historyStats ? historyStats.thisWeekPoints : (user.student?.weeklyPoints || 0)}
                      </span>
                      <span className="text-sm font-bold text-gray-400 ml-2">pts this week</span>
                    </div>
                    {historyStats?.isNewRecord && (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black animate-pulse">
                        <span>★ Top week!</span>
                      </div>
                    )}
                  </div>

                  {/* Comparisons: vs Last Week & vs ★ Top week */}
                  <div className="grid grid-cols-1 gap-2.5 pt-1">
                    {/* vs Last Week */}
                    <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">vs. Last Week</span>
                        <span className="text-xs text-gray-500">
                          Last week: <strong className="text-gray-300">{historyStats?.lastWeekPoints ?? 0} pts</strong>
                        </span>
                      </div>
                      {(() => {
                        const diff = historyStats?.diffLastWeek ?? 0;
                        if (diff > 0) {
                          return (
                            <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black">
                              +{diff} pts ↗
                            </span>
                          );
                        } else if (diff < 0) {
                          return (
                            <span className="px-3 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-black">
                              {diff} pts ↘
                            </span>
                          );
                        }
                        return (
                          <span className="px-3 py-1 rounded-xl bg-gray-800 text-gray-400 text-xs font-bold">
                            Equal (0 pts)
                          </span>
                        );
                      })()}
                    </div>

                    {/* vs ★ Top week */}
                    <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          vs. ★ Top week
                        </span>
                        <span className="text-xs text-gray-500">
                          Top record: <strong className="text-amber-300">{historyStats?.bestWeekPoints ?? 0} pts</strong>
                          {historyStats?.bestWeekLabel && historyStats.bestWeekLabel !== "None" && (
                            <span className="text-[10px] text-gray-600 block">{historyStats.bestWeekLabel}</span>
                          )}
                        </span>
                      </div>
                      {(() => {
                        const diffBest = historyStats?.diffBestWeek ?? 0;
                        if (historyStats?.isNewRecord) {
                          return (
                            <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
                              ★ Top week
                            </span>
                          );
                        } else if (diffBest < 0) {
                          return (
                            <span className="px-3 py-1 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-bold">
                              {diffBest} pts vs top
                            </span>
                          );
                        }
                        return (
                          <span className="px-3 py-1 rounded-xl bg-gray-800 text-gray-400 text-xs font-bold">
                            0 pts
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Top Week Relative Progress Indicator */}
                  {historyStats && historyStats.bestWeekPoints > 0 && (
                    <div className="flex flex-col gap-1 pt-1">
                      <div className="w-full bg-gray-950 rounded-full h-2 border border-gray-800 overflow-hidden relative">
                        <div
                          className="bg-gradient-to-r from-fuchsia-500 to-amber-400 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(3, (historyStats.thisWeekPoints / Math.max(1, historyStats.bestWeekPoints)) * 100))}%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-500 font-bold px-0.5">
                        <span>{((historyStats.thisWeekPoints / Math.max(1, historyStats.bestWeekPoints)) * 100).toFixed(0)}% of ★ Top week</span>
                        <span>{historyStats.bestWeekPoints} pts</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Classic Bundle Progress - only if not tiered, or we can just always show it. Let's only show if not tiered or if they still want it. */}
                {user.student?.rewardSystem !== 'tiered' && (
                  <div className="bg-gray-900 border border-gray-800 p-8 rounded-[3rem] shadow-xl flex flex-col gap-2 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-bold flex items-center gap-2">
                        <Package className="w-4 h-4 text-purple-400" />
                        {settings.bundleItemName || "🍫 Chocolate"}
                      </span>
                      <span className="text-2xl font-black text-purple-400">
                        x{bundlesEarned}
                      </span>
                    </div>
                    <div className="w-full bg-gray-950 rounded-full h-3 border border-gray-800 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-fuchsia-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-right text-gray-500 font-bold">
                      {currentProgress} / {bundleLimit} to next
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>



      </main>

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
