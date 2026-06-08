"use client";

import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Zap, Trophy, History, Package } from "lucide-react";
import BundleAnimation from "@/components/BundleAnimation";
import StarRatingAnimation from "@/components/StarRatingAnimation";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [liveTime, setLiveTime] = useState(0);
  const [frozenTime, setFrozenTime] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [prevBundles, setPrevBundles] = useState<number | null>(null);
  const [showBundleAnim, setShowBundleAnim] = useState(false);
  const [showRating, setShowRating] = useState<{stars: number, compliment: string, points: number} | null>(null);
  const lastResultIdRef = useRef<string | null>(null);

  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user || user.role !== "student") return;

    const fetchDashboardData = async () => {
      // Find active session
      const res = await fetch(`/api/sessions?studentId=${user.id}`);
      const sessions = await res.json();
      if (sessions.length > 0 && !sessions[0].isCompleted) {
        setActiveSession(sessions[0]);
      } else {
        setActiveSession(null);
      }
      
      // Fetch withdrawals
      const logsRes = await fetch(`/api/withdrawals?studentId=${user.id}`);
      setLogs(await logsRes.json());
      
      const setRes = await fetch("/api/settings");
      setSettings(await setRes.json());
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
          // Show frozen time if student stopped it
          if (timerData.stoppedByStudent && timerData.studentStopTime) {
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
    if (prevBundles !== null && bundlesEarned > prevBundles) {
      setShowBundleAnim(true);
      setTimeout(() => setShowBundleAnim(false), 4000);
    }
    setPrevBundles(bundlesEarned);
  }, [bundlesEarned, prevBundles]);

  if (!user || user.role !== "student") return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full flex flex-col gap-10">
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Main Stats Card */}
          <div className="flex-1 bg-gradient-to-br from-indigo-900 to-purple-900 border border-indigo-500/30 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
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

          {/* Live Timer Sync Card */}
          <div className="w-full md:w-96 bg-gray-900 border border-gray-800 p-10 rounded-[3rem] shadow-xl flex flex-col items-center justify-center gap-4 relative overflow-hidden">
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
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-center">Waiting for teacher<br/>to start timer...</p>
                </>
             )}
          </div>
        </div>

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
          onComplete={() => setShowRating(null)}
        />
      )}
    </div>
  );
}
