import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** cookie เก็บ JWT ที่ backend ออกให้ตอน login (ชื่อเดียวกับฝั่ง backend) */
export const SESSION_COOKIE = "token";

export type Session = { userId: number; role: "ADMIN" | "TENANT"; name: string };

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("ยังไม่ได้ตั้งค่า JWT_SECRET ในไฟล์ frontend/.env");
  return new TextEncoder().encode(s);
}

/** ตรวจลายเซ็น JWT ด้วย secret เดียวกับ backend */
export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { userId: Number(payload.sub), role: payload.role as Session["role"], name: String(payload.name) };
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export async function requireRole(role: Session["role"]) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== role) redirect(session.role === "ADMIN" ? "/admin" : "/tenant");
  return session;
}
