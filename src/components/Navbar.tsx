"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, PlayCircle, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // If no user, just show a simple Navbar
  if (!user) {
    return (
      <nav className="flex items-center justify-between px-4 md:px-6 py-4 bg-gray-950 border-b border-gray-800 relative z-50">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
            <PlayCircle className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black text-white tracking-wide">QuizCompanion</h1>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-gray-950 border-b border-gray-800 relative z-50">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-indigo-600 p-1.5 md:p-2 rounded-lg shadow-lg shadow-indigo-500/20">
            <PlayCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <h1 className="text-lg md:text-xl font-black text-white tracking-wide">QuizCompanion</h1>
          <span className="ml-1 md:ml-2 px-2 py-0.5 md:py-1 bg-gray-800 rounded text-[10px] md:text-xs font-bold uppercase text-gray-400">
            {user.role}
          </span>
        </div>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-4">
          {user.role === "teacher" && (
            <>
              <Link 
                href="/teacher" 
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${pathname === '/teacher' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
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
            </>
          )}
          {user.role === "student" && (
            <>
              <Link 
                href="/student" 
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${pathname === '/student' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
              >
                My Dashboard
              </Link>
              <Link 
                href={user.student?.assignedGame === 'builder' ? '/student/builder' : '/student/pet'}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${pathname.includes(user.student?.assignedGame === 'builder' ? '/builder' : '/pet') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
              >
                {user.student?.assignedGame === 'builder' ? 'World Builder' : 'My Pet'}
              </Link>
              {user.student?.assignedGame === 'builder' && (
                <Link 
                  href="/student/examples"
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${pathname.includes('/examples') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
                >
                  Example Worlds
                </Link>
              )}
            </>
          )}
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white rounded-lg font-bold transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <button 
            onClick={toggleMenu}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors focus:outline-none"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-gray-900 border-b border-gray-800 p-4 flex flex-col gap-2 shadow-2xl">
          {user.role === "teacher" && (
            <>
              <Link 
                href="/teacher" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${pathname === '/teacher' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
              >
                Dashboard
              </Link>
              <Link 
                href="/settings" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${pathname === '/settings' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
            </>
          )}
          {user.role === "student" && (
            <>
              <Link 
                href="/student" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${pathname === '/student' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
              >
                My Dashboard
              </Link>
              <Link 
                href={user.student?.assignedGame === 'builder' ? '/student/builder' : '/student/pet'}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${pathname.includes(user.student?.assignedGame === 'builder' ? '/builder' : '/pet') ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
              >
                {user.student?.assignedGame === 'builder' ? 'World Builder' : 'My Pet'}
              </Link>
              {user.student?.assignedGame === 'builder' && (
                <Link 
                  href="/student/examples"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${pathname.includes('/examples') ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
                >
                  Example Worlds
                </Link>
              )}
            </>
          )}
          <hr className="border-gray-800 my-2" />
          <button 
            onClick={() => {
              setIsMobileMenuOpen(false);
              logout();
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white rounded-lg font-bold transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
