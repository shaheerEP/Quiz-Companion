"use client";

import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Zap, Trophy, History, Package, ListChecks, PlusCircle, MinusCircle } from "lucide-react";
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
  const [completedSessions, setCompletedSessions] = useState<any[]>([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const lastResultIdRef = useRef<string | null>(null);
  const shownManualLogsRef = useRef<Set<string>>(new Set());

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
              const latest = unseenManuals[unseenManuals.length - 1]; // Assume last is newest
              shownManualLogsRef.current.add(latest._id);
              setManualAnim({ type: latest.logType, amount: latest.points });
              
              // Also add all others to the shown set so we don't queue them forever
              unseenManuals.forEach((l: any) => shownManualLogsRef.current.add(l._id));
            }
          }
        });
    } else {
      setQuestionLogs([]);
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
        const completed = sessions.filter((s: any) => s.isCompleted);
        
        setCompletedSessions(completed);

        if (active) {
          setActiveSession(active);
      } else {
        setActiveSession(null);
      }
      
      // Fetch withdrawals
      const logsRes = await fetch(`/api/withdrawals?studentId=${user.id}`);
      setLogs(await logsRes.json());
      
      const setRes = await fetch("/api/settings");
      setSettings(await setRes.json());
      
      refreshAuth();
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000); // Polling every 3s
    return () => clearInterval(interval);
  }, [user]);

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
    if (user && !initialLoadComplete) {
      setInitialLoadComplete(true);
      setPrevBundles(bundlesEarned);
    }
  }, [user, initialLoadComplete, bundlesEarned]);

  useEffect(() => {
    if (initialLoadComplete && prevBundles !== null && bundlesEarned > prevBundles) {
      setShowBundleAnim(true);
      setTimeout(() => setShowBundleAnim(false), 4000);
    }
    if (initialLoadComplete) {
      setPrevBundles(bundlesEarned);
    }
  }, [bundlesEarned, prevBundles, initialLoadComplete]);

  if (!user || user.role !== "student") return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full flex flex-col gap-10">
        
        <div className="mb-2">
          <p className="text-indigo-400 font-bold uppercase tracking-widest mb-1 text-sm">Welcome back,</p>
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight capitalize">{user.name}</h1>
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

              {settings && (
                <div className="bg-black/30 p-6 rounded-2xl border border-white/10 backdrop-blur-md mt-auto w-full">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-indigo-200 font-bold flex items-center gap-2">
                      <Package className="w-5 h-5 text-purple-400" />
                      {bundleItemName} Collected
                    </span>
                    <span className="text-3xl font-black text-purple-400">x{bundlesEarned}</span>
                  </div>
                  <div className="w-full bg-black/50 rounded-full h-4 border border-white/10 overflow-hidden mb-2 relative">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-fuchsia-400 h-full rounded-full transition-all duration-1000 relative overflow-hidden" 
                      style={{ width: `${progressPercent}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 skew-x-12 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                    </div>
                  </div>
                  <div className="text-xs text-right text-indigo-300 font-bold">
                    {currentProgress} / {bundleLimit} points to next
                  </div>
                </div>
              )}
            </div>
          </div>
            
          {/* Past Quizzes embedded inside the same column but underneath */}
          {completedSessions.length > 0 && (
              <div className="bg-black/40 p-8 rounded-3xl border border-white/5 shadow-inner">
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                  <History className="w-6 h-6 text-indigo-400" />
                  Past Quizzes
                </h3>
                <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {completedSessions.map(session => (
                    <div key={session._id} className="flex justify-between items-center bg-gray-900/50 p-4 rounded-2xl border border-gray-800/50 hover:bg-gray-800/50 transition-colors">
                      <div>
                        <p className="font-bold text-gray-200 text-lg">
                          {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-sm text-gray-500 font-medium">
                          {session.totalQuestions} questions
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-emerald-500 opacity-70" />
                        <p className="font-black text-emerald-400 text-xl">
                          {session.finalScore}
                        </p>
                      </div>
                    </div>
                  ))}
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
          </div>
        </div>

        {/* Question Logs */}
        {activeSession && questionLogs.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] shadow-lg mb-8">
            <h2 className="text-xl font-black text-gray-200 mb-6 flex items-center gap-3 border-b border-gray-800 pb-4">
              <div className="bg-indigo-500/20 p-2 rounded-lg"><ListChecks className="w-5 h-5 text-indigo-400" /></div>
              Question Results
            </h2>
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {questionLogs.map((log) => (
                <div key={log._id} className="flex justify-between items-center bg-gray-950 p-4 rounded-xl border border-gray-800/50">
                  <div className="flex items-center gap-4">
                    {log.logType === 'bonus' ? (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-500/20 text-indigo-400">
                        <PlusCircle className="w-5 h-5" />
                      </div>
                    ) : log.logType === 'deduction' ? (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-500/20 text-rose-400">
                        <MinusCircle className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${log.isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        Q{log.questionNumber}
                      </div>
                    )}
                    <div>
                      {log.logType === 'bonus' ? (
                        <>
                          <p className="font-bold text-indigo-400">+{log.points} pts</p>
                          <p className="text-xs text-gray-500">Manual Bonus</p>
                        </>
                      ) : log.logType === 'deduction' ? (
                        <>
                          <p className="font-bold text-rose-400">-{log.points} pts</p>
                          <p className="text-xs text-gray-500">Manual Deduction</p>
                        </>
                      ) : (
                        <>
                          <p className={`font-bold ${log.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {log.isCorrect ? `+${log.points} pts` : 'No points'}
                          </p>
                          <p className="text-xs text-gray-500">{Number(log.responseTime).toFixed(1)}s response</p>
                        </>
                      )}
                    </div>
                  </div>
                  {(!log.logType || log.logType === 'question') && log.isCorrect && (
                    <div className="text-lg">
                      {"⭐".repeat(log.starsAwarded)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Withdrawal History */}
        <div className="bg-gray-900 border border-gray-800 p-10 rounded-[3rem] shadow-xl">
           <h2 className="text-2xl font-black text-gray-200 mb-8 flex items-center gap-3 border-b border-gray-800 pb-4">
              <div className="bg-rose-500/20 p-2 rounded-lg"><History className="text-rose-400 w-5 h-5" /></div>
              Reward History
           </h2>
           {logs.length === 0 ? (
             <p className="text-gray-500 font-bold italic text-lg text-center py-6">No rewards redeemed yet. Keep earning points!</p>
           ) : (
             <div className="flex flex-col gap-4">
               {logs.map((log) => (
                 <div key={log._id} className="flex justify-between items-center bg-gray-950 p-6 rounded-2xl border border-gray-800 shadow-inner">
                   <div>
                     <p className="text-2xl font-black text-white mb-1">{log.rewardDescription}</p>
                     <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{new Date(log.date).toLocaleDateString()}</p>
                   </div>
                   <div className="text-3xl font-black text-rose-500 drop-shadow-md">
                     -{log.pointsDeducted} pts
                   </div>
                 </div>
               ))}
             </div>
           )}
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
