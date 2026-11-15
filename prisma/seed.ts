import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function monthOffset(offset: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function main() {
  // ล้างข้อมูลเก่า
  await prisma.payment.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.meterReading.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  const setting = await prisma.setting.create({
    data: { id: 1, waterRate: 1800, elecRate: 800, dueDay: 5 },
  });

  await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: await bcrypt.hash("admin1234", 10),
      name: "เจ้าของหอ",
      role: "ADMIN",
    },
  });

  const tenantNames = [
    "สมชาย ใจดี", "สมหญิง รักเรียน", "ณัฐพล แสนสุข", "พิมพ์ชนก ทองดี",
    "กิตติพงษ์ มีชัย", "วรรณา ศรีสวัสดิ์", "ธนากร บุญมา",
  ];
  const tenantHash = await bcrypt.hash("tenant1234", 10);
  const tenants = [];
  for (let i = 0; i < tenantNames.length; i++) {
    tenants.push(
      await prisma.user.create({
        data: {
          username: `tenant${i + 1}`,
          passwordHash: tenantHash,
          name: tenantNames[i],
          phone: `08${String(10000000 + i * 1234567).slice(0, 8)}`,
          role: "TENANT",
        },
      }),
    );
  }

  // 2 ชั้น ชั้นละ 5 ห้อง ห้องว่าง 3 ห้อง
  const rooms = [];
  let t = 0;
  for (const floor of [1, 2]) {
    for (let n = 1; n <= 5; n++) {
      const occupied = !(floor === 2 && n >= 3);
      rooms.push(
        await prisma.room.create({
          data: {
            number: `${floor}0${n}`,
            floor,
            rent: (floor === 1 ? 3500 : 3800) * 100,
            tenantId: occupied ? tenants[t++].id : null,
          },
        }),
      );
    }
  }

  // ย้อนหลัง 6 เดือน (เดือนปัจจุบันยังไม่จด)
  for (const room of rooms.filter((r) => r.tenantId)) {
    let water = 100 + room.id * 7;
    let elec = 1000 + room.id * 31;
    for (let offset = -6; offset <= -1; offset++) {
      const month = monthOffset(offset);
      const waterUnits = 4 + ((room.id + offset * 3) % 6 + 6) % 6;
      const elecUnits = 80 + ((room.id * 13 + offset * 17) % 70 + 70) % 70;
      await prisma.meterReading.create({
        data: {
          roomId: room.id, month,
          waterPrev: water, waterCurr: water + waterUnits,
          elecPrev: elec, elecCurr: elec + elecUnits,
        },
      });
      water += waterUnits;
      elec += elecUnits;

      const waterAmount = waterUnits * setting.waterRate;
      const elecAmount = elecUnits * setting.elecRate;
      const total = room.rent + waterAmount + elecAmount;
      const [y, m] = month.split("-").map(Number);
      // เดือนล่าสุดให้บางห้องยังค้างจ่าย
      const paid = offset < -1 || room.id % 3 !== 0;
      const paidAt = new Date(y, m, 1 + (room.id % 4), 10);

      const bill = await prisma.bill.create({
        data: {
          roomId: room.id, tenantId: room.tenantId!, month,
          rent: room.rent,
          waterUnits, waterRate: setting.waterRate, waterAmount,
          elecUnits, elecRate: setting.elecRate, elecAmount,
          total,
          dueDate: new Date(y, m, setting.dueDay, 23, 59, 59),
          status: paid ? "PAID" : "UNPAID",
          paidAt: paid ? paidAt : null,
        },
      });
      if (paid) {
        await prisma.payment.create({
          data: {
            billId: bill.id, amount: total,
            stripeSessionId: `seed_${bill.id}`,
            method: room.id % 2 ? "promptpay" : "card",
            paidAt,
          },
        });
      }
    }
  }

  console.log("Seed เสร็จแล้ว: admin/admin1234, tenant1..tenant7 / tenant1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
