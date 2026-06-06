"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, PlayCircle } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-gray-950 border-b border-gray-800">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
          <PlayCircle className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-black text-white tracking-wide">QuizCompanion</h1>
      </div>
      <div className="flex gap-4">
        <Link 
          href="/" 
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${pathname === '/' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
        >
          Dashboard
        </Link>
        <Link 
          href="/settings" 
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${pathname === '/settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>
    </nav>
  );
}
