import Shell from "@/components/Shell";
import { requireRole } from "@/lib/auth";

const links = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/rooms", label: "ห้องพัก" },
  { href: "/admin/tenants", label: "ผู้เช่า" },
  { href: "/admin/meters", label: "จดมิเตอร์" },
  { href: "/admin/bills", label: "บิล" },
  { href: "/admin/settings", label: "ตั้งค่า" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("ADMIN");
  return (
    <Shell title="เจ้าของหอ" name={session.name} links={links}>
      {children}
    </Shell>
  );
}
