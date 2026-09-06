import { AppError } from "./response";

/**
 * ฟังก์ชันตรวจสอบข้อมูลนำเข้า
 *
 * กฎเหล็ก: ห้ามเชื่อข้อมูลที่ส่งมาจากฝั่ง Frontend เด็ดขาด
 * ผู้ใช้แก้ไขข้อมูลที่ส่งมาได้เสมอ (เปิด DevTools หรือใช้ Postman ยิงตรงก็ได้)
 */

/** บังคับว่าต้องเป็นข้อความที่ไม่ว่าง */
export function requireString(value: unknown, fieldName: string, maxLength = 255): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(`กรุณากรอก${fieldName}`, 400);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new AppError(`${fieldName}ยาวเกิน ${maxLength} ตัวอักษร`, 400);
  }
  return trimmed;
}

/** ข้อความที่จะกรอกหรือไม่ก็ได้ — ถ้าไม่กรอกคืน null */
export function optionalString(value: unknown, maxLength = 255): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  return value.trim().slice(0, maxLength);
}

/** บังคับว่าต้องเป็นตัวเลขไม่ติดลบ */
export function requireNumber(value: unknown, fieldName: string, min = 0): number {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new AppError(`${fieldName}ต้องเป็นตัวเลข`, 400);
  }
  if (num < min) {
    throw new AppError(`${fieldName}ต้องไม่น้อยกว่า ${min}`, 400);
  }
  return num;
}

/** บังคับว่าต้องเป็นจำนวนเต็มบวก ใช้กับ id และจำนวนสินค้า */
export function requireInt(value: unknown, fieldName: string, min = 1): number {
  const num = Number(value);
  if (!Number.isInteger(num) || num < min) {
    throw new AppError(`${fieldName}ต้องเป็นจำนวนเต็มตั้งแต่ ${min} ขึ้นไป`, 400);
  }
  return num;
}

/** ตรวจรูปแบบอีเมลแบบพื้นฐาน */
export function requireEmail(value: unknown): string {
  const email = requireString(value, "อีเมล", 150).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("รูปแบบอีเมลไม่ถูกต้อง", 400);
  }
  return email;
}

/** บังคับว่าค่าต้องอยู่ในรายการที่กำหนดเท่านั้น ใช้กับฟิลด์ ENUM */
export function requireOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new AppError(`${fieldName}ต้องเป็นค่าใดค่าหนึ่งใน: ${allowed.join(", ")}`, 400);
  }
  return value as T;
}
