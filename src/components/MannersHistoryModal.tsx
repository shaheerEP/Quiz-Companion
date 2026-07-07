import { X, Star, Calendar } from "lucide-react";
import { useEffect, useState } from "react";

interface MannersHistoryModalProps {
  studentId: string;
  onClose: () => void;
}

export default function MannersHistoryModal({ studentId, onClose }: MannersHistoryModalProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/manners?studentId=${studentId}`)
      .then(res => res.json())
      .then(data => {
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [studentId]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="bg-yellow-500/20 p-2 rounded-lg text-yellow-500"><Star className="w-6 h-6 fill-yellow-500" /></div>
            Manners History
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="text-center py-10 text-gray-500 font-bold">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 text-gray-500 font-bold">No manners logs found yet.</div>
          ) : (
            <div className="flex flex-col gap-6">
              {logs.map(log => (
                <div key={log._id} className="bg-gray-950 border border-gray-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
                    <div className="flex items-center gap-2 text-gray-400 font-bold uppercase tracking-wider text-sm">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      {new Date(log.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="relative inline-block text-lg" title={`${log.percentage.toFixed(0)}%`}>
                      <div className="flex text-gray-800">★★★★★</div>
                      <div className="flex text-yellow-400 absolute top-0 left-0 overflow-hidden whitespace-nowrap" style={{ width: `${log.percentage}%` }}>
                        ★★★★★
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {log.tasks.map((task: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-900/50 p-3 rounded-xl border border-gray-800/50">
                        <span className="text-gray-300 font-bold text-sm">{task.task}</span>
                        <div className="flex gap-1">
                          {Array.from({ length: task.maxStars }).map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < task.stars ? 'text-yellow-500 fill-yellow-500' : 'text-gray-700'}`} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
