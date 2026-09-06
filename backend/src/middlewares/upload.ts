import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import multer from "multer";
import type { Request } from "express";
import { AppError } from "../utils/response";

/**
 * ตั้งค่าการอัปโหลดไฟล์ด้วย multer
 *
 * กฎความปลอดภัย 3 ข้อ:
 *  1. รับเฉพาะไฟล์รูปภาพ (jpg / png / webp)
 *  2. จำกัดขนาดไม่เกิน 2 MB
 *  3. เปลี่ยนชื่อไฟล์ใหม่เสมอ — ห้ามใช้ชื่อเดิมที่ผู้ใช้ส่งมา
 *     เพราะชื่อไฟล์อาจมี ../ เพื่อเขียนทับไฟล์อื่นในเครื่อง (path traversal)
 */

const UPLOAD_ROOT = path.join(__dirname, "..", "..", "uploads");
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

/** สร้างโฟลเดอร์ปลายทางถ้ายังไม่มี */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** สร้างตัวอัปโหลดสำหรับโฟลเดอร์ย่อยที่ระบุ เช่น "products" หรือ "slips" */
function createUploader(subFolder: string) {
  const destination = path.join(UPLOAD_ROOT, subFolder);
  ensureDir(destination);

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => {
      // ตั้งชื่อใหม่: เวลา + สุ่ม + นามสกุลเดิม  เช่น 1725012345678-a1b2c3d4.jpg
      const ext = path.extname(file.originalname).toLowerCase();
      const random = crypto.randomBytes(4).toString("hex");
      cb(null, `${Date.now()}-${random}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req: Request, file, cb) => {
      if (!ALLOWED_MIME.includes(file.mimetype)) {
        cb(new AppError("รองรับเฉพาะไฟล์รูปภาพ .jpg .png .webp เท่านั้น", 400));
        return;
      }
      cb(null, true);
    },
  });
}

/** ใช้กับรูปสินค้า — field name ในฟอร์มต้องชื่อ "image" */
export const uploadProductImage = createUploader("products").single("image");

/** ใช้กับสลิปโอนเงิน — field name ในฟอร์มต้องชื่อ "slip" */
export const uploadSlip = createUploader("slips").single("slip");

/** ลบไฟล์เก่าทิ้งเมื่อมีการอัปโหลดทับ (ไม่ต้องโยน error ถ้าลบไม่ได้) */
export function removeUploadedFile(subFolder: string, filename: string | null): void {
  if (!filename) return;
  const target = path.join(UPLOAD_ROOT, subFolder, path.basename(filename));
  fs.promises.unlink(target).catch(() => {
    /* ไฟล์อาจถูกลบไปแล้ว ไม่ใช่เรื่องคอขาดบาดตาย */
  });
}
