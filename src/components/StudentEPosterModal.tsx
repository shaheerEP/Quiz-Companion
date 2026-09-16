"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Download, Copy, Check, X, Sparkles, Trophy, Star, RefreshCw } from "lucide-react";

interface StudentEPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    _id: string;
    name: string;
    profileImageUrl?: string;
    pointsBalance?: number;
    lifetimePoints?: number;
    dailyPoints?: number;
    activeAvatar?: string;
  } | null;
  historyStats: {
    thisWeekPoints: number;
    thisWeekLabel?: string;
    lastWeekPoints: number;
    lastWeekLabel?: string;
    twoWeeksAgoPoints?: number;
    twoWeeksAgoLabel?: string;
    prevTwoWeeksTotalPoints?: number;
    bestWeekPoints: number;
    bestWeekLabel?: string;
    isNewRecord?: boolean;
    diffLastWeek?: number;
    diffBestWeek?: number;
  } | null;
}

type PosterTheme = "cosmic" | "golden" | "emerald";

export default function StudentEPosterModal({
  isOpen,
  onClose,
  student,
  historyStats,
}: StudentEPosterModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [theme, setTheme] = useState<PosterTheme>("cosmic");
  const [isRendering, setIsRendering] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);

  const drawPoster = useCallback(() => {
    if (!student || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsRendering(true);

    const W = 1080;
    const H = 1350;
    canvas.width = W;
    canvas.height = H;

    // Helper: Rounded Rect
    const roundRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    // Helper: Draw Star
    const drawStar = (cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number, color: string) => {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();
    };

    // Theme Configs
    const themes = {
      cosmic: {
        bg1: "#070913",
        bg2: "#11172E",
        bg3: "#0B0E1D",
        accentPrimary: "#818CF8",
        accentGold: "#FBBF24",
        borderGold: "rgba(251, 191, 36, 0.4)",
        cardBg: "rgba(15, 23, 42, 0.78)",
        thisWeekColor: "#34D399",
        lastWeekColor: "#C084FC",
        twoWeeksColor: "#60A5FA",
        topWeekColor: "#FBBF24",
      },
      golden: {
        bg1: "#0F0B04",
        bg2: "#271B08",
        bg3: "#120D04",
        accentPrimary: "#F59E0B",
        accentGold: "#FCD34D",
        borderGold: "rgba(252, 211, 77, 0.55)",
        cardBg: "rgba(26, 19, 9, 0.82)",
        thisWeekColor: "#10B981",
        lastWeekColor: "#E879F9",
        twoWeeksColor: "#38BDF8",
        topWeekColor: "#FBBF24",
      },
      emerald: {
        bg1: "#04110B",
        bg2: "#0D2E1E",
        bg3: "#06170E",
        accentPrimary: "#10B981",
        accentGold: "#FCD34D",
        borderGold: "rgba(52, 211, 153, 0.5)",
        cardBg: "rgba(6, 26, 17, 0.82)",
        thisWeekColor: "#34D399",
        lastWeekColor: "#A78BFA",
        twoWeeksColor: "#38BDF8",
        topWeekColor: "#FBBF24",
      },
    };

    const cur = themes[theme];

    // 1. Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, cur.bg1);
    bgGrad.addColorStop(0.45, cur.bg2);
    bgGrad.addColorStop(1, cur.bg3);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle Radial Orbs for depth
    const orb1 = ctx.createRadialGradient(240, 260, 20, 240, 260, 360);
    orb1.addColorStop(0, "rgba(99, 102, 241, 0.18)");
    orb1.addColorStop(1, "rgba(99, 102, 241, 0)");
    ctx.fillStyle = orb1;
    ctx.fillRect(0, 0, W, H);

    const orb2 = ctx.createRadialGradient(840, 950, 40, 840, 950, 420);
    orb2.addColorStop(0, "rgba(245, 158, 11, 0.14)");
    orb2.addColorStop(1, "rgba(245, 158, 11, 0)");
    ctx.fillStyle = orb2;
    ctx.fillRect(0, 0, W, H);

    // Background Stars & Sparkles
    const starCoords = [
      { x: 90, y: 130, s: 4, c: "#FFFFFF" },
      { x: 980, y: 160, s: 5, c: "#FCD34D" },
      { x: 140, y: 520, s: 3, c: "#818CF8" },
      { x: 950, y: 580, s: 4, c: "#FFFFFF" },
      { x: 110, y: 920, s: 5, c: "#FCD34D" },
      { x: 990, y: 1040, s: 3.5, c: "#34D399" },
      { x: 220, y: 1240, s: 4, c: "#818CF8" },
      { x: 860, y: 1260, s: 4.5, c: "#FFFFFF" },
    ];
    starCoords.forEach((st) => {
      drawStar(st.x, st.y, 4, st.s * 2, st.s, st.c);
    });

    // 2. Double Ornate Border
    // Outer border
    roundRect(32, 32, W - 64, H - 64, 36);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner glowing golden border
    roundRect(46, 46, W - 92, H - 92, 28);
    ctx.strokeStyle = cur.borderGold;
    ctx.lineWidth = 3;
    ctx.shadowColor = cur.accentGold;
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // Corner Ornaments
    const cornerSize = 22;
    const corners = [
      { x: 46, y: 46 },
      { x: W - 46, y: 46 },
      { x: 46, y: H - 46 },
      { x: W - 46, y: H - 46 },
    ];
    corners.forEach((c) => {
      drawStar(c.x, c.y, 5, cornerSize, cornerSize / 2.3, cur.accentGold);
    });

    // 3. Header Section
    // Header Pill Badge
    const headerPillW = 560;
    const headerPillH = 46;
    const headerPillX = (W - headerPillW) / 2;
    const headerPillY = 80;

    roundRect(headerPillX, headerPillY, headerPillW, headerPillH, 23);
    const pillGrad = ctx.createLinearGradient(headerPillX, 0, headerPillX + headerPillW, 0);
    pillGrad.addColorStop(0, "rgba(99, 102, 241, 0.35)");
    pillGrad.addColorStop(0.5, "rgba(245, 158, 11, 0.45)");
    pillGrad.addColorStop(1, "rgba(99, 102, 241, 0.35)");
    ctx.fillStyle = pillGrad;
    ctx.fill();
    ctx.strokeStyle = cur.accentGold;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#FDE68A";
    ctx.font = "bold 15px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★ INTERACTIVE QUIZ ACADEMY • OFFICIAL ACHIEVEMENT ★", W / 2, headerPillY + headerPillH / 2);

    // Title: WEEKLY PERFORMANCE SPOTLIGHT
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 38px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 10;
    ctx.fillText("STUDENT PERFORMANCE POSTER", W / 2, 168);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#94A3B8";
    ctx.font = "600 16px 'Segoe UI', system-ui, sans-serif";
    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    ctx.fillText(`Official Progress Record • Issued on ${dateStr}`, W / 2, 204);

    // 4. Student Avatar & Hero Section
    const avatarCenterX = W / 2;
    const avatarCenterY = 340;
    const avatarRadius = 90;

    // Proceed with image loading and final rendering
    const renderStudentIdentityAndCards = (loadedImg: HTMLImageElement | null) => {
      // Avatar Glow Ring
      const avatarGlow = ctx.createRadialGradient(
        avatarCenterX,
        avatarCenterY,
        avatarRadius - 10,
        avatarCenterX,
        avatarCenterY,
        avatarRadius + 30
      );
      avatarGlow.addColorStop(0, "rgba(245, 158, 11, 0.5)");
      avatarGlow.addColorStop(0.7, "rgba(99, 102, 241, 0.3)");
      avatarGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = avatarGlow;
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 32, 0, Math.PI * 2);
      ctx.fill();

      // Golden Circular Frame
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      if (loadedImg) {
        // Draw photo centered and scaled properly
        const imgAspect = loadedImg.width / loadedImg.height;
        let drawW = avatarRadius * 2;
        let drawH = avatarRadius * 2;
        let drawX = avatarCenterX - avatarRadius;
        let drawY = avatarCenterY - avatarRadius;

        if (imgAspect > 1) {
          drawW = drawH * imgAspect;
          drawX = avatarCenterX - drawW / 2;
        } else {
          drawH = drawW / imgAspect;
          drawY = avatarCenterY - drawH / 2;
        }
        ctx.drawImage(loadedImg, drawX, drawY, drawW, drawH);
      } else {
        // Draw placeholder avatar with initials
        const avGrad = ctx.createLinearGradient(
          avatarCenterX - avatarRadius,
          avatarCenterY - avatarRadius,
          avatarCenterX + avatarRadius,
          avatarCenterY + avatarRadius
        );
        avGrad.addColorStop(0, "#4F46E5");
        avGrad.addColorStop(1, "#9333EA");
        ctx.fillStyle = avGrad;
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 76px 'Segoe UI', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const initial = student.name ? student.name.charAt(0).toUpperCase() : "?";
        ctx.fillText(initial, avatarCenterX, avatarCenterY + 4);
      }
      ctx.restore();

      // Outer Golden Ring on Avatar
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
      ctx.strokeStyle = cur.accentGold;
      ctx.lineWidth = 6;
      ctx.shadowColor = cur.accentGold;
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Crown / Star Icon above avatar
      drawStar(avatarCenterX, avatarCenterY - avatarRadius - 14, 5, 18, 8, "#FBBF24");

      // Student Name
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 52px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.shadowBlur = 14;
      ctx.fillText(student.name, W / 2, 474);
      ctx.shadowBlur = 0;

      // Sub-badges under name (Lifetime & Current Balance)
      const badgePillW = 540;
      const badgePillH = 40;
      const badgePillX = (W - badgePillW) / 2;
      const badgePillY = 512;

      roundRect(badgePillX, badgePillY, badgePillW, badgePillH, 20);
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#E2E8F0";
      ctx.font = "bold 15px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const balance = (student.pointsBalance || 0).toLocaleString();
      const lifetime = (student.lifetimePoints || 0).toLocaleString();
      ctx.fillText(`💎 Balance: ${balance} pts   •   🏆 Lifetime: ${lifetime} pts`, W / 2, badgePillY + badgePillH / 2);

      // 5. Four Requested Score Cards
      // Layout: 2 Columns × 2 Rows
      const cardW = 446;
      const cardH = 200;
      const cardGapX = 28;
      const cardGapY = 24;
      const startX = (W - (cardW * 2 + cardGapX)) / 2; // 80px left margin
      const startY = 585;

      const thisWeekPts = historyStats?.thisWeekPoints ?? 0;
      const thisWeekLbl = historyStats?.thisWeekLabel || "Current Week";

      const lastWeekPts = historyStats?.lastWeekPoints ?? 0;
      const lastWeekLbl = historyStats?.lastWeekLabel || "1 Week Ago";

      const twoWeeksPts = historyStats?.twoWeeksAgoPoints ?? 0;
      const twoWeeksLbl = historyStats?.twoWeeksAgoLabel || "2 Weeks Ago";

      const topWeekPts = historyStats?.bestWeekPoints ?? 0;

      const cards = [
        {
          col: 0,
          row: 0,
          title: "🚀 THIS WEEK",
          subtitle: thisWeekLbl,
          points: thisWeekPts,
          badgeText: historyStats?.isNewRecord ? "★ NEW RECORD!" : "CURRENT ACTIVE",
          accent: cur.thisWeekColor,
          highlight: true,
        },
        {
          col: 1,
          row: 0,
          title: "⏮️ LAST WEEK",
          subtitle: lastWeekLbl,
          points: lastWeekPts,
          badgeText: "PREVIOUS WEEK 1",
          accent: cur.lastWeekColor,
          highlight: false,
        },
        {
          col: 0,
          row: 1,
          title: "⏳ 2 WEEKS AGO",
          subtitle: twoWeeksLbl,
          points: twoWeeksPts,
          badgeText: "PREVIOUS WEEK 2",
          accent: cur.twoWeeksColor,
          highlight: false,
        },
        {
          col: 1,
          row: 1,
          title: "★ TOP WEEK",
          subtitle: "All-Time Best Weekly Score",
          points: topWeekPts,
          badgeText: "★ ALL-TIME RECORD",
          accent: cur.topWeekColor,
          highlight: true,
        },
      ];

      cards.forEach((c) => {
        const cx = startX + c.col * (cardW + cardGapX);
        const cy = startY + c.row * (cardH + cardGapY);

        // Card Container
        roundRect(cx, cy, cardW, cardH, 24);
        ctx.fillStyle = cur.cardBg;
        ctx.fill();

        // Card Border with Accent Glow
        ctx.strokeStyle = c.accent;
        ctx.lineWidth = c.highlight ? 2.5 : 1.5;
        if (c.highlight) {
          ctx.shadowColor = c.accent;
          ctx.shadowBlur = 14;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Header Title in Card
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.font = "900 17px 'Segoe UI', system-ui, sans-serif";
        ctx.fillStyle = c.accent;
        ctx.fillText(c.title, cx + 24, cy + 22);

        // Small Pill Badge in Card
        const miniBadgeW = 140;
        const miniBadgeH = 26;
        const miniBadgeX = cx + cardW - miniBadgeW - 20;
        const miniBadgeY = cy + 20;

        roundRect(miniBadgeX, miniBadgeY, miniBadgeW, miniBadgeH, 13);
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fill();
        ctx.strokeStyle = c.accent;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = "bold 10px 'Segoe UI', system-ui, sans-serif";
        ctx.fillStyle = c.accent;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(c.badgeText, miniBadgeX + miniBadgeW / 2, miniBadgeY + miniBadgeH / 2);

        // Subtitle (Date range or description)
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.font = "600 13px 'Segoe UI', system-ui, sans-serif";
        ctx.fillStyle = "#94A3B8";
        ctx.fillText(c.subtitle, cx + 24, cy + 50);

        // Big Points Number
        ctx.font = "900 44px 'Segoe UI', system-ui, sans-serif";
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 8;
        ctx.fillText(c.points.toLocaleString(), cx + 24, cy + 86);
        ctx.shadowBlur = 0;

        ctx.font = "bold 18px 'Segoe UI', system-ui, sans-serif";
        ctx.fillStyle = c.accent;
        const ptsWidth = ctx.measureText(c.points.toLocaleString()).width;
        ctx.fillText("pts", cx + 24 + ptsWidth + 10, cy + 106);

        // Bottom Progress bar / Line accent
        roundRect(cx + 24, cy + cardH - 24, cardW - 48, 6, 3);
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fill();

        const pct = topWeekPts > 0 ? Math.min(1, c.points / topWeekPts) : 0.2;
        if (pct > 0) {
          roundRect(cx + 24, cy + cardH - 24, (cardW - 48) * pct, 6, 3);
          ctx.fillStyle = c.accent;
          ctx.fill();
        }
      });

      // 6. Previous Two Weeks Combined Summary Banner
      const sumBannerY = startY + cardH * 2 + cardGapY + 22;
      const sumBannerH = 64;
      const sumBannerW = cardW * 2 + cardGapX;
      const sumBannerX = startX;

      roundRect(sumBannerX, sumBannerY, sumBannerW, sumBannerH, 20);
      const sumGrad = ctx.createLinearGradient(sumBannerX, 0, sumBannerX + sumBannerW, 0);
      sumGrad.addColorStop(0, "rgba(99, 102, 241, 0.15)");
      sumGrad.addColorStop(0.5, "rgba(168, 85, 247, 0.2)");
      sumGrad.addColorStop(1, "rgba(245, 158, 11, 0.15)");
      ctx.fillStyle = sumGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const prevTwoWeeksTotal = (lastWeekPts + twoWeeksPts).toLocaleString();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 16px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = "#E2E8F0";
      ctx.fillText(
        `📊 Previous 2 Weeks Combined Total: `,
        W / 2 - 80,
        sumBannerY + sumBannerH / 2
      );

      ctx.font = "900 22px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = "#FCD34D";
      ctx.fillText(
        `${prevTwoWeeksTotal} pts`,
        W / 2 + 130,
        sumBannerY + sumBannerH / 2
      );

      // 7. Motivational Footer Quote & Stamp
      const footerY = 1180;
      ctx.font = "italic 600 18px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = "#CBD5E1";
      ctx.textAlign = "center";
      ctx.fillText('"Continuous effort — not strength or intelligence — is the key to unlocking your potential."', W / 2, footerY);

      ctx.font = "bold 15px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = cur.accentGold;
      ctx.fillText("🌟 Keep shining, keep answering, and reach for the stars! 🚀", W / 2, footerY + 32);

      // Security / Verification Stamp Line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, footerY + 68);
      ctx.lineTo(startX + sumBannerW, footerY + 68);
      ctx.stroke();

      ctx.font = "bold 12px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = "#64748B";
      ctx.fillText("AUTHENTICATED CLASSROOM PROGRESS POSTER • INTERACTIVE QUIZ COMPANION", W / 2, footerY + 92);

      setIsRendering(false);
      setDownloadReady(true);
    };

    // Load student photo if present
    if (student.profileImageUrl) {
      const img = new Image();
      // Use proxy to eliminate any CORS taint
      img.crossOrigin = "anonymous";
      img.src = `/api/image-proxy?url=${encodeURIComponent(student.profileImageUrl)}`;
      img.onload = () => {
        renderStudentIdentityAndCards(img);
      };
      img.onerror = () => {
        // Direct fallback if proxy has an issue
        const directImg = new Image();
        directImg.crossOrigin = "anonymous";
        directImg.src = student.profileImageUrl!;
        directImg.onload = () => renderStudentIdentityAndCards(directImg);
        directImg.onerror = () => renderStudentIdentityAndCards(null);
      };
    } else {
      renderStudentIdentityAndCards(null);
    }
  }, [student, historyStats, theme]);

  useEffect(() => {
    if (isOpen && student) {
      setDownloadReady(false);
      const timer = setTimeout(() => {
        drawPoster();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, student, theme, drawPoster]);

  const handleDownload = () => {
    if (!canvasRef.current || !student) return;
    try {
      const link = document.createElement("a");
      const cleanName = student.name.replace(/\s+/g, "_");
      link.download = `${cleanName}_Weekly_Achievement_Poster.png`;
      link.href = canvasRef.current.toDataURL("image/png", 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download poster image:", err);
    }
  };

  const handleCopyImage = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    } catch (err) {
      console.error("Clipboard write error:", err);
      // Fallback: alert or prompt
      alert("Could not copy directly to clipboard. You can click 'Download PNG' to save the image!");
    }
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[95vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Student Achievement E-Poster
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  HD 1080×1350
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Weekly progress & ★ Top week poster for <span className="text-amber-300 font-bold">{student.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Theme Selector + Poster Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center gap-4">
          {/* Theme Selector Pill Bar */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950 border border-white/5 text-xs font-bold">
            <span className="text-slate-400 px-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Theme:
            </span>
            <button
              onClick={() => setTheme("cosmic")}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                theme === "cosmic"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🌌 Cosmic Night
            </button>
            <button
              onClick={() => setTheme("golden")}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                theme === "golden"
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              👑 Golden Trophy
            </button>
            <button
              onClick={() => setTheme("emerald")}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                theme === "emerald"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ⚡ Cyber Emerald
            </button>
          </div>

          {/* Canvas Wrapper */}
          <div className="relative flex justify-center items-center w-full max-w-[500px] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 bg-slate-950">
            {isRendering && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs gap-3">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                <span className="text-xs font-bold text-slate-300">Rendering high-res e-poster...</span>
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="w-full h-auto aspect-[4/5] object-contain rounded-2xl"
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>Ready to share on WhatsApp, Telegram, or print as certificate!</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyImage}
              disabled={!downloadReady || isRendering}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-black">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Image</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              disabled={!downloadReady || isRendering}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Download Poster (PNG)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
