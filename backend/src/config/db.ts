import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

/**
 * Connection Pool = แหล่งรวมการเชื่อมต่อที่เปิดค้างไว้ให้ใช้ซ้ำ
 *
 * ทำไมไม่ createConnection() ใหม่ทุกครั้งที่ query?
 * เพราะการเปิดการเชื่อมต่อใหม่ช้ามาก (ต้อง handshake กับฐานข้อมูลทุกครั้ง)
 * Pool จะเปิดไว้ล่วงหน้าแล้วหมุนเวียนใช้ เร็วกว่าและไม่ทำให้ฐานข้อมูลล้ม
 */
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // เปิดการเชื่อมต่อพร้อมกันได้มากสุด 10
  queueLimit: 0,
  dateStrings: true, // คืนวันที่เป็นสตริง อ่านง่ายกว่าและไม่เพี้ยนเรื่อง timezone
});

/** ทดสอบว่าต่อฐานข้อมูลได้จริงตอนเปิดเซิร์ฟเวอร์ จะได้รู้ปัญหาทันทีไม่ต้องรอ request แรก */
export async function testConnection(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release(); // ต้องคืน connection กลับ pool เสมอ ไม่งั้น pool จะหมด
  }
}
