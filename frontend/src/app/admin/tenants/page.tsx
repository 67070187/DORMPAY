import { api } from "@/lib/api";
import { baht } from "@/lib/format";
import type { Room, Tenant } from "@/lib/types";
import ActionForm from "@/components/ActionForm";
import ResetPassword from "./ResetPassword";
import { assignRoom, createTenant, deleteTenant } from "../actions";

export default async function TenantsPage() {
  const [tenants, vacantRooms] = await Promise.all([api<Tenant[]>("/tenants"), api<Room[]>("/rooms?vacant=true")]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="card overflow-x-auto">
        <h1 className="mb-3 text-lg font-semibold">ผู้เช่า ({tenants.length})</h1>
        <table className="table">
          <thead>
            <tr>
              <th>ชื่อ</th>
              <th>ชื่อผู้ใช้</th>
              <th>เบอร์โทร</th>
              <th>ค้างชำระ (บาท)</th>
              <th>ห้อง</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => {
              const owed = t.owed ?? 0;
              return (
                <tr key={t.id}>
                  <td className="font-medium">{t.name}</td>
                  <td className="text-slate-500">{t.username}</td>
                  <td className="text-slate-500">{t.phone ?? "-"}</td>
                  <td className={owed ? "font-medium text-red-600" : "text-slate-400"}>{owed ? baht(owed) : "-"}</td>
                  <td>
                    <form action={assignRoom} className="flex items-center gap-2">
                      <input type="hidden" name="tenantId" value={t.id} />
                      <select name="roomId" defaultValue={t.roomId ?? ""} className="input !w-32" aria-label="ห้อง">
                        <option value="">— ไม่มีห้อง —</option>
                        {t.roomId && <option value={t.roomId}>{t.roomNumber}</option>}
                        {vacantRooms.map((r) => (
                          <option key={r.id} value={r.id}>{r.number}</option>
                        ))}
                      </select>
                      <button className="btn-secondary !px-3 !py-1.5">ย้าย</button>
                    </form>
                  </td>
                  <td>
                    <div className="flex items-start gap-3">
                      <ResetPassword tenantId={t.id} />
                      <form action={deleteTenant}>
                        <input type="hidden" name="tenantId" value={t.id} />
                        <button className="text-xs text-red-600 hover:underline">ลบ</button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!tenants.length && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">ยังไม่มีผู้เช่า</td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-slate-400">เลือก “ไม่มีห้อง” แล้วกดย้าย = ผู้เช่าย้ายออก · ลบผู้เช่าเป็น soft delete (ประวัติบิลยังอยู่)</p>
      </section>

      <section className="card h-fit">
        <h2 className="mb-3 font-semibold">เพิ่มผู้เช่าใหม่</h2>
        <ActionForm action={createTenant} submitLabel="เพิ่มผู้เช่า">
          <div>
            <label className="label">ชื่อ-นามสกุล</label>
            <input name="name" className="input" required />
          </div>
          <div>
            <label className="label">เบอร์โทร</label>
            <input name="phone" className="input" />
          </div>
          <div>
            <label className="label">ชื่อผู้ใช้ (ใช้ล็อกอิน)</label>
            <input name="username" className="input" required />
          </div>
          <div>
            <label className="label">รหัสผ่านเริ่มต้น</label>
            <input name="password" type="text" className="input" required minLength={6} />
          </div>
          <div>
            <label className="label">ห้อง</label>
            <select name="roomId" className="input" defaultValue="">
              <option value="">— ยังไม่เข้าห้อง —</option>
              {vacantRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.number} ({baht(r.rent)} บาท)
                </option>
              ))}
            </select>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
