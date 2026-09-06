import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { apiGet, apiGetPaginated } from "@/lib/api";
import type { Category, Product } from "@/types";

// บอก Next.js ว่าหน้านี้ต้องดึงข้อมูลใหม่ทุกครั้ง ห้ามสร้างเป็นหน้าคงที่ตอน build
// เพราะข้อมูลสินค้าและสต็อกเปลี่ยนตลอดเวลา
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // ดึงสองอย่างพร้อมกันด้วย Promise.all จะเร็วกว่ารอทีละอัน
  // ห่อ try/catch ไว้เพราะถ้า backend ไม่ได้เปิด หน้าเว็บต้องไม่ขาวทั้งหน้า
  let categories: Category[] = [];
  let products: Product[] = [];
  let errorMessage = "";

  try {
    const [categoryData, productData] = await Promise.all([
      apiGet<Category[]>("/categories"),
      apiGetPaginated<Product[]>("/products?limit=8&sort=newest"),
    ]);
    categories = categoryData;
    products = productData.data;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ";
  }

  return (
    <>
      {/* แถบต้อนรับด้านบน */}
      <section className="bg-dark text-white py-5">
        <div className="container">
          <h1 className="display-6 fw-bold">อุปกรณ์ไอทีครบ จบในที่เดียว</h1>
          <p className="lead text-white-50 mb-4">
            เมาส์ คีย์บอร์ด SSD แรม จอภาพ และอุปกรณ์เครือข่าย ราคานักศึกษา
          </p>
          <Link href="/products" className="btn btn-warning btn-lg">
            เลือกซื้อสินค้า
          </Link>
        </div>
      </section>

      <div className="container py-5">
        {errorMessage && (
          <div className="alert alert-danger">
            <strong>โหลดข้อมูลไม่สำเร็จ:</strong> {errorMessage}
            <div className="small mt-1">
              ตรวจว่ารัน <code>docker compose up -d</code> และ <code>npm run dev</code> ฝั่ง
              backend แล้วหรือยัง
            </div>
          </div>
        )}

        {/* หมวดหมู่สินค้า */}
        {categories.length > 0 && (
          <section className="mb-5">
            <h2 className="h4 mb-3">หมวดหมู่สินค้า</h2>
            <div className="row g-2">
              {categories.map((category) => (
                <div key={category.id} className="col-6 col-md-4 col-lg-3">
                  <Link
                    href={`/products?category=${category.slug}`}
                    className="btn btn-outline-dark w-100 text-start"
                  >
                    {category.name}
                    <span className="badge bg-secondary float-end">
                      {category.product_count ?? 0}
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* สินค้ามาใหม่ */}
        {products.length > 0 && (
          <section>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h4 mb-0">สินค้ามาใหม่</h2>
              <Link href="/products" className="btn btn-sm btn-link">
                ดูทั้งหมด →
              </Link>
            </div>
            <div className="row g-3">
              {products.map((product) => (
                <div key={product.id} className="col-6 col-md-4 col-lg-3">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
