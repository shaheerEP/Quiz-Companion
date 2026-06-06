"use client";

import { createContext, useContext, useEffect, useState } from "react";

type AuthUser = {
  role: "teacher" | "student" | null;
  id?: string;
  name?: string;
  student?: any;
};

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshAuth: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data);
    } catch (e) {
      setUser(null);
    }
    setLoading(false);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/login";
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
