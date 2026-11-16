import { prisma } from "@/lib/db";
import { baht, currentMonth, monthLabel } from "@/lib/format";
import { getSettings } from "@/lib/billing";
import ActionForm from "@/components/ActionForm";
import StatusBadge from "@/components/StatusBadge";
import { saveMeterReadings } from "../actions";

export default async function MetersPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: m } = await searchParams;
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : currentMonth();
  const settings = await getSettings();

  const rooms = await prisma.room.findMany({
    where: { OR: [{ tenantId: { not: null } }, { meterReadings: { some: { month } } }] },
    include: {
      tenant: true,
      meterReadings: { where: { month: { lte: month } }, orderBy: { month: "desc" }, take: 2 },
      bills: { where: { month } },
    },
    orderBy: { number: "asc" },
  });

  const rows = rooms.map((room) => {
    const thisMonth = room.meterReadings.find((r) => r.month === month);
    const before = room.meterReadings.find((r) => r.month < month);
    return {
      room,
      bill: room.bills[0],
      thisMonth,
      waterPrev: thisMonth?.waterPrev ?? before?.waterCurr ?? 0,
      elecPrev: thisMonth?.elecPrev ?? before?.elecCurr ?? 0,
      prevKnown: !!(thisMonth || before),
    };
  });
  const done = rows.filter((r) => r.bill).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">จดมิเตอร์น้ำ-ไฟ · {monthLabel(month)}</h1>
          <p className="text-sm text-slate-500">
            จดแล้ว {done}/{rows.length} ห้อง · ค่าน้ำ {baht(settings.waterRate)} บาท/หน่วย · ค่าไฟ{" "}
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
              {rows.map(({ room, bill, thisMonth, waterPrev, elecPrev, prevKnown }) => {
                const locked = bill?.status === "PAID";
                const key = `${room.id}-${thisMonth?.id ?? "new"}-${bill?.total ?? 0}`;
                return (
                  <tr key={key} className={locked ? "bg-slate-50" : ""}>
                    <td className="font-medium">
                      {room.number}
                      {!locked && <input type="hidden" name="roomId" value={room.id} />}
                    </td>
                    <td className="text-slate-600">{room.tenant?.name ?? "-"}</td>
                    <td>
                      <input
                        name={`waterPrev_${room.id}`}
                        type="number"
                        min="0"
                        defaultValue={waterPrev}
                        readOnly={prevKnown}
                        disabled={locked}
                        className={`input !w-24 ${prevKnown ? "!bg-slate-50 text-slate-500" : ""}`}
                      />
                    </td>
                    <td>
                      <input
                        name={`waterCurr_${room.id}`}
                        type="number"
                        min={waterPrev}
                        defaultValue={thisMonth?.waterCurr}
                        disabled={locked}
                        className="input !w-24"
                      />
                    </td>
                    <td>
                      <input
                        name={`elecPrev_${room.id}`}
                        type="number"
                        min="0"
                        defaultValue={elecPrev}
                        readOnly={prevKnown}
                        disabled={locked}
                        className={`input !w-24 ${prevKnown ? "!bg-slate-50 text-slate-500" : ""}`}
                      />
                    </td>
                    <td>
                      <input
                        name={`elecCurr_${room.id}`}
                        type="number"
                        min={elecPrev}
                        defaultValue={thisMonth?.elecCurr}
                        disabled={locked}
                        className="input !w-24"
                      />
                    </td>
                    <td>
                      {bill ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{baht(bill.total)}</span>
                          <StatusBadge status={bill.status} />
                        </div>
                      ) : (
                        <span className="text-slate-400">ยังไม่ออกบิล</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
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
