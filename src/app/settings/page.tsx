"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { User, Gift, Save, Trash2, Edit2, Link as LinkIcon, Package } from "lucide-react";

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

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [originalSettings, setOriginalSettings] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");

  const [withdrawStudentId, setWithdrawStudentId] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [withdrawReason, setWithdrawReason] = useState("");

  const [editingStudent, setEditingStudent] = useState<any>(null);

  useEffect(() => {
    fetch("/api/settings").then(res => res.json()).then(data => { 
      setSettings(data); 
      setOriginalSettings(JSON.parse(JSON.stringify(data))); 
    });
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
    setOriginalSettings(JSON.parse(JSON.stringify(settings)));
    setLoading(false);
    alert("Settings saved successfully!");
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

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
        lifetimePoints: editingStudent.lifetimePoints,
        rewardSystem: editingStudent.rewardSystem,
        profileImageUrl: editingStudent.profileImageUrl,
        mannersEnabled: editingStudent.mannersEnabled
      })
    });
    setEditingStudent(null);
    await fetchStudents();
    setLoading(false);
    alert("Student updated successfully!");
  };

  if (!settings) return <div className="min-h-screen bg-gray-950 text-white"><Navbar /><div className="p-10 font-bold text-xl">Loading configuration...</div></div>;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col relative">
      <Navbar />

      {hasChanges && (
        <button 
          onClick={handleSave} disabled={loading}
          className="fixed top-24 right-10 z-50 bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-full font-black transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.4)] border-2 border-emerald-400 flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          {loading ? "Saving..." : "Save App Settings"}
        </button>
      )}

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
                    {students?.map(s => <option key={s._id} value={s._id}>{s.name} ({s.pointsBalance} pts available)</option>)}
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
                {students?.map(student => (
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
                          <div>
                            <label className="text-xs text-purple-400 font-bold mb-1 block">Reward System</label>
                            <select 
                              value={editingStudent.rewardSystem || 'classic'} onChange={e => setEditingStudent({...editingStudent, rewardSystem: e.target.value})}
                              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-purple-500 appearance-none"
                            >
                              <option value="classic">Classic (Bundles)</option>
                              <option value="tiered">Tiered (Levels)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-yellow-400 font-bold mb-1 block">Manners Feature</label>
                            <label className="flex items-center gap-2 mt-2 cursor-pointer">
                              <input 
                                type="checkbox" checked={editingStudent.mannersEnabled || false} 
                                onChange={e => setEditingStudent({...editingStudent, mannersEnabled: e.target.checked})}
                                className="w-5 h-5 text-yellow-500 rounded focus:ring-yellow-500 focus:ring-2 bg-gray-900 border-gray-700"
                              />
                              <span className="text-sm font-bold text-gray-300">Enable</span>
                            </label>
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-cyan-400 font-bold mb-1 block">Profile Image URL (or upload via Cloudinary)</label>
                            <div className="flex gap-2">
                              <input 
                                type="text" value={editingStudent.profileImageUrl || ''} onChange={e => setEditingStudent({...editingStudent, profileImageUrl: e.target.value})} placeholder="https://..."
                                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-cyan-500"
                              />
                              <label className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-xl cursor-pointer flex items-center justify-center transition-colors">
                                Upload
                                <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  
                                  try {
                                    setLoading(true);
                                    const compressedFile = await compressImage(file, 800);
                                    
                                    const formData = new FormData();
                                    formData.append("file", compressedFile);
                                    
                                    const res = await fetch(`/api/upload`, { method: "POST", body: formData });
                                    const data = await res.json();
                                    
                                    if (data.secure_url) {
                                      setEditingStudent({...editingStudent, profileImageUrl: data.secure_url});
                                    } else {
                                      alert("Upload failed: " + (data.error || "Unknown error"));
                                    }
                                  } catch (err) {
                                    alert("Upload failed. Check console.");
                                    console.error(err);
                                  } finally {
                                    setLoading(false);
                                  }
                                }} />
                              </label>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
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
                          <button onClick={() => {
                            const token = btoa(student._id.toString());
                            const url = `${window.location.origin}/api/auth/magic?token=${token}`;
                            navigator.clipboard.writeText(url);
                            alert("Login Magic Link Copied! Send this to the student.");
                          }} className="bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white p-2 rounded-lg transition-colors" title="Copy Login Magic Link">
                            <LinkIcon className="w-4 h-4" />
                          </button>
                          {student.mannersEnabled && (
                            <button onClick={() => {
                              const token = btoa(student._id.toString());
                              const url = `${window.location.origin}/manners/${token}`;
                              navigator.clipboard.writeText(url);
                              alert("Manners Magic Link Copied! Send this to the parents.");
                            }} className="bg-yellow-500/10 hover:bg-yellow-600 text-yellow-400 hover:text-white p-2 rounded-lg transition-colors" title="Copy Manners Magic Link">
                              <span className="font-bold text-xs">⭐</span>
                            </button>
                          )}
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] shadow-lg">
            <h2 className="text-2xl font-black text-gray-200 mb-6 border-b border-gray-800 pb-4">Gamified Rating Tiers</h2>
            <div className="flex flex-col gap-6">
              {settings.ratingTiers?.map((tier: any, index: number) => (
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
              <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                <h2 className="text-2xl font-black text-gray-200 flex items-center gap-3">
                  <div className="bg-yellow-500/20 p-2 rounded-lg">⭐</div>
                  Manners Tasks
                </h2>
                <button 
                  onClick={() => setSettings({...settings, mannersList: [...(settings.mannersList || []), { id: `task-${Date.now()}`, task: "New Task", maxStars: 1 }]})}
                  className="bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 px-3 py-1 rounded-lg text-sm font-bold transition-colors"
                >
                  + Add Task
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {settings.mannersList?.map((task: any, index: number) => (
                  <div key={index} className="flex flex-wrap items-center gap-3 bg-gray-950 p-4 rounded-xl border border-gray-800">
                    <input 
                      type="text" value={task.task} placeholder="Task Name"
                      onChange={e => {
                        const tasks = [...settings.mannersList];
                        tasks[index].task = e.target.value;
                        setSettings({...settings, mannersList: tasks});
                      }}
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-yellow-500"
                    />
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Max Stars</label>
                      <input type="number" value={task.maxStars} min="1" max="10"
                        onChange={e => { const tasks = [...settings.mannersList]; tasks[index].maxStars = Number(e.target.value); setSettings({...settings, mannersList: tasks}); }}
                        className="w-20 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-yellow-400 text-sm font-bold outline-none focus:border-yellow-500"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const tasks = settings.mannersList.filter((_: any, i: number) => i !== index);
                        setSettings({...settings, mannersList: tasks});
                      }}
                      className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 p-2 rounded-lg mt-4"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(!settings.mannersList || settings.mannersList.length === 0) && (
                  <p className="text-gray-500 text-sm italic">No manners tasks added. Click "+ Add Task" to create one.</p>
                )}
              </div>
            </div>

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

            <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] shadow-lg mt-2">
              <h2 className="text-2xl font-black text-gray-200 mb-6 border-b border-gray-800 pb-4 flex items-center gap-3">
                <div className="bg-purple-500/20 p-2 rounded-lg"><Package className="w-5 h-5 text-purple-400" /></div>
                Point Bundles & Controls
              </h2>
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Bundle Limit (pts)</label>
                    <input 
                      type="number" value={settings.bundleLimit}
                      onChange={e => setSettings({...settings, bundleLimit: Number(e.target.value)})}
                      className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white font-black outline-none focus:border-purple-500 transition-colors text-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Bundle Item</label>
                    <input 
                      type="text" value={settings.bundleItemName}
                      onChange={e => setSettings({...settings, bundleItemName: e.target.value})}
                      placeholder="e.g. 🍫 Chocolate"
                      className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-purple-500 transition-colors text-xl"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-950 p-4 rounded-xl border border-gray-700">
                  <input 
                    type="checkbox" checked={settings.allowStudentToStopTimer}
                    onChange={e => setSettings({...settings, allowStudentToStopTimer: e.target.checked})}
                    className="w-6 h-6 text-indigo-500 rounded focus:ring-indigo-500 focus:ring-2 bg-gray-900 border-gray-700 cursor-pointer"
                  />
                  <label className="text-sm text-gray-300 font-bold">Allow Students to Stop Timer Remotely</label>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] shadow-lg mt-2">
              <h2 className="text-2xl font-black text-gray-200 mb-6 border-b border-gray-800 pb-4 flex items-center gap-3">
                <div className="bg-fuchsia-500/20 p-2 rounded-lg"><Package className="w-5 h-5 text-fuchsia-400" /></div>
                Tiered Reward Levels
              </h2>
              <div className="flex flex-col gap-6">
                <div>
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Weekly Target Points</label>
                  <input 
                    type="number" value={settings.weeklyTargetPoints ?? 5000}
                    onChange={e => setSettings({...settings, weeklyTargetPoints: Number(e.target.value)})}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white font-black outline-none focus:border-fuchsia-500 transition-colors text-xl"
                  />
                </div>
                {settings.tieredRewards?.map((reward: any, index: number) => (
                  <div key={index} className="grid grid-cols-2 gap-4 bg-gray-950 p-4 rounded-xl border border-gray-800">
                    <div>
                      <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Level {index + 1} Name</label>
                      <input 
                        type="text" value={reward.name}
                        onChange={e => {
                          const newRewards = [...(settings.tieredRewards || [])];
                          newRewards[index] = { ...newRewards[index], name: e.target.value };
                          setSettings({...settings, tieredRewards: newRewards});
                        }}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-fuchsia-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-fuchsia-400 font-bold uppercase mb-1 block">Points Required</label>
                      <input 
                        type="number" value={reward.points}
                        onChange={e => {
                          const newRewards = [...(settings.tieredRewards || [])];
                          newRewards[index] = { ...newRewards[index], points: Number(e.target.value) };
                          setSettings({...settings, tieredRewards: newRewards});
                        }}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-fuchsia-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] shadow-lg mt-2">
              <h2 className="text-2xl font-black text-gray-200 mb-6 border-b border-gray-800 pb-4 flex items-center gap-3">
                <div className="bg-cyan-500/20 p-2 rounded-lg"><Package className="w-5 h-5 text-cyan-400" /></div>
                World Builder Settings
              </h2>
              <div className="flex flex-col gap-6">
                <div>
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Block Placement Cost (pts)</label>
                  <input 
                    type="number" value={settings.builderBlockCost}
                    onChange={e => setSettings({...settings, builderBlockCost: Number(e.target.value)})}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white font-black outline-none focus:border-cyan-500 transition-colors text-xl"
                  />
                </div>

                <div className="mt-4">
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Large Roof Cost (pts)</label>
                  <p className="text-xs text-gray-400 mb-2">Points required for a student to build a large roof.</p>
                  <input 
                    type="number" value={settings.builderRoofCost ?? 100}
                    onChange={e => setSettings({...settings, builderRoofCost: Number(e.target.value)})}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white font-black outline-none focus:border-cyan-500 transition-colors text-xl"
                  />
                </div>
                
                <div className="mt-4">
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Custom Color Cost (pts)</label>
                  <p className="text-xs text-gray-400 mb-2">Points required for a student to buy any custom hex color.</p>
                  <input 
                    type="number" value={settings.customColorCost}
                    onChange={e => setSettings({...settings, customColorCost: Number(e.target.value)})}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-emerald-400 font-black outline-none focus:border-cyan-500 transition-colors text-xl"
                  />
                </div>

                <div className="mt-4">
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Land Upgrade Amount (blocks)</label>
                  <p className="text-xs text-gray-400 mb-2">How much land size increases per upgrade.</p>
                  <input 
                    type="number" value={settings.landUpgradeAmount ?? 50}
                    onChange={e => setSettings({...settings, landUpgradeAmount: Number(e.target.value)})}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-emerald-400 font-black outline-none focus:border-cyan-500 transition-colors text-xl"
                  />
                </div>

                <div className="mt-4">
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Land Upgrade Cost (pts)</label>
                  <p className="text-xs text-gray-400 mb-2">Points required for a student to expand their land.</p>
                  <input 
                    type="number" value={settings.landUpgradeCost ?? 1000}
                    onChange={e => setSettings({...settings, landUpgradeCost: Number(e.target.value)})}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-emerald-400 font-black outline-none focus:border-cyan-500 transition-colors text-xl"
                  />
                </div>

                <div className="mt-4">
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Motivational Quote</label>
                  <p className="text-xs text-gray-400 mb-2">A 3D text displayed near the builder scene (e.g. 'Build for your beloved Mom').</p>
                  <input 
                    type="text" value={settings.builderQuote || ''}
                    onChange={e => setSettings({...settings, builderQuote: e.target.value})}
                    placeholder="e.g. Build for your beloved Mom"
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-cyan-500 transition-colors text-xl"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] shadow-lg mt-2">
              <h2 className="text-2xl font-black text-gray-200 mb-6 border-b border-gray-800 pb-4 flex items-center gap-3">
                <div className="bg-amber-500/20 p-2 rounded-lg"><Package className="w-5 h-5 text-amber-400" /></div>
                Decorative Items & Eraser
              </h2>
              <div className="flex flex-col gap-6">
                <div>
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Block Erase Refund (pts returned when erasing a block)</label>
                  <input 
                    type="number" value={settings.builderBlockRefund ?? 0}
                    onChange={e => setSettings({...settings, builderBlockRefund: Number(e.target.value)})}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white font-black outline-none focus:border-amber-500 transition-colors text-xl"
                  />
                </div>

                <div className="mt-2">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-300">Placeable Items</h3>
                    <button 
                      onClick={() => setSettings({...settings, builderItems: [...(settings.builderItems || []), { id: `item-${Date.now()}`, name: "New Item", emoji: "📦", cost: 100, refundOnErase: 50, width: 1, height: 1, depth: 1 }]})}
                      className="bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 px-3 py-1 rounded-lg text-sm font-bold transition-colors"
                    >
                      + Add Item
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {settings.builderItems?.map((item: any, index: number) => (
                      <div key={index} className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <input 
                            type="text" value={item.emoji} placeholder="Emoji"
                            onChange={e => {
                              const items = [...settings.builderItems];
                              items[index].emoji = e.target.value;
                              setSettings({...settings, builderItems: items});
                            }}
                            className="w-14 bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-white text-center text-xl outline-none focus:border-amber-500"
                          />
                          <input 
                            type="text" value={item.name} placeholder="Item Name"
                            onChange={e => {
                              const items = [...settings.builderItems];
                              items[index].name = e.target.value;
                              setSettings({...settings, builderItems: items});
                            }}
                            className="flex-1 min-w-[100px] bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500"
                          />
                          <button 
                            onClick={() => {
                              const items = settings.builderItems.filter((_: any, i: number) => i !== index);
                              setSettings({...settings, builderItems: items});
                            }}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 p-2 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Cost</label>
                            <input type="number" value={item.cost}
                              onChange={e => { const items = [...settings.builderItems]; items[index].cost = Number(e.target.value); setSettings({...settings, builderItems: items}); }}
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-emerald-400 text-sm font-bold outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Erase Refund</label>
                            <input type="number" value={item.refundOnErase}
                              onChange={e => { const items = [...settings.builderItems]; items[index].refundOnErase = Number(e.target.value); setSettings({...settings, builderItems: items}); }}
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-amber-400 text-sm font-bold outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Width</label>
                            <input type="number" step="0.1" value={item.width}
                              onChange={e => { const items = [...settings.builderItems]; items[index].width = Number(e.target.value); setSettings({...settings, builderItems: items}); }}
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Height</label>
                            <input type="number" step="0.1" value={item.height}
                              onChange={e => { const items = [...settings.builderItems]; items[index].height = Number(e.target.value); setSettings({...settings, builderItems: items}); }}
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Depth</label>
                            <input type="number" step="0.1" value={item.depth}
                              onChange={e => { const items = [...settings.builderItems]; items[index].depth = Number(e.target.value); setSettings({...settings, builderItems: items}); }}
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
