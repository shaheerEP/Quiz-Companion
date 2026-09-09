"use client";

import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import Stopwatch from "@/components/Stopwatch";
import CountdownTimer from "@/components/CountdownTimer";
import StarRatingAnimation from "@/components/StarRatingAnimation";
import MysteryGiftModal from "@/components/MysteryGiftModal";
import BundleAnimation from "@/components/BundleAnimation";
import WrongAnswerAnimation from "@/components/WrongAnswerAnimation";
import ManualPointsAnimation from "@/components/ManualPointsAnimation";
import { User, Activity, Zap, PlusCircle, MinusCircle, Package, ListChecks, History, Trophy, Globe, Star, Timer, BookOpen } from "lucide-react";
import Link from "next/link";
import MannersHistoryModal from "@/components/MannersHistoryModal";

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
  const dailyLimitRef = useRef(5);
  const weeklyLimitRef = useRef(4);
  const [resetTimerKey, setResetTimerKey] = useState(0);
  const [timerTab, setTimerTab] = useState<'quiz' | 'countdown'>('quiz');
  const [mannersLogs, setMannersLogs] = useState<any[]>([]);
  const [showMannersHistory, setShowMannersHistory] = useState(false);

  useEffect(() => {
    if (activeSession) {
      fetch(`/api/sessions/${activeSession._id}/questions`)
        .then(res => res.json())
        .then(setQuestionLogs);
    } else {
      setQuestionLogs([]);
    }
  }, [activeSession?._id, activeSession?.totalQuestions, activeSession?.finalScore]);

  const fetchStudentHistory = async (
    studentId: string,
    dLimit = dailyLimitRef.current,
    wLimit = weeklyLimitRef.current
  ) => {
    try {
      const historyRes = await fetch(
        `/api/history?studentId=${studentId}&dailyLimit=${dLimit}&weeklyLimit=${wLimit}`
      );
      if (!historyRes.ok) return;
      const histData = await historyRes.json();
      if (histData.stats) setHistoryStats(histData.stats);
      if (histData.daily) setDailyHistory(histData.daily);
      setHasMoreDaily(Boolean(histData.hasMoreDaily));
      setTotalDailyDays(histData.totalDailyDays || 0);
      if (histData.weekly) setWeeklyHistory(histData.weekly);
      setHasMoreWeekly(Boolean(histData.hasMoreWeekly));
      setTotalWeeks(histData.totalWeeks || 0);
      if (histData.items) setHistoryItems(histData.items);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const handleShowMoreDaily = async () => {
    if (loadingMoreDaily || !hasMoreDaily || !activeStudent) return;
    setLoadingMoreDaily(true);
    const nextLimit = dailyDaysLimit + 5;
    dailyLimitRef.current = nextLimit;
    setDailyDaysLimit(nextLimit);
    await fetchStudentHistory(activeStudent._id, nextLimit, weeklyLimitRef.current);
    setLoadingMoreDaily(false);
  };

  const handleShowMoreWeekly = async () => {
    if (loadingMoreWeekly || !hasMoreWeekly || !activeStudent) return;
    setLoadingMoreWeekly(true);
    const nextLimit = weeklyWeeksLimit + 4;
    weeklyLimitRef.current = nextLimit;
    setWeeklyWeeksLimit(nextLimit);
    await fetchStudentHistory(activeStudent._id, dailyLimitRef.current, nextLimit);
    setLoadingMoreWeekly(false);
  };

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

      fetchStudentHistory(studentId);

      const mannersRes = await fetch(`/api/manners?studentId=${studentId}`);
      if (mannersRes.ok) setMannersLogs(await mannersRes.json());

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

          fetchStudentHistory(activeStudent._id);

          const mannersRes = await fetch(`/api/manners?studentId=${activeStudent._id}`);
          if (mannersRes.ok) setMannersLogs(await mannersRes.json());

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

  const getOrCreateSession = async () => {
    if (activeSession) return activeSession;
    if (!activeStudent) return null;
    const res = await fetch(`/api/sessions?studentId=${activeStudent._id}`);
    if (!res.ok) return null;
    const sessions = await res.json();
    const open = sessions.find((s: any) => !s.isCompleted);
    if (open) { setActiveSession(open); return open; }
    const newRes = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: activeStudent._id })
    });
    if (!newRes.ok) return null;
    const newSession = await newRes.json();
    setActiveSession(newSession);
    return newSession;
  };

  const handleAddBonus = async () => {
    const amount = prompt("Enter bonus points to add:");
    if (!amount || isNaN(Number(amount)) || !activeStudent) return;

    const session = await getOrCreateSession();
    if (!session) return;

    await fetch(`/api/sessions/${session._id}/manual-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logType: 'bonus', points: Number(amount) })
    });

    const newPoints = activeStudent.pointsBalance + Number(amount);
    const newLifetime = activeStudent.lifetimePoints + Number(amount);
    const newDaily = (activeStudent.dailyPoints || 0) + Number(amount);
    setActiveStudent({ ...activeStudent, pointsBalance: newPoints, lifetimePoints: newLifetime, dailyPoints: newDaily });

    setManualAnim({ type: 'bonus', amount: Number(amount) });

    fetch(`/api/sessions/${session._id}/questions`)
      .then(res => res.json())
      .then(setQuestionLogs);

    fetchStudentHistory(activeStudent._id);
  };

  const handleDeductPoints = async () => {
    const amount = prompt("Enter points to deduct:");
    if (!amount || isNaN(Number(amount)) || !activeStudent) return;

    const session = await getOrCreateSession();
    if (!session) return;

    await fetch(`/api/sessions/${session._id}/manual-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logType: 'deduction', points: Number(amount) })
    });

    const newPoints = Math.max(0, activeStudent.pointsBalance - Number(amount));
    const newLifetime = Math.max(0, activeStudent.lifetimePoints - Number(amount));
    const newDaily = Math.max(0, (activeStudent.dailyPoints || 0) - Number(amount));
    setActiveStudent({ ...activeStudent, pointsBalance: newPoints, lifetimePoints: newLifetime, dailyPoints: newDaily });

    setManualAnim({ type: 'deduction', amount: Number(amount) });

    fetch(`/api/sessions/${session._id}/questions`)
      .then(res => res.json())
      .then(setQuestionLogs);

    fetchStudentHistory(activeStudent._id);
  };

  const handleHistoryManualLog = async (dayString: string, logType: 'bonus' | 'deduction') => {
    const amount = prompt(`Enter points to ${logType === 'bonus' ? 'add' : 'deduct'} for ${dayString}:`);
    if (!amount || isNaN(Number(amount)) || !activeStudent) return;

    const session = await getOrCreateSession();
    if (!session) return;

    let targetDate = new Date();
    if (dayString === "Yesterday") {
      targetDate.setDate(targetDate.getDate() - 1);
    } else if (dayString !== "Today") {
      targetDate = new Date(dayString);
    }

    await fetch(`/api/sessions/${session._id}/manual-log`, {
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

    fetch(`/api/sessions/${session._id}/questions`)
      .then(res => res.json())
      .then(setQuestionLogs);

    fetchStudentHistory(activeStudent._id);
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
      const sortedTiers = [...(settings.ratingTiers || [])].sort((a: any, b: any) => a.maxSeconds - b.maxSeconds);
      if (sortedTiers.length > 0) {
        matchedTier = sortedTiers[sortedTiers.length - 1];
        for (const tier of sortedTiers) {
          if (seconds <= tier.maxSeconds) {
            matchedTier = tier;
            break;
          }
        }
      }
    }

    if (isCorrect) {
      setShowRating({
        stars: matchedTier.stars || 0,
        compliment: matchedTier.name || "Correct!",
        points: matchedTier.points || 0
      });
    }

    try {
      const res = await fetch(`/api/sessions/${activeSession._id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionNumber: (activeSession.totalQuestions || 0) + 1,
          responseTime: seconds,
          starsAwarded: matchedTier.stars || 0,
          points: matchedTier.points || 0,
          isCorrect,
          compliment: matchedTier.name || "Correct!"
        })
      });
      if (!res.ok) {
        console.error("Failed to post question score", await res.text());
      }
    } catch (e) {
      console.error("Error posting score", e);
    }

    const actualPoints = isCorrect ? (matchedTier.points || 0) : 0;

    setActiveSession((prev: any) => {
      const prevTotal = prev.totalQuestions || 0;
      const prevAvg = prev.averageSpeed || 0;
      const newTotal = prevTotal + 1;
      return {
        ...prev,
        totalQuestions: newTotal,
        finalScore: (prev.finalScore || 0) + actualPoints,
        averageSpeed: ((prevAvg * prevTotal) + seconds) / newTotal,
        isTimerRunning: false,
        stoppedByStudent: false,
        studentStopTime: null
      };
    });
    
    setActiveStudent((prev: any) => ({
      ...prev,
      lifetimePoints: (prev.lifetimePoints || 0) + actualPoints,
      pointsBalance: (prev.pointsBalance || 0) + actualPoints,
      dailyPoints: (prev.dailyPoints || 0) + actualPoints
    }));

    if (!isCorrect) {
      setShowWrong(true);
    }

    fetchStudentHistory(activeStudent._id);
  };

  const handleRatingComplete = () => {
    setShowRating(null);
    setResetTimerKey(prev => prev + 1);
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

    if (activeStudent.rewardSystem === 'tiered') {
      prevActiveStudentIdRef.current = activeStudent._id;
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
  }, [activeStudent?._id, activeStudent?.lifetimePoints, activeStudent?.rewardSystem, settings?.bundleLimit, prevBundles]);

  const renderDailyHistory = () => (
    <section className="w-full bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950/90 border border-white/10 rounded-[2.5rem] shadow-xl p-6 xl:p-8 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Score History</h3>
            <p className="text-[11px] text-slate-400">Past quiz rounds and rewards</p>
          </div>
        </div>

        {/* Segmented Tab Controls */}
        <div className="inline-flex p-1 bg-black/40 border border-white/10 rounded-2xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveHistoryTab("daily")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeHistoryTab === "daily"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            📅 Daily ({totalDailyDays})
          </button>
          <button
            type="button"
            onClick={() => setActiveHistoryTab("weekly")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeHistoryTab === "weekly"
                ? "bg-fuchsia-600 text-white shadow-md shadow-fuchsia-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🗓️ Weekly ({totalWeeks})
          </button>
        </div>
      </div>

      {activeHistoryTab === "daily" ? (
        <div className="flex flex-col gap-4 max-h-96 xl:max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {dailyHistory.length === 0 ? (
            <p className="text-slate-500 italic text-sm text-center py-6">No daily history recorded yet.</p>
          ) : (
            dailyHistory.map((dayGroup) => (
              <div key={dayGroup.dayString} className="flex flex-col gap-2">
                <div className="flex justify-between items-center pl-2.5 border-l-2 border-indigo-500/60">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">{dayGroup.dayString}</p>
                  <div className="flex gap-2 items-center">
                    <div className="relative inline-block text-sm mr-2" title={`${Math.min(100, Math.max(0, (dayGroup.totalPoints / 1000) * 100)).toFixed(0)}% of daily goal`}>
                      <div className="flex text-gray-700">★★★★★</div>
                      <div className="flex text-yellow-400 absolute top-0 left-0 overflow-hidden whitespace-nowrap drop-shadow-[0_0_6px_rgba(250,204,21,0.85)]" style={{ width: `${Math.min(100, Math.max(0, (dayGroup.totalPoints / 1000) * 100))}%` }}>
                        ★★★★★
                      </div>
                    </div>
                    <p className={`text-xs font-black mr-1 ${dayGroup.totalPoints > 0 ? 'text-emerald-400' : dayGroup.totalPoints < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {dayGroup.totalPoints > 0 ? '+' : ''}{dayGroup.totalPoints} pts
                    </p>
                    <button title="Add points for this day" onClick={() => handleHistoryManualLog(dayGroup.dayString, 'bonus')} className="w-6 h-6 bg-indigo-500/20 text-indigo-400 hover:text-white hover:bg-indigo-500 rounded-lg flex items-center justify-center transition-colors"><PlusCircle className="w-3.5 h-3.5" /></button>
                    <button title="Deduct points for this day" onClick={() => handleHistoryManualLog(dayGroup.dayString, 'deduction')} className="w-6 h-6 bg-rose-500/20 text-rose-400 hover:text-white hover:bg-rose-500 rounded-lg flex items-center justify-center transition-colors"><MinusCircle className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {dayGroup.items?.map((item: any) => (
                    <div key={item._id} className="flex justify-between items-center bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-3.5">
                        {item.type === 'quiz' && <div className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center bg-emerald-500/20 text-emerald-400"><Trophy className="w-4 h-4" /></div>}
                        {item.type === 'bonus' && <div className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center bg-indigo-500/20 text-indigo-400"><PlusCircle className="w-4 h-4" /></div>}
                        {item.type === 'deduction' && <div className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center bg-rose-500/20 text-rose-400"><MinusCircle className="w-4 h-4" /></div>}
                        <div>
                          <p className="font-bold text-white text-sm sm:text-base">{item.title}</p>
                          {item.details && <p className="text-xs text-slate-400 font-medium">{item.details}</p>}
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
                className="px-5 py-2.5 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {loadingMoreDaily ? "Fetching days..." : `Show More Days (${dailyHistory.length} of ${totalDailyDays})`}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Weekly History Tab */
        <div className="flex flex-col gap-3 max-h-96 xl:max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {weeklyHistory.length === 0 ? (
            <p className="text-slate-500 italic text-sm text-center py-6">No weekly history recorded yet.</p>
          ) : (
            weeklyHistory.map((week: any) => (
              <div
                key={week.weekKey}
                className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 flex flex-col gap-2 hover:border-fuchsia-500/30 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-fuchsia-500/20 text-fuchsia-300 flex items-center justify-center text-xs font-black shrink-0">
                      📆
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{week.weekLabel}</h4>
                        {week.isBestWeek && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black">
                            ★ Top week
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{week.itemsCount} total events</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    {week.diffPrevWeek !== undefined && (
                      <span
                        className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                          week.diffPrevWeek > 0
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : week.diffPrevWeek < 0
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {week.diffPrevWeek > 0 ? `+${week.diffPrevWeek}` : week.diffPrevWeek} vs prev
                      </span>
                    )}
                    <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-pink-400">
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
                className="px-5 py-2.5 rounded-2xl bg-fuchsia-600/20 hover:bg-fuchsia-600/30 text-fuchsia-300 hover:text-white border border-fuchsia-500/30 text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {loadingMoreWeekly ? "Fetching weeks..." : `Show More Weeks (${weeklyHistory.length} of ${totalWeeks})`}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 flex flex-col relative selection:bg-indigo-500 selection:text-white">
      <Navbar />

      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-[140px]" />
      </div>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 p-3 sm:p-5 md:p-6 gap-4 md:gap-6 max-w-[1600px] mx-auto w-full pb-28 md:pb-6 relative z-10">
        {/* Left Sidebar: Student Profile & Gamification Stats */}
        <aside className={`w-full md:col-span-1 lg:col-span-4 xl:col-span-3 flex flex-col gap-4 md:gap-6 shrink-0 h-fit ${activeStudent ? 'order-2' : 'order-1'} md:order-1`}>
          <div className="bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-indigo-950/40 border border-white/10 p-5 sm:p-6 rounded-[2.5rem] shadow-xl flex flex-col gap-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white tracking-tight">Student Champion</h2>
                  <p className="text-[11px] text-indigo-300 font-semibold">Active Quiz Player</p>
                </div>
              </div>
              {activeStudent && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Live
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Select Challenger
              </label>
              <select
                className="w-full bg-slate-950/90 border border-white/10 text-white font-bold rounded-2xl px-4 py-3.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-inner appearance-none text-sm"
                onChange={handleStudentChange}
                value={activeStudent?._id || ""}
              >
                <option value="">Choose a student...</option>
                {students.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            {activeStudent && (
              <div className="pt-2 flex flex-col gap-4">
                {/* Points Treasure */}
                <div className="flex items-center justify-between bg-gradient-to-r from-emerald-950/40 via-slate-950/70 to-slate-950/70 p-4 rounded-2xl border border-emerald-500/20 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-lg shrink-0">
                      💎
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Points Balance</span>
                      <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-green-300">
                        {activeStudent.pointsBalance?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lifetime Points */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/50 rounded-2xl border border-white/5">
                  <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" /> Lifetime Earned
                  </span>
                  <span className="text-sm font-black text-white">{activeStudent.lifetimePoints?.toLocaleString() || 0} pts</span>
                </div>

                {/* Class Time Toggle */}
                <div className="flex items-center justify-between bg-slate-950/50 p-3.5 rounded-2xl border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <span>📚</span> Class Quiz Mode
                    </span>
                    <span className="text-[10px] text-slate-500">{activeStudent.isClassTime ? "Student restricted" : "Free play active"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleClassTime}
                    className={`w-14 h-8 rounded-full flex items-center transition-colors p-1 ${activeStudent.isClassTime ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full transition-transform shadow-md ${activeStudent.isClassTime ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>

                {/* Game / Revision Links */}
                <a
                  href={`/world/${activeStudent._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all flex justify-center items-center gap-2 text-sm"
                >
                  <Globe className="w-4 h-4" /> Explore Built World 🌍
                </a>

                {activeStudent.revisionEnabled && (
                  <Link
                    href={`/revision?studentId=${activeStudent._id}`}
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold py-3 rounded-2xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 transition-all flex justify-center items-center gap-2 text-sm"
                  >
                    <BookOpen className="w-4 h-4" /> Revision Cards 📖
                  </Link>
                )}

                {/* Today's Manners */}
                {activeStudent.mannersEnabled && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        Today's Manners
                      </span>
                      <button onClick={() => setShowMannersHistory(true)} className="text-[11px] text-amber-400 font-bold hover:underline">History &rarr;</button>
                    </div>
                    <div className="relative inline-block text-3xl text-center py-1">
                      <div className="flex justify-center text-slate-800">★★★★★</div>
                      {(() => {
                        const todayLog = mannersLogs.find(l => new Date(l.date).toDateString() === new Date().toDateString());
                        const pct = todayLog ? todayLog.percentage : 0;
                        return (
                          <div className="flex text-yellow-400 absolute top-0 left-0 right-0 overflow-hidden whitespace-nowrap drop-shadow-[0_0_10px_rgba(250,204,21,0.85)] mx-auto justify-center" style={{ width: `${pct}%`, marginLeft: 'calc(50% - 50px)' }}>
                            ★★★★★
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Unlimited Weekly Progress & Comparisons */}
                <div className="flex flex-col gap-3 pt-3 border-t border-white/10 bg-slate-950/60 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold flex items-center gap-1.5 text-xs">
                      <span>🚀</span> Weekly Progress
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-white/5">
                      Resets Mon
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-300 to-rose-400">
                        {historyStats ? historyStats.thisWeekPoints : (activeStudent.weeklyPoints || 0)}
                      </span>
                      <span className="text-xs font-bold text-slate-400 ml-1.5">pts this week</span>
                    </div>
                    {historyStats?.isNewRecord && (
                      <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black animate-pulse">
                        ★ Top week!
                      </div>
                    )}
                  </div>

                  {/* Comparisons: vs Last Week & vs ★ Top week */}
                  <div className="flex flex-col gap-2 pt-0.5">
                    {/* vs Last Week */}
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">vs. Last Week</span>
                        <span className="text-[10px] text-slate-500">
                          Last: <strong className="text-slate-300">{historyStats?.lastWeekPoints ?? 0} pts</strong>
                        </span>
                      </div>
                      {(() => {
                        const diff = historyStats?.diffLastWeek ?? 0;
                        if (diff > 0) {
                          return (
                            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black">
                              +{diff} pts ↗
                            </span>
                          );
                        } else if (diff < 0) {
                          return (
                            <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-black">
                              {diff} pts ↘
                            </span>
                          );
                        }
                        return (
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-400 text-[11px] font-bold">
                            Equal (0)
                          </span>
                        );
                      })()}
                    </div>

                    {/* vs ★ Top week */}
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          vs. ★ Top week
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Top: <strong className="text-amber-300">{historyStats?.bestWeekPoints ?? 0} pts</strong>
                          {historyStats?.bestWeekLabel && historyStats.bestWeekLabel !== "None" && (
                            <span className="text-[9px] text-slate-500 block">{historyStats.bestWeekLabel}</span>
                          )}
                        </span>
                      </div>
                      {(() => {
                        const diffBest = historyStats?.diffBestWeek ?? 0;
                        if (historyStats?.isNewRecord) {
                          return (
                            <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
                              ★ Top week
                            </span>
                          );
                        } else if (diffBest < 0) {
                          return (
                            <span className="px-2.5 py-0.5 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-bold">
                              {diffBest} pts vs top
                            </span>
                          );
                        }
                        return (
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-400 text-[11px] font-bold">
                            0 pts
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Relative progress towards ★ Top week */}
                  {historyStats && historyStats.bestWeekPoints > 0 && (
                    <div className="flex flex-col gap-1 pt-1">
                      <div className="w-full bg-slate-900 rounded-full h-2 border border-white/5 overflow-hidden relative">
                        <div
                          className="bg-gradient-to-r from-fuchsia-500 to-amber-400 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(3, (historyStats.thisWeekPoints / Math.max(1, historyStats.bestWeekPoints)) * 100))}%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-bold px-0.5">
                        <span>{((historyStats.thisWeekPoints / Math.max(1, historyStats.bestWeekPoints)) * 100).toFixed(0)}% of ★ Top week</span>
                        <span>{historyStats.bestWeekPoints} pts</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Add / Deduct Points */}
                <div className="flex gap-2 w-full pt-1">
                  <button
                    onClick={handleAddBonus}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-3 text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex justify-center items-center gap-1.5 active:scale-95"
                  >
                    <PlusCircle className="w-4 h-4" /> Add Points 🌟
                  </button>
                  <button
                    onClick={handleDeductPoints}
                    className="flex-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold py-3 px-3 text-xs sm:text-sm rounded-2xl border border-rose-500/25 transition-all flex justify-center items-center gap-1.5 active:scale-95"
                  >
                    <MinusCircle className="w-4 h-4" /> Deduct
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Interaction Area: Quiz Arena */}
        <div className={`w-full md:col-span-1 lg:col-span-8 xl:col-span-6 flex flex-col gap-6 ${activeStudent ? 'order-1' : 'order-2'} md:order-2`}>
          <section className="w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900/90 via-indigo-950/30 to-purple-950/20 border border-white/10 rounded-[2.5rem] shadow-2xl p-6 sm:p-8 relative overflow-hidden min-h-[420px] md:min-h-[520px]">
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px] pointer-events-none" />

            {!activeStudent ? (
              <div className="text-center text-slate-400 flex flex-col items-center max-w-md z-10 py-10">
                <div className="w-28 h-28 bg-gradient-to-tr from-indigo-600/30 to-purple-600/30 rounded-3xl flex items-center justify-center mb-6 border border-indigo-500/30 shadow-xl shadow-indigo-500/10">
                  <span className="text-5xl">🎯</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">Quiz Time Arena! 🚀</h3>
                <p className="text-sm sm:text-base font-medium text-slate-400 leading-relaxed">
                  Select a student champion from the left panel to begin today's live quiz round and earn stars!
                </p>
              </div>
            ) : (
              <div className="w-full flex flex-col h-full items-center justify-center gap-6 sm:gap-8 z-10">
                {/* Desktop Student Header */}
                <div className="w-full flex-col hidden md:flex items-start">
                  <div className="flex justify-between items-center w-full mb-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-black uppercase tracking-wider">
                      <span>🌟</span> Active Challenger
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-500/15 px-4 py-2 rounded-2xl border border-emerald-500/30 shadow-inner">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300 font-bold text-sm">Today's Points: </span>
                      <span className="text-xl font-black text-emerald-400">{activeStudent.dailyPoints?.toLocaleString() || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 w-full">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-indigo-400/60 bg-slate-800 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.35)] relative z-10">
                        {activeStudent.profileImageUrl ? (
                          <img src={activeStudent.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-16 h-16 md:w-20 md:h-20 text-slate-400" />
                        )}
                      </div>

                      {/* 5 Star Daily Fill */}
                      <div className="relative inline-block text-3xl md:text-4xl">
                        <div className="flex text-slate-800">★★★★★</div>
                        <div
                          className="flex text-yellow-400 absolute top-0 left-0 overflow-hidden whitespace-nowrap drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]"
                          style={{ width: `${Math.min(100, ((activeStudent.dailyPoints || 0) / 1000) * 100)}%` }}
                        >
                          ★★★★★
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">Ready to score</span>
                      <h1 className="text-5xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-amber-200 tracking-tight capitalize drop-shadow-md">
                        {activeStudent.name}
                      </h1>
                    </div>
                  </div>
                </div>

                {/* Mobile Student Header */}
                <div className="w-full md:hidden flex flex-col items-center">
                  <div className="flex justify-between items-center w-full mb-3 gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold">
                      <span>🌟</span> Challenger
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-500/15 px-3 py-1 rounded-xl border border-emerald-500/30">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300 text-xs font-bold">Today: </span>
                      <span className="text-base font-black text-emerald-400">{activeStudent.dailyPoints?.toLocaleString() || 0}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-indigo-400/60 bg-slate-800 flex items-center justify-center shadow-xl relative z-10">
                      {activeStudent.profileImageUrl ? (
                        <img src={activeStudent.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-14 h-14 text-slate-400" />
                      )}
                    </div>

                    <h1 className="text-4xl font-black text-white tracking-tight capitalize drop-shadow-md text-center">
                      {activeStudent.name}
                    </h1>

                    {/* 5 Star Daily Fill (Mobile) */}
                    <div className="relative inline-block text-3xl">
                      <div className="flex text-slate-800">★★★★★</div>
                      <div
                        className="flex text-yellow-400 absolute top-0 left-0 overflow-hidden whitespace-nowrap drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]"
                        style={{ width: `${Math.min(100, ((activeStudent.dailyPoints || 0) / 1000) * 100)}%` }}
                      >
                        ★★★★★
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timer Controls & Display */}
                <div className="flex flex-col items-center w-full mt-2 gap-4">
                  <div className="flex bg-black/40 rounded-2xl p-1 border border-white/10 shadow-inner">
                    <button
                      onClick={() => setTimerTab('quiz')}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                        timerTab === 'quiz'
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Activity className="w-4 h-4" /> ⚡ Quiz Stopwatch
                    </button>
                    <button
                      onClick={() => setTimerTab('countdown')}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                        timerTab === 'countdown'
                          ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Timer className="w-4 h-4" /> ⏳ Countdown
                    </button>
                  </div>

                  {timerTab === 'quiz' ? (
                    <Stopwatch
                      key={resetTimerKey}
                      isRunning={isRunning}
                      setIsRunning={handleTimerRunningState}
                      onScore={handleScore}
                      onCancel={handleCancel}
                      studentStopTime={activeSession?.stoppedByStudent ? activeSession.studentStopTime : null}
                    />
                  ) : (
                    <CountdownTimer />
                  )}
                </div>
              </div>
            )}
          </section>

          <div className="hidden md:block w-full">
            {activeStudent && renderDailyHistory()}
          </div>
        </div>

        {/* Daily History for Mobile (moves outside middle column) */}
        <div className="block md:hidden w-full order-3">
          {activeStudent && renderDailyHistory()}
        </div>

        {/* Right Sidebar */}
        {activeSession && (
          <aside className="w-full md:col-span-2 lg:col-span-12 xl:col-span-3 flex flex-col gap-4 md:gap-6 shrink-0 h-fit order-3">
            <div className="bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-rose-950/25 border border-white/10 p-5 sm:p-6 rounded-[2.5rem] shadow-xl">
              <h2 className="text-base font-black text-white mb-5 flex items-center gap-2.5 border-b border-white/10 pb-4">
                <div className="bg-rose-500/20 p-2 rounded-xl text-rose-400"><Activity className="w-4 h-4" /></div>
                Live Quiz Mission 🎯
              </h2>

              <div className="flex flex-col gap-4">
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 shadow-inner">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span>⚡</span> Average Speed
                  </p>
                  <p className="text-3xl sm:text-4xl font-black text-indigo-400 flex items-center gap-2">
                    <Zap className="w-6 h-6 text-indigo-400" />
                    {activeSession.averageSpeed.toFixed(1)}s
                  </p>
                </div>
                {activeSession.isCompleted && (
                  <div className="mt-4 bg-gradient-to-tr from-amber-500/20 to-yellow-500/10 border border-amber-500/30 p-5 rounded-2xl text-center">
                    <div className="text-3xl mb-1">🏆</div>
                    <h3 className="text-lg font-black text-amber-300 mb-1">Quiz Completed!</h3>
                    <p className="text-xs text-amber-200">Final Score: <span className="font-black text-white text-sm">{activeSession.finalScore} pts</span></p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </main>

      {/* Mobile Action Bar */}
      {activeStudent && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-3.5 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 z-50 flex gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
          <button
            onClick={handleAddBonus}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex justify-center items-center gap-2 text-sm active:scale-95"
          >
            <PlusCircle className="w-5 h-5" /> Add Points 🌟
          </button>
          <button
            onClick={handleDeductPoints}
            className="flex-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold py-3.5 rounded-2xl border border-rose-500/25 transition-all flex justify-center items-center gap-2 text-sm active:scale-95"
          >
            <MinusCircle className="w-5 h-5" /> Deduct
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

      {showMannersHistory && activeStudent && (
        <MannersHistoryModal studentId={activeStudent._id} onClose={() => setShowMannersHistory(false)} />
      )}
    </div>
  );
}
