// ================================================================
// config.js — ค่าตั้งระบบเงินเดือน (หน้าเว็บ HR)
// ================================================================
window.PAYROLL_CONFIG = {

  // 1) URL ของ Apps Script Web App ฝั่ง payroll (payroll/13_WebApp.gs) — /exec
  //    ⚠️ คนละตัวกับระบบลา — payroll เป็น Apps Script project แยก
  //    วิธีได้มา: เปิด project payroll → Deploy → New deployment → Web app
  //              (Execute as: Me · Who has access: Anyone) → คัด /exec URL มาวางตรงนี้
  PAYROLL_API_URL: "PASTE_PAYROLL_EXEC_URL_HERE",

  // 2) LIFF ID — channel เดียวกับระบบลา (ใช้ล็อกอินร่วมกัน)
  LIFF_ID: "2010306683-lAr4GKMY",

  // 3) DEV MODE — เทสโดยไม่ผ่าน LINE (production = "")
  //    ใส่ LINE userId ของคนที่เป็น ADMIN/OWNER
  //    ⚠️ ใช้ได้เฉพาะตอนที่ยังไม่ได้ตั้ง LIFF_CHANNEL_ID ใน Script Properties ฝั่ง payroll
  DEV_USER_ID: "",

  // 4) MOCK MODE — พรีวิวหน้าจอด้วยข้อมูลตัวอย่าง ไม่ต่อ backend (production = false)
  MOCK: true,

  // 5) จำนวนคนต่อรอบของขั้นที่ทำทีละคน (สร้างสลิป / ส่งสลิป)
  //    เล็ก = progress bar ขยับถี่ · ใหญ่ = รอบน้อยลงแต่แต่ละรอบนานขึ้น
  //    ⚠️ สร้างสลิปต้องเว้น 5 วิ/คน กัน Google บล็อก → 5 คน ≈ 25 วิ/รอบ
  BATCH_SLIP: 5,
  BATCH_SEND: 5,
};
