import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectToDatabase from "@/lib/db";
import { Student } from "@/models/Student";
import { updateStudentPoints } from "@/lib/points";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("auth_session");
    if (!authCookie) return NextResponse.json(null);
    
    const session = JSON.parse(Buffer.from(authCookie.value, "base64").toString());
    if (session.role === "student") {
      await connectToDatabase();
      // Exclude heavy worldBlocks and notes/tasks to keep payload and CPU serialization minimal
      const student = await Student.findById(session.id).select("-worldBlocks -notes -tasks");
      if (student) {
        const prevDaily = student.lastDailyReset;
        const prevWeekly = student.lastWeeklyReset;
        updateStudentPoints(student, 0);
        if (student.lastDailyReset !== prevDaily || student.lastWeeklyReset !== prevWeekly) {
          await student.save();
        }
      }
      const studentData = student?.toObject ? student.toObject() : student;
      const res = NextResponse.json({ ...session, student: studentData });
      res.headers.set("Cache-Control", "private, no-cache");
      return res;
    }
    const res = NextResponse.json(session);
    res.headers.set("Cache-Control", "private, no-cache");
    return res;
  } catch (error) {
    return NextResponse.json(null);
  }
}
