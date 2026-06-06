"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (user.role === "teacher") {
        router.push("/teacher");
      } else {
        router.push("/student");
      }
    }
  }, [user, loading, router]);

  return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>;
}
