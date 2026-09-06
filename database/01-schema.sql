-- =====================================================================
-- IT Shop : โครงสร้างฐานข้อมูล
-- ใช้กับ MariaDB 11
-- =====================================================================

CREATE DATABASE IF NOT EXISTS itshop
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE itshop;

-- ---------------------------------------------------------------------
-- ตารางหมวดหมู่สินค้า
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(100) NOT NULL UNIQUE,   -- ชื่อสำหรับใช้ใน URL เช่น "mouse"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- ตารางสินค้า
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  price       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  stock       INT NOT NULL DEFAULT 0,
  image       VARCHAR(255),                  -- ชื่อไฟล์ใน uploads/products/
  is_active   TINYINT(1) NOT NULL DEFAULT 1, -- 1 = เปิดขาย, 0 = ปิดขาย
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_category (category_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- ตารางผู้ใช้งาน
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,   -- ใช้เป็นชื่อผู้ใช้ตอนเข้าสู่ระบบ
  password   VARCHAR(255) NOT NULL,          -- เก็บค่าที่ผ่าน bcrypt แล้วเท่านั้น
  phone      VARCHAR(20),
  address    TEXT,
  role       ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- ตารางคำสั่งซื้อ
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  order_code       VARCHAR(20) NOT NULL UNIQUE,  -- เช่น ORD20260830001
  user_id          INT NOT NULL,
  total_amount     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_method   ENUM('cod','transfer') NOT NULL DEFAULT 'cod',
  payment_slip     VARCHAR(255),                 -- ชื่อไฟล์ใน uploads/slips/
  status           ENUM('pending','paid','shipping','completed','cancelled')
                     NOT NULL DEFAULT 'pending',
  recipient_name   VARCHAR(100) NOT NULL,
  recipient_phone  VARCHAR(20)  NOT NULL,
  shipping_address TEXT NOT NULL,
  note             VARCHAR(255),
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- ตารางรายการสินค้าในคำสั่งซื้อ
--
-- ทำไมต้องเก็บ product_name และ unit_price ซ้ำทั้งที่มีตาราง products อยู่แล้ว?
-- เพราะราคาสินค้าเปลี่ยนได้ในภายหลัง แต่ใบเสร็จเดิมต้องคงราคา ณ วันที่ซื้อไว้เสมอ
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  order_id     INT NOT NULL,
  product_id   INT NOT NULL,
  product_name VARCHAR(200) NOT NULL,   -- สำเนาชื่อ ณ วันสั่งซื้อ
  unit_price   DECIMAL(10,2) NOT NULL,  -- สำเนาราคา ณ วันสั่งซื้อ
  quantity     INT NOT NULL,
  subtotal     DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_order (order_id)
) ENGINE=InnoDB;
