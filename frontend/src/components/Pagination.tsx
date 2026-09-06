import Link from "next/link";

interface Props {
  page: number;
  totalPages: number;
  /** ฟังก์ชันสร้าง URL ของหน้าที่ n — ให้หน้าที่เรียกใช้กำหนดเอง เพราะแต่ละหน้ามี query ไม่เหมือนกัน */
  buildHref: (page: number) => string;
}

export default function Pagination({ page, totalPages, buildHref }: Props) {
  if (totalPages <= 1) return null;

  // แสดงเลขหน้าไม่เกิน 5 ปุ่ม โดยให้หน้าปัจจุบันอยู่ตรงกลาง
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav aria-label="แบ่งหน้า">
      <ul className="pagination justify-content-center">
        <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
          <Link className="page-link" href={buildHref(page - 1)}>
            ก่อนหน้า
          </Link>
        </li>

        {pages.map((n) => (
          <li key={n} className={`page-item ${n === page ? "active" : ""}`}>
            <Link className="page-link" href={buildHref(n)}>
              {n}
            </Link>
          </li>
        ))}

        <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
          <Link className="page-link" href={buildHref(page + 1)}>
            ถัดไป
          </Link>
        </li>
      </ul>
    </nav>
  );
}
