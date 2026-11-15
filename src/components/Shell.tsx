import Link from "next/link";
import { logout } from "@/app/actions";
import NavLinks from "./NavLinks";

export default function Shell({
  title,
  name,
  links,
  children,
}: {
  title: string;
  name: string;
  links: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">D</span>
            DORM-PAY
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{title}</span>
          </Link>
          <NavLinks links={links} />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-slate-600">{name}</span>
            <form action={logout}>
              <button className="btn-secondary !px-3 !py-1.5">ออกจากระบบ</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
