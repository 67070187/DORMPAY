"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type RevenuePoint = { label: string; paid: number; unpaid: number };

const PAID = "#22c55e"; // เขียว = ชำระแล้ว
const UNPAID = "#ef4444"; // แดง = ค้างชำระ

const fmt = (v: number) => Math.round(v).toLocaleString("th-TH");

/** หาช่วงแกน Y ที่เป็นตัวเลขกลมๆ เช่น 0, 10,000, 20,000, 30,000, 40,000 */
function niceTicks(max: number) {
  if (max <= 0) return [0, 1000];
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough)!;
  const top = Math.ceil((max * 1.08) / step) * step; // เผื่อที่ให้ตัวเลขยอดรวมบนหัวแท่ง
  return Array.from({ length: top / step + 1 }, (_, i) => i * step);
}

type TooltipProps = { active?: boolean; label?: string; payload?: { payload: RevenuePoint & { total: number } }[] };

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-semibold">{label}</p>
      <p className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: PAID }} />
        ชำระแล้ว <span className="ml-auto pl-4 font-medium">{fmt(p.paid)} ฿</span>
      </p>
      <p className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: UNPAID }} />
        ค้างชำระ <span className="ml-auto pl-4 font-medium">{fmt(p.unpaid)} ฿</span>
      </p>
      <p className="mt-1 flex border-t border-slate-100 pt-1 text-slate-500">
        รวม <span className="ml-auto font-medium text-slate-900">{fmt(p.total)} ฿</span>
      </p>
    </div>
  );
}

export default function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const rows = data.map((d) => ({ ...d, total: d.paid + d.unpaid }));
  const ticks = niceTicks(Math.max(0, ...rows.map((r) => r.total)));

  // ยอดรวมบนหัวแท่ง: วาดที่แท่งที่อยู่บนสุดของเดือนนั้น (แดงถ้ามียอดค้าง ไม่งั้นเขียว)
  const totalLabel = (series: "paid" | "unpaid") =>
    function TotalLabel(props: { x?: unknown; y?: unknown; width?: unknown; value?: unknown }) {
      // value = ชื่อเดือน (LabelList dataKey="label") ใช้หาแถวข้อมูล เพราะ index อาจไม่ตรงเมื่อมีแท่งสูง 0
      const r = rows.find((row) => row.label === props.value);
      if (!r || !r.total || (series === "paid") !== (r.unpaid === 0)) return null;
      const x = Number(props.x) + Number(props.width) / 2;
      return (
        <text x={x} y={Number(props.y) - 6} textAnchor="middle" fontSize={11} fill="#475569">
          {fmt(r.total)}
        </text>
      );
    };

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-sm text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: PAID }} /> ชำระแล้ว
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: UNPAID }} /> ค้างชำระ
        </span>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 20, right: 8, left: 4, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="#eef2f7" />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#e2e8f0" }} fontSize={12} tick={{ fill: "#475569" }} />
            <YAxis
              ticks={ticks}
              domain={[0, ticks[ticks.length - 1]]}
              tickFormatter={fmt}
              tickLine={false}
              axisLine={false}
              fontSize={12}
              tick={{ fill: "#94a3b8" }}
              width={60}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
            <Bar
              dataKey="paid"
              name="ชำระแล้ว"
              stackId="a"
              fill={PAID}
              maxBarSize={56}
              // มุมบนโค้งเฉพาะเดือนที่ไม่มียอดค้าง (แท่งเขียวอยู่บนสุด)
              shape={(props: React.ComponentProps<typeof Rectangle> & { payload?: { unpaid: number } }) => (
                <Rectangle {...props} radius={props.payload?.unpaid ? 0 : [6, 6, 0, 0]} />
              )}
            >
              <LabelList dataKey="label" content={totalLabel("paid")} />
            </Bar>
            <Bar dataKey="unpaid" name="ค้างชำระ" stackId="a" fill={UNPAID} maxBarSize={56} radius={[6, 6, 0, 0]}>
              <LabelList dataKey="label" content={totalLabel("unpaid")} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
