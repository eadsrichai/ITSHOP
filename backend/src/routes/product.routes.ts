import { Router } from "express";
import * as controller from "../controllers/product.controller";

const router = Router();

// 🌐 สัปดาห์นี้มีแต่การอ่านข้อมูล ใครก็เรียกได้
// การเพิ่ม/แก้ไข/ลบ จะเพิ่มในสัปดาห์ที่ 4 และล็อกสิทธิ์ในสัปดาห์ที่ 5
router.get("/", controller.getProducts);
router.get("/:id", controller.getProductById);

export default router;
