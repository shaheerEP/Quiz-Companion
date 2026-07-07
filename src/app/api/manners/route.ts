import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { MannersLog } from "@/models/MannersLog";
import { Student } from "@/models/Student";
import { Settings } from "@/models/Settings";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const token = searchParams.get("token");

    await connectToDatabase();
    
    let targetStudentId = studentId;
    if (token) {
      try {
        targetStudentId = Buffer.from(token, 'base64').toString('utf8');
      } catch (e) {
        return NextResponse.json({ error: "Invalid token" }, { status: 400 });
      }
    }

    if (!targetStudentId) return NextResponse.json({ error: "Student ID required" }, { status: 400 });

    const student = await Student.findById(targetStudentId);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    
    // Parent fetching details via token
    if (token) {
       const settings = await Settings.findOne({ key: "config", teacherId: student.teacherId });
       const mannersList = settings?.value?.mannersList || [];
       
       const startOfDay = new Date();
       startOfDay.setHours(0, 0, 0, 0);
       
       const todayLog = await MannersLog.findOne({ studentId: targetStudentId, date: { $gte: startOfDay } });
       
       return NextResponse.json({ student, mannersList, todayLog });
    }

    // Teacher/Student fetching history
    const logs = await MannersLog.find({ studentId: targetStudentId }).sort({ date: -1 });
    return NextResponse.json(logs);

  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch manners logs", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { token, tasks } = await req.json();
    if (!token || !tasks) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    let studentId;
    try {
      studentId = Buffer.from(token, 'base64').toString('utf8');
    } catch (e) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    await connectToDatabase();
    const student = await Student.findById(studentId);
    if (!student || !student.mannersEnabled) {
      return NextResponse.json({ error: "Feature disabled or student not found" }, { status: 403 });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let totalScore = 0;
    let maxScore = 0;
    tasks.forEach((t: any) => {
      totalScore += Number(t.stars);
      maxScore += Number(t.maxStars);
    });
    
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    const log = await MannersLog.findOneAndUpdate(
      { studentId, date: { $gte: startOfDay } },
      {
        studentId,
        date: startOfDay,
        tasks,
        totalScore,
        maxScore,
        percentage
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(log);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to save manners log", details: error.message }, { status: 500 });
  }
}
