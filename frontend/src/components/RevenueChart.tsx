"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type RevenuePoint = { label: string; paid: number; unpaid: number };

const fmt = (v: number) => v.toLocaleString("th-TH");

export default function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickFormatter={fmt} tickLine={false} axisLine={false} fontSize={12} width={64} />
          <Tooltip formatter={(v) => `${fmt(Number(v))} บาท`} cursor={{ fill: "#f1f5f9" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="paid" name="ชำระแล้ว" stackId="a" fill="#4f46e5" />
          <Bar dataKey="unpaid" name="ค้างชำระ" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
