import type { Response } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/db";
import type { AuthRequest, PublicUser, User } from "../types";
import { AppError, sendSuccess } from "../utils/response";
import { optionalString, requireEmail, requireString } from "../utils/validate";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-this-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";
const SALT_ROUNDS = 10;

/** คอลัมน์ที่ปลอดภัยจะส่งออกไปข้างนอก — สังเกตว่าไม่มี password */
const PUBLIC_USER_COLUMNS = "id, name, email, phone, address, role, created_at";

function createToken(userId: number, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/** POST /api/auth/register — สมัครสมาชิก */
export async function register(req: AuthRequest, res: Response): Promise<void> {
  const name = requireString(req.body.name, "ชื่อ-สกุล", 100);
  const email = requireEmail(req.body.email);
  const password = requireString(req.body.password, "รหัสผ่าน", 100);
  const phone = optionalString(req.body.phone, 20);
  const address = optionalString(req.body.address, 500);

  if (password.length < 6) {
    throw new AppError("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร", 400);
  }

  // ตรวจว่าอีเมลซ้ำหรือไม่
  const [existing] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM users WHERE email = ?",
    [email]
  );
  if (existing.length > 0) {
    throw new AppError("อีเมลนี้ถูกใช้สมัครไปแล้ว", 400);
  }

  // hash รหัสผ่านก่อนบันทึกเสมอ — ห้ามเก็บรหัสผ่านดิบลงฐานข้อมูลเด็ดขาด
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO users (name, email, password, phone, address, role) VALUES (?, ?, ?, ?, ?, 'customer')",
    [name, email, hashed, phone, address]
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = ?`,
    [result.insertId]
  );
  const user = rows[0] as PublicUser;

  sendSuccess(
    res,
    { token: createToken(user.id, user.role), user },
    "สมัครสมาชิกสำเร็จ",
    201
  );
}

/** POST /api/auth/login — เข้าสู่ระบบ */
export async function login(req: AuthRequest, res: Response): Promise<void> {
  const email = requireEmail(req.body.email);
  const password = requireString(req.body.password, "รหัสผ่าน", 100);

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );

  const found = rows[0] as User | undefined;

  // ข้อความเดียวกันทั้งกรณีไม่มีอีเมลและกรณีรหัสผ่านผิด
  // เพื่อไม่ให้คนร้ายเดาได้ว่าอีเมลไหนมีอยู่ในระบบบ้าง
  if (!found || !(await bcrypt.compare(password, found.password))) {
    throw new AppError("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
  }

  // ตัด password ออกก่อนส่งกลับ
  const { password: _removed, ...user } = found;

  sendSuccess(res, { token: createToken(user.id, user.role), user }, "เข้าสู่ระบบสำเร็จ");
}

/** GET /api/auth/me — ข้อมูลผู้ใช้ปัจจุบัน (ใช้ตรวจว่า token ยังใช้ได้อยู่ไหม) */
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = ?`,
    [req.user!.userId]
  );

  if (rows.length === 0) throw new AppError("ไม่พบบัญชีผู้ใช้", 404);

  sendSuccess(res, rows[0]);
}

/** PUT /api/auth/profile — แก้ไขข้อมูลส่วนตัว */
export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  const name = requireString(req.body.name, "ชื่อ-สกุล", 100);
  const phone = optionalString(req.body.phone, 20);
  const address = optionalString(req.body.address, 500);

  await pool.query("UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?", [
    name,
    phone,
    address,
    req.user!.userId,
  ]);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = ?`,
    [req.user!.userId]
  );

  sendSuccess(res, rows[0], "บันทึกข้อมูลสำเร็จ");
}
