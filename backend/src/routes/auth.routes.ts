import { Router } from "express";
import * as controller from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/errorHandler";
import type { AuthRequest } from "../types";

const router = Router();

// 🌐 ใครก็เรียกได้
router.post("/register", asyncHandler<AuthRequest>(controller.register));
router.post("/login", asyncHandler<AuthRequest>(controller.login));

// 🔑 ต้องเข้าสู่ระบบก่อน
router.get("/me", requireAuth, asyncHandler<AuthRequest>(controller.getMe));
router.put("/profile", requireAuth, asyncHandler<AuthRequest>(controller.updateProfile));

export default router;
