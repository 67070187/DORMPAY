import { api } from "@/lib/api";
import type { Settings } from "@/lib/types";
import ActionForm from "@/components/ActionForm";
import { updateSettings } from "../actions";

export default async function SettingsPage() {
  const s = await api<Settings>("/settings");
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <section className="card">
        <h1 className="mb-4 text-lg font-semibold">ตั้งค่าอัตราค่าบริการ</h1>
        <ActionForm action={updateSettings} submitLabel="บันทึก" resetOnSuccess={false}>
          <div>
            <label className="label">ค่าน้ำ (บาท/หน่วย)</label>
            <input name="waterRate" type="number" step="0.01" min="0" defaultValue={s.waterRate / 100} className="input" required />
          </div>
          <div>
            <label className="label">ค่าไฟ (บาท/หน่วย)</label>
            <input name="elecRate" type="number" step="0.01" min="0" defaultValue={s.elecRate / 100} className="input" required />
          </div>
          <div>
            <label className="label">ครบกำหนดชำระ วันที่ (ของเดือนถัดไป)</label>
            <input name="dueDay" type="number" min="1" max="28" defaultValue={s.dueDay} className="input" required />
          </div>
          <div className="border-t border-slate-100 pt-3">
            <label className="label">หมายเลขพร้อมเพย์ (เบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก)</label>
            <input name="promptPayId" inputMode="numeric" defaultValue={s.promptPayId} className="input" required />
          </div>
          <div>
            <label className="label">ชื่อบัญชีที่แสดงบน QR</label>
            <input name="promptPayName" defaultValue={s.promptPayName} className="input" required maxLength={60} />
          </div>
        </ActionForm>
      </section>
      <section className="card text-sm text-slate-600">
        <h2 className="mb-1 font-semibold text-slate-900">การชำระเงิน (โหมดสาธิต)</h2>
        <p>
          ผู้เช่าจะเห็น QR PromptPay ตามยอดบิลจากหมายเลขด้านบน เมื่อกด “โอนเงินเสร็จสิ้น” ระบบจะบันทึกว่าชำระแล้วทันที
          โดยไม่มีการตรวจสอบเงินเข้าจริง
        </p>
      </section>
    </div>
  );
}
