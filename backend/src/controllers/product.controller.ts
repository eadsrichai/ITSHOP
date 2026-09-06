import type { Request, Response } from "express";
import type { RowDataPacket } from "mysql2";
import { pool } from "../config/db";
import { sendError, sendPaginated, sendSuccess } from "../utils/response";

/**
 * ตัวเลือกการเรียงลำดับ
 *
 * ทำไมต้องทำเป็นตารางแบบนี้ ไม่เอาค่าจาก query string ไปต่อใน SQL ตรง ๆ?
 * เพราะชื่อคอลัมน์ใส่เป็น ? ไม่ได้ ถ้าเอาค่าผู้ใช้ไปต่อสตริงจะเปิดช่อง SQL Injection ทันที
 * วิธีที่ปลอดภัยคือให้ผู้ใช้เลือกได้เฉพาะ "คีย์" ที่เรากำหนดไว้ล่วงหน้าเท่านั้น
 */
const SORT_OPTIONS: Record<string, string> = {
  newest: "p.created_at DESC",
  price_asc: "p.price ASC",
  price_desc: "p.price DESC",
  name: "p.name ASC",
};

// คอลัมน์ที่ต้องใช้บ่อย เก็บไว้ตัวแปรเดียว จะได้ไม่ต้องพิมพ์ซ้ำสองที่
const PRODUCT_COLUMNS = `
  p.id, p.category_id, p.name, p.description, p.price, p.stock,
  p.image, p.is_active, p.created_at, p.updated_at,
  c.name AS category_name, c.slug AS category_slug
`;

/**
 * GET /api/products
 * query: search, category (slug หรือ id), sort, page, limit
 *
 * สัปดาห์นี้ยังเขียน try/catch เองในทุก controller
 * สัปดาห์ที่ 4 จะได้เรียนวิธีย้าย catch ไปไว้ที่เดียว (errorHandler)
 * แล้วโค้ดตรงนี้จะสั้นลงเยอะ
 */
export async function getProducts(req: Request, res: Response): Promise<void> {
  try {
    const search = String(req.query.search ?? "").trim().slice(0, 100);
    const category = String(req.query.category ?? "").trim().slice(0, 100);
    const sortKey = String(req.query.sort ?? "newest");
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 12));
    const offset = (page - 1) * limit;

    // ประกอบเงื่อนไข WHERE ทีละชิ้น พร้อมเก็บค่าไว้ใน params แยกต่างหาก
    // ค่าทุกตัวส่งผ่าน ? เสมอ ไม่ต่อเข้าไปในสตริง SQL
    const conditions: string[] = ["p.is_active = 1"];
    const params: unknown[] = [];

    if (search) {
      conditions.push("p.name LIKE ?");
      params.push(`%${search}%`);
    }

    if (category) {
      conditions.push("(c.slug = ? OR c.id = ?)");
      params.push(category, Number(category) || 0);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const orderBy = SORT_OPTIONS[sortKey] ?? SORT_OPTIONS.newest;

    // นับจำนวนทั้งหมดก่อน เพื่อคำนวณว่ามีกี่หน้า
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
         FROM products p
         JOIN categories c ON c.id = p.category_id
         ${where}`,
      params
    );
    const total = Number(countRows[0].total);

    // mysql2 คืนค่าเป็น array 2 ช่อง [ข้อมูล, metadata]
    // เราสนใจแค่ช่องแรก จึงเขียน const [rows] = ...
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ${PRODUCT_COLUMNS}
         FROM products p
         JOIN categories c ON c.id = p.category_id
         ${where}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    sendPaginated(res, rows, {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("[ERROR] getProducts", error);
    sendError(res, "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์", 500);
  }
}

/** GET /api/products/:id — รายละเอียดสินค้า 1 รายการ */
export async function getProductById(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      sendError(res, "รหัสสินค้าไม่ถูกต้อง", 400);
      return;
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ${PRODUCT_COLUMNS}
         FROM products p
         JOIN categories c ON c.id = p.category_id
        WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      sendError(res, "ไม่พบสินค้าที่ต้องการ", 404);
      return;
    }

    sendSuccess(res, rows[0]);
  } catch (error) {
    console.error("[ERROR] getProductById", error);
    sendError(res, "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์", 500);
  }
}
