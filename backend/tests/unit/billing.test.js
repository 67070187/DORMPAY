const { calculateBill, dueDateFor, prevMonth, currentMonth, isValidMonth, paymentReference } = require("../../src/utils/billing");

describe("calculateBill", () => {
  const base = { rent: 350000, waterRate: 1800, elecRate: 800 };

  test("คิดค่าเช่า + ค่าน้ำ + ค่าไฟ เป็นสตางค์", () => {
    const r = calculateBill({ ...base, waterPrev: 100, waterCurr: 106, elecPrev: 1000, elecCurr: 1120 });
    expect(r).toEqual({ waterUnits: 6, waterAmount: 10800, elecUnits: 120, elecAmount: 96000, total: 456800 });
  });

  test("ไม่ใช้น้ำไฟเลย = ค่าเช่าอย่างเดียว", () => {
    const r = calculateBill({ ...base, waterPrev: 50, waterCurr: 50, elecPrev: 70, elecCurr: 70 });
    expect(r.total).toBe(350000);
  });

  test("เลขครั้งนี้น้อยกว่าครั้งก่อน -> error", () => {
    expect(() => calculateBill({ ...base, waterPrev: 10, waterCurr: 9, elecPrev: 0, elecCurr: 1 })).toThrow(RangeError);
    expect(() => calculateBill({ ...base, waterPrev: 0, waterCurr: 1, elecPrev: 5, elecCurr: 4 })).toThrow("ไฟ");
  });

  test.each([[-1], [1.5], [NaN]])("เลขมิเตอร์ %p ไม่ถูกต้อง -> error", (bad) => {
    expect(() => calculateBill({ ...base, waterPrev: bad, waterCurr: 10, elecPrev: 0, elecCurr: 1 })).toThrow(RangeError);
  });
});

describe("วันที่และเดือน", () => {
  test("dueDateFor: วันที่ 5 ของเดือนถัดไป 23:59:59", () => {
    const d = dueDateFor("2026-10", 5);
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()]).toEqual([2026, 11, 5, 23]);
  });

  test("dueDateFor: บิลเดือนธันวาคม ครบกำหนดมกราคมปีถัดไป", () => {
    const d = dueDateFor("2026-12", 5);
    expect([d.getFullYear(), d.getMonth() + 1]).toEqual([2027, 1]);
  });

  test("prevMonth ข้ามปี", () => {
    expect(prevMonth("2026-01")).toBe("2025-12");
    expect(prevMonth("2026-11")).toBe("2026-10");
  });

  test("currentMonth", () => {
    expect(currentMonth(new Date(2026, 0, 31))).toBe("2026-01");
  });

  test.each([
    ["2026-11", true],
    ["2026-13", false],
    ["2026-1", false],
    ["abc", false],
    [undefined, false],
  ])("isValidMonth(%p) = %p", (m, ok) => {
    expect(isValidMonth(m)).toBe(ok);
  });
});

test("paymentReference มีวันที่ + เลขบิล 6 หลัก + เลขสุ่ม 4 หลัก", () => {
  const ref = paymentReference(97, new Date(2026, 10, 16), () => 0.5);
  expect(ref).toBe("DP20261116-000097-5500");
});
