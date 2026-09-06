"use client";

import { useEffect } from "react";

/**
 * โหลด JavaScript ของ Bootstrap (dropdown, modal, offcanvas, collapse)
 *
 * ทำไมต้อง import แบบ dynamic ใน useEffect?
 * เพราะ Bootstrap JS ต้องมีตัวแปร window ซึ่งมีเฉพาะในเบราว์เซอร์
 * ถ้า import ไว้ด้านบนไฟล์ตามปกติ Next.js จะพยายามรันฝั่งเซิร์ฟเวอร์แล้วพังทันที
 *
 * คอมโพเนนต์นี้ไม่แสดงผลอะไร มีหน้าที่โหลดสคริปต์อย่างเดียว
 */
export default function BootstrapClient() {
  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  return null;
}
