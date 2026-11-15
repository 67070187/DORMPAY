import { getSettings } from "@/lib/billing";
import ActionForm from "@/components/ActionForm";
import { stripeConfigured } from "@/lib/stripe";
import { updateSettings } from "../actions";

export default async function SettingsPage() {
  const s = await getSettings();
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
        </ActionForm>
      </section>
      <section className="card text-sm">
        <h2 className="mb-1 font-semibold">การชำระเงินออนไลน์ (Stripe)</h2>
        {stripeConfigured() ? (
          <p className="text-emerald-700">เชื่อมต่อแล้ว ({process.env.STRIPE_SECRET_KEY?.startsWith("sk_test") ? "โหมดทดสอบ" : "โหมดจริง"})</p>
        ) : (
          <p className="text-amber-700">ยังไม่ได้ใส่ STRIPE_SECRET_KEY ในไฟล์ .env ผู้เช่าจะยังจ่ายออนไลน์ไม่ได้</p>
        )}
      </section>
    </div>
  );
}
