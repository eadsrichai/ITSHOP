import type { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { AuthRequest, JwtPayload } from "../types";
import { sendError } from "../utils/response";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-this-secret-key";

/**
 * ด่านที่ 1 — ตรวจว่ามี token และ token ถูกต้องหรือไม่
 *
 * ถ้าผ่าน จะแนบข้อมูลผู้ใช้ไว้ที่ req.user ให้ controller ใช้ต่อ
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  // Header ที่ส่งมาหน้าตาแบบนี้:  Authorization: Bearer eyJhbGciOi...
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    sendError(res, "กรุณาเข้าสู่ระบบก่อนใช้งาน", 401);
    return;
  }

  const token = header.slice(7); // ตัดคำว่า "Bearer " ออก 7 ตัวอักษร

  try {
    req.user = jwt.verify(token, JWT_SECRET) as JwtPayload;
    next();
  } catch {
    // token ปลอม หรือหมดอายุ
    sendError(res, "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", 401);
  }
}

/**
 * ด่านที่ 2 — ตรวจว่าเป็นแอดมินหรือไม่ (ต้องใช้ต่อจาก requireAuth เสมอ)
 *
 * วิธีใช้:  router.get("/orders", requireAuth, requireAdmin, getAllOrders);
 *
 * สำคัญ: การซ่อนเมนูหรือ redirect ที่ฝั่ง Frontend ไม่ใช่ระบบความปลอดภัย
 * ใครก็ยิง API ตรงด้วย Postman ได้ ด่านจริงอยู่ตรงนี้
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== "admin") {
    sendError(res, "คุณไม่มีสิทธิ์เข้าถึงส่วนนี้", 403);
    return;
  }
  next();
}
