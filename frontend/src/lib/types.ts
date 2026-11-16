// รูปแบบข้อมูล JSON ที่ได้จาก backend (เงินเป็นสตางค์, วันที่เป็น ISO string)

export type Role = "ADMIN" | "TENANT";
export type BillStatus = "PAID" | "UNPAID";

export type Room = {
  id: number;
  number: string;
  floor: number;
  rent: number;
  tenantId: number | null;
  tenantName: string | null;
};

export type Tenant = {
  id: number;
  username: string;
  name: string;
  phone: string | null;
  roomId: number | null;
  roomNumber: string | null;
  roomRent?: number | null;
  owed?: number;
  unpaidCount?: number;
};

export type Payment = { id: number; amount: number; reference: string; method: string; paidAt: string };

export type Bill = {
  id: number;
  roomId: number;
  tenantId: number;
  month: string;
  rent: number;
  waterUnits: number;
  waterRate: number;
  waterAmount: number;
  elecUnits: number;
  elecRate: number;
  elecAmount: number;
  total: number;
  dueDate: string;
  status: BillStatus;
  paidAt: string | null;
  roomNumber: string;
  tenantName: string;
  displayStatus: "PAID" | "UNPAID" | "OVERDUE";
};

export type BillWithPayments = Bill & { payments: Payment[] };

export type Settings = {
  waterRate: number;
  elecRate: number;
  dueDay: number;
  promptPayId: string;
  promptPayName: string;
};

export type MeterRow = {
  roomId: number;
  roomNumber: string;
  tenantName: string | null;
  waterPrev: number;
  waterCurr: number | null;
  elecPrev: number;
  elecCurr: number | null;
  prevKnown: boolean;
  billId: number | null;
  billTotal: number | null;
  billStatus: BillStatus | null;
};

export type Dashboard = {
  month: string;
  rooms: { total: number; occupied: number; vacant: number };
  collected: { amount: number; count: number };
  outstanding: { amount: number; count: number; overdue: number };
  revenue: { month: string; billCount: number; paid: number; unpaid: number }[];
  unpaidBills: Bill[];
};

export type MeSummary = { tenant: Tenant; owed: number; unpaidCount: number; paidCount: number; bills: Bill[] };

export type PromptPayInfo = { billId: number; amount: number; payload: string; accountName: string; accountId: string };
