"use client";

import { useActionState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { login } from "@/app/actions";
import Logo from "@/components/Logo";

// โหลดโมเดล 3D เฉพาะฝั่งเบราว์เซอร์ (three.js ใช้ WebGL ซึ่งไม่มีบนเซิร์ฟเวอร์)
const DormModel = dynamic(() => import("@/components/DormModel"), { ssr: false });

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  const router = useRouter();
  const redirectTo = state?.redirectTo;
  const entering = Boolean(redirectTo); // ล็อกอินสำเร็จ -> เล่นแอนิเมชันซูมเข้าหอ
  const navigated = useRef(false);

  const goIn = useCallback(() => {
    if (!redirectTo || navigated.current) return;
    navigated.current = true;
    router.replace(redirectTo);
  }, [redirectTo, router]);

  useEffect(() => {
    if (!redirectTo) return;
    router.prefetch(redirectTo); // โหลดหน้าถัดไปรอไว้ระหว่างเล่นแอนิเมชัน
    window.scrollTo({ top: 0, behavior: "smooth" }); // มือถือ: เลื่อนขึ้นให้เห็นโมเดล
    const fallback = setTimeout(goIn, 3500); // กันกรณีแอนิเมชันเล่นไม่ได้ (เช่น แท็บอยู่เบื้องหลัง)
    return () => clearTimeout(fallback);
  }, [redirectTo, router, goIn]);

  const fade = `transition-all duration-500 ${entering ? "pointer-events-none translate-y-2 opacity-0" : ""}`;

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      <section
        className="relative h-[26rem] shrink-0 overflow-hidden sm:h-[30rem] lg:h-auto lg:flex-1"
        style={{ background: "linear-gradient(180deg, #bae6fd 0%, #e0e7ff 60%, #eef2ff 100%)" }}
      >
        <DormModel
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          entering={entering}
          onEntered={goIn}
        />
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 p-5 pt-12 lg:p-8 lg:pt-16 ${fade}`}
          style={{ background: "linear-gradient(to top, rgba(238,242,255,0.95) 30%, rgba(238,242,255,0))" }}
        >
          <p className="text-sm text-indigo-900/70">ลากเพื่อหมุนดูหอพัก</p>
        </div>
      </section>

      <section
        className={`flex flex-1 items-center justify-center px-4 py-10 lg:max-w-xl lg:flex-none lg:basis-[28rem] ${fade}`}
      >
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <Logo size={56} className="mx-auto mb-3 drop-shadow-md" />
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
            <button className="btn w-full" disabled={pending || entering}>
              {entering ? "กำลังเข้าหอ..." : pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>
        </div>
      </section>

      {/* ฉากขาวค่อยๆ จางเข้ามาตอนท้ายแอนิเมชัน (ตอนกล้องเข้าประตู) */}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-50 bg-[#f6f7fb] transition-opacity duration-700 ${
          entering ? "opacity-100 delay-[1150ms]" : "opacity-0"
        }`}
      />
    </main>
  );
}
