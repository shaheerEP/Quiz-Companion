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

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, password, pointsBalance, lifetimePoints } = body;
    if (!id) return NextResponse.json({ error: "Student ID is required" }, { status: 400 });

    await connectToDatabase();
    const student = await Student.findById(id);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    if (name !== undefined) student.name = name;
    if (password !== undefined) student.password = password;
    if (pointsBalance !== undefined) student.pointsBalance = Number(pointsBalance);
    if (lifetimePoints !== undefined) student.lifetimePoints = Number(lifetimePoints);
    if (body.pet !== undefined) student.pet = body.pet;
    if (body.inventory !== undefined) student.inventory = body.inventory;
    if (body.assignedGame !== undefined) student.assignedGame = body.assignedGame;
    if (body.worldBlocks !== undefined) student.worldBlocks = body.worldBlocks;

    await student.save();
    return NextResponse.json(student);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update student", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Student ID is required" }, { status: 400 });

    await connectToDatabase();
    await Student.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete student", details: error.message }, { status: 500 });
  }
}
