"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Stopwatch from "@/components/Stopwatch";
import StarRatingAnimation from "@/components/StarRatingAnimation";
import MysteryGiftModal from "@/components/MysteryGiftModal";
import { User, Activity, Zap } from "lucide-react";

export default function Dashboard() {
  const [settings, setSettings] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [activeStudent, setActiveStudent] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [showRating, setShowRating] = useState<{stars: number, compliment: string, points: number} | null>(null);
  const [showFinale, setShowFinale] = useState<"Master Mind Champion 🏆" | "Super Solver 🥇" | null>(null);

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
        // Create new session
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

  const handleScore = async (seconds: number) => {
    if (!settings || !activeSession || !activeStudent) return;

    // Find the right tier
    const sortedTiers = [...settings.ratingTiers].sort((a: any, b: any) => a.maxSeconds - b.maxSeconds);
    let matchedTier = sortedTiers[sortedTiers.length - 1]; // default to longest time
    for (const tier of sortedTiers) {
      if (seconds <= tier.maxSeconds) {
        matchedTier = tier;
        break;
      }
    }

    setShowRating({
      stars: matchedTier.stars,
      compliment: matchedTier.name,
      points: matchedTier.points
    });

    // Save to DB
    const res = await fetch(`/api/sessions/${activeSession._id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionNumber: activeSession.totalQuestions + 1,
        responseTime: seconds,
        starsAwarded: matchedTier.stars,
        points: matchedTier.points
      })
    });
    const result = await res.json();

    // Update local state temporarily so the UI is snappy
    setActiveSession((prev: any) => ({
      ...prev,
      totalQuestions: prev.totalQuestions + 1,
      finalScore: prev.finalScore + matchedTier.points,
      averageSpeed: ((prev.averageSpeed * prev.totalQuestions) + seconds) / (prev.totalQuestions + 1)
    }));
    setActiveStudent((prev: any) => ({
      ...prev,
      allTimeScore: prev.allTimeScore + matchedTier.points
    }));
  };

  const handleRatingComplete = () => {
    setShowRating(null);
    if (activeSession && settings) {
      const updatedTotal = activeSession.totalQuestions;
      if (updatedTotal >= settings.badgeThresholds.finaleQuestionCount) {
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
    // Force complete old session, start a new one automatically
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
                  <span className="text-gray-400 font-bold">All-Time Score</span>
                  <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">
                    {activeStudent.allTimeScore.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4">
                  <span className="text-gray-500 font-medium">Total Sessions</span>
                  <span className="text-xl font-bold text-gray-300">{activeStudent.totalSessions}</span>
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
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">Accumulative Score</p>
                  <p className="text-4xl font-black text-emerald-400">
                    +{activeSession.finalScore}
                  </p>
                </div>

                <div className="bg-gray-950 p-5 rounded-2xl border border-gray-800/50 shadow-inner">
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">Avg. Speed</p>
                  <p className="text-4xl font-black text-indigo-400 flex items-center gap-2">
                    <Zap className="w-7 h-7 text-indigo-500" />
                    {activeSession.averageSpeed.toFixed(1)}s
                  </p>
                </div>
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
              <h3 className="text-2xl font-black text-gray-300 mb-2">Welcome Back!</h3>
              <p className="text-lg font-medium text-gray-500">Select a student from the sidebar to begin the live class quiz session.</p>
            </div>
          ) : (
            <Stopwatch 
              isRunning={isRunning} 
              setIsRunning={setIsRunning} 
              onScore={handleScore} 
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

      {showFinale && settings && (
        <MysteryGiftModal
          badgeType={showFinale}
          gifts={settings.mysteryGifts}
          onClose={handleFinaleClose}
        />
      )}
    </div>
  );
}
