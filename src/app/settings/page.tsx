"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then(res => res.json()).then(setSettings);
  }, []);

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

  const handleSeedDatabase = async () => {
    if (confirm("Are you sure? This will wipe the current DB and seed it with demo students.")) {
      await fetch("/api/seed", { method: "POST" });
      alert("Database seeded! Head back to the dashboard to test.");
    }
  };

  if (!settings) return <div className="min-h-screen bg-gray-950 text-white"><Navbar /><div className="p-10 font-bold text-xl">Loading configuration...</div></div>;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full flex flex-col gap-10">
        <div className="flex items-center justify-between bg-gray-900 border border-gray-800 p-6 rounded-[2rem] shadow-lg">
          <h1 className="text-3xl font-black text-white ml-2">Dashboard Configuration</h1>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-black transition-colors disabled:opacity-50 shadow-lg shadow-indigo-500/20"
          >
            {loading ? "Saving..." : "Save Changes"}
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
                        type="text" 
                        value={tier.name}
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
                        type="number" 
                        value={tier.maxSeconds}
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
                        type="number" 
                        value={tier.points}
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
              <p className="text-sm font-bold text-gray-400 mb-4">Enter one reward per line. A random gift will be selected during the Grand Finale.</p>
              <textarea 
                rows={6}
                value={settings.mysteryGifts.join("\n")}
                onChange={e => {
                  setSettings({...settings, mysteryGifts: e.target.value.split("\n")});
                }}
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
                    type="number" 
                    value={settings.badgeThresholds.finaleQuestionCount}
                    onChange={e => {
                      setSettings({
                        ...settings, 
                        badgeThresholds: { ...settings.badgeThresholds, finaleQuestionCount: Number(e.target.value) }
                      });
                    }}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white font-black outline-none focus:border-indigo-500 transition-colors text-2xl"
                  />
                  <p className="text-xs text-gray-500 mt-2">Required questions to trigger finale.</p>
                </div>
                <div>
                  <label className="text-xs text-yellow-500 font-bold uppercase tracking-wider mb-2 block">Champion Speed (s)</label>
                  <input 
                    type="number" 
                    value={settings.badgeThresholds.speedThreshold}
                    onChange={e => {
                      setSettings({
                        ...settings, 
                        badgeThresholds: { ...settings.badgeThresholds, speedThreshold: Number(e.target.value) }
                      });
                    }}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white font-black outline-none focus:border-indigo-500 transition-colors text-2xl"
                  />
                  <p className="text-xs text-gray-500 mt-2">Max avg time to get Master badge.</p>
                </div>
              </div>
            </div>

            <div className="bg-rose-950/20 border border-rose-900/50 p-8 rounded-[2rem] shadow-lg">
              <h2 className="text-2xl font-black text-rose-500 mb-6 border-b border-rose-900/50 pb-4">Danger Zone</h2>
              <p className="text-sm text-gray-400 mb-6 font-medium">Use this to reset the database and inject sample student data for testing.</p>
              <button 
                onClick={handleSeedDatabase}
                className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-4 rounded-xl font-black transition-colors w-full shadow-lg shadow-rose-500/20"
              >
                Reset & Seed Demo Database
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
