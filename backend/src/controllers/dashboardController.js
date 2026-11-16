const dashboardModel = require("../models/dashboardModel");
const billModel = require("../models/billModel");
const { currentMonth, prevMonth } = require("../utils/billing");

// GET /api/dashboard
async function summary(_req, res) {
  const now = new Date();
  const months = [];
  for (let m = currentMonth(now), i = 0; i < 12; i++, m = prevMonth(m)) months.unshift(m);

  const [rooms, collected, outstanding, revenue, unpaidBills] = await Promise.all([
    dashboardModel.roomStats(),
    dashboardModel.collectedSince(new Date(now.getFullYear(), now.getMonth(), 1)),
    dashboardModel.outstanding(),
    dashboardModel.monthlyRevenue(months),
    billModel.findAll({ status: "UNPAID", limit: 10 }),
  ]);

  // เติมเดือนที่ไม่มีบิลให้เป็น 0 แล้วตัดเดือนว่างด้านหน้าออก (แสดงอย่างน้อย 6 เดือน)
  const chart = months.map((month) => revenue.find((r) => r.month === month) ?? { month, billCount: 0, paid: 0, unpaid: 0 });
  const first = chart.findIndex((p) => p.billCount > 0);
  res.json({
    month: currentMonth(now),
    rooms,
    collected,
    outstanding,
    revenue: first === -1 ? chart.slice(-6) : chart.slice(Math.min(first, 6)),
    unpaidBills,
  });
}

module.exports = { summary };
