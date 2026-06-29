import { IStudent } from "@/models/Student";

function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const startOfWeek = new Date(d.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}

function getStartOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function updateStudentPoints(
  student: any,
  pointsToAdd: number
) {
  const now = new Date();
  const startOfCurrentWeek = getStartOfWeek(now);
  const startOfCurrentDay = getStartOfDay(now);

  // Reset weekly points if last reset was before this week's start
  if (!student.lastWeeklyReset || new Date(student.lastWeeklyReset) < startOfCurrentWeek) {
    student.weeklyPoints = 0;
    student.lastWeeklyReset = now;
  }

  // Reset daily points if last reset was before today
  if (!student.lastDailyReset || new Date(student.lastDailyReset) < startOfCurrentDay) {
    student.dailyPoints = 0;
    student.lastDailyReset = now;
  }

  // Only add positive points to daily/weekly trackers (or subtract if penalty)
  student.weeklyPoints = Math.max(0, (student.weeklyPoints || 0) + pointsToAdd);
  student.dailyPoints = Math.max(0, (student.dailyPoints || 0) + pointsToAdd);
  
  student.pointsBalance = Math.max(0, (student.pointsBalance || 0) + pointsToAdd);
  student.lifetimePoints = Math.max(0, (student.lifetimePoints || 0) + pointsToAdd);

  return student;
}
