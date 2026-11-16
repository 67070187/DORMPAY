const { pool, resetDb, asAdmin } = require("../helpers");

let admin;
beforeAll(async () => {
  await resetDb();
  admin = await asAdmin();
});
afterAll(() => pool.end());

describe("Rooms CRUD", () => {
  let roomId;

  test("GET /api/rooms -> 10 ห้องจากข้อมูลตัวอย่าง", async () => {
    const res = await admin.get("/api/rooms").expect(200);
    expect(res.body).toHaveLength(10);
    expect(res.body[0]).toMatchObject({ number: "101", rent: 350000 });
  });

  test("GET /api/rooms?vacant=true -> เฉพาะห้องว่าง", async () => {
    const res = await admin.get("/api/rooms?vacant=true").expect(200);
    expect(res.body.map((r) => r.number)).toEqual(["203", "204", "205"]);
  });

  test("POST /api/rooms -> 201", async () => {
    const res = await admin.post("/api/rooms").send({ number: "301", floor: 3, rent: 400000 }).expect(201);
    expect(res.body).toMatchObject({ number: "301", floor: 3, rent: 400000, tenantId: null });
    roomId = res.body.id;
  });

  test("POST เลขห้องซ้ำ -> 409", async () => {
    const res = await admin.post("/api/rooms").send({ number: "301", floor: 3, rent: 400000 }).expect(409);
    expect(res.body.error).toBe("มีห้อง 301 อยู่แล้ว");
  });

  test("POST ข้อมูลไม่ครบ/ผิด -> 400", async () => {
    await admin.post("/api/rooms").send({ number: "", floor: 3, rent: 1 }).expect(400);
    await admin.post("/api/rooms").send({ number: "302", floor: 0, rent: 1 }).expect(400);
    await admin.post("/api/rooms").send({ number: "302", floor: 3, rent: -5 }).expect(400);
  });

  test("PUT /api/rooms/:id -> แก้ค่าเช่า", async () => {
    const res = await admin.put(`/api/rooms/${roomId}`).send({ number: "301", floor: 3, rent: 420000 }).expect(200);
    expect(res.body.rent).toBe(420000);
  });

  test("DELETE ห้องที่มีผู้เช่า -> 409", async () => {
    await admin.delete("/api/rooms/1").expect(409);
  });

  test("DELETE ห้องว่าง = soft delete (204) แล้วไม่แสดงในรายการ แต่ยังอยู่ในตาราง", async () => {
    await admin.delete(`/api/rooms/${roomId}`).expect(204);
    await admin.get(`/api/rooms/${roomId}`).expect(404);
    const [[row]] = await pool.query("SELECT deleted_at FROM rooms WHERE id = ?", [roomId]);
    expect(row.deleted_at).not.toBeNull();
  });

  test("ลบแล้วสร้างเลขห้องเดิมใหม่ได้", async () => {
    await admin.post("/api/rooms").send({ number: "301", floor: 3, rent: 400000 }).expect(201);
  });
});
