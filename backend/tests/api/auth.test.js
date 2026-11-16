const { app, request, pool, resetDb, asAdmin, asTenant } = require("../helpers");

beforeAll(resetDb);
afterAll(() => pool.end());

describe("POST /api/auth/login", () => {
  test("รหัสถูก -> 200 + token + httpOnly cookie", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin1234" });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: "admin", role: "ADMIN" });
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.headers["set-cookie"][0]).toMatch(/^token=.+HttpOnly/);
  });

  test("รหัสผิด -> 401", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "admin", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  test("ไม่ส่งข้อมูล -> 400", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });

  test("JSON พัง -> 400", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad");
    expect(res.status).toBe(400);
  });
});

describe("การยืนยันตัวตนและสิทธิ์", () => {
  test("ไม่ล็อกอิน -> 401", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    expect((await request(app).get("/api/rooms")).status).toBe(401);
  });

  test("ส่ง token ผ่าน Authorization: Bearer ได้ (เหมือนใน Postman)", async () => {
    const login = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin1234" });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("admin");
  });

  test("ผู้เช่าเรียก API ของ admin -> 403", async () => {
    const tenant = await asTenant(1);
    expect((await tenant.get("/api/rooms")).status).toBe(403);
    expect((await tenant.get("/api/dashboard")).status).toBe(403);
  });

  test("admin เรียก API ของผู้เช่า -> 403", async () => {
    const admin = await asAdmin();
    expect((await admin.get("/api/me")).status).toBe(403);
  });

  test("logout แล้วเรียกต่อไม่ได้", async () => {
    const admin = await asAdmin();
    await admin.post("/api/auth/logout").expect(200);
    expect((await admin.get("/api/auth/me")).status).toBe(401);
  });

  test("route ที่ไม่มี -> 404", async () => {
    expect((await request(app).get("/api/nope")).status).toBe(404);
  });
});
