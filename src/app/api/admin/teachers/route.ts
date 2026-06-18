import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectToDatabase from "@/lib/db";
import { Teacher } from "@/models/Teacher";

// Helper to check admin auth
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

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  try {
    await connectToDatabase();
    // Use aggregation to join students and get student count
    const teachers = await Teacher.aggregate([
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "teacherId",
          as: "studentsList"
        }
      },
      {
        $addFields: {
          studentCount: { $size: "$studentsList" }
        }
      },
      {
        $project: {
          studentsList: 0 // We don't need the actual students
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    return NextResponse.json(teachers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  try {
    const { username, password } = await req.json();
    if (!username || !password) return NextResponse.json({ error: "Username and password required" }, { status: 400 });

    await connectToDatabase();
    const existing = await Teacher.findOne({ username });
    if (existing) return NextResponse.json({ error: "Username already exists" }, { status: 400 });

    const teacher = await Teacher.create({ username, password });
    return NextResponse.json(teacher, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
