import Link from "next/link";
import { imageUrl } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types";

/**
 * การ์ดสินค้า 1 ใบ — ใช้ทั้งหน้าแรกและหน้ารายการสินค้า
 *
 * เป็น Server Component (ไม่มี "use client") เพราะแค่แสดงข้อมูลเฉย ๆ
 * ไม่มีอะไรที่ต้องจำสถานะหรือรอผู้ใช้กด
 */
export default function ProductCard({ product }: { product: Product }) {
  const outOfStock = product.stock <= 0;

  return (
    <div className="card h-100 shadow-sm">
      <Link href={`/products/${product.id}`}>
        {/* ใช้ <img> ธรรมดา ไม่ใช้ next/image เพราะ Next.js 16 บล็อกรูปจาก localhost */}
        <img
          src={imageUrl(product.image)}
          alt={product.name}
          className="card-img-top bg-light"
          style={{ height: 180, objectFit: "contain", padding: "0.75rem" }}
        />
      </Link>

      <div className="card-body d-flex flex-column">
        <span className="badge bg-light text-secondary align-self-start mb-2">
          {product.category_name}
        </span>

        <h6 className="card-title">
          <Link href={`/products/${product.id}`} className="text-decoration-none text-dark">
            {product.name}
          </Link>
        </h6>

        <div className="mt-auto">
          <p className="h5 text-danger mb-1">{formatPrice(product.price)}</p>
          <p className="small text-muted mb-2">
            {outOfStock ? (
              <span className="text-danger">สินค้าหมด</span>
            ) : (
              `คงเหลือ ${product.stock} ชิ้น`
            )}
          </p>
          {/* สัปดาห์ที่ 6 จะเพิ่มปุ่ม "เพิ่มลงตะกร้า" ตรงนี้ */}
          <Link href={`/products/${product.id}`} className="btn btn-warning btn-sm w-100">
            ดูรายละเอียด
          </Link>
        </div>
      </div>
    </div>
  );
}
