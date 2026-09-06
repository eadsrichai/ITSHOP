import type { NextConfig } from "next";

/**
 * โปรเจคนี้ใช้ <img> ธรรมดาแสดงรูปสินค้า จึงยังไม่ต้องตั้งค่า images
 *
 * ถ้าอยากเปลี่ยนไปใช้ next/image ให้เอาคอมเมนต์ด้านล่างออก
 * เหตุผลที่ต้องตั้งค่าเพิ่ม: Next.js 16 บล็อกการ optimize รูปจาก local IP
 * (เช่น localhost) ไว้โดยค่าเริ่มต้น เพื่อกันช่องโหว่ SSRF
 */
const nextConfig: NextConfig = {
  // images: {
  //   remotePatterns: [
  //     {
  //       protocol: "http",
  //       hostname: "localhost",
  //       port: "5000",
  //       pathname: "/uploads/**",
  //     },
  //   ],
  //   dangerouslyAllowLocalIP: true, // เปิดได้เฉพาะตอน dev บนเครื่องตัวเองเท่านั้น
  // },
};

export default nextConfig;
