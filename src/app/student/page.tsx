"use client";

import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Zap, Trophy, History } from "lucide-react";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [liveTime, setLiveTime] = useState(0);

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
        }
      } catch (e) {}
    };

    syncTimer();
    const timerInterval = setInterval(syncTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [activeSession]);

  if (!user || user.role !== "student") return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full flex flex-col gap-10">
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Main Stats Card */}
          <div className="flex-1 bg-gradient-to-br from-indigo-900 to-purple-900 border border-indigo-500/30 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full filter blur-3xl mix-blend-overlay"></div>
            
            <h2 className="text-2xl font-black text-indigo-200 mb-2 uppercase tracking-widest relative z-10">Points Balance</h2>
            <div className="text-8xl md:text-[8rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300 drop-shadow-lg mb-8 relative z-10">
              {user.student?.pointsBalance?.toLocaleString() || 0} <span className="text-4xl text-indigo-300">pts</span>
            </div>

            <div className="flex items-center gap-4 bg-black/30 p-5 rounded-2xl w-fit border border-white/10 backdrop-blur-md relative z-10">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-sm font-bold text-indigo-200 uppercase tracking-wider">Lifetime Earnings</p>
                <p className="text-2xl font-black text-white">{user.student?.lifetimePoints?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>

          {/* Live Timer Sync Card */}
          <div className="w-full md:w-96 bg-gray-900 border border-gray-800 p-10 rounded-[3rem] shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
             {activeSession?.isTimerRunning ? (
                <>
                  <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>
                  <Zap className="w-12 h-12 text-emerald-400 mb-6 animate-bounce" />
                  <p className="text-emerald-400 font-bold uppercase tracking-widest mb-2 z-10">Live Timer Running</p>
                  <div className="text-6xl font-mono font-black text-white z-10 tracking-tighter drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                    {liveTime.toFixed(1)}<span className="text-3xl text-gray-500">s</span>
                  </div>
                </>
             ) : (
                <>
                  <div className="bg-gray-800 p-6 rounded-full mb-6">
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
    </div>
  );
}
