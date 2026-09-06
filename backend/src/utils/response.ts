import type { Response } from "express";

/**
 * ฟังก์ชันช่วยตอบกลับให้ทุก endpoint มีรูปแบบเดียวกัน
 * ฝั่ง Frontend จะได้เขียนโค้ดอ่านผลลัพธ์แบบเดียวกันหมด ไม่ต้องเดา
 *
 * รูปแบบสำเร็จ  : { success: true,  data: ..., message: "" }
 * รูปแบบผิดพลาด : { success: false, message: "ข้อความบอกสาเหตุ" }
 */

export function sendSuccess(
  res: Response,
  data: unknown,
  message = "",
  statusCode = 200
): void {
  res.status(statusCode).json({ success: true, data, message });
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** ใช้กับรายการที่แบ่งหน้า — แนบข้อมูลจำนวนหน้าไปด้วย */
export function sendPaginated(
  res: Response,
  data: unknown[],
  pagination: PaginationInfo
): void {
  res.status(200).json({ success: true, data, pagination });
}

export function sendError(res: Response, message: string, statusCode = 400): void {
  res.status(statusCode).json({ success: false, message });
}
