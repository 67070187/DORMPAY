import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "dormpay_session";

export type Session = { userId: number; role: "ADMIN" | "TENANT"; name: string };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("ยังไม่ได้ตั้งค่า AUTH_SECRET ในไฟล์ .env");
  return new TextEncoder().encode(s);
}

export async function signSession(session: Session) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
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
