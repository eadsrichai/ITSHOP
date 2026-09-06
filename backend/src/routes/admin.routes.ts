import { Router } from "express";
import * as controller from "../controllers/admin.controller";
import { requireAdmin, requireAuth } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/errorHandler";
import type { AuthRequest } from "../types";

const router = Router();

// 👑 ทุกเส้นทางในไฟล์นี้ต้องเป็นแอดมินเท่านั้น
// ประกาศไว้ที่เดียวตรงนี้ ปลอดภัยกว่าไปใส่ทีละบรรทัดแล้วเผลอลืมบางเส้นทาง
router.use(requireAuth, requireAdmin);

router.get("/summary", asyncHandler(controller.getSummary));

router.get("/orders", asyncHandler(controller.getAllOrders));
router.get("/orders/:id", asyncHandler(controller.getOrderDetail));
router.patch("/orders/:id/status", asyncHandler(controller.updateOrderStatus));

router.get("/users", asyncHandler(controller.getUsers));
router.patch("/users/:id/role", asyncHandler<AuthRequest>(controller.updateUserRole));

export default router;
