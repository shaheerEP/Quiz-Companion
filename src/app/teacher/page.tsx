"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Stopwatch from "@/components/Stopwatch";
import StarRatingAnimation from "@/components/StarRatingAnimation";
import MysteryGiftModal from "@/components/MysteryGiftModal";
import BundleAnimation from "@/components/BundleAnimation";
import WrongAnswerAnimation from "@/components/WrongAnswerAnimation";
import { User, Activity, Zap, PlusCircle, MinusCircle, Package, ListChecks } from "lucide-react";

export default function TeacherDashboard() {
  const [settings, setSettings] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [activeStudent, setActiveStudent] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [showRating, setShowRating] = useState<{stars: number, compliment: string, points: number} | null>(null);
  const [showWrong, setShowWrong] = useState(false);
  const [showFinale, setShowFinale] = useState<"Master Mind Champion 🏆" | "Super Solver 🥇" | null>(null);
  const [prevBundles, setPrevBundles] = useState<number | null>(null);
  const [showBundleAnim, setShowBundleAnim] = useState(false);
  const [questionLogs, setQuestionLogs] = useState<any[]>([]);
  const [resetTimerKey, setResetTimerKey] = useState(0);

  useEffect(() => {
    if (activeSession) {
      fetch(`/api/sessions/${activeSession._id}/questions`)
        .then(res => res.json())
        .then(setQuestionLogs);
    } else {
      setQuestionLogs([]);
    }
  }, [activeSession?._id, activeSession?.totalQuestions]);

  useEffect(() => {
    fetch("/api/settings").then(res => res.json()).then(setSettings);
    fetch("/api/students").then(res => res.json()).then(setStudents);
  }, []);

  const handleStudentChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const studentId = e.target.value;
    const student = students.find(s => s._id === studentId);
    setActiveStudent(student);
    
    if (student) {
      const res = await fetch(`/api/sessions?studentId=${studentId}`);
      const sessions = await res.json();
      if (sessions.length > 0 && !sessions[0].isCompleted) {
        setActiveSession(sessions[0]);
      } else {
        const newSessionRes = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: student._id })
        });
        const newSession = await newSessionRes.json();
        setActiveSession(newSession);
      }
    } else {
      setActiveSession(null);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && activeSession && activeStudent) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/sessions?studentId=${activeStudent._id}`);
          const sessions = await res.json();
          if (sessions.length > 0 && !sessions[0].isCompleted) {
            if (sessions[0].stoppedByStudent && sessions[0].studentStopTime !== null) {
              setActiveSession(sessions[0]);
            }
          }
        } catch (e) {}
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, activeSession, activeStudent]);

  const handleAddBonus = async () => {
    const amount = prompt("Enter bonus points to add:");
    if (!amount || isNaN(Number(amount)) || !activeSession) return;
    
    await fetch(`/api/sessions/${activeSession._id}/manual-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logType: 'bonus', points: Number(amount) })
    });
    
    const newPoints = activeStudent.pointsBalance + Number(amount);
    const newLifetime = activeStudent.lifetimePoints + Number(amount);
    setActiveStudent({ ...activeStudent, pointsBalance: newPoints, lifetimePoints: newLifetime });
    
    // Also update session score locally and refetch logs by incrementing totalQuestions slightly to trigger effect, or better yet, fetch logs manually
    fetch(`/api/sessions/${activeSession._id}/questions`)
      .then(res => res.json())
      .then(setQuestionLogs);
  };

  const handleDeductPoints = async () => {
    const amount = prompt("Enter points to deduct:");
    if (!amount || isNaN(Number(amount)) || !activeSession) return;
    
    await fetch(`/api/sessions/${activeSession._id}/manual-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logType: 'deduction', points: Number(amount) })
    });

    const newPoints = Math.max(0, activeStudent.pointsBalance - Number(amount));
    const newLifetime = Math.max(0, activeStudent.lifetimePoints - Number(amount));
    setActiveStudent({ ...activeStudent, pointsBalance: newPoints, lifetimePoints: newLifetime });
    
    fetch(`/api/sessions/${activeSession._id}/questions`)
      .then(res => res.json())
      .then(setQuestionLogs);
  };

  const handleTimerRunningState = async (run: boolean, teacherStopTime?: number, teacherStartTime?: number) => {
    setIsRunning(run);
    if (activeSession) {
      await fetch("/api/sessions/timer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sessionId: activeSession._id, 
          isTimerRunning: run,
          ...(teacherStopTime !== undefined && { teacherStopTime }),
          ...(teacherStartTime !== undefined && { teacherStartTime })
        })
      });
      setActiveSession({ 
        ...activeSession, 
        isTimerRunning: run, 
        stoppedByStudent: false, 
        studentStopTime: teacherStopTime !== undefined ? teacherStopTime : null,
        lastQuestionResult: null 
      });
    }
  };

  const handleCancel = async () => {
    // Reset the timer state in DB — don't log any question, notify student
    if (activeSession) {
      await fetch("/api/sessions/timer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSession._id, isTimerRunning: false, cancelled: true })
      });
      setActiveSession({ ...activeSession, isTimerRunning: false, stoppedByStudent: false, studentStopTime: null, lastQuestionResult: null });
    }
  };

  const handleScore = async (seconds: number, isCorrect: boolean) => {
    if (!settings || !activeSession || !activeStudent) return;

    let matchedTier = { name: "Incorrect!", stars: 0, points: 0, maxSeconds: 999 };
    if (isCorrect) {
      const sortedTiers = [...settings.ratingTiers].sort((a: any, b: any) => a.maxSeconds - b.maxSeconds);
      matchedTier = sortedTiers[sortedTiers.length - 1]; // default to longest time
      for (const tier of sortedTiers) {
        if (seconds <= tier.maxSeconds) {
          matchedTier = tier;
          break;
        }
      }
    }

    if (isCorrect) {
      setShowRating({
        stars: matchedTier.stars,
        compliment: matchedTier.name,
        points: matchedTier.points
      });
    }

    const res = await fetch(`/api/sessions/${activeSession._id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionNumber: activeSession.totalQuestions + 1,
        responseTime: seconds,
        starsAwarded: matchedTier.stars,
        points: matchedTier.points,
        isCorrect,
        compliment: matchedTier.name
      })
    });
    const result = await res.json();

    const actualPoints = isCorrect ? matchedTier.points : 0;
    
    setActiveSession((prev: any) => ({
      ...prev,
      totalQuestions: prev.totalQuestions + 1,
      finalScore: prev.finalScore + actualPoints,
      averageSpeed: ((prev.averageSpeed * prev.totalQuestions) + seconds) / (prev.totalQuestions + 1),
      isTimerRunning: false,
      stoppedByStudent: false,
      studentStopTime: null
    }));
    setActiveStudent((prev: any) => ({
      ...prev,
      lifetimePoints: prev.lifetimePoints + actualPoints,
      pointsBalance: prev.pointsBalance + actualPoints
    }));

    if (!isCorrect) {
      setShowWrong(true);
    }
  };

  const handleRatingComplete = () => {
    setShowRating(null);
    setResetTimerKey(prev => prev + 1);
    if (activeSession && settings) {
      const updatedTotal = activeSession.totalQuestions + 1; // +1 because state might be lagging one tick behind if called synchronously
      // Wait, we updated state before calling this in handleScore. But setActiveSession is async. 
      // Let's rely on activeSession.totalQuestions + 1 if we're calling it from handleScore, but wait, handleRatingComplete is called *after* animation.
      // So activeSession state should be updated by now.
      if (activeSession.totalQuestions >= settings.badgeThresholds.finaleQuestionCount) {
        if (activeSession.averageSpeed <= settings.badgeThresholds.speedThreshold) {
          setShowFinale("Master Mind Champion 🏆");
        } else {
          setShowFinale("Super Solver 🥇");
        }
      }
    }
  };

  const handleFinaleClose = async () => {
    setShowFinale(null);
    if (activeStudent) {
      const newSessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: activeStudent._id })
      });
      const newSession = await newSessionRes.json();
      setActiveSession(newSession);
    }
  };

  const bundlesEarned = Math.floor((activeStudent?.lifetimePoints || 0) / (settings?.bundleLimit || 1000));
  useEffect(() => {
    if (prevBundles !== null && bundlesEarned > prevBundles) {
      setShowBundleAnim(true);
      setTimeout(() => setShowBundleAnim(false), 4000);
    }
    setPrevBundles(bundlesEarned);
  }, [bundlesEarned, prevBundles]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col md:flex-row p-6 gap-6 max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        <aside className="w-full md:w-80 flex flex-col gap-6">
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] shadow-lg">
            <h2 className="text-xl font-black text-gray-200 mb-6 flex items-center gap-3 border-b border-gray-800 pb-4">
              <div className="bg-indigo-500/20 p-2 rounded-lg"><User className="w-5 h-5 text-indigo-400" /></div>
              Student Profile
            </h2>
            <select 
              className="w-full bg-gray-950 border border-gray-800 text-white font-bold rounded-xl px-4 py-4 outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none shadow-inner"
              onChange={handleStudentChange}
              value={activeStudent?._id || ""}
            >
              <option value="">Select a student...</option>
              {students.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>

            {activeStudent && (
              <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col gap-5">
                <div className="flex items-center justify-between bg-gray-950 p-4 rounded-xl border border-gray-800/50">
                  <span className="text-gray-400 font-bold">Points Balance</span>
                  <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500">
                    {activeStudent.pointsBalance?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4">
                  <span className="text-gray-500 font-medium">Lifetime Points</span>
                  <span className="text-xl font-bold text-gray-300">{activeStudent.lifetimePoints?.toLocaleString() || 0}</span>
                </div>

                {settings && (
                  <div className="flex flex-col gap-2 pt-4 border-t border-gray-800 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-bold flex items-center gap-2">
                        <Package className="w-4 h-4 text-purple-400" />
                        {settings.bundleItemName || "🍫 Chocolate"}
                      </span>
                      <span className="text-2xl font-black text-purple-400">
                        x{Math.floor((activeStudent.lifetimePoints || 0) / (settings.bundleLimit || 1000))}
                      </span>
                    </div>
                    <div className="w-full bg-gray-950 rounded-full h-3 border border-gray-800 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-fuchsia-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(0, (((activeStudent.lifetimePoints || 0) % (settings.bundleLimit || 1000)) / (settings.bundleLimit || 1000)) * 100))}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-right text-gray-500 font-bold">
                      {(activeStudent.lifetimePoints || 0) % (settings.bundleLimit || 1000)} / {settings.bundleLimit || 1000} to next
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 w-full mt-2">
                  <button 
                    onClick={handleAddBonus}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold py-3 rounded-xl transition-colors border border-indigo-500/20"
                  >
                    <PlusCircle className="w-5 h-5" /> Add Points
                  </button>
                  <button 
                    onClick={handleDeductPoints}
                    className="flex-1 flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold py-3 rounded-xl transition-colors border border-rose-500/20"
                  >
                    <MinusCircle className="w-5 h-5" /> Deduct
                  </button>
                </div>
              </div>
            )}
          </div>

          {activeSession && (
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] shadow-lg flex-1">
              <h2 className="text-xl font-black text-gray-200 mb-6 flex items-center gap-3 border-b border-gray-800 pb-4">
                <div className="bg-rose-500/20 p-2 rounded-lg"><Activity className="w-5 h-5 text-rose-400" /></div>
                Live Session
              </h2>
              
              <div className="flex flex-col gap-4">
                <div className="bg-gray-950 p-5 rounded-2xl border border-gray-800/50 shadow-inner">
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">Progress</p>
                  <p className="text-4xl font-black text-white">
                    Q: {activeSession.totalQuestions} <span className="text-2xl text-gray-600 font-bold">/ {settings?.badgeThresholds.finaleQuestionCount || 5}</span>
                  </p>
                </div>

                <div className="bg-gray-950 p-5 rounded-2xl border border-gray-800/50 shadow-inner">
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">Avg. Speed</p>
                  <p className="text-4xl font-black text-indigo-400 flex items-center gap-2">
                    <Zap className="w-7 h-7 text-indigo-500" />
                    {activeSession.averageSpeed.toFixed(1)}s
                  </p>
                </div>
                {activeSession.isCompleted && (
                <div className="mt-8 bg-amber-500/10 border border-amber-500/30 p-6 rounded-2xl text-center">
                  <h3 className="text-xl font-bold text-amber-400 mb-2">Quiz Completed</h3>
                  <p className="text-amber-200">Final Score: <span className="font-black text-white">{activeSession.finalScore} pts</span></p>
                </div>
              )}
              </div>
            </div>
          )}

          {activeSession && questionLogs.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] shadow-lg flex-1 mt-8 md:mt-0 xl:mt-8 md:col-span-1 xl:col-span-1">
              <h2 className="text-xl font-black text-gray-200 mb-6 flex items-center gap-3 border-b border-gray-800 pb-4">
                <div className="bg-indigo-500/20 p-2 rounded-lg"><ListChecks className="w-5 h-5 text-indigo-400" /></div>
                Question Results
              </h2>
              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
                            <p className="text-xs text-gray-500">{log.responseTime}s response</p>
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
        </aside>

        {/* Main Interaction Area */}
        <section className="flex-1 flex items-center justify-center bg-gray-900 border border-gray-800 rounded-[2rem] shadow-lg p-6 relative overflow-hidden min-h-[600px] xl:min-h-[700px]">
          {!activeStudent ? (
            <div className="text-center text-gray-500 flex flex-col items-center max-w-sm">
              <div className="w-32 h-32 bg-gray-800/50 rounded-full flex items-center justify-center mb-6 border border-gray-700/50">
                <User className="w-16 h-16 text-gray-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-300 mb-2">Teacher Dashboard</h3>
              <p className="text-lg font-medium text-gray-500">Select a student from the sidebar to begin the live class quiz session.</p>
            </div>
          ) : (
            <Stopwatch 
              key={resetTimerKey}
              isRunning={isRunning} 
              setIsRunning={handleTimerRunningState} 
              onScore={handleScore}
              onCancel={handleCancel}
              studentStopTime={activeSession?.stoppedByStudent ? activeSession.studentStopTime : null}
            />
          )}
        </section>
      </main>

      {showRating && (
        <StarRatingAnimation 
          stars={showRating.stars}
          compliment={showRating.compliment}
          points={showRating.points}
          onComplete={handleRatingComplete}
        />
      )}

      {showWrong && (
        <WrongAnswerAnimation 
          onComplete={() => {
            setShowWrong(false);
            handleRatingComplete();
          }}
        />
      )}

      {showFinale && settings && (
        <MysteryGiftModal
          badgeType={showFinale}
          gifts={settings.mysteryGifts}
          onClose={handleFinaleClose}
        />
      )}

      {showBundleAnim && settings && (
        <BundleAnimation itemName={settings.bundleItemName || "🍫 Chocolate"} />
      )}
    </div>
  );
}
