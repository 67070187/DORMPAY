"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/auth";

export type FormState = { error?: string; ok?: string } | undefined;

/** ส่งชื่อผู้ใช้/รหัสผ่านไปที่ POST /api/auth/login แล้วเก็บ JWT ไว้ใน httpOnly cookie */
export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: formData.get("username"), password: formData.get("password") }),
      cache: "no-store",
    });
  } catch {
    return { error: "เชื่อมต่อ backend ไม่ได้ (ตรวจว่าเปิด backend แล้ว)" };
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) return { error: data?.error ?? "เข้าสู่ระบบไม่สำเร็จ" };

  (await cookies()).set(SESSION_COOKIE, data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect(data.user.role === "ADMIN" ? "/admin" : "/tenant");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
