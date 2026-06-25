import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectToDatabase from "@/lib/db";
import { Student } from "@/models/Student";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (!token) return NextResponse.redirect(new URL("/login", req.url));

    await connectToDatabase();
    
    // Decode base64 student ID
    const studentId = Buffer.from(token, "base64").toString();
    const student = await Student.findById(studentId);
    
    if (!student) return NextResponse.redirect(new URL("/login", req.url));

    const sessionData = { role: "student", id: student._id.toString(), name: student.name, teacherId: student.teacherId.toString() };
    const cookieStore = await cookies();
    cookieStore.set("auth_session", Buffer.from(JSON.stringify(sessionData)).toString("base64"), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60
    });

    return NextResponse.redirect(new URL("/student", req.url));
  } catch (error: any) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}
