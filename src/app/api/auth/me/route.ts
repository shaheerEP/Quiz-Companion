import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectToDatabase from "@/lib/db";
import { Student } from "@/models/Student";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("auth_session");
    if (!authCookie) return NextResponse.json(null);
    
    const session = JSON.parse(Buffer.from(authCookie.value, "base64").toString());
    if (session.role === "student") {
      await connectToDatabase();
      const student = await Student.findById(session.id);
      return NextResponse.json({ ...session, student });
    }
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(null);
  }
}
