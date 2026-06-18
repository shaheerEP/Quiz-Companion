"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ShieldCheck, Plus, Trash2, Edit2, LogOut } from "lucide-react";

type Teacher = { _id: string; username: string; createdAt: string };

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

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
    if (!confirm("Are you sure you want to delete this teacher?")) return;
    await fetch(`/api/admin/teachers/${id}`, { method: "DELETE" });
    fetchTeachers();
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
              <h3 className="text-lg font-bold text-white mb-4">New Teacher</h3>
              {error && <div className="text-red-500 text-sm font-bold mb-4">{error}</div>}
              <div className="flex gap-4">
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
              <div key={teacher._id} className="flex justify-between items-center bg-gray-950 p-4 rounded-2xl border border-gray-800">
                <div>
                  <div className="text-white font-bold text-lg">{teacher.username}</div>
                  <div className="text-gray-500 text-sm">Created: {new Date(teacher.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDeleteTeacher(teacher._id)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
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
