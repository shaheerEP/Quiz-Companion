import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectToDatabase from "@/lib/db";
import { Student } from "@/models/Student";
import { Teacher } from "@/models/Teacher";

export async function POST(req: Request) {
  try {
    const { username, password, role, teacherUsername } = await req.json();
    await connectToDatabase();

    if (role === "admin") {
      const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "superadmin123";
      if (password === adminPassword) {
        const sessionData = { role: "admin" };
        const cookieStore = await cookies();
        cookieStore.set("auth_session", Buffer.from(JSON.stringify(sessionData)).toString("base64"), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 7 * 24 * 60 * 60
        });
        return NextResponse.json({ success: true, role: "admin" });
      } else {
        return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });
      }
    } else if (role === "teacher") {
      const teacher = await Teacher.findOne({ username });
      if (teacher && teacher.password === password) {
        const sessionData = { role: "teacher", teacherId: teacher._id.toString(), username: teacher.username };
        const cookieStore = await cookies();
        cookieStore.set("auth_session", Buffer.from(JSON.stringify(sessionData)).toString("base64"), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 7 * 24 * 60 * 60
        });
        return NextResponse.json({ success: true, role: "teacher" });
      } else {
        return NextResponse.json({ error: "Invalid teacher username or password" }, { status: 401 });
      }
    } else if (role === "student") {
      if (!teacherUsername) return NextResponse.json({ error: "Teacher username is required" }, { status: 400 });
      const teacher = await Teacher.findOne({ username: teacherUsername });
      if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

      const student = await Student.findOne({ name: username, teacherId: teacher._id });
      if (!student || student.password !== password) {
        return NextResponse.json({ error: "Invalid student name or password" }, { status: 401 });
      }
      const sessionData = { role: "student", id: student._id.toString(), name: student.name, teacherId: teacher._id.toString() };
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
