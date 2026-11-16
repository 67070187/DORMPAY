const { pool, resetDb, asAdmin, asTenant } = require("../helpers");
const { currentMonth } = require("../../src/utils/billing");

let admin;
let tenant1;
const month = currentMonth();

beforeAll(async () => {
  await resetDb();
  admin = await asAdmin();
  tenant1 = await asTenant(1);
});
afterAll(() => pool.end());

describe("จดมิเตอร์ -> ออกบิล -> ผู้เช่าจ่ายด้วย PromptPay (สาธิต)", () => {
  let billId;

  test("GET /api/meters แสดงเลขครั้งก่อนจากเดือนที่แล้ว", async () => {
    const res = await admin.get(`/api/meters?month=${month}`).expect(200);
    expect(res.body.rooms).toHaveLength(7);
    const r101 = res.body.rooms.find((r) => r.roomNumber === "101");
    expect(r101.prevKnown).toBe(true);
    expect(r101.billId).toBeNull();
  });

  test("POST /api/meters ออกบิลและคำนวณถูก", async () => {
    const { body } = await admin.get(`/api/meters?month=${month}`);
    const r = body.rooms.find((x) => x.roomNumber === "101");
    const res = await admin
      .post("/api/meters")
      .send({
        month,
        readings: [
          { roomId: r.roomId, waterPrev: r.waterPrev, waterCurr: r.waterPrev + 6, elecPrev: r.elecPrev, elecCurr: r.elecPrev + 120 },
          { roomId: 2, waterPrev: 10, waterCurr: 5, elecPrev: 0, elecCurr: 1 }, // เลขน้อยกว่าครั้งก่อน
          { roomId: 8, waterPrev: 0, waterCurr: 1, elecPrev: 0, elecCurr: 1 }, // ห้องว่าง
        ],
      })
      .expect(201);
    // 3,500 + 6×18 + 120×8 = 4,568 บาท
    expect(res.body.saved).toEqual([{ roomId: r.roomId, roomNumber: "101", total: 456800 }]);
    expect(res.body.errors).toHaveLength(2);
  });

  test("POST /api/meters เดือนผิดรูปแบบ -> 400", async () => {
    await admin.post("/api/meters").send({ month: "2026-13", readings: [{}] }).expect(400);
  });

  test("ผู้เช่าเห็นบิลใหม่ใน /api/me", async () => {
    const res = await tenant1.get("/api/me").expect(200);
    expect(res.body.owed).toBe(456800);
    billId = res.body.bills.find((b) => b.month === month).id;
  });

  test("ผู้เช่าคนอื่นดูบิลนี้ไม่ได้ -> 404", async () => {
    const tenant2 = await asTenant(2);
    await tenant2.get(`/api/bills/${billId}`).expect(404);
    await tenant2.post(`/api/bills/${billId}/pay`).expect(404);
  });

  test("GET /api/bills/:id/promptpay ได้ payload ที่มียอดเงินถูก", async () => {
    const res = await tenant1.get(`/api/bills/${billId}/promptpay`).expect(200);
    expect(res.body.amount).toBe(456800);
    expect(res.body.payload).toContain("54074568.00");
    expect(res.body.accountId).toBe("081-xxx-5678");
  });

  test("POST /api/bills/:id/pay -> 201 + เลขอ้างอิง, บิลเป็น PAID", async () => {
    const res = await tenant1.post(`/api/bills/${billId}/pay`).expect(201);
    expect(res.body.reference).toMatch(/^DP\d{8}-\d{6}-\d{4}$/);
    const bill = await tenant1.get(`/api/bills/${billId}`).expect(200);
    expect(bill.body.status).toBe("PAID");
    expect(bill.body.payments).toHaveLength(1);
  });

  test("จ่ายซ้ำ -> 409 และไม่มี payment เพิ่ม", async () => {
    await tenant1.post(`/api/bills/${billId}/pay`).expect(409);
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM payments WHERE bill_id = ?", [billId]);
    expect(n).toBe(1);
  });

  test("กดจ่ายพร้อมกัน 5 ครั้ง บันทึกได้ครั้งเดียว (SELECT ... FOR UPDATE)", async () => {
    const tenant3 = await asTenant(3);
    const me = await tenant3.get("/api/me");
    const unpaid = me.body.bills.find((b) => b.status === "UNPAID");
    const results = await Promise.all(Array.from({ length: 5 }, () => tenant3.post(`/api/bills/${unpaid.id}/pay`)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM payments WHERE bill_id = ?", [unpaid.id]);
    expect(n).toBe(1);
  });

  test("แก้มิเตอร์ของบิลที่จ่ายแล้วไม่ได้", async () => {
    const res = await admin
      .post("/api/meters")
      .send({ month, readings: [{ roomId: 1, waterPrev: 0, waterCurr: 1, elecPrev: 0, elecCurr: 1 }] })
      .expect(400);
    expect(res.body.errors[0].error).toMatch(/ชำระแล้ว/);
  });

  test("ลบบิลที่จ่ายแล้ว -> 409", async () => {
    await admin.delete(`/api/bills/${billId}`).expect(409);
  });

  test("GET /api/bills?status=OVERDUE (จาก VIEW)", async () => {
    const res = await admin.get("/api/bills?status=OVERDUE").expect(200);
    expect(res.body.every((b) => b.displayStatus === "OVERDUE")).toBe(true);
    expect(res.body.map((b) => b.roomNumber)).toEqual(["201"]); // ห้อง 103 เพิ่งจ่ายไป
  });

  test("GET /api/dashboard สรุปตัวเลขถูก", async () => {
    const res = await admin.get("/api/dashboard").expect(200);
    expect(res.body.rooms).toEqual({ total: 10, occupied: 7, vacant: 3 });
    expect(res.body.outstanding.count).toBe(1);
    expect(res.body.revenue.at(-1)).toMatchObject({ month, paid: 456800, unpaid: 0 });
  });
});

describe("Settings", () => {
  test("PUT /api/settings หมายเลขพร้อมเพย์ผิด -> 400", async () => {
    await admin
      .put("/api/settings")
      .send({ waterRate: 1800, elecRate: 800, dueDay: 5, promptPayId: "123", promptPayName: "x" })
      .expect(400);
  });

  test("PUT /api/settings สำเร็จ", async () => {
    const res = await admin
      .put("/api/settings")
      .send({ waterRate: 2000, elecRate: 900, dueDay: 10, promptPayId: "0899999999", promptPayName: "หอทดสอบ" })
      .expect(200);
    expect(res.body).toMatchObject({ waterRate: 2000, dueDay: 10, promptPayId: "0899999999" });
  });
});
