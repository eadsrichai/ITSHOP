// รูปร่างข้อมูลที่ API ส่งกลับมา — ให้ตรงกับ backend/src/types/index.ts

export interface Category {
  id: number;
  name: string;
  slug: string;
  product_count?: number;
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
  category_name: string;
  category_slug: string;
}

// ---------------------------------------------------------------------
// รูปแบบ response มาตรฐานจาก API
// ---------------------------------------------------------------------

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: Pagination;
}
