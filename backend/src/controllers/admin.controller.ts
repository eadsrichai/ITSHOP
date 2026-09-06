import type { Request, Response } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { pool } from "../config/db";
import type { AuthRequest, OrderStatus, UserRole } from "../types";
import { AppError, sendPaginated, sendSuccess } from "../utils/response";
import { optionalString, requireInt, requireOneOf } from "../utils/validate";

const ORDER_STATUSES = ["pending", "paid", "shipping", "completed", "cancelled"] as const;
const USER_ROLES = ["customer", "admin"] as const;

/** GET /api/admin/summary — ตัวเลขสรุปสำหรับหน้าแดชบอร์ด */
export async function getSummary(_req: Request, res: Response): Promise<void> {
  // ยอดขายนับเฉพาะคำสั่งซื้อที่ไม่ถูกยกเลิก
  const [salesRows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(total_amount), 0) AS total_sales,
            COUNT(*)                       AS total_orders
       FROM orders
      WHERE status <> 'cancelled'`
  );

  const [statusRows] = await pool.query<RowDataPacket[]>(
    "SELECT status, COUNT(*) AS total FROM orders GROUP BY status"
  );

  const [productRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total_products,
            SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END) AS low_stock_count
       FROM products
      WHERE is_active = 1`
  );

  const [customerRows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total_customers FROM users WHERE role = 'customer'"
  );

  // สินค้าใกล้หมด 5 อันดับแรก
  const [lowStock] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, stock
       FROM products
      WHERE is_active = 1 AND stock <= 5
      ORDER BY stock ASC
      LIMIT 5`
  );

  // สินค้าขายดี 5 อันดับแรก
  const [bestSellers] = await pool.query<RowDataPacket[]>(
    `SELECT oi.product_id, oi.product_name, SUM(oi.quantity) AS sold
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
      WHERE o.status <> 'cancelled'
      GROUP BY oi.product_id, oi.product_name
      ORDER BY sold DESC
      LIMIT 5`
  );

  // แปลงผลลัพธ์การนับสถานะเป็น object ที่ Frontend ใช้ง่าย
  const byStatus: Record<string, number> = {};
  for (const status of ORDER_STATUSES) byStatus[status] = 0;
  for (const row of statusRows) byStatus[String(row.status)] = Number(row.total);

  sendSuccess(res, {
    total_sales: Number(salesRows[0].total_sales),
    total_orders: Number(salesRows[0].total_orders),
    total_products: Number(productRows[0].total_products),
    low_stock_count: Number(productRows[0].low_stock_count ?? 0),
    total_customers: Number(customerRows[0].total_customers),
    orders_by_status: byStatus,
    low_stock_products: lowStock,
    best_sellers: bestSellers,
  });
}

/** GET /api/admin/orders — คำสั่งซื้อทั้งหมด (กรองตามสถานะ / ค้นหาได้) */
export async function getAllOrders(req: Request, res: Response): Promise<void> {
  const status = optionalString(req.query.status, 20) ?? "";
  const search = optionalString(req.query.search, 100) ?? "";
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (status && ORDER_STATUSES.includes(status as OrderStatus)) {
    conditions.push("o.status = ?");
    params.push(status);
  }
  if (search) {
    conditions.push("(o.order_code LIKE ? OR o.recipient_name LIKE ? OR u.email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
       FROM orders o JOIN users u ON u.id = o.user_id
       ${where}`,
    params
  );
  const total = Number(countRows[0].total);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT o.id, o.order_code, o.total_amount, o.payment_method, o.payment_slip,
            o.status, o.recipient_name, o.created_at,
            u.name AS customer_name, u.email AS customer_email
       FROM orders o
       JOIN users u ON u.id = o.user_id
       ${where}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  sendPaginated(res, rows, {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

/** GET /api/admin/orders/:id — รายละเอียดคำสั่งซื้อสำหรับแอดมิน */
export async function getOrderDetail(req: Request, res: Response): Promise<void> {
  const id = requireInt(req.params.id, "รหัสคำสั่งซื้อ");

  const [orders] = await pool.query<RowDataPacket[]>(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
       FROM orders o
       JOIN users u ON u.id = o.user_id
      WHERE o.id = ?`,
    [id]
  );
  if (orders.length === 0) throw new AppError("ไม่พบคำสั่งซื้อนี้", 404);

  const [items] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM order_items WHERE order_id = ? ORDER BY id",
    [id]
  );

  sendSuccess(res, { ...orders[0], items });
}

/**
 * PATCH /api/admin/orders/:id/status — เปลี่ยนสถานะคำสั่งซื้อ
 * ถ้าเปลี่ยนเป็น cancelled ต้องคืนสต็อกด้วย จึงต้องใช้ Transaction
 */
export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  const id = requireInt(req.params.id, "รหัสคำสั่งซื้อ");
  const newStatus: OrderStatus = requireOneOf(req.body.status, ORDER_STATUSES, "สถานะ");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [orders] = await conn.query<RowDataPacket[]>(
      "SELECT status FROM orders WHERE id = ?",
      [id]
    );
    if (orders.length === 0) throw new AppError("ไม่พบคำสั่งซื้อนี้", 404);

    const currentStatus = String(orders[0].status) as OrderStatus;
    if (currentStatus === newStatus) {
      throw new AppError("คำสั่งซื้อนี้อยู่ในสถานะนี้อยู่แล้ว", 400);
    }
    if (currentStatus === "cancelled") {
      throw new AppError("คำสั่งซื้อที่ยกเลิกแล้วเปลี่ยนสถานะไม่ได้", 400);
    }

    await conn.query("UPDATE orders SET status = ? WHERE id = ?", [newStatus, id]);

    // ยกเลิกทีหลัง = ต้องคืนสต็อกที่ตัดไปตอนสั่งซื้อกลับเข้าระบบ
    if (newStatus === "cancelled") {
      const [items] = await conn.query<RowDataPacket[]>(
        "SELECT product_id, quantity FROM order_items WHERE order_id = ?",
        [id]
      );
      for (const item of items) {
        await conn.query("UPDATE products SET stock = stock + ? WHERE id = ?", [
          item.quantity,
          item.product_id,
        ]);
      }
    }

    await conn.commit();
    sendSuccess(res, { id, status: newStatus }, "เปลี่ยนสถานะสำเร็จ");
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/** GET /api/admin/users — รายชื่อสมาชิก */
export async function getUsers(req: Request, res: Response): Promise<void> {
  const search = optionalString(req.query.search, 100) ?? "";

  const where = search ? "WHERE u.name LIKE ? OR u.email LIKE ?" : "";
  const params = search ? [`%${search}%`, `%${search}%`] : [];

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
            COUNT(o.id) AS order_count
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id AND o.status <> 'cancelled'
       ${where}
      GROUP BY u.id
      ORDER BY u.created_at DESC`,
    params
  );

  sendSuccess(res, rows);
}

/** PATCH /api/admin/users/:id/role — เปลี่ยนบทบาทสมาชิก */
export async function updateUserRole(req: AuthRequest, res: Response): Promise<void> {
  const id = requireInt(req.params.id, "รหัสสมาชิก");
  const role: UserRole = requireOneOf(req.body.role, USER_ROLES, "บทบาท");

  // กันแอดมินเผลอลดสิทธิ์ตัวเองจนไม่มีใครเข้าหลังบ้านได้
  if (id === req.user!.userId) {
    throw new AppError("เปลี่ยนบทบาทของตัวเองไม่ได้", 400);
  }

  const [result] = await pool.query<ResultSetHeader>("UPDATE users SET role = ? WHERE id = ?", [
    role,
    id,
  ]);
  if (result.affectedRows === 0) throw new AppError("ไม่พบสมาชิกรายนี้", 404);

  sendSuccess(res, { id, role }, "เปลี่ยนบทบาทสำเร็จ");
}
