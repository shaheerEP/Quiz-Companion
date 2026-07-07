"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Star, Sparkles, Send } from "lucide-react";
import confetti from "canvas-confetti";

export default function MannersPortal() {
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    
    fetch(`/api/manners?token=${token}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.error) {
          setError(resData.error);
        } else if (!resData.student?.mannersEnabled) {
          setError("Manners tracking is not enabled for this student.");
        } else {
          setData(resData);
          if (resData.todayLog) {
            const initialRatings: Record<string, number> = {};
            resData.todayLog.tasks.forEach((t: any) => {
              initialRatings[t.taskId] = t.stars;
            });
            setRatings(initialRatings);
            setSuccess(true); // Already filled today
          } else {
            const initialRatings: Record<string, number> = {};
            resData.mannersList.forEach((t: any) => {
              initialRatings[t.id] = 0;
            });
            setRatings(initialRatings);
          }
        }
        setLoading(false);
      })
      .catch(err => {
        setError("Failed to load manners portal.");
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async () => {
    if (!data) return;
    setSubmitting(true);
    
    const tasksPayload = data.mannersList.map((task: any) => ({
      task: task.task,
      taskId: task.id,
      maxStars: task.maxStars,
      stars: ratings[task.id] || 0
    }));

    try {
      const res = await fetch("/api/manners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, tasks: tasksPayload })
      });
      
      if (res.ok) {
        setSuccess(true);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FBBF24', '#F59E0B', '#D97706']
        });
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to submit.");
      }
    } catch (err) {
      alert("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white"><Sparkles className="w-8 h-8 animate-spin text-yellow-500" /></div>;
  }

  if (error) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-rose-500 font-bold p-6 text-center">{error}</div>;
  }

  const mannersList = data.mannersList || [];
  
  if (mannersList.length === 0) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500 font-bold p-6 text-center">No manners tasks have been configured by the teacher.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4 py-10 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-yellow-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl relative z-10 flex flex-col gap-8">
        
        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30 mb-2">
            <Star className="w-10 h-10 text-white fill-white" />
          </div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500">
            Daily Manners
          </h1>
          <p className="text-gray-400 font-bold">Rate <span className="text-white">{data.student.name}'s</span> behavior today!</p>
        </div>

        <div className="flex flex-col gap-6">
          {mannersList.map((task: any) => (
            <div key={task.id} className="bg-gray-950/50 p-5 rounded-2xl border border-gray-800">
              <p className="font-bold text-gray-200 mb-3 text-lg">{task.task}</p>
              <div className="flex gap-2">
                {Array.from({ length: task.maxStars }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      // Clicking same star toggles it off if it's the only one, or sets to this index+1
                      const current = ratings[task.id] || 0;
                      if (current === i + 1) {
                        setRatings({...ratings, [task.id]: i}); // decrement by 1
                      } else {
                        setRatings({...ratings, [task.id]: i + 1});
                      }
                    }}
                    className={`transition-all transform hover:scale-110 active:scale-90 ${
                      (ratings[task.id] || 0) > i ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" : "text-gray-700 hover:text-gray-500"
                    }`}
                  >
                    <Star className={`w-10 h-10 md:w-8 md:h-8 ${
                      (ratings[task.id] || 0) > i ? "fill-yellow-400" : "fill-transparent"
                    }`} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={handleSubmit}
          disabled={submitting}
          className={`w-full py-4 rounded-xl font-black text-xl flex items-center justify-center gap-2 transition-all ${
            success 
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
              : "bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:opacity-90 shadow-lg shadow-yellow-500/20 transform hover:-translate-y-1"
          }`}
        >
          {submitting ? (
            <Sparkles className="w-6 h-6 animate-spin" />
          ) : success ? (
            <>
              <CheckCircle2 className="w-6 h-6" /> Updated Successfully!
            </>
          ) : (
            <>
              <Send className="w-6 h-6" /> Submit Stars
            </>
          )}
        </button>
        
        {success && (
          <p className="text-center text-sm text-gray-400 font-bold mt-[-10px]">
            You can change your rating and submit again if needed.
          </p>
        )}

      </div>
    </div>
  );
}
