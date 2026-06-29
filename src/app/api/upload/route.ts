import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getTeacherId } from "@/lib/auth-helpers";

// Cloudinary config is automatically loaded from the CLOUDINARY_URL environment variable 
// if it exists. If we need to explicitly configure it, we can, but v2 handles it.

export async function POST(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary using a stream
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: "interactive-quiz/profiles",
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" }
          ]
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json(uploadResult);
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    return NextResponse.json({ error: "Upload failed", details: error.message }, { status: 500 });
  }
}
