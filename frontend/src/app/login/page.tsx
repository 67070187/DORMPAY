"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
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
            <input id="username" name="username" className="input" required autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="password">รหัสผ่าน</label>
            <input id="password" name="password" type="password" className="input" required />
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
    </main>
  );
}
