"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { PlayCircle, ShieldCheck, User, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function Login() {
  const [role, setRole] = useState<"admin" | "teacher" | "student">("student");
  const [username, setUsername] = useState("");
  const [teacherUsername, setTeacherUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { refreshAuth } = useAuth();
  const router = useRouter();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        username: role !== "admin" ? username : undefined,
        teacherUsername: role === "student" ? teacherUsername : undefined,
        password
      })
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Login failed");
    } else {
      await refreshAuth();
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "teacher") {
        router.push("/teacher");
      } else {
        router.push("/student");
      }
    }
  };

  const cycleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };

  const currentThemeIcon = 
    theme === "light" ? <Sun className="w-4 h-4 text-amber-500" /> :
    theme === "dark" ? <Moon className="w-4 h-4 text-indigo-400" /> :
    resolvedTheme === "dark" ? <Moon className="w-4 h-4 text-indigo-400" /> :
    <Sun className="w-4 h-4 text-amber-500" />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-gray-950 p-4 relative transition-colors duration-200">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4">
        <button
          onClick={cycleTheme}
          title={`Theme: ${theme} (Click to switch)`}
          aria-label="Switch Theme"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold text-slate-700 dark:text-gray-300 shadow-sm hover:scale-105 active:scale-95 transition-all"
        >
          {currentThemeIcon}
          <span className="capitalize">{theme}</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-3xl shadow-xl p-8 sm:p-10 transition-colors">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 p-3.5 rounded-2xl shadow-lg shadow-indigo-500/20 mb-4">
            <PlayCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">QuizCompanion</h1>
          <p className="text-slate-400 dark:text-gray-400 font-bold mt-1 text-sm">Sign in to continue</p>
        </div>

        {/* Role toggle */}
        <div className="flex gap-1.5 mb-8 bg-slate-100 dark:bg-gray-950 p-1.5 rounded-2xl border border-slate-200/60 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold transition-all text-xs sm:text-sm ${
              role === "student" 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25" 
                : "text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <User className="w-4 h-4" /> Student
          </button>
          <button
            type="button"
            onClick={() => setRole("teacher")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold transition-all text-xs sm:text-sm ${
              role === "teacher" 
                ? "bg-rose-600 text-white shadow-md shadow-rose-500/25" 
                : "text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Teacher
          </button>
          <button
            type="button"
            onClick={() => setRole("admin")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold transition-all text-xs sm:text-sm ${
              role === "admin" 
                ? "bg-amber-600 text-white shadow-md shadow-amber-500/25" 
                : "text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Admin
          </button>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 p-3.5 rounded-xl text-center font-bold text-xs">
              {error}
            </div>
          )}
          
          {role === "student" && (
            <>
              <div>
                <label className="text-[11px] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1.5 block">
                  Teacher Username
                </label>
                <input
                  type="text"
                  value={teacherUsername}
                  onChange={(e) => setTeacherUsername(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500 transition-colors text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1.5 block">
                  Student Name
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500 transition-colors text-sm"
                  required
                />
              </div>
            </>
          )}

          {role === "teacher" && (
            <div>
              <label className="text-[11px] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1.5 block">
                Teacher Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500 transition-colors text-sm"
                required
              />
            </div>
          )}

          <div>
            <label className="text-[11px] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1.5 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500 transition-colors text-sm"
              required
            />
          </div>

          <button
            type="submit"
            className={`w-full py-3.5 rounded-xl font-black text-base text-white transition-all mt-2 shadow-md hover:scale-[1.01] active:scale-[0.99] ${
              role === "teacher" 
                ? "bg-rose-600 hover:bg-rose-500 shadow-rose-500/20" 
                : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20"
            }`}
          >
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}
