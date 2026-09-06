"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/types";

/**
 * แถบค้นหาและกรองสินค้า
 *
 * เป็น Client Component เพราะมีฟอร์มที่ผู้ใช้กรอกและกดปุ่ม
 * เมื่อกดค้นหา จะเปลี่ยน URL ให้มี query string แล้ว Server Component
 * ของหน้า /products จะดึงข้อมูลใหม่ตาม query นั้นเอง
 */
export default function ProductFilter({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "newest");

  function applyFilter(event: React.FormEvent) {
    event.preventDefault();

    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (category) params.set("category", category);
    if (sort !== "newest") params.set("sort", sort);
    // ทุกครั้งที่เปลี่ยนเงื่อนไข ต้องกลับไปหน้า 1 เสมอ

    router.push(`/products?${params.toString()}`);
  }

  function resetFilter() {
    setSearch("");
    setCategory("");
    setSort("newest");
    router.push("/products");
  }

  return (
    <form className="card card-body shadow-sm mb-4" onSubmit={applyFilter}>
      <div className="row g-2 align-items-end">
        <div className="col-12 col-md-4">
          <label className="form-label small mb-1">ค้นหาสินค้า</label>
          <input
            type="text"
            className="form-control"
            placeholder="เช่น เมาส์, SSD"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="col-6 col-md-3">
          <label className="form-label small mb-1">หมวดหมู่</label>
          <select
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">ทุกหมวดหมู่</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name} ({c.product_count ?? 0})
              </option>
            ))}
          </select>
        </div>

        <div className="col-6 col-md-3">
          <label className="form-label small mb-1">เรียงตาม</label>
          <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">ใหม่ล่าสุด</option>
            <option value="price_asc">ราคาน้อยไปมาก</option>
            <option value="price_desc">ราคามากไปน้อย</option>
            <option value="name">ชื่อ ก-ฮ</option>
          </select>
        </div>

        <div className="col-12 col-md-2 d-flex gap-2">
          <button type="submit" className="btn btn-dark flex-fill">
            ค้นหา
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={resetFilter}>
            ล้าง
          </button>
        </div>
      </div>
    </form>
  );
}
