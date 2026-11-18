// ตัวเรียก popup แจ้งเตือน (toast) จากที่ไหนก็ได้ในฝั่งเบราว์เซอร์ เช่น toast.success("บันทึกแล้ว")
// ส่งเป็น event ของ window แล้วให้ <Toaster /> ใน layout เป็นตัวแสดงผล

export type ToastType = "success" | "error";
export type ToastDetail = { id: number; type: ToastType; message: string };

export const TOAST_EVENT = "dormpay:toast";
let nextId = 1;

function show(type: ToastType, message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { id: nextId++, type, message } }));
}

export const toast = {
  success: (message: string) => show("success", message),
  error: (message: string) => show("error", message),
};
