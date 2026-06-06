"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { PlayCircle, ShieldCheck, User } from "lucide-react";

export default function Login() {
  const [role, setRole] = useState<"teacher" | "student">("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { refreshAuth } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, username: role === "student" ? username : undefined, password })
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Login failed");
    } else {
      await refreshAuth();
      if (role === "teacher") {
        router.push("/teacher");
      } else {
        router.push("/student");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-[2rem] shadow-2xl p-10">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-500/20 mb-6">
            <PlayCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-wide">QuizCompanion</h1>
          <p className="text-gray-500 font-bold mt-3 text-lg">Sign in to continue</p>
        </div>

        <div className="flex gap-2 mb-10 bg-gray-950 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all text-lg ${role === "student" ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:text-gray-300"}`}
          >
            <User className="w-5 h-5" /> Student
          </button>
          <button
            type="button"
            onClick={() => setRole("teacher")}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all text-lg ${role === "teacher" ? "bg-rose-600 text-white shadow-md" : "text-gray-500 hover:text-gray-300"}`}
          >
            <ShieldCheck className="w-5 h-5" /> Teacher
          </button>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-center font-bold text-sm">{error}</div>}
          
          {role === "student" && (
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Student Name</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-5 py-4 text-white font-bold outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-5 py-4 text-white font-bold outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            className={`w-full py-5 rounded-2xl font-black text-xl transition-all mt-4 shadow-lg hover:scale-[1.02] active:scale-[0.98] ${role === "teacher" ? "bg-rose-600 hover:bg-rose-500 shadow-rose-500/20" : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20"}`}
          >
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}
