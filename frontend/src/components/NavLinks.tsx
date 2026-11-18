"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DoorOpen, Gauge, LayoutDashboard, ReceiptText, Settings, Users, type LucideIcon } from "lucide-react";

// ไอคอนของแต่ละเมนู (ส่งชื่อมาจาก layout ที่เป็น server component แล้วแปลงเป็นไอคอนที่นี่)
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  rooms: DoorOpen,
  tenants: Users,
  meters: Gauge,
  bills: ReceiptText,
  settings: Settings,
};

export type NavLink = { href: string; label: string; icon: keyof typeof ICONS };

export default function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 text-sm">
      {links.map((l) => {
        const active = l.href === pathname || (l.href.split("/").length > 2 && pathname.startsWith(l.href));
        const Icon = ICONS[l.icon];
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-300 ${
              active ? "bg-indigo-50 font-medium text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
