// ---------------------------------------------------------------------
// รูปร่างข้อมูลในฐานข้อมูล (เท่าที่ใช้ในสัปดาห์นี้)
//
// สัปดาห์นี้เราอ่านข้อมูลอย่างเดียว จึงประกาศแค่ 2 ตารางที่ใช้จริง
// ตาราง users / orders / order_items จะเพิ่มเข้ามาในสัปดาห์ถัด ๆ ไป
// ---------------------------------------------------------------------

export interface Category {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export interface Product {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  image: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}
