import Pagination from "@/components/Pagination";
import ProductCard from "@/components/ProductCard";
import ProductFilter from "@/components/ProductFilter";
import { apiGet, apiGetPaginated } from "@/lib/api";
import type { Category, Pagination as PaginationInfo, Product } from "@/types";

export const dynamic = "force-dynamic";

interface Props {
  /**
   * ⚠️ Next.js 16: searchParams เป็น Promise แล้ว ต้อง await ก่อนใช้เสมอ
   * โค้ดเก่าที่เขียน searchParams.search ตรง ๆ จะใช้ไม่ได้แล้ว
   */
  searchParams: Promise<{
    search?: string;
    category?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function ProductListPage({ searchParams }: Props) {
  const params = await searchParams; // ← จุดที่นักศึกษามักลืม

  const search = params.search ?? "";
  const category = params.category ?? "";
  const sort = params.sort ?? "newest";
  const page = Math.max(1, Number(params.page) || 1);

  // ประกอบ query string ส่งไปให้ API
  const query = new URLSearchParams({ page: String(page), limit: "12", sort });
  if (search) query.set("search", search);
  if (category) query.set("category", category);

  let categories: Category[] = [];
  let products: Product[] = [];
  let pagination: PaginationInfo = { page: 1, limit: 12, total: 0, totalPages: 1 };
  let errorMessage = "";

  try {
    const [categoryData, productData] = await Promise.all([
      apiGet<Category[]>("/categories"),
      apiGetPaginated<Product[]>(`/products?${query.toString()}`),
    ]);
    categories = categoryData;
    products = productData.data;
    pagination = productData.pagination;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ";
  }

  /** สร้าง URL ของหน้าที่ n โดยคงเงื่อนไขการค้นหาเดิมไว้ */
  function buildHref(targetPage: number): string {
    const next = new URLSearchParams();
    if (search) next.set("search", search);
    if (category) next.set("category", category);
    if (sort !== "newest") next.set("sort", sort);
    if (targetPage > 1) next.set("page", String(targetPage));
    const qs = next.toString();
    return qs ? `/products?${qs}` : "/products";
  }

  return (
    <div className="container py-4">
      <h1 className="h3 mb-3">สินค้าทั้งหมด</h1>

      <ProductFilter categories={categories} />

      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : products.length === 0 ? (
        <div className="alert alert-info">
          ไม่พบสินค้าที่ตรงกับเงื่อนไข ลองเปลี่ยนคำค้นหรือหมวดหมู่ดูครับ
        </div>
      ) : (
        <>
          <p className="text-muted small">
            พบ {pagination.total} รายการ · หน้า {pagination.page} จาก {pagination.totalPages}
          </p>

          <div className="row g-3 mb-4">
            {products.map((product) => (
              <div key={product.id} className="col-6 col-md-4 col-lg-3">
                <ProductCard product={product} />
              </div>
            ))}
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            buildHref={buildHref}
          />
        </>
      )}
    </div>
  );
}
