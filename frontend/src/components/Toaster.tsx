"use client";

import { useEffect, useState } from "react";
import { TOAST_EVENT, type ToastDetail } from "@/lib/toast";

const DURATION = 3000;

/** แสดง popup แจ้งเตือนด้านบนกลางจอ หายเองใน 3 วินาที (วางไว้ใน layout ครั้งเดียว) */
export default function Toaster() {
  const [items, setItems] = useState<(ToastDetail & { leaving?: boolean })[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const t = (e as CustomEvent<ToastDetail>).detail;
      setItems((list) => [...list.slice(-2), t]); // แสดงพร้อมกันได้สูงสุด 3 อัน
      setTimeout(() => dismiss(t.id), DURATION);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  function dismiss(id: number) {
    setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 200);
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.type === "error" ? "alert" : "status"}
          className={`toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-lg transition-all duration-200 ${
            t.leaving ? "-translate-y-2 opacity-0" : ""
          } ${t.type === "error" ? "border-red-100" : "border-emerald-100"}`}
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
              t.type === "error" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
            }`}
          >
            {t.type === "error" ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm-.75 4.5a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zM10 14.5a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
                <path d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.8 3.79 6.8-6.8a1 1 0 011.4 0z" />
              </svg>
            )}
          </span>
          <p className="flex-1 text-slate-700">{t.message}</p>
          <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600" aria-label="ปิด">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
