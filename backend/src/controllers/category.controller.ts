import type { Request, Response } from "express";
import type { RowDataPacket } from "mysql2";
import { pool } from "../config/db";
import { sendError, sendSuccess } from "../utils/response";

/**
 * GET /api/categories — รายการหมวดหมู่ทั้งหมด พร้อมจำนวนสินค้าในแต่ละหมวด
 *
 * ใช้ LEFT JOIN ไม่ใช่ JOIN ธรรมดา เพราะหมวดที่ยังไม่มีสินค้าเลย
 * ก็ต้องแสดงในรายการด้วย (แค่จำนวนเป็น 0)
 */
export async function getCategories(_req: Request, res: Response): Promise<void> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.id, c.name, c.slug,
              COUNT(p.id) AS product_count
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
        GROUP BY c.id, c.name, c.slug
        ORDER BY c.id`
    );

    sendSuccess(res, rows);
  } catch (error) {
    console.error("[ERROR] getCategories", error);
    sendError(res, "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์", 500);
  }
}
