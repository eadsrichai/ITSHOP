import type { Metadata } from "next";
import type { ReactNode } from "react";

// ลำดับสำคัญ: Bootstrap ก่อน แล้วค่อย CSS ของเรา เพื่อให้ของเราทับค่าของ Bootstrap ได้
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BootstrapClient from "@/components/BootstrapClient";

export const metadata: Metadata = {
  title: "IT Shop — ร้านอุปกรณ์ไอทีออนไลน์",
  description: "โปรเจคตัวอย่างระบบซื้อขายสินค้าออนไลน์ Next.js 16 + Express + MariaDB",
};

/**
 * layout.tsx = โครงที่ครอบทุกหน้าในเว็บ
 * อะไรที่ต้องเห็นทุกหน้า (Navbar, Footer) ให้ใส่ตรงนี้ ไม่ต้องไปใส่ซ้ำทุกหน้า
 *
 * สัปดาห์ที่ 5 จะเพิ่ม AuthProvider และสัปดาห์ที่ 6 จะเพิ่ม CartProvider มาครอบตรงนี้
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body>
        <div className="app-shell">
          <Navbar />
          <main>{children}</main>
          <Footer />
        </div>
        <BootstrapClient />
      </body>
    </html>
  );
}
