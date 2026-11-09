import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Student } from "@/models/Student";
import { getTeacherId } from "@/lib/auth-helpers";

import { updateStudentPoints } from "@/lib/points";

export async function GET(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const includeBlocks = searchParams.get("includeBlocks") === "true";

    await connectToDatabase();

    const now = new Date();
    const startOfCurrentDay = new Date(now);
    startOfCurrentDay.setHours(0, 0, 0, 0);

    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfCurrentWeek = new Date(new Date(now).setDate(diff));
    startOfCurrentWeek.setHours(0, 0, 0, 0);

    const resetScope: any = { teacherId };
    if (id) resetScope._id = id;

    // Fast atomic database-level resets instead of iterating and calling student.save() in a loop
    await Promise.all([
      Student.updateMany(
        {
          ...resetScope,
          $or: [
            { lastDailyReset: { $lt: startOfCurrentDay } },
            { lastDailyReset: null },
            { lastDailyReset: { $exists: false } }
          ]
        },
        { $set: { dailyPoints: 0, lastDailyReset: now } }
      ),
      Student.updateMany(
        {
          ...resetScope,
          $or: [
            { lastWeeklyReset: { $lt: startOfCurrentWeek } },
            { lastWeeklyReset: null },
            { lastWeeklyReset: { $exists: false } }
          ]
        },
        { $set: { weeklyPoints: 0, lastWeeklyReset: now } }
      )
    ]);

    const query: any = { teacherId };
    if (id) query._id = id;

    let mongoQuery = Student.find(query).sort({ updatedAt: -1 });
    if (!includeBlocks) {
      // Exclude heavy worldBlocks array by default to slash payload size and memory serialization
      mongoQuery = mongoQuery.select("-worldBlocks");
    }

    const students = await mongoQuery.lean();

    const response = NextResponse.json(students);
    response.headers.set("Cache-Control", "private, no-cache");
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, password } = await req.json();
    if (!name || !password) return NextResponse.json({ error: "Name and password are required" }, { status: 400 });

    await connectToDatabase();
    const newStudent = await Student.create({ name, password, teacherId });
    return NextResponse.json(newStudent, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create student", details: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, name, password, pointsBalance, lifetimePoints, isClassTime, rewardSystem, profileImageUrl, mannersEnabled, mannersList } = body;
    if (!id) return NextResponse.json({ error: "Student ID is required" }, { status: 400 });

    await connectToDatabase();
    const student = await Student.findOne({ _id: id, teacherId });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    if (name !== undefined) student.name = name;
    if (password !== undefined) student.password = password;
    if (pointsBalance !== undefined) student.pointsBalance = Number(pointsBalance);
    if (lifetimePoints !== undefined) student.lifetimePoints = Number(lifetimePoints);
    if (isClassTime !== undefined) student.isClassTime = isClassTime;
    if (rewardSystem !== undefined) student.rewardSystem = rewardSystem;
    if (mannersEnabled !== undefined) student.mannersEnabled = mannersEnabled;
    if (mannersList !== undefined) student.mannersList = mannersList;
    if (body.revisionRewindDays !== undefined) (student as any).revisionRewindDays = body.revisionRewindDays;
    
    if (profileImageUrl !== undefined) {
      if (student.profileImageUrl && student.profileImageUrl !== profileImageUrl) {
        const { deleteCloudinaryImage } = await import("@/lib/cloudinary");
        await deleteCloudinaryImage(student.profileImageUrl);
      }
      student.profileImageUrl = profileImageUrl;
    }
    
    // Legacy fields check
    if (body.pet !== undefined) student.pet = body.pet;
    if (body.inventory !== undefined) student.inventory = body.inventory;
    if (body.assignedGame !== undefined) student.assignedGame = body.assignedGame;
    if (body.worldBlocks !== undefined) student.worldBlocks = body.worldBlocks;
    if (body.activeAvatar !== undefined) student.activeAvatar = body.activeAvatar;
    if (body.unlockedAvatars !== undefined) student.unlockedAvatars = body.unlockedAvatars;
    if (body.customColors !== undefined) student.customColors = body.customColors;
    if (body.landSize !== undefined) student.landSize = Number(body.landSize);

    await student.save();
    const studentObj = student.toObject();
    if (body.worldBlocks === undefined) {
      delete (studentObj as any).worldBlocks;
    }
    return NextResponse.json(studentObj);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update student", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Student ID is required" }, { status: 400 });

    await connectToDatabase();
    const student = await Student.findOneAndDelete({ _id: id, teacherId });
    
    if (student && student.profileImageUrl) {
      const { deleteCloudinaryImage } = await import("@/lib/cloudinary");
      await deleteCloudinaryImage(student.profileImageUrl);
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete student", details: error.message }, { status: 500 });
  }
}
