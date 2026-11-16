"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { confirmDemoPayment } from "@/app/tenant/actions";

type Props = {
  billId: number;
  amount: string; // ยอดที่จัดรูปแบบแล้ว เช่น "4,386.00"
  title: string; // เช่น "ห้อง 102 · ตุลาคม 2569"
  payload: string; // ข้อความ PromptPay ที่จะทำเป็น QR
  accountName: string;
  accountId: string; // หมายเลขที่ปิดบางส่วนแล้ว
  buttonLabel?: string;
};

export default function PromptPayModal(props: Props) {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<string>("");
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!open || qr) return;
    QRCode.toDataURL(props.payload, { width: 560, margin: 1, errorCorrectionLevel: "M" }).then(setQr);
  }, [open, qr, props.payload]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close() {
    setOpen(false);
    setError(null);
    if (done) router.refresh();
  }

  /** บันทึกเป็นรูป PNG พร้อมยอดเงินและรายละเอียดบิล */
  async function saveQr() {
    const img = new Image();
    img.src = qr;
    await img.decode();
    const W = 640, H = 860;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#0e3d66";
    ctx.fillRect(0, 0, W, 110);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText("PromptPay", W / 2, 72);
    ctx.drawImage(img, (W - 460) / 2, 140, 460, 460);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 40px sans-serif";
    ctx.fillText(`฿ ${props.amount}`, W / 2, 660);
    ctx.font = "26px sans-serif";
    ctx.fillStyle = "#334155";
    ctx.fillText(props.title, W / 2, 710);
    ctx.fillText(`${props.accountName} · ${props.accountId}`, W / 2, 750);
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("DORM-PAY · QR สำหรับสาธิต", W / 2, 810);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `dormpay-bill-${props.billId}.png`;
    a.click();
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await confirmDemoPayment(props.billId);
      if (res.ok) setDone(res.reference);
      else setError(res.error);
    });
  }

  return (
    <>
      <button className="btn" onClick={() => setOpen(true)}>
        {props.buttonLabel ?? "ชำระเงิน"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={(e) => e.target === e.currentTarget && !pending && close()}
          role="dialog"
          aria-modal="true"
          aria-label="ชำระเงินด้วย PromptPay"
        >
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between bg-[#0e3d66] px-5 py-3 text-white">
              <span className="text-lg font-bold tracking-wide">PromptPay</span>
              <button onClick={close} disabled={pending} className="text-2xl leading-none opacity-80 hover:opacity-100" aria-label="ปิด">
                ×
              </button>
            </div>

            {done ? (
              <div className="space-y-3 p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">✓</div>
                <p className="text-lg font-semibold">ชำระเงินสำเร็จ</p>
                <p className="text-2xl font-bold">฿ {props.amount}</p>
                <p className="text-sm text-slate-500">{props.title}</p>
                <p className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">เลขอ้างอิง {done}</p>
                <button className="btn w-full" onClick={close}>เสร็จสิ้น</button>
              </div>
            ) : (
              <div className="space-y-4 p-5 text-center">
                <span className="inline-block rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-800">
                  โหมดสาธิต · ไม่มีการโอนเงินจริง
                </span>
                <div className="mx-auto aspect-square w-60 rounded-xl border border-slate-200 p-2">
                  {qr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qr} alt="QR Code PromptPay" className="h-full w-full" />
                  ) : (
                    <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
                  )}
                </div>
                <div>
                  <p className="text-3xl font-bold">฿ {props.amount}</p>
                  <p className="text-sm text-slate-500">{props.title}</p>
                  <p className="text-sm text-slate-500">
                    {props.accountName} · {props.accountId}
                  </p>
                </div>
                <p className="text-xs text-slate-400">สแกนด้วยแอปธนาคาร แล้วกด “โอนเงินเสร็จสิ้น”</p>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <button className="btn-secondary" onClick={saveQr} disabled={!qr || pending}>
                    บันทึก QR
                  </button>
                  <button className="btn !bg-emerald-600 hover:!bg-emerald-700" onClick={confirm} disabled={pending}>
                    {pending ? "กำลังบันทึก..." : "โอนเงินเสร็จสิ้น"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
