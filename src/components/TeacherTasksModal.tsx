"use client";

import React, { useState, useEffect } from "react";
import { Check, Trash2, Plus, X, Sparkles, Repeat, Award, CheckCircle2, User, Users } from "lucide-react";
import confetti from "canvas-confetti";

interface TaskItem {
  id: string;
  title: string;
  points: number;
  isRepeatable: boolean;
  completed: boolean;
  completedCount?: number;
  lastCompletedAt?: string;
  completedToday?: boolean;
}

interface TeacherTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  onStudentUpdated?: (updatedStudent: any) => void;
}

export default function TeacherTasksModal({
  isOpen,
  onClose,
  student,
  onStudentUpdated,
}: TeacherTasksModalProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("50");
  const [isRepeatable, setIsRepeatable] = useState(false);
  const [assignTarget, setAssignTarget] = useState<"single" | "all">("single");
  const [submitting, setSubmitting] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!student?._id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?studentId=${student._id}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && student?._id) {
      fetchTasks();
      setStatusMessage(null);
    }
  }, [isOpen, student?._id]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting || !student?._id) return;
    setSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: assignTarget === "all" ? "all" : student._id,
          title: title.trim(),
          points: parseInt(points, 10) || 10,
          isRepeatable,
        }),
      });

      if (res.ok) {
        setTitle("");
        setPoints("50");
        setStatusMessage(
          assignTarget === "all"
            ? "Task assigned to all students successfully! 🎉"
            : "Task added successfully! 🎉"
        );
        await fetchTasks();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to create task");
      }
    } catch (err) {
      console.error("Error creating task:", err);
      alert("Failed to create task. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks?studentId=${student._id}&taskId=${taskId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      } else {
        alert("Failed to delete task");
      }
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const handleCompleteTask = async (task: TaskItem) => {
    if (completingTaskId || !student?._id) return;
    if (!task.isRepeatable && task.completed) return;

    setCompletingTaskId(task.id);
    try {
      const res = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student._id,
          taskId: task.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        setStatusMessage(data.message || `+${task.points} pts awarded! 🎉`);

        // Refresh task list
        await fetchTasks();

        // Notify parent to refresh student state
        if (data.student && onStudentUpdated) {
          onStudentUpdated(data.student);
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to complete task");
      }
    } catch (err) {
      console.error("Error completing task:", err);
    } finally {
      setCompletingTaskId(null);
    }
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Tasks & Points
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Manage tasks and assign reward points for <span className="text-amber-300 font-bold">{student.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {statusMessage && (
            <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Form to Add Task */}
          <form
            onSubmit={handleCreateTask}
            className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 flex flex-col gap-4"
          >
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Write a New Task & Assign Points
            </span>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Task description (e.g. Read 2 chapters of book, Practice piano)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="flex-1 px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />

              <div className="flex items-center gap-2 shrink-0">
                <div className="relative w-28">
                  <input
                    type="number"
                    min="1"
                    placeholder="Points"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    required
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    pts
                  </span>
                </div>
              </div>
            </div>

            {/* Repeatable Toggle & Target Selection */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Type:</span>
                <div className="flex items-center p-1 bg-slate-900 border border-white/5 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setIsRepeatable(false)}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      !isRepeatable
                        ? "bg-amber-500 text-slate-950 shadow-md font-black"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    ⭐ One-Time
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRepeatable(true)}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      isRepeatable
                        ? "bg-indigo-600 text-white shadow-md font-black"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Repeat className="w-3 h-3" /> Repeatable
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Assign to:</span>
                <div className="flex items-center p-1 bg-slate-900 border border-white/5 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setAssignTarget("single")}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      assignTarget === "single"
                        ? "bg-slate-700 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <User className="w-3 h-3" /> {student.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignTarget("all")}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      assignTarget === "all"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Users className="w-3 h-3" /> All Students
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="ml-auto px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{submitting ? "Adding..." : "Add Task"}</span>
              </button>
            </div>
          </form>

          {/* Current Tasks List */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Assigned Tasks ({tasks.length})
            </span>

            {loading ? (
              <div className="text-center py-8 text-slate-500 text-xs font-bold">
                Loading tasks...
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-white/5 flex flex-col items-center gap-2 text-slate-500">
                <Award className="w-8 h-8 text-slate-600" />
                <p className="text-xs font-bold">No tasks assigned yet.</p>
                <p className="text-[11px]">Add a task above to award points when completed!</p>
              </div>
            ) : (
              tasks.map((task) => {
                const isCompleted = !task.isRepeatable && task.completed;
                const isCompletedToday = task.isRepeatable && task.completedToday;

                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isCompleted
                        ? "bg-slate-950/40 border-white/5 opacity-70"
                        : isCompletedToday
                        ? "bg-indigo-950/30 border-indigo-500/30"
                        : "bg-slate-900 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {/* Left: Tick mark button */}
                    <button
                      type="button"
                      onClick={() => handleCompleteTask(task)}
                      disabled={isCompleted || completingTaskId === task.id}
                      title={
                        isCompleted
                          ? "Completed"
                          : isCompletedToday
                          ? "Completed today (Click to complete again)"
                          : "Click to complete and add points!"
                      }
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                        isCompleted
                          ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 cursor-default"
                          : isCompletedToday
                          ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:scale-105 active:scale-95"
                          : "bg-slate-800 hover:bg-emerald-600 border border-white/10 hover:border-emerald-400 text-slate-400 hover:text-white active:scale-95"
                      }`}
                    >
                      <Check className={`w-5 h-5 ${isCompleted ? "stroke-[3]" : "stroke-[2.5]"}`} />
                    </button>

                    {/* Middle: Title & Badges */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-bold truncate ${
                            isCompleted ? "line-through text-slate-500" : "text-white"
                          }`}
                        >
                          {task.title}
                        </span>

                        {/* Points badge */}
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-black shrink-0">
                          +{task.points} pts
                        </span>

                        {/* Type badge */}
                        {task.isRepeatable ? (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold flex items-center gap-1 shrink-0">
                            <Repeat className="w-2.5 h-2.5" /> Repeatable
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold shrink-0">
                            ⭐ One-Time
                          </span>
                        )}

                        {/* Status badge */}
                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black shrink-0">
                            ✓ Done
                          </span>
                        )}
                        {isCompletedToday && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold shrink-0">
                            ✓ Completed Today ({task.completedCount || 1}x)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Click the tick mark (`✓`) to award points anytime!</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
