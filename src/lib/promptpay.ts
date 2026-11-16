/**
 * สร้างข้อความ PromptPay QR ตามมาตรฐาน EMVCo (แบบเดียวกับที่ธนาคารไทยใช้)
 * โปรเจคนี้ใช้เพื่อสาธิตเท่านั้น หมายเลขพร้อมเพย์ตั้งค่าได้ในหน้า "ตั้งค่า"
 */

function field(id: string, value: string) {
  return id + String(value.length).padStart(2, "0") + value;
}

/** CRC16-CCITT (poly 0x1021, เริ่มต้น 0xFFFF) ตามที่ EMVCo กำหนด */
export function crc16(data: string) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** "0812345678" -> "0066812345678" ส่วนเลขบัตรประชาชน 13 หลักใช้ตามเดิม */
function formatTarget(id: string) {
  const digits = id.replace(/\D/g, "");
  if (digits.length === 13) return { tag: "02", value: digits };
  return { tag: "01", value: ("0066" + digits.replace(/^0/, "")).padStart(13, "0") };
}

/** @param amountSatang ยอดเงินเป็นสตางค์ */
export function promptPayPayload(promptPayId: string, amountSatang: number) {
  const target = formatTarget(promptPayId);
  const merchant = field("00", "A000000677010111") + field(target.tag, target.value);
  const body =
    field("00", "01") +
    field("01", "12") + // 12 = QR ใช้ครั้งเดียว มียอดเงินกำหนด
    field("29", merchant) +
    field("53", "764") + // สกุลเงินบาท
    field("54", (amountSatang / 100).toFixed(2)) +
    field("58", "TH") +
    "6304";
  return body + crc16(body);
}

/** "0812345678" -> "081-xxx-5678" */
export function maskPromptPayId(id: string) {
  const d = id.replace(/\D/g, "");
  if (d.length === 10) return `${d.slice(0, 3)}-xxx-${d.slice(6)}`;
  if (d.length === 13) return `x-xxxx-xxxxx-${d.slice(10, 12)}-${d.slice(12)}`;
  return d;
}
