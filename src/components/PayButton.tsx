"use client";

import { useFormStatus } from "react-dom";

export default function PayButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn" disabled={pending}>
      {pending ? "กำลังไปหน้าชำระเงิน..." : label}
    </button>
  );
}
