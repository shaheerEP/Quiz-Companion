"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Store, Backpack, Sparkles, AlertCircle } from "lucide-react";

// Pet definitions
const PET_TYPES = {
  dragon: { name: "Dragon", stages: ["🥚", "🦎", "🐉"], color: "emerald" },
  robot: { name: "Robot", stages: ["⚙️", "🤖", "🦾"], color: "blue" },
  alien: { name: "Alien", stages: ["☄️", "👽", "🛸"], color: "purple" }
};

// Shop items
const SHOP_ITEMS = [
  { id: "hat_cap", name: "Cool Cap", icon: "🧢", price: 50, type: "hat" },
  { id: "hat_top", name: "Top Hat", icon: "🎩", price: 100, type: "hat" },
  { id: "hat_crown", name: "Crown", icon: "👑", price: 300, type: "hat" },
  { id: "env_space", name: "Space BG", icon: "🌌", price: 200, type: "env" },
  { id: "env_forest", name: "Forest BG", icon: "🌲", price: 200, type: "env" },
];

export default function PetDashboard() {
  const { user, refreshAuth } = useAuth();
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pet" | "shop" | "inventory">("pet");
  const [actionMessage, setActionMessage] = useState<{text: string, type: 'success'|'error'} | null>(null);

  const fetchStudentData = async () => {
    if (!user) return;
    try {
      // Need a way to fetch the specific student. Let's fetch all and filter for now,
      // or we can just use the user context if it contains updated info.
      // Wait, the AuthContext `user` might have `student` data attached. Let's see.
      const res = await fetch("/api/students");
      const students = await res.json();
      const currentStudent = students.find((s: any) => s._id === user.id);
      if (currentStudent) {
        // Auto-evolve check
        let newLevel = 1;
        if (currentStudent.lifetimePoints >= 1500) newLevel = 3;
        else if (currentStudent.lifetimePoints >= 500) newLevel = 2;

        if (currentStudent.pet && currentStudent.pet.level !== newLevel && currentStudent.pet.level < 3) {
          // Evolve!
          const updatedStudent = await fetch("/api/students", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: user.id,
              pet: { ...currentStudent.pet, level: newLevel }
            })
          }).then(r => r.json());
          setStudentData(updatedStudent);
          showMessage(`Your pet evolved to Level ${newLevel}! 🎉`, "success");
        } else {
          setStudentData(currentStudent);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
    // Poll every 5s just in case points update
    const interval = setInterval(fetchStudentData, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const showMessage = (text: string, type: 'success'|'error') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleAdopt = async (type: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user?.id,
          pet: {
            type,
            name: `My ${PET_TYPES[type as keyof typeof PET_TYPES].name}`,
            level: 1,
          },
          inventory: []
        })
      });
      if (res.ok) {
        await fetchStudentData();
        showMessage(`You adopted a ${PET_TYPES[type as keyof typeof PET_TYPES].name}!`, "success");
      }
    } catch (e) {
      showMessage("Failed to adopt pet.", "error");
    }
    setLoading(false);
  };

  const handleBuy = async (item: typeof SHOP_ITEMS[0]) => {
    if (!studentData) return;
    if (studentData.pointsBalance < item.price) {
      showMessage("Not enough points!", "error");
      return;
    }
    if (studentData.inventory.includes(item.id)) {
      showMessage("You already own this item!", "error");
      return;
    }

    try {
      // Deduct points, add to inventory
      const res = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user?.id,
          pointsBalance: studentData.pointsBalance - item.price,
          inventory: [...studentData.inventory, item.id]
        })
      });

      if (res.ok) {
        // Optional: log withdrawal
        await fetch("/api/withdrawals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: user?.id,
            pointsDeducted: item.price,
            rewardDescription: `Bought ${item.name} for pet`
          })
        });

        await fetchStudentData();
        showMessage(`Bought ${item.name}!`, "success");
      }
    } catch (e) {
      showMessage("Purchase failed.", "error");
    }
  };

  const handleEquip = async (itemId: string, type: string) => {
    if (!studentData || !studentData.pet) return;
    
    const newPet = { ...studentData.pet };
    if (type === "hat") {
      newPet.equippedHat = newPet.equippedHat === itemId ? null : itemId; // Toggle
    } else if (type === "env") {
      newPet.equippedEnvironment = newPet.equippedEnvironment === itemId ? null : itemId;
    }

    try {
      const res = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user?.id,
          pet: newPet
        })
      });
      if (res.ok) {
        await fetchStudentData();
      }
    } catch (e) {}
  };

  if (!user || user.role !== "student") return null;

  if (loading && !studentData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const hasPet = !!studentData?.pet?.type;
  const petDef = hasPet ? PET_TYPES[studentData.pet.type as keyof typeof PET_TYPES] : null;
  const currentStage = hasPet ? petDef?.stages[studentData.pet.level - 1] : "";
  const equippedHatIcon = hasPet && studentData.pet.equippedHat ? SHOP_ITEMS.find(i => i.id === studentData.pet.equippedHat)?.icon : null;
  const equippedEnvIcon = hasPet && studentData.pet.equippedEnvironment ? SHOP_ITEMS.find(i => i.id === studentData.pet.equippedEnvironment)?.icon : null;

  // Next level threshold
  const nextLevelPts = studentData?.pet?.level === 1 ? 500 : studentData?.pet?.level === 2 ? 1500 : null;
  const levelProgress = nextLevelPts ? Math.min(100, (studentData.lifetimePoints / nextLevelPts) * 100) : 100;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full flex flex-col gap-8">
        
        {/* Header & Balance */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">My Pet Companion</h1>
            <p className="text-indigo-400 font-bold mt-2">Take care of your digital friend!</p>
          </div>
          <div className="bg-gray-900 border border-indigo-500/30 px-6 py-3 rounded-2xl flex flex-col">
            <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Points Balance</span>
            <span className="text-3xl font-black text-yellow-400">{studentData?.pointsBalance || 0} pts</span>
          </div>
        </div>

        {actionMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-xl font-bold flex items-center gap-2 ${actionMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}
          >
            {actionMessage.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            {actionMessage.text}
          </motion.div>
        )}

        {!hasPet ? (
          // Adoption Center
          <div className="bg-gray-900 border border-gray-800 p-10 rounded-[3rem] shadow-xl text-center">
            <h2 className="text-3xl font-black text-white mb-4">Welcome to the Adoption Center</h2>
            <p className="text-gray-400 mb-10 max-w-2xl mx-auto">Choose your first digital companion. It will grow and evolve as you earn points in your classes!</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(PET_TYPES).map(([key, pet]) => (
                <div key={key} className={`bg-gray-950 border border-gray-800 hover:border-${pet.color}-500/50 p-8 rounded-3xl transition-all cursor-pointer group flex flex-col items-center justify-between`} onClick={() => handleAdopt(key)}>
                  <div className="text-8xl mb-6 group-hover:scale-110 transition-transform origin-bottom">{pet.stages[0]}</div>
                  <h3 className={`text-2xl font-black text-${pet.color}-400 mb-2`}>{pet.name} Egg</h3>
                  <p className="text-gray-500 text-sm font-bold">Evolves into a {pet.name}</p>
                  <button className={`mt-6 w-full bg-${pet.color}-600/20 text-${pet.color}-400 hover:bg-${pet.color}-600 hover:text-white py-3 rounded-xl font-bold transition-colors`}>
                    Adopt
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Pet Dashboard
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Pet Display */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-gray-900 border border-gray-800 p-10 rounded-[3rem] shadow-xl relative overflow-hidden h-[400px] flex items-center justify-center">
                {/* Environment Background */}
                {equippedEnvIcon ? (
                  <div className="absolute inset-0 opacity-20 text-[30rem] leading-none flex items-center justify-center pointer-events-none select-none filter blur-sm">
                    {equippedEnvIcon}
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-b from-gray-800/50 to-transparent"></div>
                )}
                
                {/* Pet Container */}
                <div className="relative z-10 flex flex-col items-center">
                  <motion.div 
                    animate={{ y: [0, -15, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="relative flex items-center justify-center"
                  >
                    <div className="text-[10rem] leading-none select-none filter drop-shadow-2xl text-center">
                      {currentStage}
                    </div>
                    {/* Equipped Hat */}
                    {equippedHatIcon && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-7xl select-none z-20 drop-shadow-lg pointer-events-none">
                        {equippedHatIcon}
                      </div>
                    )}
                  </motion.div>
                </div>

                <div className="absolute bottom-6 left-8 right-8 flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-3xl font-black text-white">{studentData.pet.name}</span>
                    <span className="text-indigo-400 font-bold uppercase tracking-widest text-sm mt-1">Level {studentData.pet.level} {petDef?.name}</span>
                  </div>
                  
                  {nextLevelPts && (
                    <div className="w-48 text-right flex flex-col items-end">
                      <span className="text-xs text-gray-400 font-bold mb-2">Evolution Progress</span>
                      <div className="w-full bg-black/50 rounded-full h-3 border border-white/10 overflow-hidden mb-1 relative">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full" 
                          style={{ width: `${levelProgress}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-gray-500 font-bold uppercase">{studentData.lifetimePoints} / {nextLevelPts} Lifetime Pts</span>
                    </div>
                  )}
                  {!nextLevelPts && (
                    <div className="text-xs font-black text-yellow-400 uppercase tracking-widest bg-yellow-400/10 px-4 py-2 rounded-full">
                      Max Level Reached!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Side Panel (Shop & Inventory) */}
            <div className="flex flex-col gap-4">
              <div className="flex p-2 bg-gray-900 rounded-2xl border border-gray-800">
                <button 
                  onClick={() => setActiveTab("pet")}
                  className={`flex-1 py-3 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 ${activeTab === 'pet' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Stats
                </button>
                <button 
                  onClick={() => setActiveTab("shop")}
                  className={`flex-1 py-3 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 ${activeTab === 'shop' ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <Store className="w-4 h-4" /> Shop
                </button>
                <button 
                  onClick={() => setActiveTab("inventory")}
                  className={`flex-1 py-3 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 ${activeTab === 'inventory' ? 'bg-purple-600/20 text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <Backpack className="w-4 h-4" /> Items
                </button>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl flex-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                {activeTab === 'pet' && (
                  <div className="flex flex-col gap-6">
                    <div>
                      <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2">Pet Details</h3>
                      <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex justify-between items-center">
                        <span className="text-white font-medium">Species</span>
                        <span className="text-indigo-400 font-bold">{petDef?.name}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2">Evolution Path</h3>
                      <div className="flex items-center justify-between bg-gray-950 p-6 rounded-xl border border-gray-800">
                        {petDef?.stages.map((stage, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-2 text-center">
                            <span className={`text-4xl ${studentData.pet.level > idx ? '' : 'opacity-30 grayscale filter'}`}>{stage}</span>
                            <span className={`text-xs font-bold ${studentData.pet.level > idx ? 'text-white' : 'text-gray-600'}`}>Lv.{idx + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'shop' && (
                  <div className="flex flex-col gap-3">
                    {SHOP_ITEMS.map(item => {
                      const owned = studentData.inventory.includes(item.id);
                      return (
                        <div key={item.id} className="bg-gray-950 p-3 rounded-xl border border-gray-800 flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center text-2xl">{item.icon}</div>
                          <div className="flex-1">
                            <p className="font-bold text-white text-sm">{item.name}</p>
                            <p className="text-xs text-yellow-400 font-bold">{item.price} pts</p>
                          </div>
                          <button 
                            onClick={() => handleBuy(item)}
                            disabled={owned}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${owned ? 'bg-gray-800 text-gray-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}`}
                          >
                            {owned ? 'Owned' : 'Buy'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {activeTab === 'inventory' && (
                  <div className="grid grid-cols-2 gap-3">
                    {studentData.inventory.length === 0 ? (
                      <div className="col-span-2 text-center py-10 text-gray-500 font-bold italic">
                        Your inventory is empty.
                      </div>
                    ) : (
                      studentData.inventory.map((itemId: string) => {
                        const itemDef = SHOP_ITEMS.find(i => i.id === itemId);
                        if (!itemDef) return null;
                        const isEquipped = studentData.pet.equippedHat === itemId || studentData.pet.equippedEnvironment === itemId;
                        
                        return (
                          <div key={itemId} className={`bg-gray-950 p-4 rounded-xl border flex flex-col items-center gap-3 transition-colors ${isEquipped ? 'border-purple-500/50 bg-purple-500/5' : 'border-gray-800'}`}>
                            <div className="text-4xl">{itemDef.icon}</div>
                            <p className="font-bold text-white text-xs text-center">{itemDef.name}</p>
                            <button 
                              onClick={() => handleEquip(itemId, itemDef.type)}
                              className={`w-full py-1.5 rounded-lg text-xs font-bold ${isEquipped ? 'bg-gray-800 text-gray-300' : 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/40'}`}
                            >
                              {isEquipped ? 'Unequip' : 'Equip'}
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
