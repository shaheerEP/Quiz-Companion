import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Student } from "@/models/Student";
import { getTeacherId } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    if (!studentId) return NextResponse.json({ error: "Student ID required" }, { status: 400 });

    await connectToDatabase();
    const student = await Student.findOne({ _id: studentId, teacherId });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    return NextResponse.json({
      notesText: student.notesText || "",
      notes: student.notes || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch notes", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { studentId, text, isCheckbox } = body;
    if (!studentId || !text?.trim()) {
      return NextResponse.json({ error: "Student ID and text required" }, { status: 400 });
    }

    await connectToDatabase();
    const student = await Student.findOne({ _id: studentId, teacherId });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text: text.trim(),
      isCheckbox: isCheckbox !== undefined ? Boolean(isCheckbox) : true,
      checked: false,
      createdAt: new Date(),
    };

    if (!student.notes) student.notes = [];
    student.notes.push(newNote);
    await student.save();

    return NextResponse.json({ success: true, note: newNote, notes: student.notes });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to add note", details: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { studentId, notesText, noteId, checked, text, isCheckbox, notes } = body;
    if (!studentId) return NextResponse.json({ error: "Student ID required" }, { status: 400 });

    await connectToDatabase();
    const student = await Student.findOne({ _id: studentId, teacherId });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    if (notesText !== undefined) {
      student.notesText = notesText;
    }

    if (noteId) {
      if (!student.notes) student.notes = [];
      const note = student.notes.find((n: any) => n.id === noteId);
      if (note) {
        if (checked !== undefined) note.checked = Boolean(checked);
        if (text !== undefined) note.text = text;
        if (isCheckbox !== undefined) note.isCheckbox = Boolean(isCheckbox);
      }
    }

    if (notes !== undefined && Array.isArray(notes)) {
      student.notes = notes;
    }

    await student.save();

    return NextResponse.json({
      success: true,
      notesText: student.notesText,
      notes: student.notes,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update note", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const noteId = searchParams.get("noteId");

    if (!studentId || !noteId) {
      return NextResponse.json({ error: "Student ID and note ID required" }, { status: 400 });
    }

    await connectToDatabase();
    const student = await Student.findOne({ _id: studentId, teacherId });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    student.notes = (student.notes || []).filter((n: any) => n.id !== noteId);
    await student.save();

    return NextResponse.json({ success: true, notes: student.notes });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete note", details: error.message }, { status: 500 });
  }
}
