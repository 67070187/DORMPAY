import { api } from "@/lib/api";
import type { Room } from "@/lib/types";
import ActionForm from "@/components/ActionForm";
import { createRoom, deleteRoom, updateRoomRent } from "../actions";

export default async function RoomsPage() {
  const rooms = await api<Room[]>("/rooms");
  const vacant = rooms.filter((r) => !r.tenantId).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="card overflow-x-auto">
        <div className="mb-3 flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">ห้องพักทั้งหมด</h1>
          <p className="text-sm text-slate-500">
            {rooms.length} ห้อง · ว่าง {vacant} ห้อง
          </p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ห้อง</th>
              <th>ชั้น</th>
              <th>ผู้เช่า</th>
              <th>ค่าเช่า/เดือน (บาท)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.number}</td>
                <td>{r.floor}</td>
                <td>
                  {r.tenantName ?? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">ว่าง</span>
                  )}
                </td>
                <td>
                  <form action={updateRoomRent} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="number" value={r.number} />
                    <input type="hidden" name="floor" value={r.floor} />
                    <input
                      name="rent"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={r.rent / 100}
                      className="input !w-28"
                      aria-label={`ค่าเช่าห้อง ${r.number}`}
                    />
                    <button className="btn-secondary !px-3 !py-1.5">บันทึก</button>
                  </form>
                </td>
                <td className="text-right">
                  {!r.tenantId && (
                    <form action={deleteRoom}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn-danger">ลบ</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {!rooms.length && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">ยังไม่มีห้อง</td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-slate-400">ค่าเช่าเริ่มใช้กับบิลที่ออกหลังจากแก้ไข · ลบได้เฉพาะห้องว่าง (soft delete)</p>
      </section>

      <section className="card h-fit">
        <h2 className="mb-3 font-semibold">เพิ่มห้องใหม่</h2>
        <ActionForm action={createRoom} submitLabel="เพิ่มห้อง">
          <div>
            <label className="label">เลขห้อง</label>
            <input name="number" className="input" placeholder="เช่น 301" required />
          </div>
          <div>
            <label className="label">ชั้น</label>
            <input name="floor" type="number" min="1" className="input" required />
          </div>
          <div>
            <label className="label">ค่าเช่า/เดือน (บาท)</label>
            <input name="rent" type="number" step="0.01" min="0" className="input" required />
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
