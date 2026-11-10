"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Settings, 
  PlayCircle, 
  LogOut, 
  Menu, 
  X, 
  BookOpen, 
  LayoutDashboard, 
  Globe, 
  Gamepad2, 
  Sun,
  Moon,
  Monitor,
  Check,
  Volume2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme, ThemeMode } from "@/context/ThemeContext";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // Close theme menu on outside click
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

  // Theme options
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

  // Simple Navbar for logged out users
  if (!user) {
    return (
      <nav className="flex items-center justify-between px-4 md:px-6 py-3.5 bg-white/90 dark:bg-gray-950/90 border-b border-slate-200/80 dark:border-gray-800 text-slate-800 dark:text-white backdrop-blur-md relative z-50">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-md shadow-indigo-500/20">
            <PlayCircle className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">QuizCompanion</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Tajweed Studio Link */}
          <Link
            href="/tajweed"
            title="Tajweed Studio (مخارج الحروف)"
            aria-label="Tajweed Studio"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
              pathname === '/tajweed'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                : 'bg-slate-100 dark:bg-gray-800/80 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-gray-700'
            }`}
          >
            <Volume2 className="w-5 h-5 text-emerald-500" />
          </Link>

          {/* Theme Selector for non-logged in users */}
          <div className="relative" ref={themeMenuRef}>
          <button
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            title={`Theme: ${theme}`}
            aria-label="Toggle theme selection"
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-gray-800/80 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 flex items-center justify-center border border-slate-200/60 dark:border-gray-700 transition-all active:scale-95"
          >
            {currentThemeIcon}
          </button>

          {isThemeMenuOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-slate-200 dark:border-gray-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              {themeOptions.map((opt) => (
                <button
                  key={opt.mode}
                  onClick={() => {
                    setTheme(opt.mode);
                    setIsThemeMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold transition-colors ${
                    theme === opt.mode 
                      ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40" 
                      : "text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {opt.icon}
                    <span>{opt.label}</span>
                  </div>
                  {theme === opt.mode && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 stroke-[3]" />}
                </button>
              ))}
            </div>
          )}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white/90 dark:bg-gray-950/90 border-b border-slate-200/80 dark:border-gray-800 text-slate-800 dark:text-white backdrop-blur-md relative z-50">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-md shadow-indigo-500/20">
            <PlayCircle className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">QuizCompanion</h1>
          <span className="ml-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700">
            {user.role}
          </span>
        </div>
        
        {/* Desktop Menu - Icon-only buttons with tooltips */}
        <div className="hidden md:flex items-center gap-2">
          {user.role === "teacher" && (
            <>
              <Link 
                href="/teacher" 
                title="Dashboard"
                aria-label="Dashboard"
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                  pathname === '/teacher' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' 
                    : 'bg-slate-100 dark:bg-gray-800/80 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-gray-700'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
              </Link>
              <Link
                href="/settings"
                title="Settings"
                aria-label="Settings"
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                  pathname === '/settings' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' 
                    : 'bg-slate-100 dark:bg-gray-800/80 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-gray-700'
                }`}
              >
                <Settings className="w-5 h-5" />
              </Link>
            </>
          )}

          {user.role === "student" && (
            <>
              <Link 
                href="/student" 
                title="Dashboard"
                aria-label="Dashboard"
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                  pathname === '/student' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' 
                    : 'bg-slate-100 dark:bg-gray-800/80 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-gray-700'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
              </Link>
              <Link 
                href={user.student?.assignedGame === 'builder' ? '/student/builder' : '/student/pet'}
                title={user.student?.assignedGame === 'builder' ? 'World Builder' : 'My Pet'}
                aria-label={user.student?.assignedGame === 'builder' ? 'World Builder' : 'My Pet'}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                  pathname.includes(user.student?.assignedGame === 'builder' ? '/builder' : '/pet') 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' 
                    : 'bg-slate-100 dark:bg-gray-800/80 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-gray-700'
                }`}
              >
                {user.student?.assignedGame === 'builder' ? (
                  <Globe className="w-5 h-5" />
                ) : (
                  <Gamepad2 className="w-5 h-5" />
                )}
              </Link>
              {(user.student as any)?.revisionEnabled && (
                <Link
                  href="/student/revision"
                  title="Revision"
                  aria-label="Revision"
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                    pathname === '/student/revision' 
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25' 
                      : 'bg-slate-100 dark:bg-gray-800/80 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-gray-700'
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                </Link>
              )}
            </>
          )}

          {/* Tajweed Studio Link */}
          <Link
            href="/tajweed"
            title="Tajweed Studio (مخارج الحروف)"
            aria-label="Tajweed Studio"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
              pathname === '/tajweed'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                : 'bg-slate-100 dark:bg-gray-800/80 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-gray-700'
            }`}
          >
            <Volume2 className="w-5 h-5 text-emerald-500" />
          </Link>

          {/* Theme Selector Popover (Light / Dark / System) */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              title={`Theme: ${theme}`}
              aria-label="Toggle theme selection"
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-gray-800/80 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 flex items-center justify-center border border-slate-200/60 dark:border-gray-700 transition-all active:scale-95"
            >
              {currentThemeIcon}
            </button>

            {isThemeMenuOpen && (
              <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-slate-200 dark:border-gray-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.mode}
                    onClick={() => {
                      setTheme(opt.mode);
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold transition-colors ${
                      theme === opt.mode 
                        ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40" 
                        : "text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {opt.icon}
                      <span>{opt.label}</span>
                    </div>
                    {theme === opt.mode && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 stroke-[3]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Logout */}
          <button 
            onClick={logout}
            title="Logout"
            aria-label="Logout"
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-200/60 dark:border-rose-900/40 shadow-sm"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Menu & Theme Button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => {
              // Cycle theme on quick mobile click: light -> dark -> system
              const nextTheme: ThemeMode = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
              setTheme(nextTheme);
            }}
            title={`Theme: ${theme}`}
            aria-label="Switch Theme"
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-gray-800/80 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 flex items-center justify-center border border-slate-200/60 dark:border-gray-700 transition-colors"
          >
            {currentThemeIcon}
          </button>

          <button 
            onClick={toggleMenu}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors focus:outline-none text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 shadow-xl p-4 flex flex-col gap-2">
          {/* Mobile Theme Switcher Segments */}
          <div className="flex items-center justify-between p-1 bg-slate-100 dark:bg-gray-800 rounded-2xl mb-1">
            {themeOptions.map((opt) => (
              <button
                key={opt.mode}
                onClick={() => setTheme(opt.mode)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  theme === opt.mode 
                    ? "bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-sm" 
                    : "text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          {user.role === "teacher" && (
            <>
              <Link 
                href="/teacher" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${
                  pathname === '/teacher' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${
                  pathname === '/settings' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </Link>
            </>
          )}
          {user.role === "student" && (
            <>
              <Link 
                href="/student" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${
                  pathname === '/student' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>
              <Link 
                href={user.student?.assignedGame === 'builder' ? '/student/builder' : '/student/pet'}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${
                  pathname.includes(user.student?.assignedGame === 'builder' ? '/builder' : '/pet') 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'
                }`}
              >
                {user.student?.assignedGame === 'builder' ? <Globe className="w-5 h-5" /> : <Gamepad2 className="w-5 h-5" />}
                <span>{user.student?.assignedGame === 'builder' ? 'World Builder' : 'My Pet'}</span>
              </Link>
              {(user.student as any)?.revisionEnabled && (
                <Link
                  href="/student/revision"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${
                    pathname === '/student/revision' 
                      ? 'bg-violet-600 text-white' 
                    : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Revision</span>
                </Link>
              )}
            </>
          )}
          <Link
            href="/tajweed"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${
              pathname === '/tajweed'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'
            }`}
          >
            <Volume2 className="w-5 h-5 text-emerald-500" />
            <span>Tajweed Studio</span>
          </Link>
          <hr className="border-slate-200 dark:border-gray-800 my-2" />
          <button 
            onClick={() => {
              setIsMobileMenuOpen(false);
              logout();
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all w-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-200/60 dark:border-rose-900/40"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </nav>
  );
}
