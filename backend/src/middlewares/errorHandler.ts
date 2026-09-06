import type { Request, Response, NextFunction } from "express";
import { MulterError } from "multer";
import { AppError, sendError } from "../utils/response";

/**
 * ตัวจับข้อผิดพลาดรวมศูนย์ — ต้องประกาศ "หลัง" route ทั้งหมดใน server.ts
 *
 * ประโยชน์: controller ทุกตัวแค่ throw ออกมา ไม่ต้องเขียน try/catch ตอบ error เอง
 * ทำให้โค้ด controller สั้นและอ่านง่ายขึ้นมาก
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // ต้องรับ next ครบ 4 ตัว ไม่งั้น Express จะไม่รู้ว่านี่คือ error handler
  _next: NextFunction
): void {
  // 1) ข้อผิดพลาดที่เราตั้งใจโยนเอง
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode);
    return;
  }

  // 2) ข้อผิดพลาดจาก multer เช่น ไฟล์ใหญ่เกินกำหนด
  if (err instanceof MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "ไฟล์ใหญ่เกิน 2 MB"
        : `อัปโหลดไฟล์ไม่สำเร็จ (${err.code})`;
    sendError(res, message, 400);
    return;
  }

  // 3) ข้อผิดพลาดจากฐานข้อมูลที่เกิดตอนคนใช้งานพร้อมกันเยอะ ๆ
  //    ข้อมูลไม่เสียหาย (ฐานข้อมูล ROLLBACK ให้แล้ว) แค่ต้องบอกผู้ใช้ให้กดใหม่
  //    1213 = Deadlock, 1205 = Lock wait timeout
  const dbErrno = (err as { errno?: number }).errno;
  if (dbErrno === 1213 || dbErrno === 1205) {
    console.warn("[DB BUSY]", (err as Error).message);
    sendError(res, "ระบบกำลังมีคนสั่งซื้อพร้อมกันจำนวนมาก กรุณากดสั่งซื้ออีกครั้ง", 409);
    return;
  }

  // 4) ข้อผิดพลาดที่ไม่คาดคิด — log ไว้ให้ผู้พัฒนาดู
  //    แต่ไม่ส่งรายละเอียดกลับไปหา client เพราะอาจหลุดข้อมูลโครงสร้างระบบ
  console.error("[ERROR]", err);
  sendError(res, "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์", 500);
}

/** เรียกเมื่อ URL ที่ขอมาไม่ตรงกับ route ไหนเลย */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `ไม่พบเส้นทาง ${req.method} ${req.originalUrl}`, 404);
}

/**
 * ตัวห่อ controller ที่เป็น async
 *
 * ปัญหา: ถ้า async function โยน error ออกมา Express 4 จะไม่จับให้เอง
 * ทางแก้: ห่อด้วยฟังก์ชันนี้ แล้ว error จะวิ่งไปหา errorHandler อัตโนมัติ
 *
 * วิธีใช้:  router.get("/", asyncHandler(getProducts));
 */
export function asyncHandler<T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req as T, res, next).catch(next);
  };
}
