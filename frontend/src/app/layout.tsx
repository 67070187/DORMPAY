import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import Toaster from "@/components/Toaster";

const thai = Noto_Sans_Thai({ subsets: ["thai", "latin"], variable: "--font-thai" });

export const metadata: Metadata = {
  title: "DORM-PAY ระบบจ่ายค่าหอพัก",
  description: "ระบบจัดการและชำระค่าหอพักออนไลน์",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${thai.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
