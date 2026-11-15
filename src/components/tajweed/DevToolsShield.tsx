"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ShieldAlert, RefreshCw, Lock } from "lucide-react";

interface DevToolsShieldProps {
  /**
   * If true, enables the active anti-debugger loop (pauses execution if DevTools is open).
   * Defaults to true in production, false or gentle in development.
   */
  enableDebuggerTrap?: boolean;
}

export default function DevToolsShield({ enableDebuggerTrap = true }: DevToolsShieldProps) {
  const [isDevToolsDetected, setIsDevToolsDetected] = useState<boolean>(false);
  const [detectionReason, setDetectionReason] = useState<string>("");
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if DevTools is open via window size differential or timing
  const checkDevTools = useCallback(() => {
    if (typeof window === "undefined") return false;

    // 1. Threshold check (DevTools docked to side or bottom)
    const threshold = 160;
    const widthDiff = window.outerWidth - window.innerWidth > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;

    if (widthDiff || heightDiff) {
      setIsDevToolsDetected(true);
      setDetectionReason("Docked Developer Tools detected");
      return true;
    }

    // 2. Timing check with anti-debugger trap
    if (enableDebuggerTrap) {
      const startTime = performance.now();
      try {
        // eslint-disable-next-line no-new-func
        const debugFn = new Function("debugger");
        debugFn();
      } catch {
        // ignore
      }
      const endTime = performance.now();
      // If DevTools is open and breakpoint triggered or evaluated slowly
      if (endTime - startTime > 100) {
        setIsDevToolsDetected(true);
        setDetectionReason("Active Debugger inspection detected");
        return true;
      }
    }

    return false;
  }, [enableDebuggerTrap]);

  // Attempt to recover if DevTools was closed
  const handleVerifyAndResume = () => {
    const threshold = 160;
    const widthDiff = window.outerWidth - window.innerWidth > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;

    if (!widthDiff && !heightDiff) {
      setIsDevToolsDetected(false);
      setDetectionReason("");
    } else {
      alert("Developer Tools are still open. Please close DevTools (Inspect Element / F12) to proceed.");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // A. Intercept context menu (Right-click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // B. Intercept keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 key
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        setIsDevToolsDetected(true);
        setDetectionReason("F12 Developer Tools shortcut blocked");
        return false;
      }

      const isModifier = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + Shift + I/J/C (Inspect / Console / Element picker)
      if (
        isModifier &&
        e.shiftKey &&
        ["I", "i", "J", "j", "C", "c"].includes(e.key)
      ) {
        e.preventDefault();
        e.stopPropagation();
        setIsDevToolsDetected(true);
        setDetectionReason("Inspect Element shortcut blocked");
        return false;
      }

      // Ctrl/Cmd + U (View Source)
      if (isModifier && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl/Cmd + S (Save Page)
      if (isModifier && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl/Cmd + P (Print Page)
      if (isModifier && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl/Cmd + A (Select All)
      if (isModifier && (e.key === "a" || e.key === "A")) {
        const target = e.target as HTMLElement | null;
        const isEditable =
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable);
        if (!isEditable) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }

      // Ctrl/Cmd + C (Copy)
      if (isModifier && (e.key === "c" || e.key === "C")) {
        const target = e.target as HTMLElement | null;
        const isEditable =
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable);
        if (!isEditable) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    // C. Prevent copy/cut clipboard actions
    const handleClipboard = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (!isEditable) {
        e.preventDefault();
        return false;
      }
    };

    // D. Prevent dragging elements/images/canvas
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // E. Prevent text selection
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (!isEditable) {
        e.preventDefault();
        return false;
      }
    };

    // F. Periodic inspection detection
    checkIntervalRef.current = setInterval(() => {
      checkDevTools();
    }, 1500);

    // G. Window resize detection (docking/undocking devtools triggers resize)
    const handleResize = () => {
      checkDevTools();
    };

    // H. Console element getter detector (triggers if DevTools console is active)
    try {
      const devtoolsProbe = document.createElement("div");
      Object.defineProperty(devtoolsProbe, "id", {
        get: () => {
          setIsDevToolsDetected(true);
          setDetectionReason("Console evaluation detected");
          return "";
        },
      });
      console.log("%c", devtoolsProbe);
    } catch {
      // ignore
    }

    // Attach listeners with capture = true
    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("copy", handleClipboard, { capture: true });
    window.addEventListener("cut", handleClipboard, { capture: true });
    window.addEventListener("dragstart", handleDragStart, { capture: true });
    window.addEventListener("selectstart", handleSelectStart, { capture: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("copy", handleClipboard, { capture: true });
      window.removeEventListener("cut", handleClipboard, { capture: true });
      window.removeEventListener("dragstart", handleDragStart, { capture: true });
      window.removeEventListener("selectstart", handleSelectStart, { capture: true });
      window.removeEventListener("resize", handleResize);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkDevTools]);

  return (
    <>
      {/* Global CSS to disable text selection and hide content during print */}
      <style jsx global>{`
        /* Disable text selection and callout menus */
        .tajweed-protected-page,
        .tajweed-protected-page * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
        }

        /* Allow standard interactions for sliders and text inputs */
        .tajweed-protected-page input[type="range"],
        .tajweed-protected-page input[type="text"],
        .tajweed-protected-page textarea {
          -webkit-user-select: auto !important;
          user-select: auto !important;
        }

        /* Completely hide content if someone attempts to print to PDF */
        @media print {
          html, body, .tajweed-protected-page {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>

      {/* DevTools Active Block Overlay */}
      {isDevToolsDetected && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed inset-0 z-[999999] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none"
        >
          <div className="max-w-md w-full bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-5 text-rose-400">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
              <Lock className="w-3.5 h-3.5" />
              <span>Proprietary Educational Material</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
              Developer Tools Restricted
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              To protect the intellectual property, 3D anatomical models, phonetics algorithms, and letter presets of this Tajweed Studio, code inspection and Developer Tools are disabled.
            </p>

            {detectionReason && (
              <div className="text-xs font-mono text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 mb-6">
                Status: {detectionReason}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <button
                type="button"
                onClick={handleVerifyAndResume}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-900/30 active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>I Closed DevTools — Resume</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mt-4">
              Tip: Close the Inspect Element / DevTools window or undocked panel, then click Resume.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
