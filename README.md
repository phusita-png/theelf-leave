# The Elf · ระบบลา & OT (Web App)

LIFF web app สำหรับพนักงาน บจก.ดิเอลฟ์ — ยื่นลา / ขอ OT / ดูสลิป / เอกสาร
Static frontend (HTML/CSS/JS) · โฮสต์บน GitHub Pages · ต่อ Google Apps Script API

## โครงสร้าง
| ไฟล์ | |
|---|---|
| `index.html` · `styles.css` · `app.js` | ตัวแอป (6 แท็บ) |
| `config.js` | ค่าที่ต้องตั้ง: `API_URL`, `LIFF_ID`, `MOCK` |
| `logo.png` | โลโก้ The Elf |

## ใช้งาน
ตั้งค่าใน `config.js`:
```js
API_URL: "<Apps Script /exec URL>",
LIFF_ID: "<LIFF ID>",
MOCK: false
```
เปิดผ่าน LINE: `https://liff.line.me/<LIFF_ID>`

> โหมดพรีวิว: ตั้ง `MOCK: true` แล้วเปิด `index.html` ดู UI ด้วยข้อมูลตัวอย่างได้
