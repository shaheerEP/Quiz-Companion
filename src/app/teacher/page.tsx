"use client";

import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import Stopwatch from "@/components/Stopwatch";
import StarRatingAnimation from "@/components/StarRatingAnimation";
import MysteryGiftModal from "@/components/MysteryGiftModal";
import BundleAnimation from "@/components/BundleAnimation";
import WrongAnswerAnimation from "@/components/WrongAnswerAnimation";
import ManualPointsAnimation from "@/components/ManualPointsAnimation";
import { User, Activity, Zap, PlusCircle, MinusCircle, Package, ListChecks, History, Trophy, Globe } from "lucide-react";

export default function TeacherDashboard() {
  const [settings, setSettings] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [activeStudent, setActiveStudent] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [showRating, setShowRating] = useState<{ stars: number, compliment: string, points: number } | null>(null);
  const [showWrong, setShowWrong] = useState(false);
  const [showFinale, setShowFinale] = useState<"Master Mind Champion 🏆" | "Super Solver 🥇" | null>(null);
  const [manualAnim, setManualAnim] = useState<{ type: 'bonus' | 'deduction', amount: number } | null>(null);
  const [prevBundles, setPrevBundles] = useState<number | null>(null);
  const [showBundleAnim, setShowBundleAnim] = useState(false);
  const [questionLogs, setQuestionLogs] = useState<any[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [resetTimerKey, setResetTimerKey] = useState(0);

  useEffect(() => {
    if (activeSession) {
      fetch(`/api/sessions/${activeSession._id}/questions`)
        .then(res => res.json())
        .then(setQuestionLogs);
    } else {
      setQuestionLogs([]);
    }
  }, [activeSession?._id, activeSession?.totalQuestions, activeSession?.finalScore]);

  const selectStudent = async (studentId: string, currentStudents: any[]) => {
    try {
      if (!studentId) {
        setActiveStudent(null);
        setActiveSession(null);
        if (typeof window !== 'undefined') window.localStorage.removeItem("lastSelectedStudentId");
        return;
      }

      const student = currentStudents.find(s => String(s._id) === String(studentId));
      if (!student) {
        if (typeof window !== 'undefined') window.localStorage.removeItem("lastSelectedStudentId");
        return;
      }
      
      setActiveStudent(student);
      if (typeof window !== 'undefined') window.localStorage.setItem("lastSelectedStudentId", String(studentId));

      const res = await fetch(`/api/sessions?studentId=${studentId}`);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const sessions = await res.json();

      const historyRes = await fetch(`/api/history?studentId=${studentId}`);
      if (!historyRes.ok) throw new Error("Failed to fetch history");
      setHistoryItems(await historyRes.json());

      if (sessions && sessions.length > 0 && !sessions[0].isCompleted) {
        setActiveSession(sessions[0]);
      } else {
        const newSessionRes = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: student._id })
        });
        if (!newSessionRes.ok) throw new Error("Failed to create session");
        const newSession = await newSessionRes.json();
        setActiveSession(newSession);
      }
    } catch (error) {
      console.error("Error in selectStudent:", error);
    }
  };

  useEffect(() => {
    fetch("/api/settings").then(res => res.json()).then(setSettings).catch(console.error);
    fetch("/api/students").then(res => res.json()).then(data => {
      setStudents(data);
      if (typeof window !== 'undefined') {
        const lastId = window.localStorage.getItem("lastSelectedStudentId");
        if (lastId && data.find((s: any) => String(s._id) === String(lastId))) {
          selectStudent(lastId, data);
        }
      }
    }).catch(console.error);
  }, []);

  const handleToggleClassTime = async () => {
    if (!activeStudent) return;
    const newIsClassTime = !activeStudent.isClassTime;

    await fetch("/api/students", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeStudent._id, isClassTime: newIsClassTime })
    });

    setActiveStudent({ ...activeStudent, isClassTime: newIsClassTime });
    setStudents(students.map(s => s._id === activeStudent._id ? { ...s, isClassTime: newIsClassTime } : s));
  };

  const handleStudentChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    selectStudent(e.target.value, students);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && activeSession && activeStudent) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/sessions?studentId=${activeStudent._id}`);
          const sessions = await res.json();

          const active = sessions.find((s: any) => !s.isCompleted);

          const historyRes = await fetch(`/api/history?studentId=${activeStudent._id}`);
          setHistoryItems(await historyRes.json());

          if (active) {
            if (active.stoppedByStudent && active.studentStopTime !== null) {
              setActiveSession(active);
            }
          } else {
            setActiveSession(null);
          }
        } catch (e) { }
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
    const newDaily = (activeStudent.dailyPoints || 0) + Number(amount);
    setActiveStudent({ ...activeStudent, pointsBalance: newPoints, lifetimePoints: newLifetime, dailyPoints: newDaily });

    setManualAnim({ type: 'bonus', amount: Number(amount) });

    fetch(`/api/sessions/${activeSession._id}/questions`)
      .then(res => res.json())
      .then(setQuestionLogs);

    fetch(`/api/history?studentId=${activeStudent._id}`)
      .then(res => res.json())
      .then(setHistoryItems);
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
    const newDaily = Math.max(0, (activeStudent.dailyPoints || 0) - Number(amount));
    setActiveStudent({ ...activeStudent, pointsBalance: newPoints, lifetimePoints: newLifetime, dailyPoints: newDaily });

    setManualAnim({ type: 'deduction', amount: Number(amount) });

    fetch(`/api/sessions/${activeSession._id}/questions`)
      .then(res => res.json())
      .then(setQuestionLogs);

    fetch(`/api/history?studentId=${activeStudent._id}`)
      .then(res => res.json())
      .then(setHistoryItems);
  };

  const handleHistoryManualLog = async (dayString: string, logType: 'bonus' | 'deduction') => {
    const amount = prompt(`Enter points to ${logType === 'bonus' ? 'add' : 'deduct'} for ${dayString}:`);
    if (!amount || isNaN(Number(amount)) || !activeSession) return;
    
    let targetDate = new Date();
    if (dayString === "Yesterday") {
      targetDate.setDate(targetDate.getDate() - 1);
    } else if (dayString !== "Today") {
      targetDate = new Date(dayString);
    }
    
    await fetch(`/api/sessions/${activeSession._id}/manual-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logType, points: Number(amount), date: targetDate.toISOString() })
    });
    
    const actualPoints = logType === 'bonus' ? Number(amount) : -Number(amount);
    
    const newDaily = dayString === "Today" ? Math.max(0, (activeStudent.dailyPoints || 0) + actualPoints) : activeStudent.dailyPoints;
    
    setActiveStudent({ 
      ...activeStudent, 
      pointsBalance: Math.max(0, activeStudent.pointsBalance + actualPoints), 
      lifetimePoints: Math.max(0, activeStudent.lifetimePoints + actualPoints), 
      dailyPoints: newDaily 
    });

    setManualAnim({ type: logType, amount: Number(amount) });

    fetch(`/api/sessions/${activeSession._id}/questions`)
      .then(res => res.json())
      .then(setQuestionLogs);

    fetch(`/api/history?studentId=${activeStudent._id}`)
      .then(res => res.json())
      .then(setHistoryItems);
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

      const newStudentStopTime = teacherStopTime !== undefined ? teacherStopTime : (run ? null : activeSession.studentStopTime);
      const newStoppedByStudent = teacherStopTime !== undefined ? false : (run ? false : activeSession.stoppedByStudent);

      setActiveSession({
        ...activeSession,
        isTimerRunning: run,
        stoppedByStudent: newStoppedByStudent,
        studentStopTime: newStudentStopTime,
        lastQuestionResult: run ? null : activeSession.lastQuestionResult
      });
    }
  };

  const handleCancel = async () => {
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
      matchedTier = sortedTiers[sortedTiers.length - 1];
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
      pointsBalance: prev.pointsBalance + actualPoints,
      dailyPoints: (prev.dailyPoints || 0) + actualPoints
    }));

    if (!isCorrect) {
      setShowWrong(true);
    }

    const historyRes = await fetch(`/api/history?studentId=${activeStudent._id}`);
    setHistoryItems(await historyRes.json());
  };

  const handleRatingComplete = () => {
    setShowRating(null);
    setResetTimerKey(prev => prev + 1);
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

  const prevActiveStudentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeStudent || !settings) {
      prevActiveStudentIdRef.current = null;
      setPrevBundles(null);
      return;
    }

    const bundles = Math.floor((activeStudent.lifetimePoints || 0) / (settings.bundleLimit || 1000));

    if (prevActiveStudentIdRef.current !== activeStudent._id) {
      setPrevBundles(bundles);
      prevActiveStudentIdRef.current = activeStudent._id;
    } else if (prevBundles !== null && bundles > prevBundles) {
      setShowBundleAnim(true);
      setTimeout(() => setShowBundleAnim(false), 4000);
      setPrevBundles(bundles);
    } else if (prevBundles !== bundles) {
      setPrevBundles(bundles);
    }
  }, [activeStudent?._id, activeStudent?.lifetimePoints, settings?.bundleLimit, prevBundles]);

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

  const renderDailyHistory = () => (
    <section className="w-full bg-gray-900 border border-gray-800 rounded-[2rem] shadow-lg p-6 xl:p-8">
      <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
        <History className="w-6 h-6 text-indigo-400" />
        Daily History
      </h3>
      <div className="flex flex-col gap-4 max-h-96 xl:max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {Object.keys(groupedHistory).map(day => {
          const dailyTotal = groupedHistory[day].reduce((total: number, item: any) => total + (item.type === 'deduction' ? -item.points : item.points), 0);
          return (
          <div key={day} className="flex flex-col gap-2">
            <div className="flex justify-between items-center pl-2 border-l-2 border-indigo-500/50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{day}</p>
              <div className="flex gap-2 items-center">
                <p className={`text-xs font-bold mr-2 ${dailyTotal > 0 ? 'text-emerald-400' : dailyTotal < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                  {dailyTotal > 0 ? '+' : ''}{dailyTotal} pts
                </p>
                <button title="Add points for this day" onClick={() => handleHistoryManualLog(day, 'bonus')} className="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center hover:bg-indigo-500/40 transition-colors"><PlusCircle className="w-4 h-4" /></button>
                <button title="Deduct points for this day" onClick={() => handleHistoryManualLog(day, 'deduction')} className="w-6 h-6 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center hover:bg-rose-500/40 transition-colors"><MinusCircle className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {groupedHistory[day].map((item: any) => (
                <div key={item._id} className="flex justify-between items-center bg-gray-950 p-4 rounded-2xl border border-gray-800/50 hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    {item.type === 'quiz' && <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400"><Trophy className="w-5 h-5" /></div>}
                    {item.type === 'bonus' && <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-indigo-500/20 text-indigo-400"><PlusCircle className="w-5 h-5" /></div>}
                    {item.type === 'deduction' && <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-rose-500/20 text-rose-400"><MinusCircle className="w-5 h-5" /></div>}
                    <div>
                      <p className="font-bold text-gray-200 text-base">{item.title}</p>
                      {item.details && <p className="text-xs text-gray-500 font-medium">{item.details}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
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
    </section>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Navbar />

      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 p-4 md:p-6 gap-4 md:gap-6 max-w-[1600px] mx-auto w-full pb-28 md:pb-6">
        <aside className={`w-full md:col-span-1 lg:col-span-4 xl:col-span-3 flex flex-col gap-4 md:gap-6 shrink-0 h-fit ${activeStudent ? 'order-2' : 'order-1'} md:order-1`}>


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
                <div className="flex items-center justify-between px-4 mt-2">
                  <span className="text-gray-500 font-medium">Lifetime Points</span>
                  <span className="text-xl font-bold text-gray-300">{activeStudent.lifetimePoints?.toLocaleString() || 0}</span>
                </div>

                <div className="flex items-center justify-between bg-gray-950 p-4 rounded-xl border border-gray-800/50 mt-2">
                  <span className="text-gray-400 font-bold">Class Time (Read-Only)</span>
                  <button
                    onClick={handleToggleClassTime}
                    className={`w-14 h-8 rounded-full flex items-center transition-colors p-1 ${activeStudent.isClassTime ? 'bg-emerald-500' : 'bg-gray-700'}`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full transition-transform shadow-md ${activeStudent.isClassTime ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>



                <a
                  href={`/world/${activeStudent._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-bold py-3 rounded-xl border border-blue-500/30 transition-all flex justify-center items-center gap-2 mt-2"
                >
                  <Globe className="w-5 h-5" /> Explore Built World
                </a>

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

                {activeSession && (
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={handleAddBonus}
                      className="flex-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 font-bold py-2.5 px-2 text-sm rounded-xl border border-indigo-500/30 transition-all flex justify-center items-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4" /> Add Points
                    </button>
                    <button
                      onClick={handleDeductPoints}
                      className="flex-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold py-2.5 px-2 text-sm rounded-xl border border-rose-500/30 transition-all flex justify-center items-center gap-1.5"
                    >
                      <MinusCircle className="w-4 h-4" /> Deduct
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Main Interaction Area */}
        <div className={`w-full md:col-span-1 lg:col-span-8 xl:col-span-6 flex flex-col gap-6 ${activeStudent ? 'order-1' : 'order-2'} md:order-2`}>
          <section className="w-full flex flex-col items-center justify-center bg-gray-900 border border-gray-800 rounded-[2rem] shadow-lg p-8 relative overflow-hidden min-h-[400px] md:min-h-[500px]">
            {!activeStudent ? (
              <div className="text-center text-gray-500 flex flex-col items-center max-w-sm">
                <div className="w-32 h-32 bg-gray-800/50 rounded-full flex items-center justify-center mb-6 border border-gray-700/50">
                  <User className="w-16 h-16 text-gray-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-300 mb-2">Teacher Dashboard</h3>
                <p className="text-lg font-medium text-gray-500">Select a student from the sidebar to begin the live class quiz session.</p>
              </div>
            ) : (
              <div className="w-full flex flex-col h-full items-center justify-center gap-8">
                <div className="w-full flex-col hidden md:flex items-start">
                  <div className="flex justify-between items-center w-full mb-4">
                    <p className="text-indigo-400 font-bold uppercase tracking-widest text-sm">Active Student</p>
                    <div className="flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20 shadow-inner">
                      <Zap className="w-4 h-4 text-indigo-400" />
                      <span className="text-indigo-400 font-bold">Today's Points: </span>
                      <span className="text-xl font-black text-indigo-400">{activeStudent.dailyPoints?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-[6px] border-indigo-500/50 bg-gray-800 flex items-center justify-center shadow-2xl relative z-10">
                        {activeStudent.profileImageUrl ? (
                          <img src={activeStudent.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-16 h-16 md:w-20 md:h-20 text-gray-500" />
                        )}
                      </div>
                      
                      {/* 5 Star Daily Fill */}
                      <div className="relative inline-block text-3xl md:text-4xl">
                        <div className="flex text-gray-700">★★★★★</div>
                        <div className="flex text-yellow-400 absolute top-0 left-0 overflow-hidden whitespace-nowrap drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" style={{ width: `${Math.min(100, ((activeStudent.dailyPoints || 0) / 1000) * 100)}%` }}>
                          ★★★★★
                        </div>
                      </div>
                    </div>
                    <h1 className="text-5xl lg:text-8xl font-black text-white tracking-tight capitalize drop-shadow-lg text-center md:text-left mt-6 md:mt-0">{activeStudent.name}</h1>
                  </div>
                </div>
                
                <div className="w-full md:hidden flex flex-col items-center">
                  <div className="flex flex-col items-center gap-2 mb-4">
                    <p className="text-indigo-400 font-bold uppercase tracking-widest text-sm">Active Student</p>
                    <div className="flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20 shadow-inner">
                      <Zap className="w-4 h-4 text-indigo-400" />
                      <span className="text-indigo-400 font-bold">Today's Points: </span>
                      <span className="text-xl font-black text-indigo-400">{activeStudent.dailyPoints?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-6 mt-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-[4px] border-indigo-500/50 bg-gray-800 flex items-center justify-center shadow-xl relative z-10">
                        {activeStudent.profileImageUrl ? (
                          <img src={activeStudent.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-16 h-16 text-gray-500" />
                        )}
                      </div>
                      
                      {/* 5 Star Daily Fill (Mobile) */}
                      <div className="relative inline-block text-4xl mt-2">
                        <div className="flex text-gray-700">★★★★★</div>
                        <div className="flex text-yellow-400 absolute top-0 left-0 overflow-hidden whitespace-nowrap drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" style={{ width: `${Math.min(100, ((activeStudent.dailyPoints || 0) / 1000) * 100)}%` }}>
                          ★★★★★
                        </div>
                      </div>
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tight capitalize drop-shadow-lg">{activeStudent.name}</h1>
                  </div>
                </div>
                <div className="flex items-center justify-center w-full mt-4">
                <Stopwatch
                  key={resetTimerKey}
                  isRunning={isRunning}
                  setIsRunning={handleTimerRunningState}
                  onScore={handleScore}
                  onCancel={handleCancel}
                  studentStopTime={activeSession?.stoppedByStudent ? activeSession.studentStopTime : null}
                />
                </div>
              </div>
            )}
          </section>
          
          <div className="hidden md:block w-full">
            {activeStudent && Object.keys(groupedHistory).length > 0 && renderDailyHistory()}
          </div>
        </div>

        {/* Daily History for Mobile (moves outside middle column) */}
        <div className="block md:hidden w-full order-3">
          {activeStudent && Object.keys(groupedHistory).length > 0 && renderDailyHistory()}
        </div>
        {/* Right Sidebar */}
        {activeSession && (
          <aside className="w-full md:col-span-2 lg:col-span-12 xl:col-span-3 flex flex-col gap-4 md:gap-6 shrink-0 h-fit order-3">
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] shadow-lg">
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


          </aside>
        )}
      </main>

      {/* Mobile Action Bar */}
      {activeSession && activeStudent && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-gray-950 border-t border-gray-800 z-50 flex gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <button
            onClick={handleAddBonus}
            className="flex-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 font-bold py-4 rounded-xl border border-indigo-500/30 transition-all flex justify-center items-center gap-2"
          >
            <PlusCircle className="w-6 h-6" /> Add Points
          </button>
          <button
            onClick={handleDeductPoints}
            className="flex-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold py-4 rounded-xl border border-rose-500/30 transition-all flex justify-center items-center gap-2"
          >
            <MinusCircle className="w-6 h-6" /> Deduct
          </button>
        </div>
      )}

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
          onClose={handleFinaleClose}
        />
      )}

      {showBundleAnim && settings && (
        <BundleAnimation itemName={settings.bundleItemName || "🍫 Chocolate"} />
      )}
    </div>
  );
}
