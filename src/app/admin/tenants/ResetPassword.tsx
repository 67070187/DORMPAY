"use client";

import { useActionState, useState } from "react";
import { resetTenantPassword } from "../actions";
import FormMessage from "@/components/FormMessage";

export default function ResetPassword({ tenantId }: { tenantId: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(resetTenantPassword, undefined);

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-indigo-600 hover:underline">
        รีเซ็ตรหัสผ่าน
      </button>
    );

  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div className="flex gap-1">
        <input name="password" placeholder="รหัสใหม่" className="input !w-28 !py-1" minLength={6} required />
        <button className="btn !px-2 !py-1" disabled={pending}>ตกลง</button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
