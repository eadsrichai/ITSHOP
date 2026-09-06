/**
 * Bootstrap แจกมาแต่ไฟล์ JavaScript ไม่มีไฟล์ประกาศชนิดข้อมูล (.d.ts) มาให้
 * TypeScript จึงบ่นว่าไม่รู้จักโมดูลนี้
 *
 * บรรทัดล่างนี้บอก TypeScript ว่า "โมดูลนี้มีอยู่จริงนะ ไม่ต้องรู้ว่าข้างในเป็นอะไร"
 * เราใช้แค่ side effect ของมัน (ทำให้ dropdown/modal ทำงาน) ไม่ได้เรียกฟังก์ชันไหนตรง ๆ
 */
declare module "bootstrap/dist/js/bootstrap.bundle.min.js";
