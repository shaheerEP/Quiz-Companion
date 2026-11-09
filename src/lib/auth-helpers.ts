import { cookies } from "next/headers";

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("auth_session");
    if (!authCookie || !authCookie.value) return null;

    let raw = authCookie.value;
    try {
      raw = decodeURIComponent(raw);
    } catch {}

    // Check if it's already a JSON string
    if (raw.startsWith("{") && raw.endsWith("}")) {
      return JSON.parse(raw);
    }

    // Try base64 decoding
    try {
      const decoded = Buffer.from(raw, "base64").toString("utf8");
      if (decoded.startsWith("{") && decoded.endsWith("}")) {
        return JSON.parse(decoded);
      }
    } catch {}

    return JSON.parse(raw);
  } catch (e) {
    console.error("getSession error:", e);
    return null;
  }
}

export async function getTeacherId() {
  const session = await getSession();
  if (!session) return null;
  if (session.teacherId) return session.teacherId;
  if (session.id && session.role === "teacher") return session.id;
  if (session.role === "admin") {
    return "admin";
  }
  return null;
}
