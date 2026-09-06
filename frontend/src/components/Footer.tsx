export default function Footer() {
  return (
    <footer className="bg-dark text-white-50 mt-5 py-4">
      <div className="container">
        <div className="row gy-3">
          <div className="col-md-6">
            <h6 className="text-white">🖥️ IT Shop</h6>
            <p className="small mb-0">
              ร้านจำหน่ายอุปกรณ์ไอทีและคอมพิวเตอร์
              <br />
              โปรเจคตัวอย่างประกอบการเรียนการสอน
            </p>
          </div>
          <div className="col-md-6 text-md-end">
            <p className="small mb-1">Next.js 16 · Express · MariaDB</p>
            <p className="small mb-0">© 2569 วิทยาลัยเทคนิคพังงา</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
