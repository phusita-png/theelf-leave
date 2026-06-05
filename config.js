// ================================================================
// config.js — ค่าที่ต้องแก้ก่อนใช้งานจริง (พี่กี้แก้ตรงนี้ที่เดียว)
// ================================================================
window.LEAVE_CONFIG = {

  // 1) URL ของ Apps Script Web App (WebApp.gs)
  //    Deploy → New deployment → Web app → copy /exec URL มาวาง
  API_URL: "PASTE_APPS_SCRIPT_EXEC_URL_HERE",

  // 2) LIFF ID (LINE Developers → LIFF → สร้าง app → endpoint = URL GitHub Pages)
  //    ตัวอย่าง: "2001234567-AbcdEfgh"
  LIFF_ID: "PASTE_LIFF_ID_HERE",

  // 3) DEV MODE — เทสบนเครื่องโดยไม่ผ่าน LINE
  //    ใส่ LINE userId จริง 1 คน (จาก sheet LineUsers) เพื่อทดสอบ
  //    ⚠️ ใช้ตอนพัฒนาเท่านั้น — production ตั้งเป็น "" และตั้ง LIFF_CHANNEL_ID ใน Apps Script
  DEV_USER_ID: "",

  // 4) MOCK MODE — เปิดดู UI ในเบราว์เซอร์ทันที (ข้อมูลตัวอย่าง ไม่ต่อ API/LIFF)
  //    เปิด index.html ได้เลย · production ต้องตั้งเป็น false
  MOCK: true
};
