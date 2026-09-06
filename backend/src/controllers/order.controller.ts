import type { Response } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { pool } from "../config/db";
import type { AuthRequest, PaymentMethod } from "../types";
import { AppError, sendSuccess } from "../utils/response";
import {
  optionalString,
  requireInt,
  requireOneOf,
  requireString,
} from "../utils/validate";

const PAYMENT_METHODS = ["cod", "transfer"] as const;

/** สร้างส่วนวันที่ของเลขที่คำสั่งซื้อ เช่น 20260830 */
function todayCode(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** รูปร่างของรายการสินค้าที่ Frontend ส่งมาตอนสั่งซื้อ */
interface IncomingItem {
  productId: number;
  quantity: number;
}

/**
 * อ่านและตรวจรายการสินค้าที่ส่งเข้ามา
 * สังเกตว่าเรารับมาแค่ "รหัสสินค้า" กับ "จำนวน" เท่านั้น — ไม่รับราคา
 * เพราะราคาต้องมาจากฐานข้อมูลของเราเสมอ
 */
function parseItems(raw: unknown): IncomingItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new AppError("ไม่มีสินค้าในคำสั่งซื้อ", 400);
  }
  if (raw.length > 50) {
    throw new AppError("สั่งซื้อได้สูงสุด 50 รายการต่อครั้ง", 400);
  }

  const items = raw.map((item, index) => ({
    productId: requireInt(item?.productId, `รหัสสินค้ารายการที่ ${index + 1}`),
    quantity: requireInt(item?.quantity, `จำนวนของรายการที่ ${index + 1}`),
  }));

  // รวมรายการที่ซ้ำกันเข้าด้วยกัน กันกรณีส่งสินค้าตัวเดียวมาสองแถวเพื่อเลี่ยงการเช็คสต็อก
  const merged = new Map<number, number>();
  for (const item of items) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  }

  // เรียงตาม productId เสมอ เพื่อให้ทุกคำสั่งซื้อจับล็อกแถวสินค้าในลำดับเดียวกัน
  // ถ้าคนหนึ่งล็อกสินค้า 1→2 แต่อีกคนล็อก 2→1 พร้อมกัน จะเกิด Deadlock ทันที
  return [...merged]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((a, b) => a.productId - b.productId);
}

/**
 * POST /api/orders — สร้างคำสั่งซื้อ
 *
 * นี่คือส่วนที่สำคัญที่สุดของทั้งโปรเจค มี 2 บทเรียนใหญ่:
 *
 *  1) ห้ามเชื่อราคาที่ส่งมาจากฝั่ง Frontend — ต้องอ่านราคาจากฐานข้อมูลมาคำนวณใหม่เสมอ
 *     ไม่งั้นใครก็แก้ราคาให้เหลือ 1 บาทแล้วกดสั่งซื้อได้
 *
 *  2) ต้องใช้ Transaction — เพราะงานนี้มีหลายขั้นตอนที่ต้อง "สำเร็จทั้งหมด หรือไม่สำเร็จเลย"
 *     ถ้าตัดสต็อกไปแล้วแต่บันทึกคำสั่งซื้อไม่สำเร็จ ข้อมูลจะเพี้ยนทันที
 */
export async function createOrder(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const items = parseItems(req.body.items);
  const recipientName = requireString(req.body.recipient_name, "ชื่อผู้รับ", 100);
  const recipientPhone = requireString(req.body.recipient_phone, "เบอร์โทรผู้รับ", 20);
  const shippingAddress = requireString(req.body.shipping_address, "ที่อยู่จัดส่ง", 500);
  const paymentMethod: PaymentMethod = requireOneOf(
    req.body.payment_method,
    PAYMENT_METHODS,
    "วิธีชำระเงิน"
  );
  const note = optionalString(req.body.note, 255);

  // ต้องขอ connection เดี่ยวออกมาจาก pool — ใช้ pool.query() ตรง ๆ ทำ Transaction ไม่ได้
  // เพราะแต่ละ query อาจไปคนละ connection กัน BEGIN กับ COMMIT จะไม่อยู่เส้นเดียวกัน
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // ---- ขั้นที่ 1: อ่านข้อมูลสินค้าจริงจากฐานข้อมูล ----
    const ids = items.map((i) => i.productId);
    const placeholders = ids.map(() => "?").join(","); // สร้าง "?,?,?" ตามจำนวนรายการ

    const [productRows] = await conn.query<RowDataPacket[]>(
      `SELECT id, name, price, stock, is_active
         FROM products
        WHERE id IN (${placeholders})`,
      ids
    );

    if (productRows.length !== ids.length) {
      throw new AppError("มีสินค้าบางรายการไม่มีอยู่ในระบบแล้ว", 400);
    }

    const productMap = new Map(productRows.map((p) => [Number(p.id), p]));

    // ---- ขั้นที่ 2: ตรวจสถานะและสต็อก แล้วคำนวณราคาใหม่ทั้งหมด ----
    let totalAmount = 0;
    const lines = items.map((item) => {
      const product = productMap.get(item.productId)!;

      if (Number(product.is_active) !== 1) {
        throw new AppError(`สินค้า "${product.name}" ปิดการขายแล้ว`, 400);
      }
      if (Number(product.stock) < item.quantity) {
        throw new AppError(
          `สินค้า "${product.name}" คงเหลือ ${product.stock} ชิ้น ไม่พอกับที่สั่ง ${item.quantity} ชิ้น`,
          400
        );
      }

      const unitPrice = Number(product.price); // ราคาจากฐานข้อมูล ไม่ใช่จาก client
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;

      return {
        productId: item.productId,
        productName: String(product.name),
        unitPrice,
        quantity: item.quantity,
        subtotal,
      };
    });

    // ปัดเป็นทศนิยม 2 ตำแหน่ง กันปัญหาเลขทศนิยมของ JavaScript (0.1 + 0.2 = 0.30000000000000004)
    totalAmount = Math.round(totalAmount * 100) / 100;

    // ---- ขั้นที่ 3: บันทึกลงตาราง orders ----
    // ใส่เลขที่ชั่วคราวไปก่อน เพราะเลขที่จริงต้องใช้ id ที่ฐานข้อมูลออกให้
    // ซึ่งจะรู้ได้ก็ต่อเมื่อ INSERT เสร็จแล้ว วิธีนี้การันตีว่าเลขที่ไม่ซ้ำแน่นอน
    const tempCode = `TMP${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const [orderResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO orders
         (order_code, user_id, total_amount, payment_method, status,
          recipient_name, recipient_phone, shipping_address, note)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [
        tempCode,
        userId,
        totalAmount,
        paymentMethod,
        recipientName,
        recipientPhone,
        shippingAddress,
        note,
      ]
    );

    const orderId = orderResult.insertId;
    const orderCode = `ORD${todayCode()}${String(orderId).padStart(4, "0")}`;
    await conn.query("UPDATE orders SET order_code = ? WHERE id = ?", [orderCode, orderId]);

    // ---- ขั้นที่ 4: ตัดสต็อก ----
    //
    // ⚠️ ลำดับสำคัญมาก — ต้องตัดสต็อก "ก่อน" บันทึก order_items เสมอ
    //
    // เหตุผล: ตอน INSERT order_items ฐานข้อมูลต้องตรวจ FOREIGN KEY ว่า product_id มีจริงไหม
    // การตรวจนั้นจะจับล็อกแบบ "อ่าน" (shared lock) บนแถวสินค้าไว้
    // ถ้าเราไป UPDATE สต็อก (ต้องใช้ล็อกแบบ "เขียน") ทีหลัง แล้วมีอีกคนทำแบบเดียวกันพร้อมกัน
    // ทั้งคู่จะถือล็อกอ่านไว้และรอล็อกเขียนของกันและกัน → เกิด Deadlock
    //
    // พอสลับมาตัดสต็อกก่อน แต่ละคำสั่งซื้อจะจับล็อกเขียนตั้งแต่แรก คิวจึงเรียงกันเป็นระเบียบ
    //
    // นอกจากนี้ยังเรียงตาม productId ก่อนวนลูป (ดูใน parseItems)
    // เพื่อให้ทุกคำสั่งซื้อจับล็อกในลำดับเดียวกันเสมอ ลดโอกาส deadlock ลงอีก
    for (const line of lines) {
      // เงื่อนไข "AND stock >= ?" สำคัญมาก
      // ถ้ามีคนอื่นแย่งซื้อตัดสต็อกไปก่อนในเสี้ยววินาทีเดียวกัน แถวนี้จะอัปเดตไม่สำเร็จ
      // เราจะรู้ทันทีจาก affectedRows แล้ว ROLLBACK ทิ้ง — สต็อกจะไม่มีทางติดลบ
      const [updateResult] = await conn.query<ResultSetHeader>(
        "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
        [line.quantity, line.productId, line.quantity]
      );

      if (updateResult.affectedRows !== 1) {
        throw new AppError(`สินค้า "${line.productName}" ถูกซื้อไปก่อนหน้า สต็อกไม่พอแล้ว`, 409);
      }
    }

    // ---- ขั้นที่ 5: บันทึกรายการสินค้า ----
    for (const line of lines) {
      await conn.query(
        `INSERT INTO order_items
           (order_id, product_id, product_name, unit_price, quantity, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, line.productId, line.productName, line.unitPrice, line.quantity, line.subtotal]
      );
    }

    await conn.commit(); // สำเร็จครบทุกขั้น → ยืนยันการเปลี่ยนแปลง

    sendSuccess(
      res,
      { id: orderId, order_code: orderCode, total_amount: totalAmount },
      "สั่งซื้อสำเร็จ",
      201
    );
  } catch (error) {
    await conn.rollback(); // พลาดขั้นใดขั้นหนึ่ง → ย้อนกลับทั้งหมดเหมือนไม่เคยเกิดขึ้น
    throw error;
  } finally {
    conn.release(); // คืน connection กลับ pool เสมอ ไม่ว่าจะสำเร็จหรือไม่
  }
}

/** GET /api/orders — ประวัติคำสั่งซื้อของตัวเอง */
export async function getMyOrders(req: AuthRequest, res: Response): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT o.id, o.order_code, o.total_amount, o.payment_method, o.payment_slip,
            o.status, o.created_at,
            COUNT(oi.id) AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC`,
    [req.user!.userId]
  );

  sendSuccess(res, rows);
}

/**
 * GET /api/orders/:id — รายละเอียดคำสั่งซื้อ
 * ต้องดูได้เฉพาะของตัวเองเท่านั้น (ยกเว้นแอดมิน)
 */
export async function getMyOrderById(req: AuthRequest, res: Response): Promise<void> {
  const id = requireInt(req.params.id, "รหัสคำสั่งซื้อ");
  const { userId, role } = req.user!;

  // แอดมินดูได้ทุกใบ ลูกค้าดูได้เฉพาะของตัวเอง
  // เงื่อนไข user_id อยู่ใน SQL เลย ไม่ใช่ไปเช็คทีหลังใน JavaScript
  const [orders] = await pool.query<RowDataPacket[]>(
    role === "admin"
      ? "SELECT * FROM orders WHERE id = ?"
      : "SELECT * FROM orders WHERE id = ? AND user_id = ?",
    role === "admin" ? [id] : [id, userId]
  );

  if (orders.length === 0) throw new AppError("ไม่พบคำสั่งซื้อนี้", 404);

  const [items] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM order_items WHERE order_id = ? ORDER BY id",
    [id]
  );

  sendSuccess(res, { ...orders[0], items });
}

/** POST /api/orders/:id/slip — อัปโหลดสลิปโอนเงิน */
export async function uploadOrderSlip(req: AuthRequest, res: Response): Promise<void> {
  const id = requireInt(req.params.id, "รหัสคำสั่งซื้อ");

  if (!req.file) throw new AppError("กรุณาเลือกไฟล์สลิป", 400);

  const [orders] = await pool.query<RowDataPacket[]>(
    "SELECT id, status, payment_method FROM orders WHERE id = ? AND user_id = ?",
    [id, req.user!.userId]
  );

  if (orders.length === 0) throw new AppError("ไม่พบคำสั่งซื้อนี้", 404);

  const order = orders[0];
  if (order.payment_method !== "transfer") {
    throw new AppError("คำสั่งซื้อนี้เลือกเก็บเงินปลายทาง ไม่ต้องแนบสลิป", 400);
  }
  if (order.status !== "pending") {
    throw new AppError("คำสั่งซื้อนี้ผ่านการตรวจสอบไปแล้ว", 400);
  }

  await pool.query("UPDATE orders SET payment_slip = ? WHERE id = ?", [req.file.filename, id]);

  sendSuccess(res, { payment_slip: req.file.filename }, "อัปโหลดสลิปสำเร็จ รอแอดมินตรวจสอบ");
}

/**
 * PATCH /api/orders/:id/cancel — ลูกค้ายกเลิกคำสั่งซื้อ
 * ยกเลิกได้เฉพาะตอนสถานะยังเป็น pending และต้องคืนสต็อกด้วย
 */
export async function cancelMyOrder(req: AuthRequest, res: Response): Promise<void> {
  const id = requireInt(req.params.id, "รหัสคำสั่งซื้อ");
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // เงื่อนไข status = 'pending' อยู่ใน UPDATE เลย
    // ถ้ากดยกเลิกซ้ำสองครั้งรัว ๆ ครั้งที่สองจะได้ affectedRows = 0 แล้วหยุดทันที
    // สต็อกจึงไม่มีทางถูกคืนซ้ำสองรอบ
    const [result] = await conn.query<ResultSetHeader>(
      `UPDATE orders SET status = 'cancelled'
        WHERE id = ? AND user_id = ? AND status = 'pending'`,
      [id, req.user!.userId]
    );

    if (result.affectedRows === 0) {
      throw new AppError("ยกเลิกไม่ได้ — ไม่พบคำสั่งซื้อ หรือสถานะเลยขั้นรอตรวจสอบไปแล้ว", 400);
    }

    // คืนสต็อกกลับเข้าระบบ
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

    await conn.commit();
    sendSuccess(res, { id }, "ยกเลิกคำสั่งซื้อสำเร็จ คืนสต็อกเรียบร้อย");
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
