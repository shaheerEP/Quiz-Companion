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
import { User, Activity, Zap, PlusCircle, MinusCircle, History, Trophy, Globe, Star, Timer, BookOpen, Award, Users, Search, X, Check } from "lucide-react";
import Link from "next/link";
import MannersHistoryModal from "@/components/MannersHistoryModal";
import StudentEPosterModal from "@/components/StudentEPosterModal";
import TeacherTasksModal from "@/components/TeacherTasksModal";

export default function TeacherDashboard() {
  const [settings, setSettings] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [activeStudent, setActiveStudent] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showStudentSelectModal, setShowStudentSelectModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(studentSearch.toLowerCase())
  );

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

  const handleStudentChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    selectStudent(e.target.value, students);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && activeSession && activeStudent) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/sessions/timer?sessionId=${activeSession._id}`);
          if (res.ok) {
            const timerData = await res.json();
            if (timerData.stoppedByStudent && timerData.studentStopTime !== null) {
              setActiveSession((prev: any) => ({
                ...prev,
                stoppedByStudent: true,
                studentStopTime: timerData.studentStopTime
              }));
            }
          }
        } catch (e) { }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, activeSession, activeStudent]);

  const getOrCreateSession = async () => {
    if (activeSession) return activeSession;
    if (!activeStudent) return null;
    const res = await fetch(`/api/sessions?studentId=${activeStudent._id}&activeOnly=true`);
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
    <section className="w-full bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-3xl shadow-sm p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <History className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">History</h3>
        </div>

        {/* Segmented Tab Controls */}
        <div className="inline-flex p-1 bg-slate-100 border border-slate-200/80 rounded-2xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveHistoryTab("daily")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              activeHistoryTab === "daily"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Daily ({totalDailyDays})
          </button>
          <button
            type="button"
            onClick={() => setActiveHistoryTab("weekly")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              activeHistoryTab === "weekly"
                ? "bg-white text-fuchsia-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Weekly ({totalWeeks})
          </button>
        </div>
      </div>

      {activeHistoryTab === "daily" ? (
        <div className="flex flex-col gap-3 max-h-96 xl:max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
          {dailyHistory.length === 0 ? (
            <p className="text-slate-400 italic text-xs text-center py-6">No history recorded yet.</p>
          ) : (
            dailyHistory.map((dayGroup) => (
              <div key={dayGroup.dayString} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center pl-2 border-l-2 border-indigo-500">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{dayGroup.dayString}</p>
                  <div className="flex gap-1.5 items-center">
                    <div className="relative inline-block text-xs mr-1" title={`${Math.min(100, Math.max(0, (dayGroup.totalPoints / 1000) * 100)).toFixed(0)}%`}>
                      <div className="flex text-slate-200">★★★★★</div>
                      <div className="flex text-yellow-400 absolute top-0 left-0 overflow-hidden whitespace-nowrap drop-shadow-[0_0_4px_rgba(250,204,21,0.85)]" style={{ width: `${Math.min(100, Math.max(0, (dayGroup.totalPoints / 1000) * 100))}%` }}>
                        ★★★★★
                      </div>
                    </div>
                    <p className={`text-xs font-black mr-1 ${dayGroup.totalPoints > 0 ? 'text-emerald-600' : dayGroup.totalPoints < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {dayGroup.totalPoints > 0 ? '+' : ''}{dayGroup.totalPoints} pts
                    </p>
                    <button title="Add points" onClick={() => handleHistoryManualLog(dayGroup.dayString, 'bonus')} className="w-6 h-6 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg flex items-center justify-center transition-colors"><PlusCircle className="w-3.5 h-3.5" /></button>
                    <button title="Deduct points" onClick={() => handleHistoryManualLog(dayGroup.dayString, 'deduction')} className="w-6 h-6 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg flex items-center justify-center transition-colors"><MinusCircle className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {dayGroup.items?.map((item: any) => (
                    <div key={item._id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className="flex items-center gap-2.5">
                        {item.type === 'quiz' && <div className="w-7 h-7 shrink-0 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-700"><Trophy className="w-3.5 h-3.5" /></div>}
                        {item.type === 'bonus' && <div className="w-7 h-7 shrink-0 rounded-xl flex items-center justify-center bg-indigo-100 text-indigo-700"><PlusCircle className="w-3.5 h-3.5" /></div>}
                        {item.type === 'deduction' && <div className="w-7 h-7 shrink-0 rounded-xl flex items-center justify-center bg-rose-100 text-rose-700"><MinusCircle className="w-3.5 h-3.5" /></div>}
                        <div>
                          <p className="font-bold text-slate-800 text-xs sm:text-sm">{item.title}</p>
                          {item.details && <p className="text-[11px] text-slate-500">{item.details}</p>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
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

          {/* Show More Days Button */}
          {hasMoreDaily && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={handleShowMoreDaily}
                disabled={loadingMoreDaily}
                className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {loadingMoreDaily ? "..." : `+ More (${dailyHistory.length}/${totalDailyDays})`}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Weekly History Tab */
        <div className="flex flex-col gap-2 max-h-96 xl:max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
          {weeklyHistory.length === 0 ? (
            <p className="text-slate-400 italic text-xs text-center py-6">No weekly history recorded yet.</p>
          ) : (
            weeklyHistory.map((week: any) => (
              <div
                key={week.weekKey}
                className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col gap-1.5 hover:border-fuchsia-300 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center text-xs font-black shrink-0">
                      📆
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-slate-800 text-xs sm:text-sm">{week.weekLabel}</h4>
                        {week.isBestWeek && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-[9px] font-black">
                            ★ Top
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {week.diffPrevWeek !== undefined && (
                      <span
                        className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold ${
                          week.diffPrevWeek > 0
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : week.diffPrevWeek < 0
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
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
                className="px-4 py-2 rounded-xl bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-600 border border-fuchsia-200 text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {loadingMoreWeekly ? "..." : `+ More (${weeklyHistory.length}/${totalWeeks})`}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col relative selection:bg-indigo-500 selection:text-white">
      <Navbar />

      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-200/40 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-200/30 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-200/30 rounded-full blur-[140px]" />
      </div>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 p-3 sm:p-5 md:p-6 gap-4 md:gap-6 max-w-[1500px] mx-auto w-full pb-24 md:pb-6 relative z-10">
        {/* Left Sidebar: Student Profile & Stats */}
        <aside className={`w-full lg:col-span-4 xl:col-span-3 flex flex-col gap-4 shrink-0 h-fit ${activeStudent ? 'order-2' : 'order-1'} lg:order-1`}>
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col gap-3 relative">
            {!activeStudent ? (
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Challenger</span>
                <button
                  onClick={() => setShowStudentSelectModal(true)}
                  title="Select Challenger"
                  aria-label="Select Challenger"
                  className="w-10 h-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-sm transition-all active:scale-95"
                >
                  <Users className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <>
                {/* Points balance and lifetime with explanatory labels */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                    <span className="text-xl shrink-0">💎</span>
                    <div className="min-w-0 flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                        Balance
                      </span>
                      <span className="text-xs sm:text-sm font-black text-slate-800 truncate">
                        {activeStudent.pointsBalance?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                    <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                    <div className="min-w-0 flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                        Lifetime
                      </span>
                      <span className="text-xs sm:text-sm font-black text-slate-800 truncate">
                        {activeStudent.lifetimePoints?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Toolbar (Icon-only with tooltips!) */}
                <div className="flex items-center justify-between gap-1.5 p-1.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <button
                    onClick={handleAddBonus}
                    title="Add Points"
                    aria-label="Add Points"
                    className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-sm transition-all active:scale-95"
                  >
                    <PlusCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDeductPoints}
                    title="Deduct Points"
                    aria-label="Deduct Points"
                    className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center transition-all active:scale-95"
                  >
                    <MinusCircle className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTasksModal(true)}
                    title="Tasks"
                    aria-label="Tasks"
                    className="relative w-9 h-9 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 flex items-center justify-center transition-all active:scale-95"
                  >
                    <Award className="w-4 h-4" />
                    {activeStudent.tasks && activeStudent.tasks.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                        {activeStudent.tasks.length}
                      </span>
                    )}
                  </button>
                  {/* Single E-Poster Button across the entire page */}
                  <button
                    type="button"
                    onClick={() => setShowPosterModal(true)}
                    title="Achievement E-Poster"
                    aria-label="Achievement E-Poster"
                    className="w-9 h-9 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 flex items-center justify-center transition-all active:scale-95"
                  >
                    <Trophy className="w-4 h-4" />
                  </button>
                  <a
                    href={`/world/${activeStudent._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="World"
                    aria-label="World"
                    className="w-9 h-9 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200 flex items-center justify-center transition-all active:scale-95"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                  {activeStudent.revisionEnabled && (
                    <Link
                      href={`/revision?studentId=${activeStudent._id}`}
                      title="Revision"
                      aria-label="Revision"
                      className="w-9 h-9 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-600 border border-violet-200 flex items-center justify-center transition-all active:scale-95"
                    >
                      <BookOpen className="w-4 h-4" />
                    </Link>
                  )}
                </div>

                {/* Manners */}
                {activeStudent.mannersEnabled && (
                  <div className="flex items-center justify-between p-2 px-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="relative inline-block text-lg">
                      <div className="flex text-slate-300">★★★★★</div>
                      {(() => {
                        const todayLog = mannersLogs.find(l => new Date(l.date).toDateString() === new Date().toDateString());
                        const pct = todayLog ? todayLog.percentage : 0;
                        return (
                          <div className="flex text-yellow-400 absolute top-0 left-0 overflow-hidden whitespace-nowrap drop-shadow-[0_0_6px_rgba(250,204,21,0.85)]" style={{ width: `${pct}%` }}>
                            ★★★★★
                          </div>
                        );
                      })()}
                    </div>
                    <button
                      onClick={() => setShowMannersHistory(true)}
                      title="Manners History"
                      aria-label="Manners History"
                      className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 flex items-center justify-center transition-all"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Weekly Progress */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">🚀 Weekly</span>
                    <span className="text-xs font-black text-fuchsia-600">
                      {historyStats ? historyStats.thisWeekPoints : (activeStudent.weeklyPoints || 0)} pts
                    </span>
                  </div>
                  {historyStats && historyStats.bestWeekPoints > 0 && (
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-fuchsia-500 to-amber-400 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(3, (historyStats.thisWeekPoints / Math.max(1, historyStats.bestWeekPoints)) * 100))}%`
                        }}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Main Interaction Area: Quiz Arena */}
        <div className={`w-full lg:col-span-8 xl:col-span-9 flex flex-col gap-6 ${activeStudent ? 'order-1' : 'order-2'} lg:order-2`}>
          <section className="w-full flex flex-col items-center justify-center bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-3xl shadow-sm p-5 sm:p-7 relative overflow-hidden min-h-[380px]">
            {!activeStudent ? (
              <div className="text-center text-slate-400 flex flex-col items-center max-w-sm z-10 py-12">
                <button
                  onClick={() => setShowStudentSelectModal(true)}
                  title="Select Challenger"
                  aria-label="Select Challenger"
                  className="w-20 h-20 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-3xl flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-sm text-indigo-600 cursor-pointer"
                >
                  <Users className="w-9 h-9" />
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col h-full items-center justify-center gap-5 z-10">
                {/* Student Header */}
                <div className="w-full flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div
                      onClick={() => setShowStudentSelectModal(true)}
                      title="Switch Challenger"
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-indigo-200/90 bg-slate-100 flex items-center justify-center shadow-md cursor-pointer hover:border-indigo-500 transition-all shrink-0"
                    >
                      {activeStudent.profileImageUrl ? (
                        <img src={activeStudent.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 sm:w-14 sm:h-14 text-slate-400" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight capitalize">
                          {activeStudent.name}
                        </h1>
                        <button
                          onClick={() => setShowStudentSelectModal(true)}
                          title="Select Challenger"
                          aria-label="Select Challenger"
                          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-95"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="relative inline-block text-xl">
                        <div className="flex text-slate-200">★★★★★</div>
                        <div
                          className="flex text-yellow-400 absolute top-0 left-0 overflow-hidden whitespace-nowrap drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]"
                          style={{ width: `${Math.min(100, ((activeStudent.dailyPoints || 0) / 1000) * 100)}%` }}
                        >
                          ★★★★★
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Today's Points with small label */}
                  <div className="flex items-center gap-2 bg-emerald-50 px-3.5 py-2 rounded-2xl border border-emerald-200">
                    <Zap className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider leading-none">
                        Today
                      </span>
                      <span className="text-base sm:text-xl font-black text-emerald-700 leading-tight">
                        {activeStudent.dailyPoints?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timer Controls & Display */}
                <div className="flex flex-col items-center w-full gap-4">
                  <div className="flex bg-slate-100 rounded-2xl p-1 border border-slate-200/80">
                    <button
                      onClick={() => setTimerTab('quiz')}
                      title="Stopwatch"
                      aria-label="Stopwatch"
                      className={`p-2.5 rounded-xl transition-all ${
                        timerTab === 'quiz'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Activity className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setTimerTab('countdown')}
                      title="Countdown"
                      aria-label="Countdown"
                      className={`p-2.5 rounded-xl transition-all ${
                        timerTab === 'countdown'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Timer className="w-5 h-5" />
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

          {activeStudent && renderDailyHistory()}
        </div>
      </main>

      {/* Mobile Action Bar */}
      {activeStudent && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-2.5 bg-white/95 backdrop-blur-xl border-t border-slate-200 z-50 flex items-center justify-around shadow-lg">
          <button
            onClick={() => setShowStudentSelectModal(true)}
            title="Select Challenger"
            aria-label="Select Challenger"
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center transition-all active:scale-95"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={handleAddBonus}
            title="Add Points"
            aria-label="Add Points"
            className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
          <button
            onClick={handleDeductPoints}
            title="Deduct Points"
            aria-label="Deduct Points"
            className="w-10 h-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center transition-all active:scale-95"
          >
            <MinusCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowTasksModal(true)}
            title="Tasks"
            aria-label="Tasks"
            className="relative w-10 h-10 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 flex items-center justify-center transition-all active:scale-95"
          >
            <Award className="w-4 h-4" />
            {activeStudent.tasks && activeStudent.tasks.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {activeStudent.tasks.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowPosterModal(true)}
            title="Achievement E-Poster"
            aria-label="Achievement E-Poster"
            className="w-10 h-10 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 flex items-center justify-center transition-all active:scale-95"
          >
            <Trophy className="w-4 h-4" />
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

      {showPosterModal && activeStudent && (
        <StudentEPosterModal
          isOpen={showPosterModal}
          onClose={() => setShowPosterModal(false)}
          student={activeStudent}
          historyStats={historyStats}
        />
      )}

      {showTasksModal && activeStudent && (
        <TeacherTasksModal
          isOpen={showTasksModal}
          onClose={() => setShowTasksModal(false)}
          student={activeStudent}
          onStudentUpdated={(updatedStudent) => {
            setActiveStudent(updatedStudent);
            fetchStudentHistory(updatedStudent._id);
          }}
        />
      )}

      {showStudentSelectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Select Challenger</span>
              </div>
              <button
                onClick={() => {
                  setShowStudentSelectModal(false);
                  setStudentSearch("");
                }}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div className="max-h-72 overflow-y-auto flex flex-col gap-1.5 custom-scrollbar pr-1">
              {filteredStudents.map((s) => (
                <button
                  key={s._id}
                  onClick={() => {
                    selectStudent(s._id, students);
                    setShowStudentSelectModal(false);
                    setStudentSearch("");
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-2xl transition-all text-left ${
                    activeStudent?._id === s._id
                      ? "bg-indigo-50 border-2 border-indigo-500 text-indigo-900"
                      : "bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center shrink-0">
                      {s.profileImageUrl ? (
                        <img src={s.profileImageUrl} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-xs truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-500">💎 {s.pointsBalance?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                  {activeStudent?._id === s._id && (
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  )}
                </button>
              ))}
              {filteredStudents.length === 0 && (
                <p className="text-slate-400 text-xs italic text-center py-4">No student found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
