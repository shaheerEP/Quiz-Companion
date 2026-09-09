"use client";

import { useEffect, useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import {
  Users,
  Save,
  Trash2,
  Edit2,
  Link as LinkIcon,
  Package,
  Plus,
  X,
  Search,
  Sparkles,
  Sliders,
  Boxes,
  Gift,
  Award,
  Camera,
  RotateCcw,
  CheckCircle2,
  Clock,
  Palette,
  Compass,
  Zap,
} from "lucide-react";

// --- Image Compression Utility ---
const compressImage = async (file: File, maxSize: number = 800): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
            } else {
              reject(new Error("Canvas to Blob failed"));
            }
          },
          "image/jpeg",
          0.8
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- Apple Cupertino Switch Component ---
interface CupertinoSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  id?: string;
  ariaLabel?: string;
}

function CupertinoSwitch({
  checked,
  onChange,
  disabled = false,
  size = "md",
  id,
  ariaLabel,
}: CupertinoSwitchProps) {
  const isMd = size === "md";
  const trackClass = isMd ? "w-12 h-7" : "w-9 h-5";
  const knobClass = isMd ? "w-6 h-6" : "w-4 h-4";
  const translateClass = isMd ? "translate-x-5" : "translate-x-4";

  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex items-center shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF] focus-visible:ring-offset-2 focus-visible:ring-offset-black ${trackClass} ${
        checked ? "bg-[#34C759]" : "bg-[#39393d]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`pointer-events-none inline-block rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.35)] transform transition-transform duration-200 ease-in-out ${knobClass} ${
          checked ? translateClass : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// --- Apple Segmented Control ---
interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

function AppleSegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex p-1 bg-black/40 border border-white/10 rounded-xl relative">
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`relative px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 z-10 ${
              isSelected
                ? "bg-[#2c2c2e] text-white shadow-[0_2px_8px_rgba(0,0,0,0.5)] border border-white/10"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// --- Apple Grouped Inset Card Wrapper ---
function AppleGroupedSection({
  title,
  description,
  action,
  children,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {(title || action) && (
        <div className="flex items-center justify-between px-3">
          {title && (
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8e8e93]">
              {title}
            </h3>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="rounded-2xl bg-[#1c1c1e]/90 border border-white/[0.08] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)] divide-y divide-white/[0.06] overflow-hidden">
        {children}
      </div>
      {description && (
        <p className="text-[12px] text-[#8e8e93] px-3 mt-1 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

// --- Apple Grouped Row Item ---
function AppleGroupedRow({
  icon,
  iconBg = "bg-blue-500",
  title,
  subtitle,
  children,
  onClick,
}: {
  icon?: React.ReactNode;
  iconBg?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-wrap sm:flex-nowrap items-center justify-between px-3.5 sm:px-4 py-3 sm:py-3.5 gap-3 sm:gap-4 min-h-[52px] ${
        onClick ? "cursor-pointer hover:bg-white/[0.03] transition-colors" : ""
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon && (
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm ${iconBg}`}
          >
            {icon}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] sm:text-[14px] font-medium text-[#f5f5f7] tracking-tight truncate">
            {title}
          </span>
          {subtitle && (
            <span className="text-[11px] sm:text-[12px] text-[#8e8e93] leading-tight">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">{children}</div>
    </div>
  );
}

type SettingsPane = "students" | "rating" | "rewards" | "builder" | "general";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [originalSettings, setOriginalSettings] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activePane, setActivePane] = useState<SettingsPane>("students");
  const [searchQuery, setSearchQuery] = useState("");

  // Student creation & editing state
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);

  // Dynamic Island / Capsule Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3200);
  };

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setOriginalSettings(JSON.parse(JSON.stringify(data)));
      });
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    fetch("/api/students")
      .then((res) => res.json())
      .then(setStudents);
  };

  const handleSave = async () => {
    setLoading(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setOriginalSettings(JSON.parse(JSON.stringify(settings)));
    setLoading(false);
    showToast("Settings saved successfully");
  };

  const handleRevert = () => {
    if (confirm("Discard all unsaved changes in this session?")) {
      setSettings(JSON.parse(JSON.stringify(originalSettings)));
      showToast("Changes reverted");
    }
  };

  const hasChanges =
    settings && originalSettings
      ? JSON.stringify(settings) !== JSON.stringify(originalSettings)
      : false;

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentPassword) return;
    setLoading(true);
    await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newStudentName, password: newStudentPassword }),
    });
    setNewStudentName("");
    setNewStudentPassword("");
    setIsAddStudentOpen(false);
    await fetchStudents();
    setLoading(false);
    showToast("Student created successfully");
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Are you sure you want to completely delete this student?")) return;
    setLoading(true);
    await fetch(`/api/students?id=${id}`, { method: "DELETE" });
    if (editingStudent?._id === id) {
      setEditingStudent(null);
    }
    await fetchStudents();
    setLoading(false);
    showToast("Student deleted");
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setLoading(true);
    await fetch("/api/students", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingStudent._id,
        name: editingStudent.name,
        password: editingStudent.password,
        pointsBalance: editingStudent.pointsBalance,
        assignedGame: editingStudent.assignedGame,
        revisionEnabled: editingStudent.revisionEnabled,
        revisionRewindDays: editingStudent.revisionRewindDays,
        rewardSystem: editingStudent.rewardSystem,
        mannersEnabled: editingStudent.mannersEnabled,
        mannersList: editingStudent.mannersList,
        profileImageUrl: editingStudent.profileImageUrl,
      }),
    });
    setEditingStudent(null);
    await fetchStudents();
    setLoading(false);
    showToast("Student profile updated");
  };

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.name?.toLowerCase().includes(query) ||
        s.password?.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  if (!settings) {
    return (
      <div className="min-h-screen bg-black text-[#86868b] flex flex-col items-center justify-center font-sans">
        <div className="w-8 h-8 rounded-full border-2 border-[#0A84FF] border-t-transparent animate-spin mb-4" />
        <span className="text-sm font-medium tracking-tight">Loading System Settings…</span>
      </div>
    );
  }

  // Sidebar navigation items definitions
  const navItems = [
    {
      id: "students" as SettingsPane,
      label: "Students & Accounts",
      icon: <Users className="w-4 h-4" />,
      color: "bg-[#0A84FF]",
      count: students.length,
    },
    {
      id: "rating" as SettingsPane,
      label: "Gamified Rating Tiers",
      icon: <Award className="w-4 h-4" />,
      color: "bg-[#FF9F0A]",
      count: settings.ratingTiers?.length || 0,
    },
    {
      id: "rewards" as SettingsPane,
      label: "Rewards & Incentives",
      icon: <Gift className="w-4 h-4" />,
      color: "bg-[#BF5AF2]",
    },
    {
      id: "builder" as SettingsPane,
      label: "World Builder & Items",
      icon: <Boxes className="w-4 h-4" />,
      color: "bg-[#30D158]",
      count: settings.builderItems?.length || 0,
    },
    {
      id: "general" as SettingsPane,
      label: "General & Timers",
      icon: <Sliders className="w-4 h-4" />,
      color: "bg-[#636366]",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-[#f5f5f7] flex flex-col font-sans selection:bg-[#0A84FF]/30">
      <Navbar />

      {/* --- Dynamic Capsule Floating Toast (Apple Dynamic Island style) --- */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="backdrop-blur-2xl bg-[#1c1c1e]/90 border border-white/15 px-5 py-2.5 rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex items-center gap-2.5 text-[13px] font-medium text-white tracking-tight">
            <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* --- Liquid Glass Sticky Header Bar --- */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#121214]/90 border-b border-white/[0.08] transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/10 shadow-sm shrink-0">
              <Sliders className="w-4 h-4 text-[#0A84FF]" />
            </div>
            <div className="min-w-0">
              <div className="hidden xs:flex items-center gap-1.5 text-[11px] text-[#8e8e93]">
                <span>QuizCompanion</span>
                <span className="text-[10px] text-neutral-600">/</span>
                <span className="text-neutral-400 font-medium">Settings</span>
              </div>
              <h1 className="text-sm sm:text-lg font-bold text-white tracking-tight truncate">
                {navItems.find((item) => item.id === activePane)?.label}
              </h1>
            </div>
          </div>

          {/* Right functional controls: Unsaved status and Save / Revert buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {hasChanges && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="hidden md:inline">Unsaved Changes</span>
              </div>
            )}
            {hasChanges && (
              <button
                type="button"
                onClick={handleRevert}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs font-medium text-[#8e8e93] hover:text-white bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1.5 border border-white/10"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Revert</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || !hasChanges}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 sm:gap-2 shadow-sm ${
                hasChanges
                  ? "bg-[#0A84FF] hover:bg-[#0071e3] text-white shadow-[0_2px_12px_rgba(10,132,255,0.4)] active:scale-95"
                  : "bg-white/5 text-neutral-500 cursor-not-allowed border border-white/5"
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? "Saving…" : "Save"}</span>
              <span className="hidden sm:inline">{!loading && " Changes"}</span>
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Pane Selector */}
        <div className="lg:hidden px-3 sm:px-4 pb-2.5 overflow-x-auto flex items-center gap-2 no-scrollbar scroll-smooth">
          {navItems.map((item) => {
            const isActive = activePane === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePane(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                  isActive
                    ? "bg-[#0A84FF] text-white shadow-sm font-semibold"
                    : "bg-white/5 text-[#8e8e93] hover:text-white border border-white/5"
                }`}
              >
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-black/30 text-white" : "bg-white/10 text-neutral-400"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- Main Settings Stage: macOS Master-Detail Layout --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex gap-8">
        {/* Left Sidebar (Desktop macOS Style) */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 gap-4">
          {/* Quick Search within Settings */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search settings…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1c1c1e]/80 border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Navigation Group */}
          <div className="rounded-2xl bg-[#1c1c1e]/60 border border-white/[0.08] p-1.5 flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = activePane === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActivePane(item.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                    isActive
                      ? "bg-[#0A84FF] text-white shadow-sm font-semibold"
                      : "text-[#8e8e93] hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-white ${
                        isActive ? "bg-white/20" : item.color
                      }`}
                    >
                      {item.icon}
                    </div>
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        isActive ? "bg-black/25 text-white" : "bg-white/10 text-neutral-400"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom System Info Widget */}
          <div className="mt-auto p-4 rounded-2xl bg-[#1c1c1e]/40 border border-white/[0.05] text-[11px] text-[#8e8e93] flex flex-col gap-1">
            <span className="font-semibold text-neutral-400">Interactive Quiz Companion</span>
            <span>HIG-Compliant Architecture</span>
            <span className="text-[10px] text-neutral-600 mt-1">Apple Human Interface Guidelines</span>
          </div>
        </aside>

        {/* Right Detail Pane */}
        <section className="flex-1 min-w-0 flex flex-col gap-8">
          {/* ===================== PANE 1: STUDENTS ===================== */}
          {activePane === "students" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              {/* Header with Search and Create Student Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Student Accounts
                  </h2>
                  <p className="text-sm text-[#8e8e93]">
                    Manage student logins, balances, manners tasks, and spaced repetition schedules.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#0A84FF] hover:bg-[#0071e3] text-white text-xs font-semibold transition-all shadow-[0_2px_10px_rgba(10,132,255,0.3)] active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Student</span>
                </button>
              </div>

              {/* Student List Section */}
              <AppleGroupedSection
                title={`Configured Students (${filteredStudents.length})`}
                description="Click any student to inspect account details, adjust point balances, or customize spaced repetition intervals."
              >
                {filteredStudents.length === 0 ? (
                  <div className="px-6 py-12 text-center text-[#8e8e93] text-sm">
                    {searchQuery
                      ? "No students match your search query."
                      : "No student accounts created yet. Click 'Add Student' above."}
                  </div>
                ) : (
                  filteredStudents.map((student) => (
                    <div
                      key={student._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 gap-3 hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Top / Main Info Row */}
                      <div className="flex items-start sm:items-center justify-between gap-3 min-w-0 flex-1">
                        <div
                          onClick={() => setEditingStudent(student)}
                          className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 group"
                        >
                          {student.profileImageUrl ? (
                            <img
                              src={student.profileImageUrl}
                              alt={student.name}
                              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover border border-white/15 shrink-0 shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-sm sm:text-base shrink-0 shadow-sm">
                              {student.name ? student.name.charAt(0).toUpperCase() : "S"}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <span className="text-sm sm:text-[15px] font-bold text-white group-hover:text-[#0A84FF] transition-colors truncate">
                                {student.name}
                              </span>
                              {student.revisionEnabled && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 shrink-0">
                                  📖 Revision Active
                                </span>
                              )}
                              {student.mannersEnabled && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                  ⭐ Manners
                                </span>
                              )}
                            </div>

                            {/* Desktop inline badges */}
                            <div className="hidden md:flex items-center gap-2 text-xs text-[#8e8e93] mt-1 flex-wrap">
                              <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                <span className="text-[10px] text-neutral-400">Pass:</span>
                                <code className="text-neutral-200 font-mono text-[11px]">{student.password}</code>
                              </span>
                              <span className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 text-emerald-400 font-semibold">
                                <span>💎</span> {(student.pointsBalance ?? 0).toLocaleString()} pts
                              </span>
                              <span className="flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20 text-blue-400 font-semibold">
                                <span>🏆</span> {(student.lifetimePoints ?? 0).toLocaleString()} pts
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Mobile action buttons on the top right */}
                        <div className="flex sm:hidden items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const token = btoa(student._id.toString());
                              const url = `${window.location.origin}/api/auth/magic?token=${token}`;
                              navigator.clipboard.writeText(url);
                              showToast(`Magic login link for ${student.name} copied!`);
                            }}
                            title="Copy Student Login Link"
                            className="w-8 h-8 rounded-xl text-[#8e8e93] hover:text-white bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                          >
                            <LinkIcon className="w-3.5 h-3.5" />
                          </button>
                          {student.mannersEnabled && (
                            <button
                              type="button"
                              onClick={() => {
                                const token = btoa(student._id.toString());
                                const url = `${window.location.origin}/manners/${token}`;
                                navigator.clipboard.writeText(url);
                                showToast(`Manners sheet link copied!`);
                              }}
                              title="Copy Manners Link"
                              className="w-8 h-8 rounded-xl text-amber-400 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 flex items-center justify-center transition-colors"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingStudent(student)}
                            title="Edit Student"
                            className="w-8 h-8 rounded-xl text-[#8e8e93] hover:text-white bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(student._id)}
                            title="Delete Student"
                            className="w-8 h-8 rounded-xl text-rose-500/70 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Mobile / Tablet Stats Chips (second row with no overlap) */}
                      <div className="flex md:hidden items-center gap-2 flex-wrap pt-0.5">
                        <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-xl border border-white/10 text-xs">
                          <span className="text-[10px] text-neutral-400">Pass:</span>
                          <code className="text-neutral-200 font-mono text-[11px] font-bold">{student.password}</code>
                        </span>
                        <span className="flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                          <span>💎</span> {(student.pointsBalance ?? 0).toLocaleString()} pts
                        </span>
                        <span className="flex items-center gap-1 bg-blue-500/10 px-2.5 py-1 rounded-xl border border-blue-500/20 text-blue-400 text-xs font-bold">
                          <span>🏆</span> {(student.lifetimePoints ?? 0).toLocaleString()} pts
                        </span>
                      </div>

                      {/* Desktop Action Buttons */}
                      <div className="hidden sm:flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const token = btoa(student._id.toString());
                            const url = `${window.location.origin}/api/auth/magic?token=${token}`;
                            navigator.clipboard.writeText(url);
                            showToast(`Magic login link for ${student.name} copied!`);
                          }}
                          title="Copy Student Login Link"
                          className="p-2 rounded-xl text-[#8e8e93] hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <LinkIcon className="w-4 h-4" />
                        </button>
                        {student.mannersEnabled && (
                          <button
                            type="button"
                            onClick={() => {
                              const token = btoa(student._id.toString());
                              const url = `${window.location.origin}/manners/${token}`;
                              navigator.clipboard.writeText(url);
                              showToast(`Manners sheet link for parents copied!`);
                            }}
                            title="Copy Manners Link for Parents"
                            className="p-2 rounded-xl text-amber-400 hover:text-amber-200 hover:bg-amber-500/10 transition-colors"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingStudent(student)}
                          title="Edit Student Profile"
                          className="p-2 rounded-xl text-[#8e8e93] hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(student._id)}
                          title="Delete Student"
                          className="p-2 rounded-xl text-rose-500/70 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </AppleGroupedSection>
            </div>
          )}

          {/* ===================== PANE 2: RATING TIERS ===================== */}
          {activePane === "rating" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Gamified Rating Tiers
                  </h2>
                  <p className="text-sm text-[#8e8e93]">
                    Configure stars, compliment titles, speed thresholds, and point rewards awarded upon quiz completion.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      ratingTiers: [
                        ...(settings.ratingTiers || []),
                        { name: "New Speed Tier", maxSeconds: 15, stars: 1, points: 10 },
                      ],
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all border border-white/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Tier</span>
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {(settings.ratingTiers || []).map((tier: any, index: number) => (
                  <AppleGroupedSection
                    key={index}
                    title={`Tier #${index + 1}`}
                    action={
                      <button
                        type="button"
                        onClick={() => {
                          const newTiers = settings.ratingTiers.filter(
                            (_: any, i: number) => i !== index
                          );
                          setSettings({ ...settings, ratingTiers: newTiers });
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    }
                  >
                    <AppleGroupedRow
                      icon={<Award className="w-4 h-4" />}
                      iconBg="bg-amber-500"
                      title="Compliment & Title"
                      subtitle="Displayed dynamically upon answer speed"
                    >
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) => {
                          const newTiers = [...settings.ratingTiers];
                          newTiers[index].name = e.target.value;
                          setSettings({ ...settings, ratingTiers: newTiers });
                        }}
                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-medium outline-none focus:border-[#0A84FF] w-48 sm:w-64"
                      />
                    </AppleGroupedRow>

                    <AppleGroupedRow
                      icon={<Sparkles className="w-4 h-4 text-amber-300" />}
                      iconBg="bg-amber-600/30"
                      title="Stars Rating"
                      subtitle="Number of stars awarded to the student"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={tier.stars}
                          onChange={(e) => {
                            const newTiers = [...settings.ratingTiers];
                            newTiers[index].stars = Number(e.target.value);
                            setSettings({ ...settings, ratingTiers: newTiers });
                          }}
                          className="w-16 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-amber-400 font-bold text-center outline-none focus:border-amber-400"
                        />
                        <span className="text-xs text-neutral-500">⭐</span>
                      </div>
                    </AppleGroupedRow>

                    <AppleGroupedRow
                      icon={<Clock className="w-4 h-4" />}
                      iconBg="bg-blue-500"
                      title="Max Answer Time"
                      subtitle="Threshold in seconds to achieve this tier"
                    >
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          value={tier.maxSeconds}
                          onChange={(e) => {
                            const newTiers = [...settings.ratingTiers];
                            newTiers[index].maxSeconds = Number(e.target.value);
                            setSettings({ ...settings, ratingTiers: newTiers });
                          }}
                          className="w-20 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold text-center outline-none focus:border-[#0A84FF]"
                        />
                        <span className="text-xs text-neutral-400">sec</span>
                      </div>
                    </AppleGroupedRow>

                    <AppleGroupedRow
                      icon={<Zap className="w-4 h-4 text-[#34C759]" />}
                      iconBg="bg-emerald-600/30"
                      title="Reward Points"
                      subtitle="Points credited immediately to balance"
                    >
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          value={tier.points}
                          onChange={(e) => {
                            const newTiers = [...settings.ratingTiers];
                            newTiers[index].points = Number(e.target.value);
                            setSettings({ ...settings, ratingTiers: newTiers });
                          }}
                          className="w-20 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-[#34C759] font-bold text-center outline-none focus:border-[#34C759]"
                        />
                        <span className="text-xs text-[#34C759]">pts</span>
                      </div>
                    </AppleGroupedRow>
                  </AppleGroupedSection>
                ))}
              </div>
            </div>
          )}

          {/* ===================== PANE 3: REWARDS & BUNDLES ===================== */}
          {activePane === "rewards" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Rewards & Incentives
                </h2>
                <p className="text-sm text-[#8e8e93]">
                  Configure reward bundles, tiered milestone levels, and mystery gift prize pool.
                </p>
              </div>

              {/* Point Bundles Section */}
              <AppleGroupedSection
                title="Classic Point Bundles"
                description="Students redeem points in increments of this bundle limit to earn physical or classroom incentives."
              >
                <AppleGroupedRow
                  icon={<Package className="w-4 h-4" />}
                  iconBg="bg-purple-500"
                  title="Bundle Target Limit"
                  subtitle="Points required to unlock one bundle"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={settings.bundleLimit}
                      onChange={(e) =>
                        setSettings({ ...settings, bundleLimit: Number(e.target.value) })
                      }
                      className="w-24 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-purple-300 font-bold text-right outline-none focus:border-purple-400"
                    />
                    <span className="text-xs text-neutral-400">pts</span>
                  </div>
                </AppleGroupedRow>

                <AppleGroupedRow
                  icon={<Gift className="w-4 h-4" />}
                  iconBg="bg-fuchsia-500"
                  title="Bundle Incentive Item"
                  subtitle="Name or emoji of the item granted upon reaching target"
                >
                  <input
                    type="text"
                    value={settings.bundleItemName}
                    onChange={(e) =>
                      setSettings({ ...settings, bundleItemName: e.target.value })
                    }
                    placeholder="e.g. 🍫 Chocolate"
                    className="w-48 sm:w-64 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-medium outline-none focus:border-purple-400"
                  />
                </AppleGroupedRow>
              </AppleGroupedSection>

              {/* Unlimited Weekly Scoring & Records (★ Top week) */}
              <AppleGroupedSection
                title="Unlimited Weekly Scoring & Records (★ Top week)"
                description="Students score unlimited points each week. Differences against Last Week and ★ Top week records are automatically tracked and compared across teacher and student dashboards."
              >
                <AppleGroupedRow
                  icon={<Sparkles className="w-4 h-4" />}
                  iconBg="bg-amber-500"
                  title="Weekly Target Points"
                  subtitle="Standard weekly target milestone"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={settings.weeklyTargetPoints ?? 5000}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          weeklyTargetPoints: Number(e.target.value),
                        })
                      }
                      className="w-24 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold text-right outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-neutral-400">pts</span>
                  </div>
                </AppleGroupedRow>

                {(settings.tieredRewards || []).map((reward: any, index: number) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-bold shrink-0">
                        {index + 1}
                      </div>
                      <input
                        type="text"
                        value={reward.name}
                        onChange={(e) => {
                          const newRewards = [...(settings.tieredRewards || [])];
                          newRewards[index] = { ...newRewards[index], name: e.target.value };
                          setSettings({ ...settings, tieredRewards: newRewards });
                        }}
                        placeholder={`Level ${index + 1} Name`}
                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-medium outline-none focus:border-fuchsia-400 w-48"
                      />
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="text-xs text-neutral-400">Requires:</span>
                      <input
                        type="number"
                        value={reward.points}
                        onChange={(e) => {
                          const newRewards = [...(settings.tieredRewards || [])];
                          newRewards[index] = {
                            ...newRewards[index],
                            points: Number(e.target.value),
                          };
                          setSettings({ ...settings, tieredRewards: newRewards });
                        }}
                        className="w-20 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-fuchsia-300 font-bold text-right outline-none focus:border-fuchsia-400"
                      />
                      <span className="text-xs text-neutral-400">pts</span>
                    </div>
                  </div>
                ))}
              </AppleGroupedSection>

              {/* Mystery Gifts Inventory */}
              <AppleGroupedSection
                title="Mystery Gifts Inventory"
                description="List of random rewards students can draw from mystery boxes (one prize per line)."
              >
                <div className="p-4">
                  <textarea
                    rows={5}
                    value={(settings.mysteryGifts || []).join("\n")}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        mysteryGifts: e.target.value.split("\n"),
                      })
                    }
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-neutral-200 font-mono leading-relaxed outline-none focus:border-[#0A84FF] transition-all resize-none"
                    placeholder="e.g. 10 mins free game time&#10;Choose today's playlist&#10;Special avatar badge"
                  />
                </div>
              </AppleGroupedSection>
            </div>
          )}

          {/* ===================== PANE 4: WORLD BUILDER ===================== */}
          {activePane === "builder" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  World Builder Settings
                </h2>
                <p className="text-sm text-[#8e8e93]">
                  Configure block placement costs, land upgrades, custom quotes, and placeable 3D decorative items.
                </p>
              </div>

              {/* Economy & Placement Costs */}
              <AppleGroupedSection
                title="Construction Economy & Costs"
                description="Defines point consumption when students build structures in the 3D World Builder."
              >
                <AppleGroupedRow
                  icon={<Boxes className="w-4 h-4" />}
                  iconBg="bg-teal-500"
                  title="Block Placement Cost"
                  subtitle="Points deducted for placing a standard voxel block"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={settings.builderBlockCost}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          builderBlockCost: Number(e.target.value),
                        })
                      }
                      className="w-20 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-[#34C759] font-bold text-right outline-none focus:border-teal-400"
                    />
                    <span className="text-xs text-neutral-400">pts</span>
                  </div>
                </AppleGroupedRow>

                <AppleGroupedRow
                  icon={<Boxes className="w-4 h-4" />}
                  iconBg="bg-teal-600"
                  title="Large Roof Structure Cost"
                  subtitle="Points deducted when deploying a large pre-fabricated roof"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={settings.builderRoofCost ?? 100}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          builderRoofCost: Number(e.target.value),
                        })
                      }
                      className="w-20 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-[#34C759] font-bold text-right outline-none focus:border-teal-400"
                    />
                    <span className="text-xs text-neutral-400">pts</span>
                  </div>
                </AppleGroupedRow>

                <AppleGroupedRow
                  icon={<Palette className="w-4 h-4" />}
                  iconBg="bg-pink-500"
                  title="Custom Hex Color Cost"
                  subtitle="Points required to unlock custom hex palette picker"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={settings.customColorCost}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          customColorCost: Number(e.target.value),
                        })
                      }
                      className="w-20 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-pink-300 font-bold text-right outline-none focus:border-pink-400"
                    />
                    <span className="text-xs text-neutral-400">pts</span>
                  </div>
                </AppleGroupedRow>

                <AppleGroupedRow
                  icon={<Compass className="w-4 h-4" />}
                  iconBg="bg-emerald-500"
                  title="Land Upgrade Size & Cost"
                  subtitle="Block increment and points price per land expansion"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={settings.landUpgradeAmount ?? 50}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            landUpgradeAmount: Number(e.target.value),
                          })
                        }
                        className="w-16 bg-black/40 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white font-bold text-center outline-none focus:border-emerald-400"
                      />
                      <span className="text-[11px] text-neutral-400">blocks</span>
                    </div>
                    <span className="text-neutral-500">/</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={settings.landUpgradeCost ?? 1000}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            landUpgradeCost: Number(e.target.value),
                          })
                        }
                        className="w-20 bg-black/40 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-emerald-400 font-bold text-right outline-none focus:border-emerald-400"
                      />
                      <span className="text-[11px] text-neutral-400">pts</span>
                    </div>
                  </div>
                </AppleGroupedRow>

                <AppleGroupedRow
                  icon={<Sparkles className="w-4 h-4" />}
                  iconBg="bg-indigo-500"
                  title="3D Scene Motivational Quote"
                  subtitle="Floating text billboard displayed in the builder world"
                >
                  <input
                    type="text"
                    value={settings.builderQuote || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, builderQuote: e.target.value })
                    }
                    placeholder="e.g. For my beloved Parents ❤️👨‍👩‍👧‍👦✨"
                    className="w-48 sm:w-72 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-medium outline-none focus:border-indigo-400"
                  />
                </AppleGroupedRow>
              </AppleGroupedSection>

              {/* Decorative Items & Refund System */}
              <AppleGroupedSection
                title="Decorative 3D Items"
                description="Custom assets and placeable items students can purchase in the builder catalog."
                action={
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        builderItems: [
                          ...(settings.builderItems || []),
                          {
                            id: `item-${Date.now()}`,
                            name: "New Item",
                            emoji: "📦",
                            cost: 100,
                            refundOnErase: 50,
                            width: 1,
                            height: 1,
                            depth: 1,
                          },
                        ],
                      })
                    }
                    className="text-xs text-[#0A84FF] hover:text-[#0071e3] font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                }
              >
                <AppleGroupedRow
                  icon={<RotateCcw className="w-4 h-4" />}
                  iconBg="bg-amber-600"
                  title="Erase Block Refund"
                  subtitle="Points returned when erasing an existing block"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={settings.builderBlockRefund ?? 0}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          builderBlockRefund: Number(e.target.value),
                        })
                      }
                      className="w-20 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-bold text-right outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-neutral-400">pts</span>
                  </div>
                </AppleGroupedRow>

                {(settings.builderItems || []).map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex flex-col gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={item.emoji}
                        onChange={(e) => {
                          const items = [...settings.builderItems];
                          items[index].emoji = e.target.value;
                          setSettings({ ...settings, builderItems: items });
                        }}
                        className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 text-center text-lg outline-none focus:border-[#0A84FF]"
                      />
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const items = [...settings.builderItems];
                          items[index].name = e.target.value;
                          setSettings({ ...settings, builderItems: items });
                        }}
                        placeholder="Item Name"
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-medium outline-none focus:border-[#0A84FF]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const items = settings.builderItems.filter(
                            (_: any, i: number) => i !== index
                          );
                          setSettings({ ...settings, builderItems: items });
                        }}
                        className="p-2 rounded-lg text-rose-500/70 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                      <div>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                          Cost (pts)
                        </span>
                        <input
                          type="number"
                          value={item.cost}
                          onChange={(e) => {
                            const items = [...settings.builderItems];
                            items[index].cost = Number(e.target.value);
                            setSettings({ ...settings, builderItems: items });
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-[#34C759] font-bold outline-none focus:border-[#34C759]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                          Erase Refund
                        </span>
                        <input
                          type="number"
                          value={item.refundOnErase}
                          onChange={(e) => {
                            const items = [...settings.builderItems];
                            items[index].refundOnErase = Number(e.target.value);
                            setSettings({ ...settings, builderItems: items });
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-bold outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                          Width (W)
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          value={item.width}
                          onChange={(e) => {
                            const items = [...settings.builderItems];
                            items[index].width = Number(e.target.value);
                            setSettings({ ...settings, builderItems: items });
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-medium outline-none focus:border-[#0A84FF]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                          Height (H)
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          value={item.height}
                          onChange={(e) => {
                            const items = [...settings.builderItems];
                            items[index].height = Number(e.target.value);
                            setSettings({ ...settings, builderItems: items });
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-medium outline-none focus:border-[#0A84FF]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                          Depth (D)
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          value={item.depth}
                          onChange={(e) => {
                            const items = [...settings.builderItems];
                            items[index].depth = Number(e.target.value);
                            setSettings({ ...settings, builderItems: items });
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-medium outline-none focus:border-[#0A84FF]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </AppleGroupedSection>
            </div>
          )}

          {/* ===================== PANE 5: GENERAL & TIMERS ===================== */}
          {activePane === "general" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  General & Session Controls
                </h2>
                <p className="text-sm text-[#8e8e93]">
                  System-wide session privileges and interaction permissions.
                </p>
              </div>

              <AppleGroupedSection
                title="Timer & Remote Controls"
                description="When enabled, students can directly stop or pause question countdown timers from their client device."
              >
                <AppleGroupedRow
                  icon={<Clock className="w-4 h-4" />}
                  iconBg="bg-blue-500"
                  title="Allow Students to Stop Timer Remotely"
                  subtitle="Permits students to interactively pause quiz clock"
                >
                  <CupertinoSwitch
                    checked={settings.allowStudentToStopTimer || false}
                    onChange={(val) =>
                      setSettings({ ...settings, allowStudentToStopTimer: val })
                    }
                    ariaLabel="Allow Students to Stop Timer Remotely"
                  />
                </AppleGroupedRow>
              </AppleGroupedSection>
            </div>
          )}
        </section>
      </main>

      {/* ========================================================================= */}
      {/* --- APPLE MODAL SHEET: ADD STUDENT --- */}
      {/* ========================================================================= */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#1c1c1e] border border-white/15 shadow-[0_24px_48px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
            {/* Sheet Navigation Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#252528]/80">
              <button
                type="button"
                onClick={() => setIsAddStudentOpen(false)}
                className="text-xs font-medium text-[#8e8e93] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <h3 className="text-sm font-semibold text-white">New Student</h3>
              <button
                type="button"
                onClick={handleAddStudent}
                disabled={loading || !newStudentName || !newStudentPassword}
                className="text-xs font-semibold text-[#0A84FF] hover:text-[#0071e3] disabled:opacity-40 transition-colors"
              >
                Create
              </button>
            </div>

            {/* Sheet Body */}
            <form onSubmit={handleAddStudent} className="p-6 flex flex-col gap-4">
              <AppleGroupedSection title="Account Credentials">
                <div className="px-4 py-3 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Student Name
                  </label>
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    required
                    autoFocus
                    className="bg-transparent text-sm text-white font-medium outline-none placeholder-neutral-600"
                  />
                </div>
                <div className="px-4 py-3 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Login Password
                  </label>
                  <input
                    type="text"
                    value={newStudentPassword}
                    onChange={(e) => setNewStudentPassword(e.target.value)}
                    placeholder="e.g. 1234"
                    required
                    className="bg-transparent text-sm text-white font-medium outline-none placeholder-neutral-600"
                  />
                </div>
              </AppleGroupedSection>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- APPLE MODAL SHEET: EDIT STUDENT INSPECTOR --- */}
      {/* ========================================================================= */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-lg animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[92vh] rounded-[2rem] bg-[#1c1c1e] border border-white/15 shadow-[0_32px_64px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
            {/* Sheet Navigation Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#242426]/90 sticky top-0 z-10">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="text-xs font-medium text-[#8e8e93] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <div className="text-center">
                <h3 className="text-sm font-semibold text-white">Student Profile</h3>
                <span className="text-[11px] text-[#8e8e93]">{editingStudent.name}</span>
              </div>
              <button
                type="button"
                onClick={handleUpdateStudent}
                disabled={loading}
                className="text-xs font-bold text-[#0A84FF] hover:text-[#0071e3] transition-colors"
              >
                Done
              </button>
            </div>

            {/* Sheet Body Scrollable Content */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              {/* Avatar & Basic Credentials */}
              <AppleGroupedSection title="Student Identity">
                <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
                  <div className="relative group shrink-0 self-center sm:self-auto">
                    {editingStudent.profileImageUrl ? (
                      <img
                        src={editingStudent.profileImageUrl}
                        alt={editingStudent.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-white/20 shadow-md"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-inner">
                        {editingStudent.name ? editingStudent.name.charAt(0).toUpperCase() : "S"}
                      </div>
                    )}
                    <label className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                      <Camera className="w-5 h-5 text-white" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setLoading(true);
                            const compressedFile = await compressImage(file, 800);
                            const formData = new FormData();
                            formData.append("file", compressedFile);
                            const res = await fetch("/api/upload", {
                              method: "POST",
                              body: formData,
                            });
                            const data = await res.json();
                            if (data.secure_url) {
                              setEditingStudent({
                                ...editingStudent,
                                profileImageUrl: data.secure_url,
                              });
                              showToast("Profile image uploaded");
                            } else {
                              alert("Upload failed: " + (data.error || "Unknown error"));
                            }
                          } catch (err) {
                            alert("Failed to upload image.");
                          } finally {
                            setLoading(false);
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                        Full Name
                      </span>
                      <input
                        type="text"
                        value={editingStudent.name}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, name: e.target.value })
                        }
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-semibold outline-none focus:border-[#0A84FF]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                        Password
                      </span>
                      <input
                        type="text"
                        value={editingStudent.password}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, password: e.target.value })
                        }
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-semibold outline-none focus:border-[#0A84FF]"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs text-neutral-400">Custom Avatar URL</span>
                  <input
                    type="text"
                    value={editingStudent.profileImageUrl || ""}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        profileImageUrl: e.target.value,
                      })
                    }
                    placeholder="https://…"
                    className="w-full sm:w-64 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-neutral-300 font-mono outline-none focus:border-[#0A84FF]"
                  />
                </div>
              </AppleGroupedSection>

              {/* Point Balances & Reward Mode */}
              <AppleGroupedSection title="Gamification & Economy">
                <AppleGroupedRow
                  icon={<Zap className="w-4 h-4 text-[#34C759]" />}
                  iconBg="bg-emerald-600/30"
                  title="Current Point Balance"
                  subtitle="Spendable points balance in builder & pet"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={editingStudent.pointsBalance}
                      onChange={(e) =>
                        setEditingStudent({
                          ...editingStudent,
                          pointsBalance: Number(e.target.value),
                        })
                      }
                      className="w-24 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#34C759] font-bold text-right outline-none focus:border-[#34C759]"
                    />
                    <span className="text-xs text-neutral-400">pts</span>
                  </div>
                </AppleGroupedRow>

                <AppleGroupedRow
                  icon={<Award className="w-4 h-4 text-[#0A84FF]" />}
                  iconBg="bg-blue-600/30"
                  title="Lifetime Points"
                  subtitle="Total career points accumulated"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={editingStudent.lifetimePoints}
                      onChange={(e) =>
                        setEditingStudent({
                          ...editingStudent,
                          lifetimePoints: Number(e.target.value),
                        })
                      }
                      className="w-24 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#0A84FF] font-bold text-right outline-none focus:border-[#0A84FF]"
                    />
                    <span className="text-xs text-neutral-400">pts</span>
                  </div>
                </AppleGroupedRow>

                <AppleGroupedRow
                  icon={<Package className="w-4 h-4 text-purple-400" />}
                  iconBg="bg-purple-600/30"
                  title="Reward Progression System"
                  subtitle="Choose whether rewards follow classic bundles or unlimited weekly tracking"
                >
                  <AppleSegmentedControl
                    options={[
                      { value: "classic", label: "Classic Bundles" },
                      { value: "tiered", label: "Unlimited (★ Top week)" },
                    ]}
                    value={editingStudent.rewardSystem || "classic"}
                    onChange={(val) =>
                      setEditingStudent({ ...editingStudent, rewardSystem: val })
                    }
                  />
                </AppleGroupedRow>
              </AppleGroupedSection>

              {/* Manners Feature */}
              <AppleGroupedSection
                title="Good Manners Feature"
                description="Allows parents to evaluate homework, manners, and daily goals via a dedicated tokenized link."
              >
                <AppleGroupedRow
                  icon={<Sparkles className="w-4 h-4 text-amber-300" />}
                  iconBg="bg-amber-600/30"
                  title="Enable Manners Tracking"
                  subtitle="Enables star rating sheet for this student"
                >
                  <CupertinoSwitch
                    checked={editingStudent.mannersEnabled || false}
                    onChange={(checked) =>
                      setEditingStudent({ ...editingStudent, mannersEnabled: checked })
                    }
                    ariaLabel="Enable Manners Tracking"
                  />
                </AppleGroupedRow>

                {editingStudent.mannersEnabled && (
                  <div className="p-4 flex flex-col gap-3 bg-black/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-300">
                        ⭐ Manners Tasks Checklist
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingStudent({
                            ...editingStudent,
                            mannersList: [
                              ...(editingStudent.mannersList || []),
                              { id: `task-${Date.now()}`, task: "New Task", maxStars: 1 },
                            ],
                          })
                        }
                        className="text-xs font-medium text-amber-400 hover:text-amber-200 bg-amber-500/10 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Task</span>
                      </button>
                    </div>

                    {(editingStudent.mannersList || []).map((task: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 bg-[#242426] p-2.5 rounded-xl border border-white/[0.06]"
                      >
                        <input
                          type="text"
                          value={task.task}
                          placeholder="Task Description"
                          onChange={(e) => {
                            const tasks = [...editingStudent.mannersList];
                            tasks[index].task = e.target.value;
                            setEditingStudent({ ...editingStudent, mannersList: tasks });
                          }}
                          className="flex-1 bg-transparent text-xs text-white font-medium outline-none"
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-neutral-400 font-semibold uppercase">
                            Max:
                          </span>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={task.maxStars}
                            onChange={(e) => {
                              const tasks = [...editingStudent.mannersList];
                              tasks[index].maxStars = Number(e.target.value);
                              setEditingStudent({ ...editingStudent, mannersList: tasks });
                            }}
                            className="w-12 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1 text-xs text-amber-300 font-bold text-center outline-none"
                          />
                          <span className="text-xs text-neutral-400">⭐</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const tasks = editingStudent.mannersList.filter(
                              (_: any, i: number) => i !== index
                            );
                            setEditingStudent({ ...editingStudent, mannersList: tasks });
                          }}
                          className="text-neutral-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </AppleGroupedSection>

              {/* Spaced Repetition / Revision Feature */}
              <AppleGroupedSection
                title="Spaced Repetition & Revision"
                description="Automatically schedules periodic revision flashcards to reinforce memory over expanding day intervals."
              >
                <AppleGroupedRow
                  icon={<Clock className="w-4 h-4 text-violet-400" />}
                  iconBg="bg-violet-600/30"
                  title="Enable Spaced Repetition"
                  subtitle="Activate repetition review queue for this student"
                >
                  <CupertinoSwitch
                    checked={editingStudent.revisionEnabled || false}
                    onChange={async (enabled) => {
                      setEditingStudent({ ...editingStudent, revisionEnabled: enabled });
                      await fetch("/api/revision/student-settings", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          studentId: editingStudent._id,
                          revisionEnabled: enabled,
                        }),
                      });
                      showToast(
                        enabled
                          ? "Revision active for student"
                          : "Revision paused for student"
                      );
                    }}
                    ariaLabel="Enable Spaced Repetition"
                  />
                </AppleGroupedRow>

                {editingStudent.revisionEnabled && (
                  <div className="p-4 flex flex-col gap-3 bg-black/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-violet-300">
                        Review Intervals (day sequence)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const currentDays =
                            editingStudent.revisionRewindDays || [1, 2, 7, 14, 30, 90];
                          const lastVal =
                            currentDays.length > 0
                              ? currentDays[currentDays.length - 1]
                              : 30;
                          const nextVal =
                            lastVal < 30
                              ? lastVal + 7
                              : lastVal < 90
                              ? lastVal + 30
                              : lastVal + 90;
                          setEditingStudent({
                            ...editingStudent,
                            revisionRewindDays: [...currentDays, nextVal],
                          });
                        }}
                        className="text-xs font-medium text-violet-400 hover:text-violet-200 bg-violet-500/10 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Interval</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(editingStudent.revisionRewindDays || [1, 2, 7, 14, 30, 90]).map(
                        (day: number, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#252528] rounded-xl border border-white/10 group"
                          >
                            <input
                              type="number"
                              min="1"
                              value={day}
                              onChange={(e) => {
                                const days = [
                                  ...(editingStudent.revisionRewindDays || [
                                    1, 2, 7, 14, 30, 90,
                                  ]),
                                ];
                                days[i] = Math.max(1, Number(e.target.value));
                                setEditingStudent({
                                  ...editingStudent,
                                  revisionRewindDays: days,
                                });
                              }}
                              className="w-12 bg-transparent text-xs text-violet-300 font-bold text-center outline-none"
                            />
                            <span className="text-[11px] text-neutral-500">days</span>
                            {(editingStudent.revisionRewindDays || [1, 2, 7, 14, 30, 90])
                              .length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const days = (
                                    editingStudent.revisionRewindDays || [
                                      1, 2, 7, 14, 30, 90,
                                    ]
                                  ).filter((_: number, idx: number) => idx !== i);
                                  setEditingStudent({
                                    ...editingStudent,
                                    revisionRewindDays: days,
                                  });
                                }}
                                className="text-neutral-500 hover:text-rose-400 ml-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </AppleGroupedSection>

              {/* Danger Zone */}
              <AppleGroupedSection title="Danger Zone">
                <AppleGroupedRow
                  icon={<Trash2 className="w-4 h-4 text-rose-500" />}
                  iconBg="bg-rose-500/20"
                  title="Delete Student Account"
                  subtitle="Permanently deletes account and quiz history"
                >
                  <button
                    type="button"
                    onClick={() => handleDeleteStudent(editingStudent._id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-semibold transition-colors"
                  >
                    Delete Account
                  </button>
                </AppleGroupedRow>
              </AppleGroupedSection>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
