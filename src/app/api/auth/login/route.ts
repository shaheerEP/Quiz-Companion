import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectToDatabase from "@/lib/db";
import { Student } from "@/models/Student";

export async function POST(req: Request) {
  try {
    const { username, password, role } = await req.json();
    await connectToDatabase();

    if (role === "teacher") {
      const teacherPassword = process.env.TEACHER_PASSWORD || "admin123";
      if (password === teacherPassword) {
        const sessionData = { role: "teacher" };
        const cookieStore = await cookies();
        cookieStore.set("auth_session", Buffer.from(JSON.stringify(sessionData)).toString("base64"), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/"
        });
        return NextResponse.json({ success: true, role: "teacher" });
      } else {
        return NextResponse.json({ error: "Invalid teacher password" }, { status: 401 });
      }
    } else if (role === "student") {
      const student = await Student.findOne({ name: username });
      if (!student || student.password !== password) {
        return NextResponse.json({ error: "Invalid student name or password" }, { status: 401 });
      }
      const sessionData = { role: "student", id: student._id.toString(), name: student.name };
      const cookieStore = await cookies();
      cookieStore.set("auth_session", Buffer.from(JSON.stringify(sessionData)).toString("base64"), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/"
      });
      return NextResponse.json({ success: true, role: "student", student });
    }

    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: "Login failed", details: error.message }, { status: 500 });
  }
}
