const { crc16, promptPayPayload, maskPromptPayId, isValidPromptPayId } = require("../../src/utils/promptpay");

test("crc16 ตรงกับค่ามาตรฐาน CRC-16/CCITT-FALSE", () => {
  expect(crc16("123456789")).toBe("29B1");
});

test("payload เบอร์โทร + ยอดเงิน", () => {
  expect(promptPayPayload("0812345678", 438600)).toBe(
    "00020101021229370016A00000067701011101130066812345678530376454074386.005802TH63044768",
  );
});

test("payload เลขบัตรประชาชน 13 หลักใช้ tag 02", () => {
  const p = promptPayPayload("1234567890123", 100);
  expect(p).toContain("02131234567890123");
  expect(p).toContain("54041.00");
});

test("payload ลงท้ายด้วย CRC ของข้อความก่อนหน้า", () => {
  const p = promptPayPayload("0899999999", 123456);
  expect(p.slice(-4)).toBe(crc16(p.slice(0, -4)));
});

test("maskPromptPayId", () => {
  expect(maskPromptPayId("0812345678")).toBe("081-xxx-5678");
});

test.each([
  ["0812345678", true],
  ["1234567890123", true],
  ["812345678", false],
  ["08123456789", false],
])("isValidPromptPayId(%p) = %p", (id, ok) => {
  expect(isValidPromptPayId(id)).toBe(ok);
});
