"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  NotebookPen,
  Check,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  X,
  Loader2,
} from "lucide-react";

export interface StudentNoteItem {
  id: string;
  text: string;
  isCheckbox: boolean;
  checked: boolean;
  createdAt?: string | Date;
}

interface StudentNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  students?: any[];
  onSelectStudent?: (studentId: string) => void;
}

export default function StudentNotesModal({
  isOpen,
  onClose,
  student,
  students = [],
  onSelectStudent,
}: StudentNotesModalProps) {
  const [notesText, setNotesText] = useState("");
  const [items, setItems] = useState<StudentNoteItem[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const [isCheckboxMode, setIsCheckboxMode] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [loading, setLoading] = useState(false);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentStudentIdRef = useRef<string | null>(null);

  // Fetch student notes on open or student change
  useEffect(() => {
    if (!isOpen || !student?._id) return;

    currentStudentIdRef.current = student._id;
    setLoading(true);

    fetch(`/api/notes?studentId=${student._id}`)
      .then((res) => res.json())
      .then((data) => {
        if (currentStudentIdRef.current === student._id) {
          setNotesText(data.notesText || "");
          setItems(data.notes || []);
        }
      })
      .catch((err) => console.error("Failed to load notes", err))
      .finally(() => setLoading(false));
  }, [isOpen, student?._id]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, notesText, student?._id]);

  // Debounced auto-save for notesText
  const triggerSaveNotesText = (text: string) => {
    if (!student?._id) return;
    setSaveStatus("saving");

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch("/api/notes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: student._id,
            notesText: text,
          }),
        });

        setSaveStatus("saved");
        if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
        statusTimerRef.current = setTimeout(() => setSaveStatus("idle"), 1500);
      } catch (err) {
        console.error("Auto-save failed", err);
        setSaveStatus("idle");
      }
    }, 500);
  };

  const handleNotesTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotesText(val);
    triggerSaveNotesText(val);
  };

  const handleClose = () => {
    if (saveTimerRef.current && student?._id) {
      clearTimeout(saveTimerRef.current);
      fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student._id,
          notesText,
        }),
      }).catch(console.error);
    }
    onClose();
  };

  // Add new item
  const handleAddItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newItemText.trim() || !student?._id) return;

    const textToAdd = newItemText.trim();
    setNewItemText("");

    const tempId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newItem: StudentNoteItem = {
      id: tempId,
      text: textToAdd,
      isCheckbox: isCheckboxMode,
      checked: false,
      createdAt: new Date(),
    };

    setItems((prev) => [...prev, newItem]);
    setSaveStatus("saving");

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student._id,
          text: textToAdd,
          isCheckbox: isCheckboxMode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.notes) {
          setItems(data.notes);
        }
        setSaveStatus("saved");
        if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
        statusTimerRef.current = setTimeout(() => setSaveStatus("idle"), 1500);
      }
    } catch (err) {
      console.error("Failed to add note item", err);
      setSaveStatus("idle");
    }
  };

  // Toggle checkbox checked/unchecked
  const handleToggleCheck = async (noteId: string) => {
    if (!student?._id) return;

    const targetItem = items.find((i) => i.id === noteId);
    if (!targetItem) return;

    const nextChecked = !targetItem.checked;
    setItems((prev) =>
      prev.map((item) =>
        item.id === noteId ? { ...item, checked: nextChecked } : item
      )
    );

    try {
      await fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student._id,
          noteId,
          checked: nextChecked,
        }),
      });
    } catch (err) {
      console.error("Failed to toggle check", err);
    }
  };

  // Toggle isCheckbox mode for an individual item
  const handleToggleItemCheckbox = async (noteId: string) => {
    if (!student?._id) return;

    const targetItem = items.find((i) => i.id === noteId);
    if (!targetItem) return;

    const nextIsCheckbox = !targetItem.isCheckbox;
    setItems((prev) =>
      prev.map((item) =>
        item.id === noteId
          ? { ...item, isCheckbox: nextIsCheckbox, checked: nextIsCheckbox ? item.checked : false }
          : item
      )
    );

    try {
      await fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student._id,
          noteId,
          isCheckbox: nextIsCheckbox,
          checked: nextIsCheckbox ? targetItem.checked : false,
        }),
      });
    } catch (err) {
      console.error("Failed to toggle item checkbox mode", err);
    }
  };

  // Inline edit item text
  const handleItemTextChange = (noteId: string, text: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === noteId ? { ...item, text } : item))
    );
  };

  const handleItemBlur = async (noteId: string, text: string) => {
    if (!student?._id) return;
    try {
      await fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student._id,
          noteId,
          text,
        }),
      });
    } catch (err) {
      console.error("Failed to update item text", err);
    }
  };

  // Delete item
  const handleDeleteItem = async (noteId: string) => {
    if (!student?._id) return;

    setItems((prev) => prev.filter((item) => item.id !== noteId));

    try {
      await fetch(`/api/notes?studentId=${student._id}&noteId=${noteId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete item", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 shrink-0">
              <NotebookPen className="w-4 h-4" />
            </div>

            {students.length > 1 && onSelectStudent ? (
              <select
                value={student?._id || ""}
                onChange={(e) => onSelectStudent(e.target.value)}
                className="bg-transparent font-black text-base sm:text-lg text-white outline-none cursor-pointer truncate max-w-[200px] sm:max-w-[260px]"
              >
                {students.map((s) => (
                  <option key={s._id} value={s._id} className="bg-slate-900 text-white font-bold">
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <h2 className="font-black text-base sm:text-lg text-white tracking-tight truncate">
                {student?.name || "Student"}
              </h2>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {saveStatus === "saving" && (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            )}
            {saveStatus === "saved" && (
              <Check className="w-4 h-4 text-emerald-400" />
            )}

            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            </div>
          ) : (
            <>
              {/* Freeform Notes Textarea */}
              <textarea
                value={notesText}
                onChange={handleNotesTextChange}
                placeholder="Note..."
                rows={3}
                className="w-full bg-slate-950/70 border border-white/10 rounded-2xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 resize-none transition-all leading-relaxed"
              />

              {/* Add item row */}
              <form onSubmit={handleAddItem} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCheckboxMode(!isCheckboxMode)}
                  title={isCheckboxMode ? "Checkbox" : "Note"}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                    isCheckboxMode
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : "bg-slate-950/60 border-white/10 text-slate-500 hover:text-white"
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="..."
                  className="flex-1 bg-slate-950/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 transition-all"
                />

                <button
                  type="submit"
                  disabled={!newItemText.trim()}
                  className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-md shadow-amber-500/20 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              {/* Items List */}
              {items.length > 0 && (
                <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`group flex items-center justify-between gap-2 p-2 rounded-xl border transition-all ${
                        item.checked
                          ? "bg-slate-950/30 border-white/5 opacity-60"
                          : "bg-slate-950/60 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {item.isCheckbox ? (
                          <button
                            type="button"
                            onClick={() => handleToggleCheck(item.id)}
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              item.checked
                                ? "bg-amber-500 border-amber-500 text-slate-950"
                                : "border-slate-600 hover:border-amber-400 bg-slate-900"
                            }`}
                          >
                            {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-amber-400/80 mx-1.5 shrink-0" />
                        )}

                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => handleItemTextChange(item.id, e.target.value)}
                          onBlur={(e) => handleItemBlur(item.id, e.target.value)}
                          className={`w-full bg-transparent border-0 outline-none text-sm transition-all focus:bg-slate-900/80 focus:px-2 focus:py-0.5 focus:rounded-lg ${
                            item.checked
                              ? "line-through text-slate-500"
                              : "text-slate-200"
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleToggleItemCheckbox(item.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-300 hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          {item.isCheckbox ? (
                            <CheckSquare className="w-3.5 h-3.5 text-amber-400/80" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
