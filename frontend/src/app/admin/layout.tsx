import Shell from "@/components/Shell";
import { requireRole } from "@/lib/auth";
import type { NavLink } from "@/components/NavLinks";

const links: NavLink[] = [
  { href: "/admin", label: "ภาพรวม", icon: "dashboard" },
  { href: "/admin/rooms", label: "ห้องพัก", icon: "rooms" },
  { href: "/admin/tenants", label: "ผู้เช่า", icon: "tenants" },
  { href: "/admin/meters", label: "จดมิเตอร์", icon: "meters" },
  { href: "/admin/bills", label: "บิล", icon: "bills" },
  { href: "/admin/settings", label: "ตั้งค่า", icon: "settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("ADMIN");
  return (
    <Shell title="เจ้าของหอ" name={session.name} links={links}>
      {children}
    </Shell>
  );
}
