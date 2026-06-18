import { cookies } from "next/headers";

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("auth_session");
    if (!authCookie) return null;
    return JSON.parse(Buffer.from(authCookie.value, "base64").toString());
  } catch (e) {
    return null;
  }
}

export async function getTeacherId() {
  const session = await getSession();
  if (!session) return null;
  // Admin doesn't have a teacherId, maybe they can view all, but for now we scope strictly.
  // Actually, if Admin wants to view students, we'd need to pass a teacherId in query. For simplicity, we just protect by teacherId.
  return session.teacherId || null;
}
