const { toSatang, formatBaht } = require("../../src/utils/money");

test("toSatang", () => {
  expect(toSatang(3500)).toBe(350000);
  expect(toSatang("18.5")).toBe(1850);
  expect(toSatang(0.1 + 0.2)).toBe(30); // ปัดเศษทศนิยม floating point
});

test.each([[-1], ["abc"], [""], [null]])("toSatang(%p) -> error", (v) => {
  expect(() => toSatang(v)).toThrow(RangeError);
});

test("formatBaht", () => {
  expect(formatBaht(456800)).toBe("4,568.00");
});
