import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Student } from "@/models/Student";
import { Settings } from "@/models/Settings";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Student ID is required" }, { status: 400 });

    await connectToDatabase();
    const student = await Student.findById(id).lean();
    if (!student) return NextResponse.json({ error: "World not found" }, { status: 404 });

    const settings = await Settings.findOne({ key: "config", teacherId: student.teacherId }).lean();

    return NextResponse.json({
      name: student.name,
      worldBlocks: student.worldBlocks || [],
      landSize: student.landSize || 50,
      builderQuote: settings?.value?.builderQuote || "",
      builderItems: settings?.value?.builderItems || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch world", details: error.message }, { status: 500 });
  }
}
