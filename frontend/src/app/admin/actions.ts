"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError, errorMessage } from "@/lib/api";
import { toSatang } from "@/lib/format";
import type { FormState } from "@/app/actions";

// server action ทุกตัวในไฟล์นี้แค่แปลงข้อมูลฟอร์ม แล้วเรียก Express API
// (การตรวจสิทธิ์และ validation จริงอยู่ที่ backend)

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

/* ---------------- ห้องพัก ---------------- */

export async function createRoom(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const room = await api<{ number: string }>("/rooms", {
      method: "POST",
      body: { number: str(fd, "number"), floor: Number(fd.get("floor")), rent: toSatang(fd.get("rent")) },
    });
    revalidatePath("/admin/rooms");
    return { ok: `เพิ่มห้อง ${room.number} แล้ว` };
  } catch (e) {
    if (e instanceof RangeError) return { error: e.message };
    return { error: errorMessage(e) };
  }
}

export async function updateRoomRent(fd: FormData) {
  await api(`/rooms/${fd.get("id")}`, {
    method: "PUT",
    body: { number: str(fd, "number"), floor: Number(fd.get("floor")), rent: toSatang(fd.get("rent")) },
  });
  revalidatePath("/admin/rooms");
}

export async function deleteRoom(fd: FormData) {
  await api(`/rooms/${fd.get("id")}`, { method: "DELETE" });
  revalidatePath("/admin/rooms");
}

/* ---------------- ผู้เช่า ---------------- */

export async function createTenant(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const t = await api<{ name: string }>("/tenants", {
      method: "POST",
      body: {
        username: str(fd, "username"),
        password: str(fd, "password"),
        name: str(fd, "name"),
        phone: str(fd, "phone") || null,
        roomId: Number(fd.get("roomId")) || null,
      },
    });
    revalidatePath("/admin/tenants");
    return { ok: `เพิ่มผู้เช่า ${t.name} แล้ว` };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function assignRoom(fd: FormData) {
  await api(`/tenants/${fd.get("tenantId")}/room`, {
    method: "PUT",
    body: { roomId: Number(fd.get("roomId")) || null },
  });
  revalidatePath("/admin/tenants");
}

export async function resetTenantPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    await api(`/tenants/${fd.get("tenantId")}/password`, { method: "PUT", body: { password: str(fd, "password") } });
    return { ok: "เปลี่ยนรหัสผ่านแล้ว" };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function deleteTenant(fd: FormData) {
  await api(`/tenants/${fd.get("tenantId")}`, { method: "DELETE" });
  revalidatePath("/admin/tenants");
}

/* ---------------- จดมิเตอร์ + ออกบิล ---------------- */

type MeterResult = { saved: { roomNumber: string }[]; errors: { roomId: number; error: string }[] };

export async function saveMeterReadings(_prev: FormState, fd: FormData): Promise<FormState> {
  const readings = fd
    .getAll("roomId")
    .map(Number)
    .filter((id) => str(fd, `waterCurr_${id}`) || str(fd, `elecCurr_${id}`))
    .map((roomId) => ({
      roomId,
      waterPrev: Number(fd.get(`waterPrev_${roomId}`)),
      waterCurr: Number(str(fd, `waterCurr_${roomId}`) || NaN),
      elecPrev: Number(fd.get(`elecPrev_${roomId}`)),
      elecCurr: Number(str(fd, `elecCurr_${roomId}`) || NaN),
    }));
  if (!readings.length) return { error: "ยังไม่ได้กรอกเลขมิเตอร์ห้องไหนเลย" };

  let result: MeterResult;
  try {
    result = await api<MeterResult>("/meters", { method: "POST", body: { month: str(fd, "month"), readings } });
  } catch (e) {
    // ถ้าไม่มีห้องไหนบันทึกได้ backend ตอบ 400 พร้อมรายการ errors
    if (e instanceof ApiError && e.data && typeof e.data === "object" && "errors" in e.data) {
      result = e.data as MeterResult;
    } else {
      return { error: errorMessage(e) };
    }
  }
  revalidatePath("/admin/meters");
  const errors = result.errors.map((x) => x.error).join(" · ");
  if (errors) return { error: `บันทึกแล้ว ${result.saved.length} ห้อง · ${errors}` };
  return { ok: `บันทึกมิเตอร์และออกบิลแล้ว ${result.saved.length} ห้อง` };
}

export async function deleteBill(fd: FormData) {
  await api(`/bills/${fd.get("id")}`, { method: "DELETE" });
  revalidatePath("/admin/bills");
  redirect("/admin/bills");
}

/* ---------------- ตั้งค่า ---------------- */

export async function updateSettings(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    await api("/settings", {
      method: "PUT",
      body: {
        waterRate: toSatang(fd.get("waterRate")),
        elecRate: toSatang(fd.get("elecRate")),
        dueDay: Number(fd.get("dueDay")),
        promptPayId: str(fd, "promptPayId"),
        promptPayName: str(fd, "promptPayName"),
      },
    });
    revalidatePath("/admin/settings");
    return { ok: "บันทึกแล้ว (อัตราค่าน้ำ-ไฟใหม่ใช้กับบิลที่ออกหลังจากนี้)" };
  } catch (e) {
    if (e instanceof RangeError) return { error: e.message };
    return { error: errorMessage(e) };
  }
}
