"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Sun, Moon, Monitor, Check, Volume2 } from "lucide-react";
import { useTheme, ThemeMode } from "@/context/ThemeContext";

export default function Navbar() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    if (isThemeMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isThemeMenuOpen]);

  const themeOptions: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { mode: "light", label: "Light", icon: <Sun className="w-4 h-4 text-amber-500" /> },
    { mode: "dark", label: "Dark", icon: <Moon className="w-4 h-4 text-indigo-400" /> },
    { mode: "system", label: "System", icon: <Monitor className="w-4 h-4 text-slate-500 dark:text-slate-400" /> },
  ];

  const currentThemeIcon =
    theme === "light" ? <Sun className="w-5 h-5 text-amber-500" /> :
    theme === "dark" ? <Moon className="w-5 h-5 text-indigo-400" /> :
    resolvedTheme === "dark" ? <Moon className="w-5 h-5 text-indigo-400" /> :
    <Sun className="w-5 h-5 text-amber-500" />;

  return (
    <nav className="flex items-center justify-between px-4 md:px-6 py-3.5 bg-white/90 dark:bg-gray-950/90 border-b border-slate-200/80 dark:border-gray-800 text-slate-800 dark:text-white backdrop-blur-md relative z-50">
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="bg-emerald-600 p-2 rounded-xl shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
          <Volume2 className="w-5 h-5 text-white" />
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Tajweed Studio
          </h1>
          <span className="arabic-font text-sm font-bold text-emerald-600 dark:text-emerald-400 hidden sm:inline">
            مخارج الحروف
          </span>
        </div>
      </Link>

      <div className="relative" ref={themeMenuRef}>
        <button
          type="button"
          onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
          title={`Theme: ${theme}`}
          aria-label="Toggle theme selection"
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-gray-800/80 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 flex items-center justify-center border border-slate-200/60 dark:border-gray-700 transition-all active:scale-95"
        >
          {currentThemeIcon}
        </button>

        {isThemeMenuOpen && (
          <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-slate-200 dark:border-gray-800 py-1.5 z-50">
            {themeOptions.map((opt) => (
              <button
                key={opt.mode}
                type="button"
                onClick={() => {
                  setTheme(opt.mode);
                  setIsThemeMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold transition-colors ${
                  theme === opt.mode
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                    : "text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {opt.icon}
                  <span>{opt.label}</span>
                </div>
                {theme === opt.mode && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
