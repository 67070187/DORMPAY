const { pool, resetDb, asAdmin, request, app } = require("../helpers");

let admin;
beforeAll(async () => {
  await resetDb();
  admin = await asAdmin();
});
afterAll(() => pool.end());

describe("Tenants", () => {
  let id;

  test("GET /api/tenants -> 7 คน พร้อมยอดค้าง", async () => {
    const res = await admin.get("/api/tenants").expect(200);
    expect(res.body).toHaveLength(7);
    const owing = res.body.filter((t) => t.owed > 0).map((t) => t.username);
    expect(owing).toEqual(["tenant3", "tenant6"]);
  });

  test("POST /api/tenants พร้อมเข้าห้องว่าง -> 201", async () => {
    const res = await admin
      .post("/api/tenants")
      .send({ username: "newbie", password: "secret123", name: "ผู้เช่าใหม่", roomId: 8 })
      .expect(201);
    expect(res.body).toMatchObject({ username: "newbie", roomNumber: "203" });
    id = res.body.id;
  });

  test("ผู้เช่าใหม่ล็อกอินได้", async () => {
    await request(app).post("/api/auth/login").send({ username: "newbie", password: "secret123" }).expect(200);
  });

  test("username ซ้ำ -> 409, ห้องไม่ว่าง -> 409 (และไม่สร้าง user ค้างไว้)", async () => {
    const dup = await admin.post("/api/tenants").send({ username: "newbie", password: "secret123", name: "x" }).expect(409);
    expect(dup.body.error).toBe("ชื่อผู้ใช้ newbie ถูกใช้แล้ว");
    await admin.post("/api/tenants").send({ username: "other", password: "secret123", name: "x", roomId: 1 }).expect(409);
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM users WHERE username = 'other'");
    expect(n).toBe(0); // transaction rollback
  });

  test("รหัสผ่านสั้นเกินไป -> 400", async () => {
    await admin.post("/api/tenants").send({ username: "shorty", password: "123", name: "x" }).expect(400);
  });

  test("PUT /:id/room ย้ายห้อง และย้ายออก", async () => {
    let res = await admin.put(`/api/tenants/${id}/room`).send({ roomId: 9 }).expect(200);
    expect(res.body.roomNumber).toBe("204");
    res = await admin.put(`/api/tenants/${id}/room`).send({ roomId: null }).expect(200);
    expect(res.body.roomId).toBeNull();
  });

  test("PUT /:id/password แล้วล็อกอินด้วยรหัสใหม่", async () => {
    await admin.put(`/api/tenants/${id}/password`).send({ password: "changed99" }).expect(200);
    await request(app).post("/api/auth/login").send({ username: "newbie", password: "changed99" }).expect(200);
  });

  test("DELETE = soft delete แล้วล็อกอินไม่ได้", async () => {
    await admin.delete(`/api/tenants/${id}`).expect(204);
    await request(app).post("/api/auth/login").send({ username: "newbie", password: "changed99" }).expect(401);
    const [[row]] = await pool.query("SELECT deleted_at FROM users WHERE id = ?", [id]);
    expect(row.deleted_at).not.toBeNull();
  });
});
