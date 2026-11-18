"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";
import { toast } from "@/lib/toast";

/**
 * ฟอร์มเล็กๆ ในตาราง (บันทึกค่าเช่า / ย้ายห้อง / ลบ)
 * เรียก server action แล้วแสดง popup ตามผลลัพธ์ { ok } หรือ { error }
 */
export default function ToastForm({
  action,
  className,
  confirmMessage,
  children,
}: {
  action: (fd: FormData) => Promise<FormState>;
  className?: string;
  confirmMessage?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      className={className}
      action={async (fd) => {
        const res = await action(fd);
        if (res?.ok) toast.success(res.ok);
        else if (res?.error) toast.error(res.error);
      }}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}

/** ปุ่ม submit ที่แสดงสถานะกำลังบันทึก */
export function SubmitButton({ children, pendingLabel, className }: { children: React.ReactNode; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? (pendingLabel ?? "...") : children}
    </button>
  );
}
