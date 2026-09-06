import Link from "next/link";

/** หน้าที่แสดงเมื่อเรียก notFound() หรือเข้า URL ที่ไม่มีอยู่ */
export default function NotFound() {
  return (
    <div className="container py-5 text-center">
      <p className="display-1 mb-0">404</p>
      <h1 className="h4">ไม่พบหน้าที่คุณต้องการ</h1>
      <p className="text-muted">หน้านี้อาจถูกลบไปแล้ว หรือพิมพ์ที่อยู่ผิด</p>
      <Link href="/" className="btn btn-warning">
        กลับหน้าแรก
      </Link>
    </div>
  );
}
