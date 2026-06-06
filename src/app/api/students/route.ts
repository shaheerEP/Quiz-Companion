import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Student } from "@/models/Student";

export async function GET() {
  try {
    await connectToDatabase();
    const students = await Student.find({}).sort({ updatedAt: -1 });
    return NextResponse.json(students);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, password } = await req.json();
    if (!name || !password) return NextResponse.json({ error: "Name and password are required" }, { status: 400 });

    await connectToDatabase();
    const newStudent = await Student.create({ name, password });
    return NextResponse.json(newStudent, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create student", details: error.message }, { status: 500 });
  }
}
