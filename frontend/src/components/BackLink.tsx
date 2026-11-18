import Link from "next/link";

/** ปุ่มย้อนกลับแบบมินิมอล: วงกลมลูกศร + ข้อความสีเทา */
export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-full py-1 pr-3 text-sm text-slate-500 transition-colors hover:text-slate-900"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-all group-hover:-translate-x-0.5 group-hover:border-slate-300">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
          <path d="M12 15l-5-5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {label}
    </Link>
  );
}
