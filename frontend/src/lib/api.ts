import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "./auth";

export const API_URL = (process.env.BACKEND_URL ?? "http://localhost:4000") + "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
  }
}

/**
 * เรียก Express API จากฝั่งเซิร์ฟเวอร์ของ Next.js
 * ส่ง JWT ของผู้ใช้ไปใน header Authorization: Bearer ...
 * ถ้า token หมดอายุ (401) จะพากลับไปหน้า login
 */
export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.method ?? "GET",
      headers: {
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(503, "เชื่อมต่อ backend ไม่ได้ (ตรวจว่าเปิด backend แล้ว)");
  }

  if (res.status === 401) redirect("/login");
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `HTTP ${res.status}`, data);
  return data as T;
}

/** ใช้ใน server action: แปลง error เป็นข้อความสำหรับแสดงในฟอร์ม */
export function errorMessage(e: unknown) {
  if (e instanceof ApiError) return e.message;
  throw e; // redirect() ของ Next.js ต้องปล่อยให้หลุดออกไป
}
