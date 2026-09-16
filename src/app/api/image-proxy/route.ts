import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl || !imageUrl.startsWith("http")) {
      return new NextResponse("Invalid URL", { status: 400 });
    }

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "QuizCompanionPoster/1.0",
      },
    });

    if (!response.ok) {
      return new NextResponse("Failed to fetch upstream image", { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Proxy Error", { status: 500 });
  }
}
