"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/actions";
import FormMessage from "./FormMessage";

/** ฟอร์มที่เรียก server action แล้วแสดงข้อความสำเร็จ/ผิดพลาด */
export default function ActionForm({
  action,
  submitLabel,
  className,
  resetOnSuccess = true,
  children,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  submitLabel: string;
  className?: string;
  resetOnSuccess?: boolean;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className ?? "space-y-3"}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={pending}>
          {pending ? "กำลังบันทึก..." : submitLabel}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
