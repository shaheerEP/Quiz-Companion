"use client";

import dynamic from "next/dynamic";

const WorldViewerClient = dynamic(() => import("./WorldViewerClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-sky-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
    </div>
  ),
});

export default function WorldViewerPage() {
  return <WorldViewerClient />;
}
