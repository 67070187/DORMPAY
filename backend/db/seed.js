const bcrypt = require("bcryptjs");
const { calculateBill, dueDateFor } = require("../src/utils/billing");

function monthOffset(offset, base = new Date()) {
  const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * ใส่ข้อมูลตัวอย่าง: admin 1 คน, ผู้เช่า 7 คน, 10 ห้อง (ว่าง 3), บิลย้อนหลัง 6 เดือน
 * เดือนล่าสุดห้อง id 3 และ 6 ยังค้างชำระ
 */
async function seed(conn) {
  const [[settings]] = await conn.query("SELECT water_rate, elec_rate, due_day FROM settings WHERE id = 1");

  await conn.query("INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, 'ADMIN')", [
    "admin",
    await bcrypt.hash("admin1234", 10),
    "เจ้าของหอ",
  ]);

  const names = ["สมชาย ใจดี", "สมหญิง รักเรียน", "ณัฐพล แสนสุข", "พิมพ์ชนก ทองดี", "กิตติพงษ์ มีชัย", "วรรณา ศรีสวัสดิ์", "ธนากร บุญมา"];
  const hash = await bcrypt.hash("tenant1234", 10);
  const tenantIds = [];
  for (let i = 0; i < names.length; i++) {
    const [r] = await conn.query("INSERT INTO users (username, password_hash, name, phone, role) VALUES (?, ?, ?, ?, 'TENANT')", [
      `tenant${i + 1}`,
      hash,
      names[i],
      `08${String(10000000 + i * 1234567).slice(0, 8)}`,
    ]);
    tenantIds.push(r.insertId);
  }

  const rooms = [];
  let t = 0;
  for (const floor of [1, 2]) {
    for (let n = 1; n <= 5; n++) {
      const occupied = !(floor === 2 && n >= 3);
      const rent = (floor === 1 ? 3500 : 3800) * 100;
      const tenantId = occupied ? tenantIds[t++] : null;
      const [r] = await conn.query("INSERT INTO rooms (number, floor, rent, tenant_id) VALUES (?, ?, ?, ?)", [
        `${floor}0${n}`,
        floor,
        rent,
        tenantId,
      ]);
      rooms.push({ id: r.insertId, rent, tenantId });
    }
  }

  for (const room of rooms.filter((r) => r.tenantId)) {
    let water = 100 + room.id * 7;
    let elec = 1000 + room.id * 31;
    for (let offset = -6; offset <= -1; offset++) {
      const month = monthOffset(offset);
      const waterUnits = 4 + ((((room.id + offset * 3) % 6) + 6) % 6);
      const elecUnits = 80 + ((((room.id * 13 + offset * 17) % 70) + 70) % 70);
      const reading = { waterPrev: water, waterCurr: water + waterUnits, elecPrev: elec, elecCurr: elec + elecUnits };
      water += waterUnits;
      elec += elecUnits;

      await conn.query(
        "INSERT INTO meter_readings (room_id, month, water_prev, water_curr, elec_prev, elec_curr) VALUES (?, ?, ?, ?, ?, ?)",
        [room.id, month, reading.waterPrev, reading.waterCurr, reading.elecPrev, reading.elecCurr],
      );

      const calc = calculateBill({ rent: room.rent, ...reading, waterRate: settings.water_rate, elecRate: settings.elec_rate });
      const paid = offset < -1 || room.id % 3 !== 0;
      const [y, m] = month.split("-").map(Number);
      const paidAt = new Date(y, m, 1 + (room.id % 4), 10);

      const [b] = await conn.query(
        `INSERT INTO bills (room_id, tenant_id, month, rent, water_units, water_rate, water_amount,
           elec_units, elec_rate, elec_amount, total, due_date, status, paid_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          room.id, room.tenantId, month, room.rent,
          calc.waterUnits, settings.water_rate, calc.waterAmount,
          calc.elecUnits, settings.elec_rate, calc.elecAmount,
          calc.total, dueDateFor(month, settings.due_day),
          paid ? "PAID" : "UNPAID", paid ? paidAt : null,
        ],
      );
      if (paid) {
        await conn.query("INSERT INTO payments (bill_id, amount, reference, paid_at) VALUES (?, ?, ?, ?)", [
          b.insertId,
          calc.total,
          `SEED${String(b.insertId).padStart(6, "0")}`,
          paidAt,
        ]);
      }
    }
  }
}

module.exports = { seed };
