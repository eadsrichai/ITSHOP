/** จัดรูปแบบราคาเป็นเงินบาท เช่น 1590 -> "฿1,590.00" */
export function formatPrice(value: number | string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(num);
}

/** จัดรูปแบบวันที่เป็นแบบไทย เช่น "30 ส.ค. 2569 14:35" */
export function formatDate(value: string | null): string {
  if (!value) return "-";
  // ค่าที่ได้จาก MariaDB เป็นรูปแบบ "2026-08-30 14:35:00" ต้องแทน space ด้วย T ให้ Date อ่านได้ทุกเบราว์เซอร์
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

// สัปดาห์ที่ 7 จะเพิ่มตารางข้อความและสีของสถานะคำสั่งซื้อไว้ตรงนี้
