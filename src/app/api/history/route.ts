import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Session } from "@/models/Session";
import { QuestionLog } from "@/models/QuestionLog";
import { getSession } from "@/lib/auth-helpers";

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Monday is 1, Sunday is 0. If Sunday, diff is -6 days to get Monday. If Monday (1), diff is 0.
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getSunday(monday: Date): Date {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

function formatWeekLabel(monday: Date, isCurrentWeek: boolean, isLastWeek: boolean): string {
  const sunday = getSunday(monday);
  const startMonth = monday.toLocaleDateString("en-US", { month: "short" });
  const endMonth = sunday.toLocaleDateString("en-US", { month: "short" });
  const startDay = monday.getDate();
  const endDay = sunday.getDate();
  const year = sunday.getFullYear();

  if (isCurrentWeek) return `This Week (${startMonth} ${startDay} – ${endDay})`;
  if (isLastWeek) return `Last Week (${startMonth} ${startDay} – ${endDay})`;
  if (startMonth === endMonth) {
    return `Week of ${startMonth} ${startDay} – ${endDay}, ${year}`;
  }
  return `Week of ${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
    }

    // Pagination query params
    const dailyLimit = Math.max(1, parseInt(searchParams.get("dailyLimit") || "5", 10));
    const dailyOffset = Math.max(0, parseInt(searchParams.get("dailyOffset") || "0", 10));
    const weeklyLimit = Math.max(1, parseInt(searchParams.get("weeklyLimit") || "4", 10));
    const weeklyOffset = Math.max(0, parseInt(searchParams.get("weeklyOffset") || "0", 10));

    await connectToDatabase();

    // Fetch all sessions to get the session IDs for this student
    const allSessions = await Session.find({ studentId });
    const allSessionIds = allSessions.map((s) => s._id);

    // Fetch all logs for these sessions, sorted newest first
    const allLogs = await QuestionLog.find({
      sessionId: { $in: allSessionIds }
    }).sort({ date: -1, createdAt: -1 });

    const historyItems: any[] = [];
    for (const log of allLogs) {
      const logDate = log.date || (log as any).createdAt || new Date();
      if (log.logType === "bonus") {
        historyItems.push({
          _id: log._id.toString(),
          type: "bonus",
          date: logDate,
          points: log.points,
          title: "Manual Bonus",
          details: ""
        });
      } else if (log.logType === "deduction") {
        historyItems.push({
          _id: log._id.toString(),
          type: "deduction",
          date: logDate,
          points: log.points,
          title: "Manual Deduction",
          details: ""
        });
      } else {
        historyItems.push({
          _id: log._id.toString(),
          type: "quiz",
          date: logDate,
          points: log.points,
          title: `Question ${log.questionNumber || 0}`,
          details: `${log.isCorrect ? "Correct" : "Incorrect"} (${log.responseTime?.toFixed(1) || 0}s)`
        });
      }
    }

    // Sort by date descending (newest first)
    historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // --- 1. Compute Daily Grouping ---
    const dailyMap: { [key: string]: { dayString: string; date: string; items: any[]; totalPoints: number } } = {};
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    for (const item of historyItems) {
      const dateObj = new Date(item.date);
      const dateKey = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD for grouping

      let dayString = dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      if (dateObj.toDateString() === today.toDateString()) {
        dayString = "Today";
      } else if (dateObj.toDateString() === yesterday.toDateString()) {
        dayString = "Yesterday";
      }

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          dayString,
          date: item.date,
          items: [],
          totalPoints: 0
        };
      }

      const net = item.type === "deduction" ? -item.points : item.points;
      dailyMap[dateKey].totalPoints += net;
      dailyMap[dateKey].items.push(item);
    }

    // All days sorted descending
    const allDays = Object.keys(dailyMap)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((key) => dailyMap[key]);

    const paginatedDaily = allDays.slice(dailyOffset, dailyOffset + dailyLimit);
    const hasMoreDaily = dailyOffset + dailyLimit < allDays.length;

    // --- 2. Compute Weekly Grouping & All-Time Stats ---
    const now = new Date();
    const currentWeekMonday = getMonday(now);
    const lastWeekMonday = new Date(currentWeekMonday);
    lastWeekMonday.setDate(lastWeekMonday.getDate() - 7);

    const weeklyMap: {
      [mondayKey: string]: {
        mondayDate: Date;
        weekKey: string;
        weekLabel: string;
        totalPoints: number;
        itemsCount: number;
        days: { dayString: string; date: string; totalPoints: number; count: number }[];
      };
    } = {};

    for (const item of historyItems) {
      const itemDate = new Date(item.date);
      const mon = getMonday(itemDate);
      const monKey = mon.toISOString().split("T")[0];

      const isCurrentWeek = mon.getTime() === currentWeekMonday.getTime();
      const isLastWeek = mon.getTime() === lastWeekMonday.getTime();

      if (!weeklyMap[monKey]) {
        weeklyMap[monKey] = {
          mondayDate: mon,
          weekKey: monKey,
          weekLabel: formatWeekLabel(mon, isCurrentWeek, isLastWeek),
          totalPoints: 0,
          itemsCount: 0,
          days: []
        };
      }

      const net = item.type === "deduction" ? -item.points : item.points;
      weeklyMap[monKey].totalPoints += net;
      weeklyMap[monKey].itemsCount += 1;
    }

    // Ensure current week exists in map even if 0 points yet
    const currentWeekKey = currentWeekMonday.toISOString().split("T")[0];
    if (!weeklyMap[currentWeekKey]) {
      weeklyMap[currentWeekKey] = {
        mondayDate: currentWeekMonday,
        weekKey: currentWeekKey,
        weekLabel: formatWeekLabel(currentWeekMonday, true, false),
        totalPoints: 0,
        itemsCount: 0,
        days: []
      };
    }

    // Sort weeks descending (newest first)
    const allWeeksList = Object.keys(weeklyMap)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((key) => weeklyMap[key]);

    // Compute diffs against previous chronological week
    // Notice allWeeksList is sorted descending [Week 3, Week 2, Week 1]
    for (let i = 0; i < allWeeksList.length; i++) {
      const prevWeek = allWeeksList[i + 1];
      const prevPoints = prevWeek ? prevWeek.totalPoints : 0;
      (allWeeksList[i] as any).diffPrevWeek = allWeeksList[i].totalPoints - prevPoints;
    }

    // Identify Most Scored Week (All-Time Record Week)
    let bestWeekPoints = 0;
    let bestWeekLabel = "None";
    let bestWeekKey = "";

    for (const w of allWeeksList) {
      if (w.totalPoints > bestWeekPoints) {
        bestWeekPoints = w.totalPoints;
        bestWeekLabel = w.weekLabel;
        bestWeekKey = w.weekKey;
      }
    }

    // Tag the best week in list
    for (const w of allWeeksList) {
      (w as any).isBestWeek = w.totalPoints > 0 && w.weekKey === bestWeekKey;
    }

    // This week and last week points
    const thisWeekPoints = weeklyMap[currentWeekKey]?.totalPoints || 0;
    const lastWeekKey = lastWeekMonday.toISOString().split("T")[0];
    const lastWeekPoints = weeklyMap[lastWeekKey]?.totalPoints || 0;
    const diffLastWeek = thisWeekPoints - lastWeekPoints;

    // Difference between most scored week and this week
    // If this week is currently the best or ties it (and > 0), diff is 0 or positive
    const diffBestWeek = thisWeekPoints - bestWeekPoints;
    const isNewRecord = thisWeekPoints >= bestWeekPoints && thisWeekPoints > 0;

    const paginatedWeekly = allWeeksList.slice(weeklyOffset, weeklyOffset + weeklyLimit);
    const hasMoreWeekly = weeklyOffset + weeklyLimit < allWeeksList.length;

    const responsePayload = {
      stats: {
        thisWeekPoints,
        lastWeekPoints,
        diffLastWeek,
        bestWeekPoints,
        bestWeekLabel,
        bestWeekKey,
        diffBestWeek,
        isNewRecord
      },
      daily: paginatedDaily,
      totalDailyDays: allDays.length,
      hasMoreDaily,
      weekly: paginatedWeekly,
      totalWeeks: allWeeksList.length,
      hasMoreWeekly,
      items: historyItems
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
