import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet, imageUrl } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types";

export const dynamic = "force-dynamic";

interface Props {
  /**
   * ⚠️ Next.js 16: params เป็น Promise แล้ว
   *
   * เขียนแบบเดิม (ใช้ไม่ได้แล้ว):  { params }: { params: { id: string } }
   * แล้วอ่านค่าด้วย params.id ตรง ๆ
   *
   * เขียนแบบใหม่: ประกาศเป็น Promise แล้ว await ก่อนใช้
   */
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params; // ← ต้อง await ทุกครั้ง

  let product: Product;
  try {
    product = await apiGet<Product>(`/products/${id}`);
  } catch {
    // ไม่พบสินค้า หรือ API มีปัญหา → แสดงหน้า 404 มาตรฐานของ Next.js
    notFound();
  }

  const outOfStock = product.stock <= 0;

  return (
    <div className="container py-4">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/">หน้าแรก</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href="/products">สินค้าทั้งหมด</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href={`/products?category=${product.category_slug}`}>
              {product.category_name}
            </Link>
          </li>
          <li className="breadcrumb-item active">{product.name}</li>
        </ol>
      </nav>

      <div className="row g-4">
        <div className="col-md-5">
          <div className="card">
            <img
              src={imageUrl(product.image)}
              alt={product.name}
              className="card-img-top bg-light p-3"
              style={{ height: 340, objectFit: "contain" }}
            />
          </div>
        </div>

        <div className="col-md-7">
          <span className="badge bg-secondary mb-2">{product.category_name}</span>
          <h1 className="h3">{product.name}</h1>

          <p className="display-6 text-danger my-3">{formatPrice(product.price)}</p>

          <p className="mb-3">
            {outOfStock ? (
              <span className="badge bg-danger">สินค้าหมด</span>
            ) : product.stock <= 5 ? (
              <span className="badge bg-warning text-dark">
                เหลือเพียง {product.stock} ชิ้น
              </span>
            ) : (
              <span className="badge bg-success">มีสินค้า {product.stock} ชิ้น</span>
            )}
          </p>

          {product.description && (
            <div className="card card-body bg-white mb-3">
              <h2 className="h6 text-muted">รายละเอียดสินค้า</h2>
              <p className="mb-0" style={{ whiteSpace: "pre-line" }}>
                {product.description}
              </p>
            </div>
          )}

          {/* สัปดาห์ที่ 6 จะเพิ่มปุ่ม "เพิ่มลงตะกร้า" ตรงนี้ */}
          <Link href="/products" className="btn btn-outline-dark btn-lg">
            ← กลับไปดูสินค้าอื่น
          </Link>
        </div>
      </div>
    </div>
  );
}
