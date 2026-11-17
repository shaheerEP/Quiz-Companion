"use client";

import { useEffect } from "react";

/**
 * DevToolsShield:
 * Silent protection that disables right-click, code-viewing shortcuts, and text-copying
 * without showing any blocking overlay or interfering with screen sharing (e.g. Google Meet, Zoom).
 */
export default function DevToolsShield() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // A. Intercept context menu (Right-click) silently
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // B. Intercept developer tools and source view shortcuts silently
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 key
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
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

      // Ctrl/Cmd + A (Select All outside form inputs)
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

      // Ctrl/Cmd + C (Copy outside form inputs)
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

    // C. Prevent copy/cut clipboard actions outside form inputs
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
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return true;
      }
      e.preventDefault();
      return false;
    };

    // E. Prevent text selection drag outside inputs
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

    // Attach listeners with capture = true to stop events before child bubbling
    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("copy", handleClipboard, { capture: true });
    window.addEventListener("cut", handleClipboard, { capture: true });
    window.addEventListener("dragstart", handleDragStart, { capture: true });
    window.addEventListener("selectstart", handleSelectStart, { capture: true });

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("copy", handleClipboard, { capture: true });
      window.removeEventListener("cut", handleClipboard, { capture: true });
      window.removeEventListener("dragstart", handleDragStart, { capture: true });
      window.removeEventListener("selectstart", handleSelectStart, { capture: true });
    };
  }, []);

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
    </>
  );
}
