import type { ApiResponse, Pagination } from "@/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
export const UPLOAD_URL = process.env.NEXT_PUBLIC_UPLOAD_URL ?? "http://localhost:5000/uploads";

/**
 * ฟังก์ชันกลางสำหรับเรียก API ทุกที่ในโปรเจค
 *
 * ทำไมต้องมีตัวกลาง? เพื่อไม่ให้ต้องเขียน 3 อย่างนี้ซ้ำทุกหน้า:
 *   1. ต่อ URL เต็ม
 *   2. แปลง error ให้เป็นข้อความภาษาไทยที่เอาไปแสดงได้เลย
 *
 * สัปดาห์ที่ 5 จะเพิ่มหน้าที่ข้อ 3 เข้ามา คือแนบ Header Authorization ให้อัตโนมัติ
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  // ตอนส่ง FormData ห้ามตั้ง Content-Type เอง!
  // ต้องปล่อยให้เบราว์เซอร์ใส่ boundary ให้ ไม่งั้น multer ฝั่ง backend จะอ่านไฟล์ไม่ได้
  if (!isFormData && options.body) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      cache: "no-store", // ข้อมูลร้านค้าต้องสดเสมอ ไม่ใช้แคช
    });
  } catch {
    // เข้ากรณีนี้เมื่อ backend ไม่ได้เปิด หรือเน็ตหลุด
    throw new Error("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — ตรวจว่าเปิด backend แล้วหรือยัง");
  }

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!res.ok || !json?.success) {
    throw new Error(json?.message ?? `เกิดข้อผิดพลาด (${res.status})`);
  }

  return json;
}

/** เรียก API แล้วเอาเฉพาะ data (ใช้บ่อยสุด) */
export async function apiGet<T>(path: string): Promise<T> {
  const json = await apiFetch<T>(path);
  return json.data;
}

/** เรียก API ที่มีการแบ่งหน้า — คืนทั้ง data และข้อมูลหน้า */
export async function apiGetPaginated<T>(
  path: string
): Promise<{ data: T; pagination: Pagination }> {
  const json = await apiFetch<T>(path);
  return {
    data: json.data,
    pagination: json.pagination ?? { page: 1, limit: 12, total: 0, totalPages: 1 },
  };
}

/** ประกอบ URL รูปภาพ ถ้าไม่มีรูปให้ใช้รูปแทน (placeholder) */
export function imageUrl(filename: string | null, folder = "products"): string {
  if (!filename) return "/placeholder.svg";
  return `${UPLOAD_URL}/${folder}/${filename}`;
}
