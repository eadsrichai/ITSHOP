import { Router } from "express";
import * as controller from "../controllers/category.controller";

const router = Router();

// 🌐 อ่านรายการหมวดหมู่ ใช้ทำเมนูกรองสินค้าในสัปดาห์ที่ 3
router.get("/", controller.getCategories);

export default router;
