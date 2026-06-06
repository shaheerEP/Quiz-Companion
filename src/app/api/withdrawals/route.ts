import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Student } from "@/models/Student";
import { WithdrawalLog } from "@/models/WithdrawalLog";

export async function POST(req: Request) {
  try {
    const { studentId, pointsDeducted, rewardDescription } = await req.json();
    
    if (!studentId || !pointsDeducted || !rewardDescription) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();
    const student = await Student.findById(studentId);
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
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    
    await connectToDatabase();
    const query = studentId ? { studentId } : {};
    const logs = await WithdrawalLog.find(query).sort({ date: -1 });
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
