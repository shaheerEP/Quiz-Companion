"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ShieldCheck, Plus, Trash2, Edit2, LogOut, X, Check, Users } from "lucide-react";

type Teacher = { _id: string; username: string; createdAt: string; studentCount?: number };

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== "admin") {
        router.push("/login");
      } else {
        fetchTeachers();
      }
    }
  }, [user, loading, router]);

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/admin/teachers");
      if (res.ok) {
        setTeachers(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername, password: newPassword }),
    });
    if (res.ok) {
      setIsAdding(false);
      setNewUsername("");
      setNewPassword("");
      fetchTeachers();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add teacher");
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm("Are you sure you want to delete this teacher? All their data may become orphaned.")) return;
    await fetch(`/api/admin/teachers/${id}`, { method: "DELETE" });
    fetchTeachers();
  };

  const handleEditClick = (teacher: Teacher) => {
    setEditingTeacherId(teacher._id);
    setEditUsername(teacher.username);
    setEditPassword(""); // Leave empty unless they want to change it
  };

  const handleSaveEdit = async (id: string) => {
    const updateData: any = {};
    if (editUsername.trim()) updateData.username = editUsername.trim();
    if (editPassword.trim()) updateData.password = editPassword.trim();

    if (Object.keys(updateData).length === 0) {
      setEditingTeacherId(null);
      return;
    }

    const res = await fetch(`/api/admin/teachers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });

    if (res.ok) {
      setEditingTeacherId(null);
      fetchTeachers();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to update teacher");
    }
  };

  if (loading || !user || user.role !== "admin") return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <div className="bg-amber-600 p-2 rounded-xl">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white">Super Admin</h1>
          </div>
          <button onClick={logout} className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold transition-colors border border-gray-800">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </header>

        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Manage Teachers</h2>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors"
            >
              <Plus className="w-5 h-5" /> Add Teacher
            </button>
          </div>

          {isAdding && (
            <form onSubmit={handleAddTeacher} className="bg-gray-950 p-6 rounded-2xl mb-6 border border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">New Teacher</h3>
                <button type="button" onClick={() => setIsAdding(false)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {error && <div className="text-red-500 text-sm font-bold mb-4">{error}</div>}
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500"
                  required
                />
                <button type="submit" className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-colors">
                  Save
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {teachers.map((teacher) => (
              <div key={teacher._id} className="flex flex-col md:flex-row md:justify-between md:items-center bg-gray-950 p-4 rounded-2xl border border-gray-800 gap-4">
                {editingTeacherId === teacher._id ? (
                  <div className="flex-1 flex flex-col md:flex-row gap-3 w-full">
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="Username"
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-bold outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="New password (leave blank to keep)"
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500 text-sm"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(teacher._id)} className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors">
                        <Check className="w-5 h-5" />
                      </button>
                      <button onClick={() => setEditingTeacherId(null)} className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="text-white font-bold text-lg">{teacher.username}</div>
                        <div className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded-md text-xs font-bold text-gray-300">
                          <Users className="w-3 h-3 text-indigo-400" />
                          {teacher.studentCount || 0} Students
                        </div>
                      </div>
                      <div className="text-gray-500 text-sm mt-1">Created: {new Date(teacher.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditClick(teacher)} className="p-2 text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeleteTeacher(teacher._id)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {teachers.length === 0 && !isAdding && (
              <div className="text-center py-10 text-gray-500 font-bold">No teachers found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
