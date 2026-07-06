"use client";

import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Zap, Trophy, History, Package, ListChecks, PlusCircle, MinusCircle, User } from "lucide-react";
import BundleAnimation from "@/components/BundleAnimation";
import StarRatingAnimation from "@/components/StarRatingAnimation";
import WrongAnswerAnimation from "@/components/WrongAnswerAnimation";
import ManualPointsAnimation from "@/components/ManualPointsAnimation";
import MysteryGiftModal from "@/components/MysteryGiftModal";

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
  const lastResultIdRef = useRef<string | null>(null);
  const shownManualLogsRef = useRef<Set<string>>(new Set());
  const initialLogsFetchedRef = useRef(false);
  const initialLoadCompleteRef = useRef(false);

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
        
        const historyRes = await fetch(`/api/history?studentId=${user.id}`);
        setHistoryItems(await historyRes.json());

        if (active) {
          setActiveSession(active);
      } else {
        setActiveSession(null);
      }
      
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
      if (activeSession.totalQuestions >= settings.badgeThresholds.finaleQuestionCount) {
        if (activeSession.averageSpeed <= settings.badgeThresholds.speedThreshold) {
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
  }, [user?.student?.lifetimePoints, settings?.bundleLimit, prevBundles, user]);

  const groupedHistory = historyItems.reduce((acc: any, item: any) => {
    const dateObj = new Date(item.date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    let dayString = dateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    if (dateObj.toDateString() === today.toDateString()) dayString = "Today";
    else if (dateObj.toDateString() === yesterday.toDateString()) dayString = "Yesterday";
    
    if (!acc[dayString]) acc[dayString] = [];
    acc[dayString].push(item);
    return acc;
  }, {});

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
            
            {/* Daily History embedded inside the same column but underneath */}
            {Object.keys(groupedHistory).length > 0 && (
              <div className="bg-black/40 p-8 rounded-3xl border border-white/5 shadow-inner">
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                  <History className="w-6 h-6 text-indigo-400" />
                  Daily History
                </h3>
                <div className="flex flex-col gap-6 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {Object.keys(groupedHistory).map(day => {
                    const dailyTotal = groupedHistory[day].reduce((total: number, item: any) => total + (item.type === 'deduction' ? -item.points : item.points), 0);
                    return (
                    <div key={day} className="flex flex-col gap-3">
                      <div className="flex justify-between items-center pl-2 border-l-2 border-indigo-500/50">
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{day}</p>
                        <div className="flex gap-2 items-center">
                          <div className="relative inline-block text-sm mr-2" title={`${Math.min(100, Math.max(0, (dailyTotal / 1000) * 100)).toFixed(0)}% of daily goal`}>
                            <div className="flex text-gray-700">★★★★★</div>
                            <div className="flex text-yellow-400 absolute top-0 left-0 overflow-hidden whitespace-nowrap drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]" style={{ width: `${Math.min(100, Math.max(0, (dailyTotal / 1000) * 100))}%` }}>
                              ★★★★★
                            </div>
                          </div>
                          <p className={`text-sm font-bold ${dailyTotal > 0 ? 'text-emerald-400' : dailyTotal < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                            {dailyTotal > 0 ? '+' : ''}{dailyTotal} pts
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {groupedHistory[day].map((item: any) => (
                          <div key={item._id} className="flex justify-between items-center bg-gray-900/50 p-4 rounded-2xl border border-gray-800/50 hover:bg-gray-800/50 transition-colors">
                            <div className="flex items-center gap-4">
                              {item.type === 'quiz' && <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400"><Trophy className="w-5 h-5" /></div>}
                              {item.type === 'bonus' && <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-500/20 text-indigo-400"><PlusCircle className="w-5 h-5" /></div>}
                              {item.type === 'deduction' && <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-500/20 text-rose-400"><MinusCircle className="w-5 h-5" /></div>}
                              <div>
                                <p className="font-bold text-gray-200 text-lg">{item.title}</p>
                                {item.details && <p className="text-xs text-gray-500 font-medium">{item.details}</p>}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-black text-xl ${item.type === 'deduction' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {item.type === 'deduction' ? '-' : '+'}{item.points}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
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
                {/* Weekly Target Progress */}
                <div className="bg-gray-900 border border-gray-800 p-8 rounded-[3rem] shadow-xl flex flex-col gap-2 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 font-bold flex items-center gap-2">
                      <Zap className="w-5 h-5 text-fuchsia-400" />
                      Weekly Goal
                    </span>
                    <span className="text-2xl font-black text-fuchsia-400">
                      {user.student?.weeklyPoints || 0} pts
                    </span>
                  </div>
                  <div className="w-full bg-gray-950 rounded-full h-4 border border-gray-800 overflow-hidden relative">
                    <div 
                      className="bg-gradient-to-r from-fuchsia-500 to-pink-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, ((user.student?.weeklyPoints || 0) / (settings.weeklyTargetPoints || 5000)) * 100)}%` }}
                    ></div>
                    {/* Tier Markers if on tiered system */}
                    {user.student?.rewardSystem === 'tiered' && settings.tieredRewards?.map((tier: any, i: number) => {
                      const pos = (tier.points / (settings.weeklyTargetPoints || 5000)) * 100;
                      if (pos > 100) return null;
                      return (
                        <div key={i} className="absolute top-0 bottom-0 w-1 bg-white/20" style={{ left: `${pos}%` }} title={`${tier.name} (${tier.points} pts)`}></div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="text-xs text-gray-500 font-bold">Resets Monday</div>
                    <div className="text-xs text-gray-400 font-bold">Target: {settings.weeklyTargetPoints || 5000}</div>
                  </div>
                  {user.student?.rewardSystem === 'tiered' && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-800/50">
                      {settings.tieredRewards?.map((tier: any, i: number) => (
                        <div key={i} className={`text-[10px] px-2 py-1 rounded-md font-bold ${(user.student?.weeklyPoints || 0) >= tier.points ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-gray-800 text-gray-500'}`}>
                          {tier.name} ({tier.points})
                        </div>
                      ))}
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
    </div>
  );
}
