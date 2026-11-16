const jwt = require("jsonwebtoken");
const { requireAuth, requireRole, signToken } = require("../../src/middleware/auth");

function run(mw, req) {
  return new Promise((resolve) => mw(req, {}, (err) => resolve({ err, req })));
}
const reqWith = ({ cookie, bearer } = {}) => ({
  cookies: cookie ? { token: cookie } : {},
  get: (h) => (h === "authorization" && bearer ? `Bearer ${bearer}` : undefined),
});

describe("requireAuth", () => {
  const token = signToken({ id: 5, role: "TENANT", name: "ทดสอบ" });

  test("ไม่มี token -> 401", async () => {
    const { err } = await run(requireAuth, reqWith());
    expect(err.status).toBe(401);
  });

  test("token ใน cookie ถูกต้อง -> ได้ req.user", async () => {
    const { err, req } = await run(requireAuth, reqWith({ cookie: token }));
    expect(err).toBeUndefined();
    expect(req.user).toEqual({ id: 5, role: "TENANT", name: "ทดสอบ" });
  });

  test("token ใน Authorization: Bearer ก็ใช้ได้", async () => {
    const { req } = await run(requireAuth, reqWith({ bearer: token }));
    expect(req.user.id).toBe(5);
  });

  test("token ปลอม (เซ็นด้วย secret อื่น) -> 401", async () => {
    const fake = jwt.sign({ sub: "1", role: "ADMIN" }, "wrong-secret");
    const { err } = await run(requireAuth, reqWith({ cookie: fake }));
    expect(err.status).toBe(401);
  });

  test("token หมดอายุ -> 401", async () => {
    const expired = jwt.sign({ sub: "1", role: "ADMIN", exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_SECRET);
    const { err } = await run(requireAuth, reqWith({ cookie: expired }));
    expect(err.status).toBe(401);
  });
});

describe("requireRole", () => {
  test("บทบาทตรง -> ผ่าน", async () => {
    const { err } = await run(requireRole("ADMIN"), { user: { role: "ADMIN" } });
    expect(err).toBeUndefined();
  });

  test("บทบาทไม่ตรง -> 403", async () => {
    const { err } = await run(requireRole("ADMIN"), { user: { role: "TENANT" } });
    expect(err.status).toBe(403);
  });
});
