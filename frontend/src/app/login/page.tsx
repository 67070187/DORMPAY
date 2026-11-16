"use client";

import { useActionState } from "react";
import dynamic from "next/dynamic";
import { login } from "@/app/actions";

// โหลดโมเดล 3D เฉพาะฝั่งเบราว์เซอร์ (three.js ใช้ WebGL ซึ่งไม่มีบนเซิร์ฟเวอร์)
const DormModel = dynamic(() => import("@/components/DormModel"), { ssr: false });

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      <section
        className="relative h-[26rem] shrink-0 overflow-hidden sm:h-[30rem] lg:h-auto lg:flex-1"
        style={{ background: "linear-gradient(180deg, #bae6fd 0%, #e0e7ff 60%, #eef2ff 100%)" }}
      >
        <DormModel className="absolute inset-0 cursor-grab active:cursor-grabbing" />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 p-5 pt-12 lg:p-8 lg:pt-16"
          style={{ background: "linear-gradient(to top, rgba(238,242,255,0.95) 30%, rgba(238,242,255,0))" }}
        >
          <p className="text-lg font-semibold text-indigo-950 lg:text-2xl">จ่ายค่าหอง่ายๆ แค่สแกน QR</p>
          <p className="text-sm text-indigo-900/70">ลากเพื่อหมุนดูหอพัก</p>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center px-4 py-10 lg:max-w-xl lg:flex-none lg:basis-[28rem]">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
              D
            </div>
            <h1 className="text-2xl font-bold">DORM-PAY</h1>
            <p className="text-sm text-slate-500">ระบบจ่ายค่าหอพักออนไลน์</p>
          </div>
          <form action={action} className="card space-y-4">
            <div>
              <label className="label" htmlFor="username">ชื่อผู้ใช้</label>
              <input id="username" name="username" className="input" required autoFocus autoComplete="username" />
            </div>
            <div>
              <label className="label" htmlFor="password">รหัสผ่าน</label>
              <input id="password" name="password" type="password" className="input" required autoComplete="current-password" />
            </div>
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            <button className="btn w-full" disabled={pending}>
              {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-slate-400">
            บัญชีทดสอบ: admin / admin1234 · tenant1 / tenant1234
          </p>
        </div>
      </section>
    </main>
  );
}
