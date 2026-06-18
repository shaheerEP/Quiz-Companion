import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectToDatabase from "@/lib/db";
import { Teacher } from "@/models/Teacher";

async function checkAdmin() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("auth_session");
  if (!authCookie) return false;
  try {
    const session = JSON.parse(Buffer.from(authCookie.value, "base64").toString());
    return session.role === "admin";
  } catch (e) {
    return false;
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  try {
    const { id } = await params;
    const { username, password } = await req.json();
    await connectToDatabase();
    
    const updateData: any = {};
    if (username) updateData.username = username;
    if (password) updateData.password = password;

    const teacher = await Teacher.findByIdAndUpdate(id, updateData, { new: true });
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    
    return NextResponse.json(teacher);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  try {
    const { id } = await params;
    await connectToDatabase();
    const teacher = await Teacher.findByIdAndDelete(id);
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
