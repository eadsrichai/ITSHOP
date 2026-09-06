import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";

// ต้องโหลด .env ก่อน import โมดูลอื่นที่อ่านค่า process.env
dotenv.config();

import { testConnection } from "./config/db";
import categoryRoutes from "./routes/category.routes";
import productRoutes from "./routes/product.routes";

const app = express();
const PORT = Number(process.env.PORT ?? 5000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

// ------------------------------------------------------------------
// Middleware ทั่วไป (ต้องประกาศก่อน route)
// ------------------------------------------------------------------

// CORS: Frontend อยู่พอร์ต 3000 ส่วน Backend อยู่พอร์ต 5000 ถือเป็นคนละต้นทาง (origin)
// เบราว์เซอร์จะบล็อกไว้ ถ้าเราไม่บอกว่าอนุญาตให้ใครเรียกได้บ้าง
app.use(cors({ origin: CORS_ORIGIN }));

app.use(express.json()); // อ่าน body ที่ส่งมาเป็น JSON
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
// ------------------------------------------------------------------
// เส้นทาง API
// ------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "IT Shop API พร้อมใช้งาน" });
});

app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);

// ------------------------------------------------------------------
// เปิดเซิร์ฟเวอร์
// ------------------------------------------------------------------
async function start(): Promise<void> {
  try {
    await testConnection();
    console.log("✅ เชื่อมต่อฐานข้อมูล MariaDB สำเร็จ");
  } catch (error) {
    console.error("❌ เชื่อมต่อฐานข้อมูลไม่ได้ — ตรวจว่ารัน docker compose up -d แล้วหรือยัง");
    console.error(error);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 API ทำงานที่ http://localhost:${PORT}`);
    console.log(`   ทดสอบได้ที่ http://localhost:${PORT}/api/health`);
  });
}

start();
