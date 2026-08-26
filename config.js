// ================================================================
// config.js — ค่าตั้งระบบ (production)
// ================================================================
window.LEAVE_CONFIG = {

  // 1) URL ของ Apps Script Web App (WebApp.gs) — /exec
  API_URL: "https://script.google.com/macros/s/AKfycbwFTk8vIiue-KEMfk7Wb8mVP6fqg8TpeMks4zS_2FRCIML7pNzLrywMnA7M_gNL1YMSlw/exec",

  // 2) LIFF ID (LINE Login channel "ระบบลา & OT ดิเอลฟ์")
  LIFF_ID: "2010306683-lAr4GKMY",

  // 3) DEV MODE — เทสโดยไม่ผ่าน LINE (production = "")
  DEV_USER_ID: "",

  // 4) MOCK MODE — พรีวิว UI ด้วยข้อมูลตัวอย่าง (production = false)
  MOCK: false,

  // ── เมนู "จัดการ Payroll" (โมดูล payroll/) ──────────────────
  // 5) /exec ของ Apps Script project **payroll** — คนละตัวกับ API_URL ข้างบน
  //    (โค้ดเงินเดือนผูกกับไฟล์ชีตเงินเดือน จึงเป็นคนละ project → คนละ /exec)
  //    วิธีได้มา: เปิด Apps Script ของไฟล์เงินเดือน → Deploy → New deployment
  //              → Web app · Execute as: Me · Who has access: Anyone
  PAYROLL_API_URL: "PASTE_PAYROLL_EXEC_URL_HERE",

  // 6) พรีวิวหน้าเงินเดือนด้วยข้อมูลปลอม (ไม่ต่อ backend) — production = false
  PAYROLL_MOCK: false,

  // 7) จำนวนคนต่อรอบของขั้นที่ทำทีละคน (สร้างสลิป / ส่งสลิป)
  //    สร้างสลิปเว้น 5 วิ/คน กัน Google บล็อก → 5 คน ≈ 25 วิ/รอบ
  PAYROLL_BATCH_SLIP: 5,
  PAYROLL_BATCH_SEND: 5
};
