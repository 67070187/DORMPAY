"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { toSatang } from "@/lib/format";
import { dueDateFor, getSettings } from "@/lib/billing";
import type { FormState } from "@/app/actions";

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function isUniqueError(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/* ---------------- ห้องพัก ---------------- */

export async function createRoom(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireRole("ADMIN");
  const number = str(fd, "number");
  const floor = Number(fd.get("floor"));
  if (!number || !Number.isInteger(floor) || floor < 1) return { error: "กรอกเลขห้องและชั้นให้ถูกต้อง" };
  try {
    await prisma.room.create({ data: { number, floor, rent: toSatang(fd.get("rent")) } });
  } catch (e) {
    if (isUniqueError(e)) return { error: `มีห้อง ${number} อยู่แล้ว` };
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/rooms");
  return { ok: `เพิ่มห้อง ${number} แล้ว` };
}

export async function updateRoomRent(fd: FormData) {
  await requireRole("ADMIN");
  await prisma.room.update({ where: { id: Number(fd.get("id")) }, data: { rent: toSatang(fd.get("rent")) } });
  revalidatePath("/admin/rooms");
}

export async function deleteRoom(fd: FormData) {
  await requireRole("ADMIN");
  const room = await prisma.room.findUnique({ where: { id: Number(fd.get("id")) } });
  if (!room || room.tenantId) return; // ลบได้เฉพาะห้องว่าง
  await prisma.room.delete({ where: { id: room.id } });
  revalidatePath("/admin/rooms");
}

/* ---------------- ผู้เช่า ---------------- */

export async function createTenant(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireRole("ADMIN");
  const username = str(fd, "username");
  const password = str(fd, "password");
  const name = str(fd, "name");
  const phone = str(fd, "phone") || null;
  const roomId = Number(fd.get("roomId")) || null;

  if (!/^[a-zA-Z0-9_.]{3,30}$/.test(username))
    return { error: "ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษ/ตัวเลข 3-30 ตัวอักษร" };
  if (password.length < 6) return { error: "รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร" };
  if (!name) return { error: "กรอกชื่อผู้เช่า" };

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username, name, phone, role: "TENANT", passwordHash: await bcrypt.hash(password, 10) },
      });
      if (roomId) {
        const room = await tx.room.findUnique({ where: { id: roomId } });
        if (!room || room.tenantId) throw new Error("ห้องนี้มีผู้เช่าแล้ว");
        await tx.room.update({ where: { id: roomId }, data: { tenantId: user.id } });
      }
    });
  } catch (e) {
    if (isUniqueError(e)) return { error: `ชื่อผู้ใช้ ${username} ถูกใช้แล้ว` };
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/tenants");
  revalidatePath("/admin/rooms");
  return { ok: `เพิ่มผู้เช่า ${name} แล้ว` };
}

export async function assignRoom(fd: FormData) {
  await requireRole("ADMIN");
  const tenantId = Number(fd.get("tenantId"));
  const roomId = Number(fd.get("roomId")) || null;
  await prisma.$transaction(async (tx) => {
    await tx.room.updateMany({ where: { tenantId }, data: { tenantId: null } });
    if (roomId) {
      const room = await tx.room.findUnique({ where: { id: roomId } });
      if (room && !room.tenantId) await tx.room.update({ where: { id: roomId }, data: { tenantId } });
    }
  });
  revalidatePath("/admin/tenants");
  revalidatePath("/admin/rooms");
}

export async function resetTenantPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireRole("ADMIN");
  const password = str(fd, "password");
  if (password.length < 6) return { error: "รหัสผ่านอย่างน้อย 6 ตัว" };
  await prisma.user.update({
    where: { id: Number(fd.get("tenantId")), role: "TENANT" },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  return { ok: "เปลี่ยนรหัสผ่านแล้ว" };
}

/* ---------------- จดมิเตอร์ + ออกบิล ---------------- */

export async function saveMeterReadings(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireRole("ADMIN");
  const month = str(fd, "month");
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "เดือนไม่ถูกต้อง" };

  const settings = await getSettings();
  const roomIds = fd.getAll("roomId").map(Number);
  let saved = 0;
  const errors: string[] = [];

  for (const roomId of roomIds) {
    const wc = str(fd, `waterCurr_${roomId}`);
    const ec = str(fd, `elecCurr_${roomId}`);
    if (!wc && !ec) continue; // ยังไม่จดห้องนี้

    const waterPrev = Number(fd.get(`waterPrev_${roomId}`));
    const elecPrev = Number(fd.get(`elecPrev_${roomId}`));
    const waterCurr = Number(wc);
    const elecCurr = Number(ec);

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) continue;
    const vals = [waterPrev, elecPrev, waterCurr, elecCurr];
    if (!wc || !ec || vals.some((v) => !Number.isInteger(v) || v < 0)) {
      errors.push(`ห้อง ${room.number}: กรอกเลขมิเตอร์ให้ครบ (จำนวนเต็ม)`);
      continue;
    }
    if (waterCurr < waterPrev || elecCurr < elecPrev) {
      errors.push(`ห้อง ${room.number}: เลขครั้งนี้ต้องไม่น้อยกว่าครั้งก่อน`);
      continue;
    }
    if (!room.tenantId) {
      errors.push(`ห้อง ${room.number}: ไม่มีผู้เช่า`);
      continue;
    }

    const existingBill = await prisma.bill.findUnique({ where: { roomId_month: { roomId, month } } });
    if (existingBill?.status === "PAID") {
      errors.push(`ห้อง ${room.number}: บิลเดือนนี้ชำระแล้ว แก้ไขไม่ได้`);
      continue;
    }

    const waterUnits = waterCurr - waterPrev;
    const elecUnits = elecCurr - elecPrev;
    const waterAmount = waterUnits * settings.waterRate;
    const elecAmount = elecUnits * settings.elecRate;
    const billData = {
      tenantId: room.tenantId,
      rent: room.rent,
      waterUnits, waterRate: settings.waterRate, waterAmount,
      elecUnits, elecRate: settings.elecRate, elecAmount,
      total: room.rent + waterAmount + elecAmount,
      dueDate: dueDateFor(month, settings.dueDay),
    };

    await prisma.$transaction([
      prisma.meterReading.upsert({
        where: { roomId_month: { roomId, month } },
        create: { roomId, month, waterPrev, waterCurr, elecPrev, elecCurr },
        update: { waterPrev, waterCurr, elecPrev, elecCurr },
      }),
      prisma.bill.upsert({
        where: { roomId_month: { roomId, month } },
        create: { roomId, month, ...billData },
        update: billData,
      }),
    ]);
    saved++;
  }

  revalidatePath("/admin/meters");
  revalidatePath("/admin/bills");
  revalidatePath("/admin");
  if (errors.length) return { error: `บันทึกแล้ว ${saved} ห้อง · ${errors.join(" · ")}` };
  if (!saved) return { error: "ยังไม่ได้กรอกเลขมิเตอร์ห้องไหนเลย" };
  return { ok: `บันทึกมิเตอร์และออกบิลแล้ว ${saved} ห้อง` };
}

export async function deleteBill(fd: FormData) {
  await requireRole("ADMIN");
  const bill = await prisma.bill.findUnique({ where: { id: Number(fd.get("id")) } });
  if (!bill || bill.status === "PAID") return;
  await prisma.$transaction([
    prisma.bill.delete({ where: { id: bill.id } }),
    prisma.meterReading.deleteMany({ where: { roomId: bill.roomId, month: bill.month } }),
  ]);
  revalidatePath("/admin/bills");
  revalidatePath("/admin/meters");
}

/* ---------------- ตั้งค่า ---------------- */

export async function updateSettings(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireRole("ADMIN");
  const dueDay = Number(fd.get("dueDay"));
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) return { error: "วันครบกำหนดต้องอยู่ระหว่าง 1-28" };
  const promptPayId = str(fd, "promptPayId").replace(/\D/g, "");
  const promptPayName = str(fd, "promptPayName");
  if (!/^0\d{9}$/.test(promptPayId) && !/^\d{13}$/.test(promptPayId))
    return { error: "หมายเลขพร้อมเพย์ต้องเป็นเบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก" };
  if (!promptPayName) return { error: "กรอกชื่อบัญชี" };
  try {
    const data = {
      waterRate: toSatang(fd.get("waterRate")),
      elecRate: toSatang(fd.get("elecRate")),
      dueDay,
      promptPayId,
      promptPayName,
    };
    await prisma.setting.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/settings");
  return { ok: "บันทึกแล้ว (อัตราค่าน้ำ-ไฟใหม่ใช้กับบิลที่ออกหลังจากนี้)" };
}
