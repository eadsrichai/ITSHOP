import { Router } from "express";
import * as controller from "../controllers/order.controller";
import { requireAuth } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/errorHandler";
import { uploadSlip } from "../middlewares/upload";
import type { AuthRequest } from "../types";

const router = Router();

// 🔑 ทุกเส้นทางในไฟล์นี้ต้องเข้าสู่ระบบก่อน
router.use(requireAuth);

router.post("/", asyncHandler<AuthRequest>(controller.createOrder));
router.get("/", asyncHandler<AuthRequest>(controller.getMyOrders));
router.get("/:id", asyncHandler<AuthRequest>(controller.getMyOrderById));
router.post("/:id/slip", uploadSlip, asyncHandler<AuthRequest>(controller.uploadOrderSlip));
router.patch("/:id/cancel", asyncHandler<AuthRequest>(controller.cancelMyOrder));

export default router;
