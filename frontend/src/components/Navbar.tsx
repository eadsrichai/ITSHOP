import Link from "next/link";

/**
 * แถบเมนูด้านบน
 *
 * สัปดาห์นี้ยังเป็น Server Component ได้ (ไม่ต้องใส่ "use client")
 * เพราะยังไม่มีปุ่มที่ต้องจำสถานะอะไรเลย มีแต่ลิงก์เฉย ๆ
 *
 * สัปดาห์ที่ 5 จะเพิ่มเมนูผู้ใช้ และสัปดาห์ที่ 6 จะเพิ่มตัวเลขจำนวนสินค้าในตะกร้า
 * ตอนนั้นค่อยเปลี่ยนเป็น Client Component
 */
export default function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold" href="/">
          🖥️ IT Shop
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNav"
          aria-controls="mainNav"
          aria-expanded="false"
          aria-label="เปิดเมนู"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" href="/products">
                สินค้าทั้งหมด
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
