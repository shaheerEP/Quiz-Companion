"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { User, Gift, Save, Trash2, Edit2 } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");

  const [withdrawStudentId, setWithdrawStudentId] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [withdrawReason, setWithdrawReason] = useState("");

  const [editingStudent, setEditingStudent] = useState<any>(null);

  useEffect(() => {
    fetch("/api/settings").then(res => res.json()).then(setSettings);
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    fetch("/api/students").then(res => res.json()).then(setStudents);
  };

  const handleSave = async () => {
    setLoading(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    setLoading(false);
    alert("Settings saved successfully!");
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentPassword) return;
    setLoading(true);
    await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newStudentName, password: newStudentPassword })
    });
    setNewStudentName("");
    setNewStudentPassword("");
    await fetchStudents();
    setLoading(false);
    alert("Student added successfully!");
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawStudentId || withdrawAmount <= 0 || !withdrawReason) return;
    setLoading(true);
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        studentId: withdrawStudentId, 
        pointsDeducted: withdrawAmount, 
        rewardDescription: withdrawReason 
      })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      alert("Error: " + data.error);
    } else {
      alert("Points withdrawn successfully!");
      setWithdrawAmount(0);
      setWithdrawReason("");
      await fetchStudents();
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Are you sure you want to completely delete this student?")) return;
    setLoading(true);
    await fetch(`/api/students?id=${id}`, { method: "DELETE" });
    await fetchStudents();
    setLoading(false);
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
        lifetimePoints: editingStudent.lifetimePoints
      })
    });
    setEditingStudent(null);
    await fetchStudents();
    setLoading(false);
    alert("Student updated successfully!");
  };

  if (!settings) return <div className="min-h-screen bg-gray-950 text-white"><Navbar /><div className="p-10 font-bold text-xl">Loading configuration...</div></div>;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full flex flex-col gap-10">
        
        {/* STUDENT MANAGEMENT & WITHDRAWALS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="flex flex-col gap-8">
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] shadow-lg">
              <h2 className="text-2xl font-black text-gray-200 mb-6 border-b border-gray-800 pb-4 flex items-center gap-3">
                <div className="bg-indigo-500/20 p-2 rounded-lg"><User className="w-5 h-5 text-indigo-400" /></div>
                Create Student
              </h2>
              <form onSubmit={handleAddStudent} className="flex flex-col gap-5">
                <div>
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Student Name</label>
                  <input 
                    type="text" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} required
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Login Password</label>
                  <input 
                    type="text" value={newStudentPassword} onChange={e => setNewStudentPassword(e.target.value)} required
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <button disabled={loading} type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-4 rounded-xl font-black transition-colors w-full mt-2 shadow-lg shadow-indigo-500/20">
                  Create Student
                </button>
              </form>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] shadow-lg">
              <h2 className="text-2xl font-black text-gray-200 mb-6 border-b border-gray-800 pb-4 flex items-center gap-3">
                <div className="bg-emerald-500/20 p-2 rounded-lg"><Gift className="w-5 h-5 text-emerald-400" /></div>
                Withdraw Points
              </h2>
              <form onSubmit={handleWithdraw} className="flex flex-col gap-5">
                <div>
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Select Student</label>
                  <select 
                    value={withdrawStudentId} onChange={e => setWithdrawStudentId(e.target.value)} required
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-emerald-500 transition-colors appearance-none"
                  >
                    <option value="">Select...</option>
                    {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.pointsBalance} pts available)</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Points to Deduct</label>
                    <input 
                      type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(Number(e.target.value))} required min={1}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-emerald-400 font-black outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Reward (Reason)</label>
                    <input 
                      type="text" value={withdrawReason} onChange={e => setWithdrawReason(e.target.value)} required placeholder="e.g. Stickers"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
                <button disabled={loading} type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-4 rounded-xl font-black transition-colors w-full mt-2 shadow-lg shadow-emerald-500/20">
                  Redeem Reward
                </button>
              </form>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] shadow-lg max-h-[850px] overflow-y-auto">
            <h2 className="text-2xl font-black text-gray-200 mb-6 border-b border-gray-800 pb-4">Existing Students</h2>
            {students.length === 0 ? (
              <p className="text-gray-500 italic text-center py-4">No students added yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {students.map(student => (
                  <div key={student._id} className="bg-gray-950 border border-gray-800 p-5 rounded-2xl">
                    {editingStudent?._id === student._id ? (
                      <form onSubmit={handleUpdateStudent} className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-gray-500 font-bold mb-1 block">Name</label>
                            <input 
                              type="text" value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} required
                              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 font-bold mb-1 block">Password</label>
                            <input 
                              type="text" value={editingStudent.password} onChange={e => setEditingStudent({...editingStudent, password: e.target.value})} required
                              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-emerald-500 font-bold mb-1 block">Balance (pts)</label>
                            <input 
                              type="number" value={editingStudent.pointsBalance} onChange={e => setEditingStudent({...editingStudent, pointsBalance: e.target.value})} required
                              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-indigo-400 font-bold mb-1 block">Lifetime (pts)</label>
                            <input 
                              type="number" value={editingStudent.lifetimePoints} onChange={e => setEditingStudent({...editingStudent, lifetimePoints: e.target.value})} required
                              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2">
                            <Save className="w-4 h-4" /> Save
                          </button>
                          <button type="button" onClick={() => setEditingStudent(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 rounded-xl">
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-black text-white">{student.name}</p>
                          <p className="text-sm text-gray-500 font-bold">Pass: <span className="text-gray-300">{student.password}</span></p>
                          <p className="text-sm text-gray-500 font-bold mt-1">
                            Balance: <span className="text-emerald-400">{student.pointsBalance} pts</span> <span className="mx-1">•</span> Lifetime: <span className="text-indigo-400">{student.lifetimePoints} pts</span>
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => setEditingStudent(student)} className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors" title="Edit Student">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteStudent(student._id)} className="bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white p-2 rounded-lg transition-colors" title="Delete Student">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* EXISTING CONFIGURATION SETTINGS */}
        <div className="flex items-center justify-between bg-gray-900 border border-gray-800 p-6 rounded-[2rem] shadow-lg mt-4">
          <h1 className="text-3xl font-black text-white ml-2">App Configuration</h1>
          <button 
            onClick={handleSave} disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-black transition-colors shadow-lg shadow-indigo-500/20"
          >
            {loading ? "Saving..." : "Save App Settings"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] shadow-lg">
            <h2 className="text-2xl font-black text-gray-200 mb-6 border-b border-gray-800 pb-4">Gamified Rating Tiers</h2>
            <div className="flex flex-col gap-6">
              {settings.ratingTiers.map((tier: any, index: number) => (
                <div key={index} className="bg-gray-950 p-6 rounded-2xl border border-gray-800">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
                    <span className="font-black text-xl text-yellow-400">{tier.stars} Stars Output</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-3">
                      <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Compliment / Title</label>
                      <input 
                        type="text" value={tier.name}
                        onChange={e => {
                          const newTiers = [...settings.ratingTiers];
                          newTiers[index].name = e.target.value;
                          setSettings({...settings, ratingTiers: newTiers});
                        }}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Max Time (sec)</label>
                      <input 
                        type="number" value={tier.maxSeconds}
                        onChange={e => {
                          const newTiers = [...settings.ratingTiers];
                          newTiers[index].maxSeconds = Number(e.target.value);
                          setSettings({...settings, ratingTiers: newTiers});
                        }}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-emerald-500 font-bold uppercase tracking-wider mb-2 block">Reward Points</label>
                      <input 
                        type="number" value={tier.points}
                        onChange={e => {
                          const newTiers = [...settings.ratingTiers];
                          newTiers[index].points = Number(e.target.value);
                          setSettings({...settings, ratingTiers: newTiers});
                        }}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] shadow-lg">
              <h2 className="text-2xl font-black text-gray-200 mb-6 border-b border-gray-800 pb-4">Mystery Gifts Inventory</h2>
              <textarea 
                rows={6} value={settings.mysteryGifts.join("\n")}
                onChange={e => setSettings({...settings, mysteryGifts: e.target.value.split("\n")})}
                className="w-full bg-gray-950 border border-gray-700 rounded-2xl px-5 py-4 text-white font-medium outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed"
                placeholder="e.g. 10 mins free game time"
              />
            </div>

            <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] shadow-lg">
              <h2 className="text-2xl font-black text-gray-200 mb-6 border-b border-gray-800 pb-4">Grand Finale Triggers</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Questions per Session</label>
                  <input 
                    type="number" value={settings.badgeThresholds.finaleQuestionCount}
                    onChange={e => setSettings({...settings, badgeThresholds: { ...settings.badgeThresholds, finaleQuestionCount: Number(e.target.value) }})}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white font-black outline-none focus:border-indigo-500 transition-colors text-2xl"
                  />
                </div>
                <div>
                  <label className="text-xs text-yellow-500 font-bold uppercase tracking-wider mb-2 block">Champion Speed (s)</label>
                  <input 
                    type="number" value={settings.badgeThresholds.speedThreshold}
                    onChange={e => setSettings({...settings, badgeThresholds: { ...settings.badgeThresholds, speedThreshold: Number(e.target.value) }})}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white font-black outline-none focus:border-indigo-500 transition-colors text-2xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
