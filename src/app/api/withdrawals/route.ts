import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Student } from "@/models/Student";
import { WithdrawalLog } from "@/models/WithdrawalLog";
import { getTeacherId } from "@/lib/auth-helpers";

export async function POST(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { studentId, pointsDeducted, rewardDescription } = await req.json();
    
    if (!studentId || !pointsDeducted || !rewardDescription) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();
    const student = await Student.findOne({ _id: studentId, teacherId });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    
    if (student.pointsBalance < pointsDeducted) {
      return NextResponse.json({ error: "Insufficient points balance" }, { status: 400 });
    }

    // Deduct points
    student.pointsBalance -= pointsDeducted;
    await student.save();

    // Log withdrawal
    const withdrawal = await WithdrawalLog.create({
      studentId,
      teacherId,
      pointsDeducted,
      rewardDescription
    });

    return NextResponse.json(withdrawal, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to process withdrawal", details: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    
    await connectToDatabase();
    const query: any = { teacherId };
    if (studentId) query.studentId = studentId;
    const logs = await WithdrawalLog.find(query).sort({ date: -1 });
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
