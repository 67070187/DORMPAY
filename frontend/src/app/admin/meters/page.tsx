import { api } from "@/lib/api";
import { baht, monthLabel } from "@/lib/format";
import type { MeterRow, Settings } from "@/lib/types";
import ActionForm from "@/components/ActionForm";
import StatusBadge from "@/components/StatusBadge";
import { saveMeterReadings } from "../actions";

export default async function MetersPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: m } = await searchParams;
  const q = m && /^\d{4}-\d{2}$/.test(m) ? `?month=${m}` : "";
  const { month, settings, rooms } = await api<{ month: string; settings: Settings; rooms: MeterRow[] }>(`/meters${q}`);
  const done = rooms.filter((r) => r.billId).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">จดมิเตอร์น้ำ-ไฟ · {monthLabel(month)}</h1>
          <p className="text-sm text-slate-500">
            จดแล้ว {done}/{rooms.length} ห้อง · ค่าน้ำ {baht(settings.waterRate)} บาท/หน่วย · ค่าไฟ{" "}
            {baht(settings.elecRate)} บาท/หน่วย
          </p>
        </div>
        <form className="flex items-center gap-2">
          <input type="month" name="month" defaultValue={month} className="input !w-44" aria-label="เดือน" />
          <button className="btn-secondary">เปลี่ยนเดือน</button>
        </form>
      </div>

      <div className="card overflow-x-auto">
        <ActionForm action={saveMeterReadings} submitLabel="บันทึกและออกบิล" resetOnSuccess={false}>
          <input type="hidden" name="month" value={month} />
          <table className="table">
            <thead>
              <tr>
                <th>ห้อง</th>
                <th>ผู้เช่า</th>
                <th>น้ำ ครั้งก่อน</th>
                <th>น้ำ ครั้งนี้</th>
                <th>ไฟ ครั้งก่อน</th>
                <th>ไฟ ครั้งนี้</th>
                <th>ยอดบิล (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => {
                const locked = r.billStatus === "PAID";
                const lockPrev = r.prevKnown ? "!bg-slate-50 text-slate-500" : "";
                return (
                  <tr key={`${r.roomId}-${r.billId ?? "new"}-${r.billTotal ?? 0}`} className={locked ? "bg-slate-50" : ""}>
                    <td className="font-medium">
                      {r.roomNumber}
                      {!locked && <input type="hidden" name="roomId" value={r.roomId} />}
                    </td>
                    <td className="text-slate-600">{r.tenantName ?? "-"}</td>
                    <td>
                      <input name={`waterPrev_${r.roomId}`} type="number" min="0" defaultValue={r.waterPrev}
                        readOnly={r.prevKnown} disabled={locked} className={`input !w-24 ${lockPrev}`} />
                    </td>
                    <td>
                      <input name={`waterCurr_${r.roomId}`} type="number" min={r.waterPrev}
                        defaultValue={r.waterCurr ?? undefined} disabled={locked} className="input !w-24" />
                    </td>
                    <td>
                      <input name={`elecPrev_${r.roomId}`} type="number" min="0" defaultValue={r.elecPrev}
                        readOnly={r.prevKnown} disabled={locked} className={`input !w-24 ${lockPrev}`} />
                    </td>
                    <td>
                      <input name={`elecCurr_${r.roomId}`} type="number" min={r.elecPrev}
                        defaultValue={r.elecCurr ?? undefined} disabled={locked} className="input !w-24" />
                    </td>
                    <td>
                      {r.billId ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{baht(r.billTotal ?? 0)}</span>
                          <StatusBadge status={r.billStatus === "PAID" ? "PAID" : "UNPAID"} />
                        </div>
                      ) : (
                        <span className="text-slate-400">ยังไม่ออกบิล</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!rooms.length && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">ยังไม่มีห้องที่มีผู้เช่า</td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="text-xs text-slate-400">
            กรอกเลขมิเตอร์ “ครั้งนี้” แล้วกดบันทึก ระบบจะคำนวณหน่วยและออกบิล (ค่าเช่า + ค่าน้ำ + ค่าไฟ) ให้อัตโนมัติ ·
            ห้องที่ชำระแล้วแก้ไขไม่ได้ · ห้องที่ยังไม่เคยจด ให้กรอกเลข “ครั้งก่อน” เองได้
          </p>
        </ActionForm>
      </div>
    </div>
  );
}
