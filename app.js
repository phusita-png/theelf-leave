/* ================================================================
   app.js — The Elf · ระบบลา & OT  (LIFF + Apps Script API)
   ================================================================ */
'use strict';

var CFG = window.LEAVE_CONFIG || {};
// ?preview=1 → โหมดพรีวิว UI ด้วยข้อมูลตัวอย่าง (ไม่ต่อ LINE/ไม่แตะข้อมูลจริง) — ไว้โชว์หน้าจอ
try{ if(location.search.indexOf('preview=1')>=0){ CFG.MOCK = true; CFG.PAYROLL_MOCK = true; } }catch(e){}
var TH_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
var TH_DOW = ['อา','จ','อ','พ','พฤ','ศ','ส'];
// ════════════ 🎨 ชุดไอคอนเส้น (monochrome) ════════════
// พี่กี้อยากได้ไอคอนแบบเส้นบาง สีเดียว ทั้งระบบ แทนอิโมจิสี
// - เขียนเป็น SVG inline · ใช้ currentColor → ได้สีตามข้อความ/ธีมที่ครอบอยู่
// - ตัวที่ "ห้ามแตะ" ยังเป็นอิโมจิเหมือนเดิม: ค่าสถานะที่เก็บในชีต (✅ อนุมัติแล้ว ฯลฯ)
//   และข้อความที่ส่งเข้า LINE — LINE แสดง SVG ไม่ได้
var ICONS = {
  sun:       '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  home:      '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.5 20v-6h5v6"/>',
  thermometer:'<path d="M13.5 13.6V4.8a2 2 0 1 0-4 0v8.8a4.2 4.2 0 1 0 4 0Z"/><path d="M11.5 9h2"/>',
  clock:     '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>',
  cake:      '<path d="M4 21h16"/><path d="M5 21v-6.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2V21"/><path d="M8 12.5V10M12 12.5V9.5M16 12.5V10"/><path d="M8 7.2c0 .8-.9 1-.9 1.8M12 6c0 .9-.9 1.1-.9 2M16 7.2c0 .8-.9 1-.9 1.8"/>',
  heart:     '<path d="M12 20s-7-4.4-7-9.2A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.8C19 15.6 12 20 12 20Z"/>',
  file:      '<path d="M14 3H7a1.8 1.8 0 0 0-1.8 1.8v14.4A1.8 1.8 0 0 0 7 21h10a1.8 1.8 0 0 0 1.8-1.8V8Z"/><path d="M14 3v5h4.8"/>',
  paperclip: '<path d="M20 11.5 12.3 19a4.6 4.6 0 0 1-6.5-6.5l7.9-7.9a3.1 3.1 0 0 1 4.3 4.3l-7.8 7.9a1.5 1.5 0 0 1-2.2-2.2l7.2-7.2"/>',
  chart:     '<path d="M4 20h16"/><path d="M7 20v-6M12 20V7M17 20v-9"/>',
  users:     '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><path d="M16 5.4a3.2 3.2 0 0 1 0 6.2M17.5 19.5a5.6 5.6 0 0 0-2-4.3"/>',
  check:     '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.4 2.4 4.6-4.9"/>',
  x:         '<circle cx="12" cy="12" r="8.5"/><path d="M9.4 9.4l5.2 5.2M14.6 9.4l-5.2 5.2"/>',
  calendar:  '<rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><path d="M3.5 9.6h17M8.5 3v4M15.5 3v4"/>',
  message:   '<path d="M20.5 12.2c0 3.9-3.8 7-8.5 7a10 10 0 0 1-2.6-.3L4.5 20.5l1.3-3.5a6.6 6.6 0 0 1-2.3-4.8c0-3.9 3.8-7 8.5-7s8.5 3.1 8.5 7Z"/>',
  ticket:    '<path d="M3.5 9.2V7.4a1.4 1.4 0 0 1 1.4-1.4h14.2a1.4 1.4 0 0 1 1.4 1.4v1.8a2.8 2.8 0 0 0 0 5.6v1.8a1.4 1.4 0 0 1-1.4 1.4H4.9a1.4 1.4 0 0 1-1.4-1.4v-1.8a2.8 2.8 0 0 0 0-5.6Z"/><path d="M13 6v2M13 11v2M13 16v2"/>',
  star:      '<path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8Z"/>',
  leaf:      '<path d="M5 19c0-8 5-12 14-13 .5 8-3.5 13-10 13H5Z"/><path d="M8.5 15.5c2-3 4.4-5 7.5-6.5"/>',
  rotate:    '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/>',
  clipboard: '<rect x="6" y="4.5" width="12" height="16" rx="2"/><rect x="9" y="2.6" width="6" height="3.6" rx="1.2"/><path d="M9.5 11h5M9.5 15h5"/>',
  'user-plus': '<circle cx="9.5" cy="8" r="3.2"/><path d="M3.5 19.5a6 6 0 0 1 12 0"/><path d="M18 8.5v5M15.5 11h5"/>',
  'user-check':'<circle cx="9.5" cy="8" r="3.2"/><path d="M3.5 19.5a6 6 0 0 1 12 0"/><path d="M16 11.8l1.7 1.7 3.3-3.5"/>',
  phone:     '<rect x="6.5" y="2.5" width="11" height="19" rx="2.4"/><path d="M10.5 18.5h3"/>',
  alert:     '<path d="M12 4.2 2.8 20h18.4L12 4.2Z"/><path d="M12 10v4M12 17h.01"/>',
  info:      '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  folder:    '<path d="M3.5 7.5a2 2 0 0 1 2-2h3.3l2 2.4h7.7a2 2 0 0 1 2 2v8.6a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/>',
  scroll:    '<path d="M6 4.5h10.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z"/><path d="M8 9h6.5M8 12.5h6.5M8 16h4"/>',
  send:      '<path d="M21 3 10.5 13.5"/><path d="M21 3l-6.8 18-3.7-7.5L3 9.8 21 3Z"/>',
  lock:      '<rect x="4.5" y="10.5" width="15" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  wallet:    '<rect x="3" y="6" width="18" height="12.5" rx="2.4"/><path d="M3 10.5h18"/><circle cx="16.5" cy="14.6" r="1.4"/>',
  user:      '<circle cx="12" cy="8.5" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  tools:     '<path d="M14.5 6.5a3.8 3.8 0 0 0 5 5l-8 8a2.4 2.4 0 0 1-3.4-3.4l8-8a3.8 3.8 0 0 0-1.6-1.6Z"/>',
  upload:    '<path d="M12 16V4.5"/><path d="M7 9.5 12 4.5l5 5"/><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
  download:  '<path d="M12 4.5V16"/><path d="M7 11.5 12 16.5l5-5"/><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
  save:      '<path d="M5 4.5h11L19.5 8v11.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-14A1.5 1.5 0 0 1 5 4.5Z"/><path d="M8 4.5v5h7"/><rect x="8" y="13.5" width="8" height="5.5" rx="1"/>',
  search:    '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
  calc:      '<rect x="5" y="3" width="14" height="18" rx="2.2"/><path d="M8.5 7.5h7"/><path d="M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01"/>',
  receipt:   '<path d="M6 3.5h12v17l-2.4-1.4-2.4 1.4-2.4-1.4L8.4 20.5 6 19V3.5Z"/><path d="M9 8h6M9 12h6"/>',
  settings:  '<circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6"/>',
  camera:    '<path d="M4.5 8.5h3l1.4-2h6.2l1.4 2h3v10h-15Z"/><circle cx="12" cy="13" r="3.2"/>',
  trend:     '<path d="M4 16.5 9.5 11l3.5 3.5L20 7.5"/><path d="M15.5 7.5H20V12"/>',
  plug:      '<path d="M9 3v5M15 3v5"/><path d="M6.5 8h11v3.2a5.5 5.5 0 0 1-11 0Z"/><path d="M12 16.7V21"/>',
  key:       '<circle cx="8" cy="12" r="4"/><path d="M12 12h9"/><path d="M17.5 12v3.5M20.5 12v2.5"/>',
  link:      '<path d="M10.5 13.5a3.6 3.6 0 0 0 5.1 0l2.6-2.6a3.6 3.6 0 0 0-5.1-5.1L11.8 7"/><path d="M13.5 10.5a3.6 3.6 0 0 0-5.1 0l-2.6 2.6a3.6 3.6 0 0 0 5.1 5.1L12.2 17"/>',
  gift:      '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5v8h14v-8"/><path d="M12 8.5V21"/><path d="M12 8.5S9 8.5 8 7.5a2 2 0 0 1 2.8-2.8c1 1 1.2 3.8 1.2 3.8Zm0 0s3 0 4-1a2 2 0 0 0-2.8-2.8c-1 1-1.2 3.8-1.2 3.8Z"/>',
  coffee:    '<path d="M4.5 8h12v6.5a4.5 4.5 0 0 1-9 0V8Z"/><path d="M16.5 9.5h1.8a2.3 2.3 0 0 1 0 4.6h-1.8"/><path d="M4 20.5h13"/>',
  mail:      '<rect x="3" y="5.5" width="18" height="13" rx="2.2"/><path d="m3.8 7 8.2 6 8.2-6"/>',
  target:    '<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r=".9"/>',
  userx:     '<circle cx="9.5" cy="8" r="3.2"/><path d="M3.5 19.5a6 6 0 0 1 12 0"/><path d="M16.5 9l4 4M20.5 9l-4 4"/>',
  moon:      '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z"/>',
  hash:      '<path d="M6 9.5h13M5 14.5h13M10 4.5 8.5 19.5M16 4.5 14.5 19.5"/>',
  pin:       '<path d="M12 21v-6"/><path d="M8 3.5h8l-1 5 3 3.5H6l3-3.5-1-5Z"/>',
  bell:      '<path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 14 6.5 10Z"/><path d="M10.3 19a2 2 0 0 0 3.4 0"/>',
  book:      '<path d="M4 5.5A2 2 0 0 1 6 3.5h5.5v16H6a2 2 0 0 0-2 2Z"/><path d="M20 5.5a2 2 0 0 0-2-2h-6.5v16H18a2 2 0 0 1 2 2Z"/>',
  trash:     '<path d="M4.5 6.5h15"/><path d="M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7"/><path d="M6.5 6.5 7.5 20a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13.5"/>',
  dot:       '<circle cx="12" cy="12" r="5"/>',
  sparkle:   '<path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9Z"/>',
  shield:    '<path d="M12 3.2 4.8 6v6c0 4.3 3 7.3 7.2 8.8 4.2-1.5 7.2-4.5 7.2-8.8V6Z"/>',
  building:  '<rect x="5" y="3.5" width="14" height="17" rx="1.8"/><path d="M9 7.5h2M13 7.5h2M9 11.5h2M13 11.5h2M9 15.5h6"/>',
  card:      '<rect x="3" y="6" width="18" height="12.5" rx="2.4"/><path d="M3 10.5h18"/>',
  inbox:     '<path d="M3.5 13.5 6 5.5h12l2.5 8v5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/><path d="M3.5 13.5H9a3 3 0 0 0 6 0h5.5"/>',
  signature: '<path d="M4 17c3-1 3.5-9 6-9s1.5 8 4 8c1.6 0 2.4-2 3-2s1 1 3 1"/><path d="M4 20.5h16"/>',
  swap:      '<path d="M4 8.5h13"/><path d="M13.5 5 17 8.5 13.5 12"/><path d="M20 15.5H7"/><path d="M10.5 12 7 15.5 10.5 19"/>',
  eraser:    '<path d="m5 15.5 6.5-6.5a2 2 0 0 1 2.8 0l3.7 3.7a2 2 0 0 1 0 2.8L15 18.5H8Z"/><path d="M8 18.5h12"/>',
  ban:       '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
  pencil:    '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M14.5 6.5l3 3"/>',
  hourglass: '<path d="M7 3h10M7 21h10"/><path d="M8 3v3.4a4 4 0 0 0 1.6 3.2L12 12l-2.4 2.4A4 4 0 0 0 8 17.6V21"/><path d="M16 3v3.4a4 4 0 0 1-1.6 3.2L12 12l2.4 2.4a4 4 0 0 1 1.6 3.2V21"/>',
  wave:      '<path d="M8 13V6.5a1.4 1.4 0 0 1 2.8 0V12"/><path d="M10.8 12V5.4a1.4 1.4 0 0 1 2.8 0V12"/><path d="M13.6 12V7a1.4 1.4 0 0 1 2.8 0v7.5c0 3.3-2.2 5.9-5.4 5.9-3.4 0-5.2-2.3-5.6-4.6l-.6-3a1.3 1.3 0 0 1 2.4-.9L8 14"/>',
};

/** ico('home') → <svg> ไอคอนเส้น ขนาดตามตัวอักษรที่ครอบอยู่ */
function ico(name, cls){
  var d = ICONS[name];
  if(!d) return '';
  return '<svg class="ico'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" '+
    'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
}

// ประเภทการลา → ไอคอน (แทน TYPE_EMOJI ในหน้าจอที่แปลงแล้ว)
var TYPE_ICON = {'ลาป่วย':'thermometer','ลากิจ':'home','ลาพักร้อน':'sun','ลากิจไม่รับค่าจ้าง':'file',
  'ลาวันเกิด':'cake','ลาวันเกิดคนพิเศษ':'heart'};
function typeIco(name, cls){ return ico(TYPE_ICON[name] || 'calendar', cls); }

var VIEW_HEAD = {
  home:    ['ระบบลา & OT','บจก.ดิเอลฟ์'],
  leave:   ['ยื่นใบลา','เลือกประเภท · วัน · ช่วงเวลา'],
  ot:      ['ขอ OT','แจ้งทำงานล่วงเวลา'],
  payslip: ['สลิปเงินเดือน','รายได้ & รายการหัก'],
  history: ['ประวัติ','คำขอลา & OT ของคุณ'],
  profile: ['โปรไฟล์','ข้อมูล & สิทธิ์การลา'],
  documents:['เอกสาร','ดาวน์โหลดเอกสารของคุณ'],
  hr:      ['อนุมัติทั้งหมด','ลา · OT · คำขอลงทะเบียน'],
  leavecal:['ปฏิทินการลา','ภาพรวมการลาทั้งทีม'],
  dashboard:['แดชบอร์ด','สรุปภาพรวม HR'],
  mgleave: ['จัดการการลา','ดู · แก้ · โควต้า · export'],
  mgot:    ['จัดการ OT','ดู · แก้ · คำนวณ · ส่งสรุป'],
  mgpay:   ['จัดการ Payroll','ปิดเดือน 10 ขั้น · รายงานย้อนหลัง'],
  emps:    ['พนักงาน','เพิ่ม · บทบาท · โควต้า · ข้อมูล'],
  unpaidreq:['ขอสิทธิ์ลาไม่รับค่าจ้าง','ส่งคำขอ → HR ให้สิทธิ์ → ยื่นใบลา']
};
// ไอคอนเมนู (โชว์หน้า topbar desktop) — ตรงกับ nav-emo ใน index.html
var VIEW_ICON = {
  home:'home', leave:'calendar', ot:'clock', payslip:'wallet', history:'clipboard', profile:'user',
  documents:'paperclip', hr:'check', leavecal:'calendar', dashboard:'chart',
  mgleave:'clipboard', mgot:'clock', mgpay:'wallet', emps:'users', unpaidreq:'file'
};

var S = {
  auth:null, profile:null, balances:null, holidays:[], schedule:null, leaveTypes:null, otTypes:null,
  otThisMonth:{hours:0,count:0}, recent:[], avatar:null,
  view:'home',
  leaveForm:{type:'vac',start:null,end:null,period:'full',reason:'',stime:'',etime:''},
  otForm:{date:null,start:'',end:'',type:'1',reason:''},
  calLeave:new Date(), calOt:new Date(), histTab:'leave', hrHist:'all', hrHistData:null,   // hrHist=แท็บประวัติแผง HR
  hrSum:{mode:'period',year:null,month:null,from:'',to:''},   // ตัวกรองสรุปแผง HR
  mgTab:'report', mgFilter:{mode:'period',year:null,month:null,from:'',to:''}, mgSearch:'', mgStatus:'all', mgData:null, mgUsers:null, mgRoles:null,  // จัดการการลา (เฟส 3)
  mgRptFilter:{mode:'period',year:null,month:null,from:'',to:''}, mgRptData:null,   // แท็บสรุปรายคน
  otTab:'report', mgotFilter:{mode:'period',year:null,month:null,from:'',to:''}, mgotSearch:'', mgotStatus:'all', mgotData:null,  // จัดการ OT (เฟส 4)
  mgotRptFilter:{mode:'period',year:null,month:null,from:'',to:''}, mgotRptData:null,
  editLeaveId:null, editOtId:null, pendingEdit:null, pendingView:null,   // โหมดแก้ไข + deep-link view
  leaveCalMonth:null, leaveCalItems:[], leaveCalSel:null, leaveCalDept:'', leaveCalType:''   // ปฏิทินการลารวม (HR)
};

// ════════════ INIT ════════════
window.addEventListener('DOMContentLoaded', init);
function init() {
  bindNav();
  bindHelp();
  if (CFG.MOCK) { mockBootstrap(); return; }
  if (CFG.DEV_USER_ID) { S.auth = {userId:CFG.DEV_USER_ID}; bootstrap(); return; }
  initLiff();
}
// ── Auth / idToken refresh (PC Admin เปิดยาว → idToken หมดอายุ ~1 ชม.) ──
var _reauthing = false;
function _idTokenExpMs_(t){
  try{ var p=JSON.parse(atob(String(t).split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); return (p.exp||0)*1000; }catch(e){ return 0; }
}
function _isAuthErr_(m){
  m=String(m||'').toLowerCase();
  return m.indexOf('idtoken')>=0 || m.indexOf('id token')>=0 || m.indexOf('expired')>=0 || m.indexOf('หมดอายุ')>=0;
}
// ต่ออายุ session: liff.login() ออก idToken ใหม่ (LINE session ยังอยู่ → กลับมาเร็ว ไม่ต้องสแกนซ้ำ)
function reauth(){
  if(_reauthing || CFG.MOCK || CFG.DEV_USER_ID) return; _reauthing=true;
  try{ var last=+(sessionStorage.getItem('reauth_ts')||0);
    if(Date.now()-last < 8000){ return fail('ต่ออายุเซสชันไม่สำเร็จ — ปิดแล้วเปิดแอปใหม่อีกครั้งค่ะ',ico('key')); }
    sessionStorage.setItem('reauth_ts', Date.now());
  }catch(e){}
  toast('เซสชันหมดอายุ · กำลังเข้าสู่ระบบใหม่…');
  setTimeout(function(){
    try{ if(liff.isLoggedIn && liff.isLoggedIn()) liff.logout(); }catch(e){}   // ล้าง token เก่า → บังคับออกใหม่สด
    try{ liff.login(); }catch(e){ location.reload(); }
  }, 700);
}
function initLiff() {
  if (!window.liff || !CFG.LIFF_ID || CFG.LIFF_ID.indexOf('PASTE') === 0)
    return fail('ยังไม่ได้ตั้งค่า LIFF_ID ใน config.js');
  liff.init({liffId:CFG.LIFF_ID}).then(function(){
    if (!liff.isLoggedIn()) { liff.login(); return; }
    var _tok = liff.getIDToken();
    if (!_tok || _idTokenExpMs_(_tok) < Date.now() + 60000) { reauth(); return; }   // หมด/ใกล้หมดใน 1 นาที → ต่ออายุก่อน
    S.auth = {idToken:_tok};
    // deep-link ?edit=LV-xxx (HR ส่งกลับให้แก้) — รับจาก query หรือ liff.state
    try {
      var qs = new URLSearchParams(location.search);
      var st = liff.state ? new URLSearchParams(String(liff.state).replace(/^\?/,'')) : null;
      S.pendingEdit = qs.get('edit') || (st && st.get('edit'));
      S.pendingView = qs.get('view') || (st && st.get('view'));   // deep-link ?view=hr (จากการ์ดแจ้งคำขอ)
    } catch(e){}
    liff.getProfile().then(function(p){
      S.avatar = p.pictureUrl; S.displayName = p.displayName || ''; paintAvatar();
      // ส่งรูปไปเก็บในชีตด้วย — พอทุกคนเปิดเว็บครบ HR ก็ได้รูปทั้งบริษัทโดยไม่ต้องยิง API ทีละคน
      if(S.avatar) api('bootstrap',{photo:S.avatar}).catch(function(){});
    }).catch(function(){});
    bootstrap();
  }).catch(function(e){ fail('LIFF init ล้มเหลว: ' + e); });
}

// ════════════ API (JSONP) ════════════
var _seq = 0;
// ════════════ API (JSONP) ════════════
// อาการ "หมดเวลาเชื่อมต่อ" ที่เจอบ่อย มาจาก 3 อย่างรวมกัน:
//   ① Apps Script ทำคำขอของผู้ใช้คนเดียว "ทีละคำขอ" — หน้าอนุมัติยิงทีเดียว 6 ชุด
//      ตัวท้ายจึงนั่งรอคิว แล้วนาฬิกาฝั่งเว็บหมดก่อนทั้งที่เซิร์ฟเวอร์ยังทำงานอยู่
//   ② เวลารอ 20 วิ สั้นไปเมื่อ GAS ตื่นจากหลับ (cold start) หรือคำขอหนัก
//   ③ หมดเวลาแล้วยอมแพ้เลย ไม่ลองใหม่
// แก้: คิวฝั่งเว็บ (ทีละ 2) + เริ่มจับเวลาเมื่อได้คิวจริง + ขยายเป็น 45 วิ + ลองใหม่ 1 ครั้ง
var API_TIMEOUT_MS = 45000;     // เวลารอต่อ 1 คำขอ (เริ่มนับตอนยิงจริง ไม่ใช่ตอนเข้าคิว)
var API_MAX_PARALLEL = 2;       // ยิงพร้อมกันได้กี่คำขอ
var _apiQueue = [], _apiActive = 0;

// คำขอที่ "เขียนข้อมูล" — ห้ามลองใหม่เอง เดี๋ยวได้ใบซ้ำ/อนุมัติซ้ำ
var API_WRITE_RE = /^(submit|decide|add|set|update|approve|reject|cancel|edit|save|send|gen|calc|close|lock|unlock|upload|delete|remove|merge|move|unlink|proxy|import|backfill|revoke|register|mg(Cancel|Edit|Proxy|Set|Export|Report(Export|Backfill))|em(Set|Add|Allow(Save|Decide)|Line(Move|Merge|Unlink)|Photo))/i;

function api(action, params) {
  if (CFG.MOCK) return mockApi(action, params);
  return new Promise(function(resolve, reject){
    _apiQueue.push({ action: action, params: params, resolve: resolve, reject: reject,
                     tries: 0, queuedAt: Date.now() });
    _apiPump();
  });
}

function _apiPump(){
  while (_apiActive < API_MAX_PARALLEL && _apiQueue.length) {
    var job = _apiQueue.shift();
    _apiActive++;
    _apiSend(job);
  }
}

function _apiSend(job){
  var t0 = Date.now();
  _apiRaw(job.action, job.params).then(function(d){
    _apiDone(job, t0);
    job.resolve(d);
  }).catch(function(e){
    var msg = String(e && e.message || e);
    var timedOut = msg.indexOf('หมดเวลา') >= 0 || msg.indexOf('เชื่อมต่อ API ไม่ได้') >= 0;
    var canRetry = timedOut && job.tries < 1 && !API_WRITE_RE.test(String(job.action||''));
    if (canRetry) {
      job.tries++;
      _apiSend(job);            // ลองใหม่ทันที (ยังไม่คืนคิว — กันคำขออื่นแซงจนคิวยาวขึ้นอีก)
      return;
    }
    _apiDone(job, t0);
    job.reject(timedOut ? new Error('เซิร์ฟเวอร์ตอบช้ากว่าปกติ — กดใหม่อีกครั้งค่ะ') : e);
  });
}

function _apiDone(job, t0){
  _apiActive--;
  try {
    var ms = Date.now() - t0;
    S.apiSlow = S.apiSlow || [];
    if (ms > 8000) S.apiSlow.push({ action: job.action, ms: ms, retried: job.tries });  // ไว้ไล่ดูว่าคำขอไหนช้า
  } catch (e) {}
  _apiPump();
}

/** ยิง JSONP 1 คำขอ (ตัวจับเวลาเริ่มที่นี่ = ตอนยิงจริง) */
function _apiRaw(action, params) {
  return new Promise(function(resolve, reject){
    if (!CFG.API_URL || CFG.API_URL.indexOf('PASTE') === 0)
      return reject(new Error('ยังไม่ได้ตั้งค่า API_URL ใน config.js'));
    var cb = '__lv_' + (++_seq) + '_' + Date.now();
    var q = ['action=' + encodeURIComponent(action), 'callback=' + cb];
    var all = Object.assign({}, S.auth || {}, params || {});
    Object.keys(all).forEach(function(k){ if (all[k]!=null){ var v=all[k]; if (typeof v==='object') v=JSON.stringify(v); q.push(encodeURIComponent(k)+'='+encodeURIComponent(v)); } });
    var sc = document.createElement('script'), done = false;
    var t = setTimeout(function(){ if(done)return; done=true; clean(); reject(new Error('หมดเวลาเชื่อมต่อ')); }, API_TIMEOUT_MS);
    window[cb] = function(d){ if(done)return; done=true; clearTimeout(t); clean();
      if (d && d.ok===false && _isAuthErr_(d.error)) reauth();   // token หมดกลางคัน → ต่ออายุอัตโนมัติ
      resolve(d); };
    function clean(){ delete window[cb]; if(sc.parentNode) sc.parentNode.removeChild(sc); }
    sc.onerror = function(){ if(done)return; done=true; clearTimeout(t); clean(); reject(new Error('เชื่อมต่อ API ไม่ได้')); };
    sc.src = CFG.API_URL + '?' + q.join('&');
    document.body.appendChild(sc);
  });
}

// ════════════ BOOTSTRAP ════════════
function bootstrap() {
  api('bootstrap', {}).then(function(r){
    if (!r.ok) {
      if (r.needRegister) return showRegister();
      return fail(r.error || 'โหลดข้อมูลไม่สำเร็จ', ico('alert'));
    }
    apply(r);
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    paintAvatar(); setupNavRoles(); render();
    if (S.pendingEdit) enterEditById(S.pendingEdit);   // deep-link → เปิดหน้าแก้เลย (ลา/OT)
    else if (S.pendingView === 'hr' && S.profile && S.profile.canApprove) goTo('hr');   // deep-link → เด้งแผง HR เลย
    else if ((S.pendingView === 'emps' || S.pendingView === 'settings') && S.profile && S.profile.canAdmin) goTo('emps');
    else if (window.innerWidth >= 1024) goTo(S.profile && S.profile.canApprove ? 'hr' : 'leavecal');
  }).catch(function(e){ fail(String(e.message || e)); });
}
function apply(r){
  S.profile=r.profile; S.balances=r.balances; S.holidays=r.holidays||[]; S.schedule=r.schedule||null;
  S.leaveTypes=r.leaveTypes; S.otTypes=r.otTypes||{}; S.otThisMonth=r.otThisMonth||{hours:0,count:0};
  S.recent=r.recent||[];
 S.unpaidReq=r.unpaidReq||{pending:false,lastStatus:'',askDays:0}; // สถานะคำขอสิทธิ์ลาไม่รับค่าจ้าง (v.76)
}
function fail(msg, emo){
  document.getElementById('loader').innerHTML =
    '<div class="empty"><div class="e-emo">'+(emo||ico('alert'))+'</div><div class="e-txt">'+esc(msg)+'</div></div>';
}

// ════════════ REGISTER (พนักงานใหม่ · ส่งคำขอ → HR อนุมัติ) ════════════
function showRegister(){
  var ld = document.getElementById('loader');
  ld.classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  ld.innerHTML =
    '<div class="reg-wrap">'+
      '<div class="reg-emo">'+ico('pencil')+'</div>'+
      '<div class="reg-title">ลงทะเบียนเข้าระบบ</div>'+
      '<div class="reg-sub">กรอกชื่อ-นามสกุลให้ตรงกับที่ HR บันทึกไว้<br>ระบบจะส่งให้ HR ตรวจสอบและอนุมัติก่อนเข้าใช้งานค่ะ</div>'+
      '<input id="regName" class="reg-input" type="text" placeholder="เช่น สมชาย ใจดี" autocomplete="off">'+
      '<button id="regBtn" class="btn btn-primary" style="width:100%;margin-top:4px">ส่งคำขอลงทะเบียน</button>'+
      '<div id="regMsg" class="reg-msg"></div>'+
    '</div>';
  var input = document.getElementById('regName');
  if (S.regName) input.value = S.regName;
  document.getElementById('regBtn').addEventListener('click', submitRegistration);
  input.addEventListener('keydown', function(e){ if(e.key==='Enter') submitRegistration(); });
  input.focus();
}
function submitRegistration(){
  var input = document.getElementById('regName');
  var msg = document.getElementById('regMsg');
  var btn = document.getElementById('regBtn');
  var name = (input.value||'').trim().replace(/\s+/g,' ');
  if (name.split(' ').length < 2){ msg.className='reg-msg err'; msg.textContent='กรุณากรอกทั้งชื่อและนามสกุลค่ะ'; return; }
  S.regName = name;
  btn.disabled = true; btn.textContent = 'กำลังส่ง…'; msg.textContent='';
  api('submitRegistration', { name:name, displayName:S.displayName||'' }).then(function(r){
    btn.disabled = false; btn.textContent = 'ส่งคำขอลงทะเบียน';
    if (r.ok || r.pending || r.already) return showRegPending(r);
    msg.className='reg-msg err'; msg.textContent = r.error || 'ส่งไม่สำเร็จ ลองใหม่อีกครั้งค่ะ';
  }).catch(function(e){
    btn.disabled = false; btn.textContent = 'ส่งคำขอลงทะเบียน';
    msg.className='reg-msg err'; msg.textContent = 'เชื่อมต่อไม่ได้: '+(e.message||e);
  });
}
function showRegPending(r){
  var already = !!r.already;
  document.getElementById('loader').innerHTML =
    '<div class="reg-wrap">'+
      '<div class="reg-emo">'+(already?ico('check'):'⏳')+'</div>'+
      '<div class="reg-title">'+(already?'คุณลงทะเบียนแล้ว':'ส่งคำขอเรียบร้อย')+'</div>'+
      '<div class="reg-sub">'+(already
        ? 'บัญชีนี้อยู่ในระบบแล้ว ปิดแล้วเปิดแอปใหม่เพื่อเริ่มใช้งานได้เลยค่ะ'
        : 'กรุณารอ HR ตรวจสอบและอนุมัติ<br>เมื่ออนุมัติแล้วระบบจะแจ้งกลับทาง LINE ทันทีค่ะ '+ico('bell'))+'</div>'+
    '</div>';
}

// ════════════ ROUTER ════════════
function bindNav(){
  document.querySelectorAll('.nav-btn').forEach(function(b){
    b.addEventListener('click', function(){ goTo(b.dataset.view); });
  });
}
function goTo(view){
  if (S.view==='mgpay' && view!=='mgpay' && window.PAY) PAY.unmount();
  if (view === 'settings') view = 'emps';   // เมนู "ตั้งค่าระบบ" เดิม = หน้าพนักงาน → alias ไว้ให้ลิงก์เก่า/deep-link ยังใช้ได้
  S.view = view;
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.view===view); });
  render(); window.scrollTo(0,0);
}
// เปิดเมนู admin ใน sidebar (desktop) ตามสิทธิ์ — มือถือ CSS ซ่อนเสมอ (ใช้ hub link เดิม)
function setupNavRoles(){
  var p = S.profile || {}, ap = !!p.canApprove, ad = !!p.canAdmin;
  var roles = {dashboard:ap, leavecal:ap, hr:ap, mgleave:ad, mgot:ad, mgpay:ad, emps:ad};
  Object.keys(roles).forEach(function(v){
    var el=document.querySelector('.nav-btn[data-view="'+v+'"]'); if(el) el.classList.toggle('allow', roles[v]); });
  // section label โชว์เฉพาะกลุ่มที่มีปุ่ม visible (desktop)
  document.querySelectorAll('.nav-sec').forEach(function(sec){
    var has=false, n=sec.nextElementSibling;
    while(n && !n.classList.contains('nav-sec')){
      if(n.classList.contains('nav-btn') && (!n.classList.contains('nav-admin')||n.classList.contains('allow'))){ has=true; break; }
      n=n.nextElementSibling;
    }
    sec.classList.toggle('has-items', has);
  });
}
// ════════════ HELP OVERLAY (คู่มือในแอป · ตาม role) ════════════
function helpUrl(){
  // ชี้ไป "หน้ารวมคู่มือ" ทั้ง 2 role — หน้านั้นแยกฝั่งพนักงาน/HR ให้อยู่แล้ว
  // (ของเดิมชี้ตรงไปเล่มเก่า พอมีเล่มใหม่เพิ่มมาก็ไม่มีใครเห็น ต้องตามแก้ทุกครั้ง)
  return 'guides/index.html';
}
function bindHelp(){
  var fab = document.getElementById('helpFab');
  if (fab) fab.addEventListener('click', openHelp);
}
function openHelp(){
  var h = document.getElementById('help');
  if (!h){
    h = document.createElement('div'); h.id='help'; h.className='help';
    h.innerHTML =
      '<div class="help-bar">'+
        '<span class="help-ttl">'+ico('book')+' คู่มือการใช้งาน</span>'+
        '<a class="help-open" target="_blank" rel="noopener">↗ เปิดเต็มหน้า</a>'+
        '<button class="help-x" aria-label="ปิด">✕</button>'+
      '</div>'+
      '<div class="help-load">กำลังโหลดคู่มือ…</div>'+
      '<iframe class="help-frame" title="คู่มือการใช้งาน"></iframe>';
    document.body.appendChild(h);
    h.querySelector('.help-x').addEventListener('click', closeHelp);
    h.addEventListener('click', function(e){ if(e.target===h) closeHelp(); });
    h.querySelector('.help-frame').addEventListener('load', function(){
      var l=h.querySelector('.help-load'); if(l) l.style.display='none'; });
  }
  var url = helpUrl();
  h.querySelector('.help-open').setAttribute('href', url);
  var l=h.querySelector('.help-load'); if(l) l.style.display='';
  h.querySelector('.help-frame').src = url;   // โหลดไฟล์เฉพาะตอนเปิด (ไฟล์ใหญ่ ~1MB)
  h.classList.add('show');
}
function closeHelp(){
  var h = document.getElementById('help'); if(!h) return;
  h.classList.remove('show');
  var f=h.querySelector('.help-frame'); if(f) f.src='about:blank';   // คืน memory
}

function render(){
  var h = VIEW_HEAD[S.view] || ['',''];
  document.getElementById('hdTitle').textContent = h[0];
  document.getElementById('hdSub').textContent = h[1];
  // topbar (desktop) — โชว์ชื่อเมนูที่กด + ไอคอน
  var tt=document.getElementById('tbTitle');
  if(tt){ tt.textContent=h[0]; document.getElementById('tbSub').textContent=h[1];
    document.getElementById('tbIcon').innerHTML=ico(VIEW_ICON[S.view]||'home'); }
  var m = document.getElementById('main');
  if (S.view==='home')      { m.innerHTML = viewHome(); wireHome(); }
  else if (S.view==='leave'){ m.innerHTML = viewLeave(); wireLeave(); }
  else if (S.view==='ot')   { m.innerHTML = viewOt(); wireOt(); }
  else if (S.view==='payslip'){ m.innerHTML = '<div class="card"><div class="skel" style="height:120px"></div></div>'; loadPayslip(); }
  else if (S.view==='documents'){ m.innerHTML = '<div class="card"><div class="skel" style="height:60px"></div></div>'; loadDocuments(); }
  else if (S.view==='hr'){ m.innerHTML = '<div class="card"><div class="skel" style="height:120px"></div></div>'; loadHr(); }
  else if (S.view==='leavecal'){ m.innerHTML = viewLeaveCal(); wireLeaveCal(); loadLeaveCal(); }
  else if (S.view==='dashboard'){ loadDashboard(); }
  else if (S.view==='mgleave'){ m.innerHTML = viewMgleave(); wireMgleave(); loadMgleave(); }
  else if (S.view==='mgot'){ m.innerHTML = viewMgot(); wireMgot(); }
  else if (S.view==='mgpay'){ mountPayroll(m); }
  else if (S.view==='emps'){ m.innerHTML = '<div class="card"><div class="skel" style="height:120px"></div></div>'; loadSettings(); }
  else if (S.view==='unpaidreq'){ m.innerHTML = viewUnpaidReq(); wireUnpaidReq(); }
  else if (S.view==='history'){ m.innerHTML = viewHistory(); wireHistory(); }
  else if (S.view==='profile'){ m.innerHTML = viewProfile(); wireMyPhotoBtn(); }
}

// ════════════ VIEW: จัดการ Payroll (โมดูล window.PAY) ════════════
// ระบบเงินเดือนเป็น Apps Script คนละ project (ผูกกับไฟล์ชีตเงินเดือน) → /exec คนละตัว
// แต่ล็อกอินใช้ LIFF channel เดียวกัน — ส่ง idToken ของคอนโซลให้โมดูลใช้ต่อ
// HR จึงล็อกอินครั้งเดียว ไม่ต้องเด้งออกไปหน้าอื่น
function mountPayroll(m){
  if (!window.PAY){ m.innerHTML = viewSoon(ico('wallet')+' จัดการ Payroll','โหลดโมดูลเงินเดือนไม่สำเร็จ — ลองรีเฟรชหน้าอีกครั้ง'); return; }
  if (!CFG.PAYROLL_API_URL || CFG.PAYROLL_API_URL.indexOf('PASTE')===0){
    m.innerHTML = viewSoon(ico('wallet')+' จัดการ Payroll','ยังไม่ได้ตั้งค่า PAYROLL_API_URL ใน config.js — ใส่ /exec ของ project payroll ก่อนค่ะ');
    return;
  }
  m.innerHTML = '<div id="payHost"></div>';
  PAY.mount(document.getElementById('payHost'), {
    PAYROLL_API_URL: CFG.PAYROLL_API_URL,
    MOCK:       !!CFG.PAYROLL_MOCK,
    BATCH_SLIP: CFG.PAYROLL_BATCH_SLIP || 5,
    BATCH_SEND: CFG.PAYROLL_BATCH_SEND || 5,
    embedded:   true,
    host: {
      // ดึงสดทุก request — คอนโซลต่ออายุ token ระหว่างใช้งานได้
      getAuth: function(){ return S.auth; },
      onAuthExpired: reauth,
      // ขั้น "ปิดรอบลา & OT" อยู่ในลำดับ payroll แต่ข้อมูลล็อกอยู่ในระบบลา
      // คอนโซลคุยได้ทั้ง 2 backend อยู่แล้ว → ให้โมดูล payroll ยืมช่องทางนี้ไป
      leaveApi: function(action, params){ return api(action, params); },
    },
  });
}

// ════════════ VIEW: HOME (Hub) ════════════
function viewHome(){
  var p = S.profile, b = S.balances;
  var bal = function(k){ var v=b[k]&&b[k].remaining; return v==null?'—':(Number.isInteger(v)?v:v.toFixed(1)); };
  var roleChip = p.canApprove ? '<span class="role-chip">'+ico('star')+' '+esc(p.role)+'</span>' : '';
  var stat = function(cls,icn,num,lb){
    return '<div class="stat '+cls+'"><div class="stat-ic">'+ico(icn)+'</div><div>'+
      '<div class="stat-num">'+num+'</div><div class="stat-lb">'+lb+'</div></div></div>'; };

  var feed = S.recent.length ? S.recent.map(function(x){
    var ic = x.kind==='ot' ? ico('clock') : typeIco(x.title);
    return '<div class="feed-item"><div class="feed-ic '+x.kind+'">'+ic+'</div>'+
      '<div class="feed-main"><div class="feed-title">'+esc(x.title)+'</div>'+
      '<div class="feed-meta">'+esc(x.dateText)+' · '+esc(x.amount)+'</div></div>'+
      statusBadge(x.status)+'</div>';
  }).join('') : '<div class="empty" style="padding:24px"><div class="e-emo">'+ico('leaf','e-ico')+'</div><div class="e-txt">ยังไม่มีกิจกรรม</div></div>';

  return ''+
  '<div class="greet"><div class="greet-hi">สวัสดีค่ะ '+ico('wave')+'</div>'+
    '<div class="greet-name">'+esc(p.name)+'</div>'+
    '<div class="greet-meta"><span class="greet-dept">'+esc(p.dept||'')+'</span>'+roleChip+'</div></div>'+

  '<div class="section-h">ภาพรวมเดือนนี้</div>'+
  '<div class="stat-grid">'+
    stat('vac','sun',bal('vac'),'พักร้อนคงเหลือ')+
    stat('biz','home',bal('biz'),'ลากิจคงเหลือ')+
    stat('sick','thermometer',bal('sick'),'ลาป่วยคงเหลือ')+
    stat('ot','clock',(S.otThisMonth.hours||0),'OT รอบนี้ (ชม.)')+
  '</div>'+

  '<div class="act-row">'+
    '<button class="act-btn primary" data-go="leave">'+
      '<svg viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></svg>ยื่นใบลา</button>'+
    '<button class="act-btn ot" data-go="ot">'+
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12.5" r="8.5"/><path d="M12 8v5l3 2"/></svg>ขอ OT</button>'+
  '</div>'+

  '<button class="hub-link" data-go="documents"><span>'+ico('paperclip')+' เอกสารของฉัน</span><span class="chev">›</span></button>'+
  '<button class="hub-link" data-go="unpaidreq"><span>'+ico('file')+' ขอสิทธิ์ลาไม่รับค่าจ้าง'+
    ((S.unpaidReq&&S.unpaidReq.pending)?' · รอ HR':'')+'</span><span class="chev">›</span></button>'+
  (p.canApprove ? '<button class="hub-link hr" data-go="hr"><span>'+ico('chart')+' แผง HR · ภาพรวม + รออนุมัติ</span><span class="chev">›</span></button>' : '')+
  (p.canAdmin ? '<button class="hub-link admin" data-go="emps"><span>'+ico('users')+' พนักงาน · เพิ่ม + บทบาท + โควต้า</span><span class="chev">›</span></button>' : '')+

  '<div class="card"><div class="card-title"><span class="ic"></span>กิจกรรมล่าสุด</div>'+feed+'</div>';
}
function wireHome(){
  document.querySelectorAll('[data-go]').forEach(function(el){
    el.addEventListener('click', function(){ goTo(el.dataset.go); });
  });
}

// ════════════ VIEW: LEAVE ════════════
function viewLeave(){
  var editing = !!S.editLeaveId;
  var banner = editing
    ? '<div class="edit-banner">'+ico('pencil')+' กำลังแก้ไขใบลา <b>'+esc(S.editLeaveId)+'</b> (HR ส่งกลับให้แก้)'+
      ' <a href="#" id="cancelEdit" class="edit-cancel">ยกเลิก</a></div>'
    : '';
  return banner+'<div class="card">'+
    '<div class="card-title"><span class="ic"></span>ประเภทการลา</div>'+
    '<div id="typeGrid"></div>'+
    '<label class="field-lb">'+ico('calendar')+' เลือกวันที่ลา</label><div id="calLeave"></div>'+
    '<div id="seg" class="seg"></div>'+
    '<div id="lvTime"></div>'+
    '<label class="field-lb">'+ico('pencil')+' เหตุผล (ไม่บังคับ)</label>'+
    '<textarea id="reason" rows="2" placeholder="ระบุเหตุผลโดยย่อ (ถ้ามี)…"></textarea>'+
    '<div id="lvSummary" style="margin-top:16px"></div>'+
    '<div style="margin-top:12px"><button id="btnLeave" class="btn btn-primary">'+(editing?'ส่งการแก้ไข':'ส่งคำขอลา')+'</button></div>'+
  '</div>';
}
function wireLeave(){
  renderTypeGrid(); renderCal('leave'); renderSeg(); renderLvTime(); renderLvSummary();
  document.getElementById('reason').value = S.leaveForm.reason || '';
  document.getElementById('reason').addEventListener('input', function(e){ S.leaveForm.reason = e.target.value; });
  document.getElementById('btnLeave').addEventListener('click', submitLeave);
  var ce = document.getElementById('cancelEdit');
  if (ce) ce.addEventListener('click', function(ev){ ev.preventDefault(); cancelEdit(); });
}
function renderTypeGrid(){
  var lt = S.leaveTypes, keys = ['sick','biz','vac'];   // 3 ประเภทหลัก: ลาป่วย / ลากิจ / ลาพักร้อน (1 บรรทัด)
  // 📄 ลาไม่รับค่าจ้าง (v.76): โชว์เมื่อ HR ให้สิทธิ์มาแล้วเท่านั้น (ขอผ่านหน้า "ขอสิทธิ์ลาไม่รับค่าจ้าง" ก่อน)
  var upLeft = (S.balances && S.balances.unpaid && S.balances.unpaid.grantLeft) || 0;
  if (upLeft > 0 && lt.unpaid) keys = keys.concat(['unpaid']);   // v.77 ดูสิทธิ์ที่ HR อนุมัติไว้ (ไม่มีโควตาแล้ว)
  // โหมดแก้ไข: ถ้าใบเดิมเป็นประเภทอื่น (วันเกิด/คนพิเศษ/ไม่รับค่าจ้าง) ให้โชว์ปุ่มประเภทนั้นด้วย
  if (S.editLeaveId && keys.indexOf(S.leaveForm.type)<0 && lt[S.leaveForm.type]) keys = keys.concat([S.leaveForm.type]);
  var html = keys.map(function(k){
    return '<div class="type-opt'+(S.leaveForm.type===k?' sel':'')+'" data-type="'+k+'">'+
      '<div class="t-emo">'+lt[k].emoji+'</div><div class="t-lb">'+lt[k].name+'</div></div>'; }).join('');
  var g = document.getElementById('typeGrid'); g.className='type-grid'; g.innerHTML=html;
  g.querySelectorAll('.type-opt').forEach(function(el){
    el.addEventListener('click', function(){ S.leaveForm.type=el.dataset.type; renderTypeGrid(); renderLvSummary(); }); });
}
function renderSeg(){
  var f = S.leaveForm, multi = f.start&&f.end&&dkey(f.end)!==dkey(f.start);
  var opts=[['full','เต็มวัน'],['morning','ครึ่งเช้า'],['afternoon','ครึ่งบ่าย'],['hours','ราย ชม.']];
  var s = document.getElementById('seg'); if(!s) return;
  s.innerHTML = opts.map(function(o){
    var dis = multi && o[0]!=='full';
    return '<button class="seg-btn'+(f.period===o[0]?' sel':'')+'"'+(dis?' disabled style="opacity:.4"':'')+' data-p="'+o[0]+'">'+o[1]+'</button>'; }).join('');
  s.querySelectorAll('.seg-btn').forEach(function(el){
    el.addEventListener('click', function(){ if(el.disabled)return; S.leaveForm.period=el.dataset.p; renderSeg(); renderLvTime(); renderLvSummary(); }); });
}
function renderLvTime(){
  var el = document.getElementById('lvTime'); if(!el) return;
  if(S.leaveForm.period!=='hours'){ el.innerHTML=''; return; }
  el.innerHTML='<label class="field-lb">⏰ เวลาที่ลา (วันเดียว · สูงสุด 8 ชม.)</label>'+
    '<div class="time-row"><input type="time" id="lvStart"><span class="dash">→</span><input type="time" id="lvEnd"></div>';
  var s=document.getElementById('lvStart'), e=document.getElementById('lvEnd');
  s.value=S.leaveForm.stime; e.value=S.leaveForm.etime;
  s.addEventListener('input',function(ev){ S.leaveForm.stime=ev.target.value; renderLvSummary(); });
  e.addEventListener('input',function(ev){ S.leaveForm.etime=ev.target.value; renderLvSummary(); });
}
function renderLvSummary(){
  var el = document.getElementById('lvSummary'); if(!el) return;
  var f = S.leaveForm; if(!f.start){ el.innerHTML=''; return; }
  var lt = S.leaveTypes[f.type], days = countLeaveDays(f);
  var per = f.period==='morning'?'ครึ่งเช้า':f.period==='afternoon'?'ครึ่งบ่าย':f.period==='hours'?'ราย ชม.':'เต็มวัน';
  var qty = f.period==='hours'
    ? (otHours(f.stime,f.etime)||0)+' ชม. (≈'+days+' วัน)'
    : days+' วัน';
  var dt = fmtThai(f.start)+(f.end&&dkey(f.end)!==dkey(f.start)?' — '+fmtThai(f.end):'')+
    (f.period==='hours'&&f.stime&&f.etime?'  ⏰ '+f.stime+'-'+f.etime:'');
  el.innerHTML = '<div class="chips">'+
    '<div class="chip"><div class="chip-v">'+lt.emoji+' '+lt.name+'</div><div class="chip-l">ประเภท</div></div>'+
    '<div class="chip"><div class="chip-v">'+qty+'</div><div class="chip-l">จำนวน</div></div>'+
    '<div class="chip"><div class="chip-v">'+per+'</div><div class="chip-l">ช่วงเวลา</div></div></div>'+
    '<div style="text-align:center;color:var(--muted);font-size:13px;margin-top:8px">'+ico('calendar')+' '+dt+'</div>';
}
function submitLeave(){
  var f = S.leaveForm;
  if (!f.start) return toast('กรุณาเลือกวันที่ลา','err');
  if (f.period==='hours'){
    if(!f.stime||!f.etime) return toast('กรุณาใส่เวลาเริ่ม-สิ้นสุด','err');
    var h=otHours(f.stime,f.etime);
    if(h<=0) return toast('เวลาเริ่ม-สิ้นสุดต้องไม่เท่ากัน','err');
    if(h>8) return toast('ลารายชั่วโมงเกิน 8 ชม. — เลือกเต็มวันแทนค่ะ','err');
  }
  // สรุปยืนยันก่อนส่ง
  var lt=S.leaveTypes[f.type], days=countLeaveDays(f);
 if (f.period!=='hours' && days<=0) return toast('ช่วงที่เลือกเป็นวันหยุดทั้งหมด เลือกวันทำงานนะคะ ','err');
  var per=f.period==='morning'?'ครึ่งเช้า':f.period==='afternoon'?'ครึ่งบ่าย':f.period==='hours'?'ราย ชม.':'เต็มวัน';
  var qty=f.period==='hours'?(otHours(f.stime,f.etime)||0)+' ชม. (≈'+days+' วัน)':days+' วัน';
  var dt=fmtThai(f.start)+(f.end&&dkey(f.end)!==dkey(f.start)?' — '+fmtThai(f.end):'')+
    (f.period==='hours'&&f.stime&&f.etime?' · '+f.stime+'-'+f.etime:'');
  confirmModal({ title:S.editLeaveId?'ยืนยันการแก้ไขใบลา':'ยืนยันการยื่นลา', emoji:ico('clipboard'), accent:'leave', onConfirm:doSubmitLeave, rows:[
    {k:'ประเภท', v:lt.emoji+' '+lt.name},
    {k:'วันที่',  v:dt},
    {k:'ช่วงเวลา',v:per},
    {k:'จำนวน',   v:qty},
    {k:'เหตุผล',  v:f.reason||'—'}
  ]});
}
function doSubmitLeave(){
  var f = S.leaveForm, editing = !!S.editLeaveId;
  var resetLabel = editing ? 'ส่งการแก้ไข' : 'ส่งคำขอลา';
  var btn = document.getElementById('btnLeave'); if(btn){ btn.disabled=true; btn.textContent='กำลังส่ง…'; }
  var action = editing ? 'submitLeaveEdit' : 'submit';
  var params = {type:f.type,startDate:fmtThai(f.start),endDate:fmtThai(f.end||f.start),period:f.period,reason:f.reason||'',startTime:f.stime,endTime:f.etime};
  if (editing) params.leaveId = S.editLeaveId;
  api(action, params)
  .then(function(r){
    if(!r.ok){ if(btn){btn.disabled=false;btn.textContent=resetLabel;} return toast(r.error||'ส่งไม่สำเร็จ','err'); }
 toast(editing ? ('แก้ไขส่งใหม่แล้ว · '+r.leaveId) : ('ส่งใบลาแล้ว · '+r.leaveId),'ok');
    S.editLeaveId=null;
    S.leaveForm={type:'vac',start:null,end:null,period:'full',reason:'',stime:'',etime:''};
    refresh(); setTimeout(function(){ S.histTab='leave'; goTo('history'); },1100);
  }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent=resetLabel;} toast(String(e.message||e),'err'); });
}

// ─── โหมดแก้ไขใบลาที่ HR ส่งกลับ ───
function parseThaiStr(s){ var p=String(s||'').split('/'); if(p.length<3) return null; var d=+p[0],m=+p[1],y=+p[2]; if(y>2500)y-=543; var dt=new Date(y,m-1,d); return isNaN(dt.getTime())?null:dt; }
function inferPeriod(it){ var t=String(it.timeDisplay||''); if(t.indexOf('เช้า')>=0)return'morning'; if(t.indexOf('บ่าย')>=0)return'afternoon'; if(t.indexOf('ชม.')>=0 && (Number(it.days)||0)<1)return'hours'; return'full'; }
function isReturnEdit(st){ st=String(st||''); return st.indexOf('แก้ไข')>=0 || st.indexOf('ส่งกลับ')>=0; }
function enterEditByLeaveId(lid){
  api('history',{}).then(function(r){
    if(!r.ok||!r.history) return;
    var it = r.history.filter(function(h){ return h.leaveId===lid; })[0];
    if(!it) return toast('ไม่พบใบลา '+lid,'err');
    if(!isReturnEdit(it.status)) return toast('ใบ '+lid+' ไม่อยู่ในสถานะให้แก้ไข','err');
    startEditLeave(it);
  }).catch(function(){});
}
function startEditLeave(it){
  S.editLeaveId = it.leaveId;
  var sd = parseThaiStr(it.startDate);
  S.leaveForm = { type: it.typeKey||'vac', start: sd, end: parseThaiStr(it.endDate),
                  period: inferPeriod(it), reason:'', stime:'', etime:'' };
  if (sd) S.calLeave = new Date(sd.getFullYear(), sd.getMonth(), 1);   // ปฏิทินเด้งไปเดือนวันลาเดิม
  S.pendingEdit = null;
  goTo('leave');
}
function cancelEdit(){
  S.editLeaveId=null;
  S.leaveForm={type:'vac',start:null,end:null,period:'full',reason:'',stime:'',etime:''};
  goTo('history');
}

// ════════════ VIEW: OT ════════════
function viewOt(){
  var editing = !!S.editOtId;
  var banner = editing
    ? '<div class="edit-banner">'+ico('pencil')+' กำลังแก้ไข OT <b>'+esc(S.editOtId)+'</b> (HR ส่งกลับให้แก้)'+
      ' <a href="#" id="cancelEditOt" class="edit-cancel">ยกเลิก</a></div>'
    : '';
  return banner+'<div class="card">'+
    '<div class="card-title ot"><span class="ic"></span>ประเภท OT</div>'+
    '<div id="otTypeGrid"></div>'+
    '<label class="field-lb">'+ico('calendar')+' วันที่ทำ OT <span style="font-weight:400">(ย้อนหลังได้ ≤30 วัน)</span></label>'+
    '<div id="calOt"></div>'+
    '<label class="field-lb">⏰ เวลาทำงาน</label>'+
    '<div class="time-row"><input type="time" id="otStart"><span class="dash">→</span><input type="time" id="otEnd"></div>'+
    '<label class="field-lb">'+ico('pencil')+' เหตุผล / รายละเอียด</label>'+
    '<textarea id="otReason" rows="2" placeholder="ระบุรายละเอียดงาน (ถ้ามี)…"></textarea>'+
    '<div id="otSummary" style="margin-top:16px"></div>'+
    '<div style="margin-top:12px"><button id="btnOt" class="btn btn-ot">'+(editing?'บันทึกการแก้ไข OT':'ส่งคำขอ OT')+'</button></div>'+
  '</div>';
}
function wireOt(){
  renderOtTypeGrid(); renderCal('ot'); renderOtSummary();
  document.getElementById('otStart').value = S.otForm.start;
  document.getElementById('otEnd').value = S.otForm.end;
  document.getElementById('otStart').addEventListener('input', function(e){ S.otForm.start=e.target.value; renderOtSummary(); });
  document.getElementById('otEnd').addEventListener('input', function(e){ S.otForm.end=e.target.value; renderOtSummary(); });
  document.getElementById('otReason').value = S.otForm.reason || '';
  document.getElementById('otReason').addEventListener('input', function(e){ S.otForm.reason=e.target.value; });
  document.getElementById('btnOt').addEventListener('click', submitOt);
  var ce = document.getElementById('cancelEditOt');
  if (ce) ce.addEventListener('click', function(ev){ ev.preventDefault(); cancelEditOt(); });
}
function renderOtTypeGrid(){
  var t = S.otTypes; var keys = Object.keys(t);
  var html = keys.map(function(k){
    return '<div class="type-opt ot'+(S.otForm.type===k?' sel ot':'')+'" data-ot="'+k+'">'+
      '<div class="t-emo">'+otEmoji(k)+'</div><div class="t-lb">'+esc(t[k])+'</div></div>'; }).join('');
  var g = document.getElementById('otTypeGrid'); g.className='type-grid'; g.innerHTML=html;
  g.querySelectorAll('.type-opt').forEach(function(el){
    el.addEventListener('click', function(){ S.otForm.type=el.dataset.ot; renderOtTypeGrid(); renderOtSummary(); }); });
}
function otEmoji(k){ return {'1':ico('sparkle'),'2':ico('inbox'),'3':ico('users'),'4':ico('sparkle')}[k] || '⏰'; }
function renderOtSummary(){
  var el = document.getElementById('otSummary'); if(!el) return;
  var f = S.otForm;
  var hrs = otHours(f.start, f.end);
  if (!f.date && !(f.start&&f.end)) { el.innerHTML=''; return; }
  var dt = f.date ? fmtThai(f.date) : '—';
  var tm = (f.start&&f.end) ? (f.start+' → '+f.end) : '—';
  el.innerHTML = '<div class="chips">'+
    '<div class="chip"><div class="chip-v">'+dt+'</div><div class="chip-l">วันที่</div></div>'+
    '<div class="chip"><div class="chip-v">'+tm+'</div><div class="chip-l">เวลา</div></div>'+
    '<div class="chip"><div class="chip-v">'+(hrs>0?hrs+' ชม.':'—')+'</div><div class="chip-l">รวม</div></div></div>'+
    (otHours(f.start,f.end)>0 && endBeforeStart(f.start,f.end) ? '<div style="text-align:center;color:var(--ot);font-size:12px;margin-top:8px">'+ico('moon')+' ข้ามเที่ยงคืน</div>':'');
}
function submitOt(){
  var f = S.otForm, editing = !!S.editOtId;
  if (!f.date) return toast('กรุณาเลือกวันที่ทำ OT','err');
  if (!f.start || !f.end) return toast('กรุณาใส่เวลาเริ่ม-สิ้นสุด','err');
  if (otHours(f.start,f.end)<=0) return toast('เวลาเริ่ม-สิ้นสุดต้องไม่เท่ากัน','err');
  var hrs=otHours(f.start,f.end);
  confirmModal({ title:editing?'ยืนยันการแก้ไข OT':'ยืนยันการขอ OT', emoji:'⏰', accent:'ot', onConfirm:doSubmitOt, rows:[
    {k:'ประเภท', v:S.otTypes[f.type]||'-'},
    {k:'วันที่',  v:fmtThai(f.date)},
 {k:'เวลา', v:f.start+' → '+f.end+(endBeforeStart(f.start,f.end)?' ':'')},
    {k:'รวม',     v:hrs+' ชม.'},
    {k:'เหตุผล',  v:f.reason||'—'}
  ]});
}
function doSubmitOt(){
  var f = S.otForm, editing = !!S.editOtId;
  var defLabel = editing ? 'บันทึกการแก้ไข OT' : 'ส่งคำขอ OT';
  var btn = document.getElementById('btnOt'); if(btn){ btn.disabled=true; btn.textContent='กำลังส่ง…'; }
  var action = editing ? 'submitOtEdit' : 'otSubmit';
  var params = {otDate:fmtThai(f.date),startTime:f.start,endTime:f.end,otType:f.type,reason:f.reason||''};
  if (editing) params.otId = S.editOtId;
  api(action, params).then(function(r){
    if(!r.ok){ if(btn){btn.disabled=false;btn.textContent=defLabel;} return toast(r.error||'ส่งไม่สำเร็จ','err'); }
 toast((editing?' บันทึกการแก้ไข OT แล้ว · ':' ส่งคำขอ OT แล้ว · ')+r.hours+' ชม.','ok');
    if(r.warn) noticeBox('ยื่น OT แล้ว — แต่มีเรื่องต้องทำต่อ', r.warn);
    S.editOtId=null;
    S.otForm={date:null,start:'',end:'',type:'1',reason:''};
    refresh(); setTimeout(function(){ S.histTab='ot'; goTo('history'); },1100);
  }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent=defLabel;} toast(String(e.message||e),'err'); });
}
// แก้ไข OT ที่ HR ส่งกลับ — prefill ฟอร์ม OT จากใบเดิม
function startEditOt(it){
  S.editOtId = it.otId;
  var d = parseThaiStr(it.otDate);
  S.otForm = { date:d, start: it.startTime||'', end: it.endTime||'', type: it.otTypeKey||'1', reason: it.reason||'' };
  if (d) S.calOt = new Date(d.getFullYear(), d.getMonth(), 1);
  S.pendingEdit = null;
  goTo('ot');
}
function cancelEditOt(){
  S.editOtId=null;
  S.otForm={date:null,start:'',end:'',type:'1',reason:''};
  goTo('history');
}
// เปิดหน้าแก้ไขตามรหัส — แยก OT-xxx / LV-xxx
function enterEditById(id){
  if (String(id).indexOf('OT-')===0){
    api('otHistory',{}).then(function(r){
      if(!r.ok||!r.history) return;
      var it = r.history.filter(function(h){ return h.otId===id; })[0];
      if(!it) return toast('ไม่พบ OT '+id,'err');
      if(!isReturnEdit(it.status)) return toast('OT '+id+' ไม่อยู่ในสถานะให้แก้ไข','err');
      startEditOt(it);
    }).catch(function(){});
  } else {
    enterEditByLeaveId(id);
  }
}

// ════════════ CALENDAR (shared) ════════════
function renderCal(mode){
  var isOt = mode==='ot';
  var cv = isOt ? S.calOt : S.calLeave;
  var form = isOt ? S.otForm : S.leaveForm;
  var y = cv.getFullYear(), mo = cv.getMonth();
  var first = new Date(y,mo,1).getDay(), days = new Date(y,mo+1,0).getDate();
  var todayK = dkey(new Date());
  var today = new Date(); today.setHours(0,0,0,0);
  var minD = null;
  if (isOt) { minD = new Date(today); minD.setDate(minD.getDate()-30); }

  // วันหยุดประจำกะของผู้ใช้ (จากชีต) — ไม่มีกะ → fallback เสาร์-อาทิตย์
  var offSet = (S.schedule && S.schedule.off && S.schedule.off.length) ? S.schedule.off : [0,6];

  var h = '<div class="cal-head"><button class="cal-nav" id="cP">‹</button>'+
    '<div class="cal-month">'+TH_MONTHS[mo]+' '+(y+543)+'</div>'+
    '<button class="cal-nav" id="cN">›</button></div><div class="cal-grid">';
  TH_DOW.forEach(function(d,i){ h += '<div class="cal-dow'+(i===0||i===6?' we':'')+'">'+d+'</div>'; });
  for (var i=0;i<first;i++) h += '<div class="cal-day empty"></div>';
  for (var d=1;d<=days;d++){
    var dt = new Date(y,mo,d), k = dkey(dt), dow = dt.getDay();
    var dim = isOt && (dt>today || (minD && dt<minD));
    var hn = holidayName(dt);
    var cls = 'cal-day';
    if (offSet.indexOf(dow)>=0) cls+=' we';     // วันหยุดประจำกะ (รายคน)
    if (hn) cls+=' holiday';                      // วันหยุดบริษัท (ทับสีกะ)
    if (k===todayK) cls+=' today';
    if (dim) cls+=' dim';
    if (isOt){ if(form.date && k===dkey(form.date)) cls+=' sel ot'; }
    else {
      if (form.start && k===dkey(form.start)) cls+=' sel';
      if (form.end && k===dkey(form.end)) cls+=' sel';
      if (form.start && form.end && dt>form.start && dt<form.end) cls+=' inrange';
    }
    var tip = hn ? ' title="'+esc(hn)+'"' : '';
    h += '<div class="'+cls+'"'+tip+(dim?'':' data-d="'+d+'"')+'>'+d+'</div>';
  }
  h += '</div>';
  h += buildCalLegend(y,mo);
  var c = document.getElementById(isOt?'calOt':'calLeave'); c.innerHTML = h;
  document.getElementById('cP').addEventListener('click', function(){ var nv=new Date(y,mo-1,1); if(isOt)S.calOt=nv; else S.calLeave=nv; renderCal(mode); });
  document.getElementById('cN').addEventListener('click', function(){ var nv=new Date(y,mo+1,1); if(isOt)S.calOt=nv; else S.calLeave=nv; renderCal(mode); });
  c.querySelectorAll('.cal-day[data-d]').forEach(function(el){
    el.addEventListener('click', function(){ isOt ? pickOt(new Date(y,mo,+el.dataset.d)) : pickLeave(new Date(y,mo,+el.dataset.d)); }); });
}
function pickLeave(dt){
  var f = S.leaveForm;
  if (!f.start || (f.start&&f.end)) { f.start=dt; f.end=null; }
  else if (dt<f.start) { f.start=dt; f.end=null; }
  else f.end=dt;
  if (f.end && dkey(f.end)!==dkey(f.start)) f.period='full';
  renderCal('leave'); renderSeg(); renderLvTime(); renderLvSummary();
}
function pickOt(dt){ S.otForm.date = dt; renderCal('ot'); renderOtSummary(); }

// ════════════ VIEW: HISTORY (tabbed) ════════════
function viewHistory(){
  return '<div class="htabs">'+
    '<button class="htab'+(S.histTab==='leave'?' sel':'')+'" data-h="leave">'+ico('clipboard')+' การลา</button>'+
    '<button class="htab'+(S.histTab==='ot'?' sel ot':'')+'" data-h="ot">⏰ OT</button></div>'+
    '<div id="histBody"><div class="card"><div class="skel" style="height:64px"></div></div></div>';
}
function wireHistory(){
  document.querySelectorAll('.htab').forEach(function(el){
    el.addEventListener('click', function(){ S.histTab=el.dataset.h; render(); }); });
  S.histTab==='ot' ? loadOtHistory() : loadLeaveHistory();
}
// สรุปประวัติลาฝั่ง client (fallback ถ้า backend ไม่ส่ง summary มา เช่นโหมด mock)
// เช็คสถานะด้วยลำดับเดียวกับ statusBadge — "รอ" ก่อน "อนุมัติ" (กัน substring trap)
function lvSummary(history){
  var s={total:0,approved:0,pending:0,rejected:0,approvedDays:0,byType:[]}, byT={};
  (history||[]).forEach(function(h){
    s.total++;
    var st=String(h.status||'');
    if(st.indexOf('แก้ไข')>=0||st.indexOf('ส่งกลับ')>=0||st.indexOf('รอ')>=0){ s.pending++; }
    else if(st.indexOf('ไม่อนุมัติ')>=0){ s.rejected++; }
    else if(st.indexOf('อนุมัติ')>=0){ s.approved++; var d=Number(h.days)||0; s.approvedDays+=d;
      var t=String(h.type||'').trim(); if(t&&d>0) byT[t]=(byT[t]||0)+d; }
    else { s.pending++; }
  });
  s.approvedDays=Math.round(s.approvedDays*100)/100;
  s.byType=Object.keys(byT).map(function(t){ return {type:t,emoji:typeIco(t),days:Math.round(byT[t]*100)/100}; })
    .sort(function(a,b){ return b.days-a.days; });
  return s;
}
function num(n){ return n%1===0?String(n):n.toFixed(2).replace(/0$/,''); }
function lvSummaryCard(sm){
  if(!sm||!sm.total) return '';
  var types = sm.byType.length
    ? '<div class="lv-sum-types">'+sm.byType.map(function(b){
        return '<span>'+b.emoji+' '+esc(b.type.replace(/^ลา/,''))+' <b>'+num(b.days)+'</b></span>'; }).join('')+'</div>'
    : '';
  return '<div class="card lv-sum">'+
    '<div class="lv-sum-row">'+
      '<div class="lv-sum-cell ok"><b>'+sm.approved+'</b><span>อนุมัติ</span></div>'+
      '<div class="lv-sum-cell wait"><b>'+sm.pending+'</b><span>รอ</span></div>'+
      '<div class="lv-sum-cell no"><b>'+sm.rejected+'</b><span>ไม่อนุมัติ</span></div>'+
    '</div>'+
    '<div class="lv-sum-days">'+ico('calendar')+' รวมวันลาที่อนุมัติ <b>'+num(sm.approvedDays)+'</b> วัน</div>'+
    types+'</div>';
}
function loadLeaveHistory(){
  api('history',{}).then(function(r){
    var body = document.getElementById('histBody'); if(!body) return;
    if(!r.ok) return body.innerHTML = emptyBox(ico('alert'), r.error||'โหลดไม่ได้');
    if(!r.history.length) return body.innerHTML = emptyBox(ico('leaf'),'ยังไม่มีประวัติการลา');
    var sumCard = lvSummaryCard(r.summary || lvSummary(r.history));
    body.innerHTML = sumCard + '<div class="card">'+r.history.map(function(h){
      var dt = h.startDate+(h.endDate&&h.endDate!==h.startDate?' — '+h.endDate:'');
      var editBtn = isReturnEdit(h.status)
        ? '<button class="hist-edit" data-edit="'+esc(h.leaveId)+'">'+ico('pencil')+' แก้ไขแล้วส่งใหม่</button>' : '';
      return '<div class="hist"><div class="hist-ic">'+typeIco(h.type)+'</div>'+
        '<div class="hist-main"><div class="hist-type">'+esc(h.type)+'</div>'+
        '<div class="hist-meta"><span>'+ico('calendar')+' '+dt+'</span><span>·</span><span>'+ico('hourglass')+' '+h.days+' วัน</span></div>'+editBtn+'</div>'+
        statusBadge(h.status)+'</div>'; }).join('')+'</div>';
    body.querySelectorAll('.hist-edit').forEach(function(b){
      b.addEventListener('click', function(){ enterEditByLeaveId(b.dataset.edit); }); });
  }).catch(function(e){ var b=document.getElementById('histBody'); if(b) b.innerHTML=emptyBox(ico('alert','e-ico'),String(e.message||e)); });
}
function loadOtHistory(){
  api('otHistory',{}).then(function(r){
    var body = document.getElementById('histBody'); if(!body) return;
    if(!r.ok) return body.innerHTML = emptyBox(ico('alert'), r.error||'โหลดไม่ได้');
    if(!r.history.length) return body.innerHTML = emptyBox(ico('leaf'),'ยังไม่มีประวัติ OT');
    body.innerHTML = '<div class="card">'+r.history.map(function(o){
      var editBtn = isReturnEdit(o.status)
        ? '<button class="hist-edit" data-edit="'+esc(o.otId)+'">'+ico('pencil')+' แก้ไขแล้วส่งใหม่</button>' : '';
      return '<div class="hist"><div class="hist-ic">'+ico('clock')+'</div>'+
        '<div class="hist-main"><div class="hist-type">'+esc(o.otType||'OT')+'</div>'+
        '<div class="hist-meta"><span>'+ico('calendar')+' '+esc(o.otDate)+'</span><span>·</span>'+
        '<span>'+ico('clock')+' '+esc(o.startTime)+'–'+esc(o.endTime)+'</span><span>·</span><span>'+o.hours+' ชม.</span></div>'+editBtn+'</div>'+
        statusBadge(o.status)+'</div>'; }).join('')+'</div>';
    body.querySelectorAll('.hist-edit').forEach(function(b){
      b.addEventListener('click', function(){ enterEditById(b.dataset.edit); }); });
  }).catch(function(e){ var b=document.getElementById('histBody'); if(b) b.innerHTML=emptyBox(ico('alert','e-ico'),String(e.message||e)); });
}

// ════════════ VIEW: PROFILE ════════════
function viewProfile(){
  var p = S.profile, b = S.balances;
  var bal = function(k){ var v=b[k]&&b[k].remaining; return v==null?'—':(Number.isInteger(v)?v:v.toFixed(1)); };
  var roleChip = p.canApprove ? '<span class="role-chip">⭐ '+esc(p.role)+'</span>' : esc(p.role||'EMPLOYEE');
  return ''+
  '<div class="pf-head"><div class="pf-ava">'+(S.avatar?'<img src="'+S.avatar+'">':ico('user'))+
      '<button class="ava-edit" data-myphoto title="เปลี่ยนรูป">'+ico('camera')+'</button></div>'+
    '<div><div class="pf-hname">'+esc(p.name)+'</div><div class="pf-hdept">'+esc(p.dept||'')+'</div></div></div>'+

  '<div class="card"><div class="card-title"><span class="ic"></span>วันลาคงเหลือ</div>'+
    '<div class="pf-stat">'+
      '<div class="pf-box a"><div class="pf-num">'+bal('vac')+'</div><div class="pf-lb">พักร้อน</div></div>'+
      '<div class="pf-box b"><div class="pf-num">'+bal('biz')+'</div><div class="pf-lb">ลากิจ</div></div>'+
      '<div class="pf-box c"><div class="pf-num">'+bal('sick')+'</div><div class="pf-lb">ลาป่วย</div></div></div>'+
    pfUsedRows()+'</div>'+

  '<div class="card"><div class="card-title"><span class="ic"></span>ข้อมูลส่วนตัว</div>'+
    pfRow('ชื่อ-นามสกุล',p.name)+pfRow('รหัสพนักงาน',p.empId||'—')+pfRow('แผนก',p.dept||'—')+
    '<div class="pf-row"><span class="k">สิทธิ์การใช้งาน</span><span class="v">'+roleChip+'</span></div>'+
    '<div class="pf-row"><span class="k">OT รอบนี้</span><span class="v">'+(S.otThisMonth.hours||0)+' ชม. · '+(S.otThisMonth.count||0)+' รายการ'+(S.otThisMonth.period?' <span style="color:var(--muted);font-size:12px">('+S.otThisMonth.period+')</span>':'')+'</span></div></div>'+

  '<div class="card"><div style="display:flex;gap:10px;align-items:center;color:var(--muted);font-size:13px">'+
    '<span style="font-size:20px">'+ico('building')+'</span><div>The Elf · ระบบลา & OT<br>เชื่อมต่อ Google Sheets เดิม · อนุมัติผ่าน LINE ของ HR</div></div></div>';
}
function pfRow(k,v){ return '<div class="pf-row"><span class="k">'+esc(k)+'</span><span class="v">'+escIco(v)+'</span></div>'; }
// ใช้ไปแล้วปีนี้ — โชว์ทุกประเภทที่ "เคยใช้ หรือ มีสิทธิ์" (v.77)
// เดิมหน้าโปรไฟล์มีแค่ 3 กล่อง พักร้อน/กิจ/ป่วย → คนที่ลาไม่รับค่าจ้าง/วันเกิด ไม่เห็นตัวเลขตัวเองเลย
function pfUsedRows(){
  var b=S.balances||{}, order=['sick','biz','vac','unpaid','bday','special'];
  var num=function(v){ return v==null?'—':(Number.isInteger(v)?v:Number(v).toFixed(2).replace(/0+$/,'').replace(/\.$/,'')); };
  var rows=order.filter(function(k){
    var x=b[k]; if(!x) return false;
    return (Number(x.used)>0) || (Number(x.quota)>0);
  }).map(function(k){
    var x=b[k], q=Number(x.quota)||0, u=Number(x.used)||0;
    var over=(k!=='unpaid') && (x.remaining!=null && Number(x.remaining)<0);   // unpaid ติดลบเป็นปกติ ไม่ใช่ "เกินสิทธิ์"
    return '<div class="pf-row"><span class="k">'+(x.emoji||'')+' '+esc(x.name)+'</span>'+
      '<span class="v"'+(over?' style="color:var(--red-deep);font-weight:700"':'')+'>ใช้ '+num(u)+
      (q>0?' / '+num(q):'')+' วัน'+(over?' '+ico('alert')+' เกินสิทธิ์':'')+'</span></div>';
  }).join('');
  return rows ? '<div class="pf-used"><div class="pf-used-t">ใช้ไปแล้วปีนี้</div>'+rows+'</div>' : '';
}

// ════════════ VIEW: PAYSLIP ════════════
function loadPayslip(){
  api('payslip',{}).then(function(r){
    var m = document.getElementById('main'); if(!m) return;
    if(!r.ok) return m.innerHTML = emptyBox(r.needLink?ico('link'):ico('alert'), r.error||'โหลดสลิปไม่ได้');
    if(!r.slips || !r.slips.length) return m.innerHTML = emptyBox(ico('receipt'),'ยังไม่มีสลิปเงินเดือน');
    m.innerHTML = renderPayslip(r); wirePayslip();
  }).catch(function(e){ var m=document.getElementById('main'); if(m) m.innerHTML=emptyBox(ico('alert','e-ico'),String(e.message||e)); });
}
function renderPayslip(r){
  var s = r.latest;
  var pdfBtn = s.slipUrl ? '<button class="slip-pdf" data-slip="'+s.month+'-'+s.yearBE+'">'+ico('file')+' เปิดสลิป PDF</button>' : '';
  var hero = '<div class="slip-hero">'+
    '<div class="slip-mo">'+esc(s.label)+'</div>'+
    '<div class="slip-net">'+baht(s.net)+'</div>'+
    '<div class="slip-cap">รายได้สุทธิ</div>'+pdfBtn+'</div>';

  // รายรับ/รายการหักแยกช่อง — โชว์เฉพาะช่องที่มียอด (ไม่งั้นรกด้วยเลข 0)
  // ต้องครบทุกช่อง ไม่งั้นยอด "รวมรายการหัก" ไม่ตรงกับรายการที่โชว์
  // (เคสจริง 27 ส.ค. 69: กยศ. 902 ไม่โชว์ พนักงานเห็นหัก 1,777 แต่มีแค่ ปกส. 875)
  var INCOME_ROWS = [
    ['เงินเดือน', 'salary'], ['OT', 'ot'], ['ค่าประจำตำแหน่ง', 'posAllow'],
    ['Incentive', 'incentive'], ['ค่าน้ำ-ไฟ', 'utility'], ['เบี้ยขยัน', 'attendance'],
    ['ค่าตกเบิก', 'backpay'], ['รายรับอื่นๆ', 'incomeOther'],
  ];
  var DEDUCT_ROWS = [
    ['ประกันสังคม', 'sso'], ['ภาษีหัก ณ ที่จ่าย', 'tax'], ['หัก กยศ.', 'studentLoan'],
    ['หักอื่นๆ', 'otherDed'], ['หักค่าเสียหาย', 'damage'], ['ประกันการทำงาน', 'insurance'],
  ];
  var subRows = function (rows, sign) {
    return rows.map(function (f) {
      var v = Number(s[f[1]] || 0);
      if (!v) return '';
      return slipRow('   • ' + f[0], (sign || '') + baht(v), 'sub');
    }).join('');
  };

  var breakdown = '<div class="card"><div class="card-title"><span class="ic"></span>รายละเอียด</div>'+
    slipRow('รวมรายรับ', baht(s.income), '') +
    subRows(INCOME_ROWS, '') +
    slipRow('รวมรายการหัก', '−'+baht(s.deduct), 'ded') +
    subRows(DEDUCT_ROWS, '−') +
    '<div class="slip-row total"><span>รายได้สุทธิ</span><span>'+baht(s.net)+'</span></div></div>';

  var ytd = '<div class="card"><div class="card-title"><span class="ic"></span>สะสมทั้งปี (YTD)</div>'+
    '<div class="chips">'+
      '<div class="chip"><div class="chip-v">'+baht0(s.ytdInc)+'</div><div class="chip-l">รายได้สะสม</div></div>'+
      '<div class="chip"><div class="chip-v">'+baht0(s.ytdTax)+'</div><div class="chip-l">ภาษีสะสม</div></div>'+
      '<div class="chip"><div class="chip-v">'+baht0(s.ytdSso)+'</div><div class="chip-l">ปกส.สะสม</div></div>'+
    '</div></div>';

  var hist = '';
  if (r.slips.length > 1) {
    hist = '<div class="card"><div class="card-title"><span class="ic"></span>สลิปย้อนหลัง</div>'+
      r.slips.map(function(x){
        var lnk = x.slipUrl ? '<button class="slip-mini" data-slip="'+x.month+'-'+x.yearBE+'">'+ico('file')+'</button>' : '';
        return '<div class="hist"><div class="hist-ic">'+ico('receipt')+'</div><div class="hist-main">'+
          '<div class="hist-type">'+esc(x.label)+'</div>'+
          '<div class="hist-meta">สุทธิ '+baht(x.net)+'</div></div>'+lnk+'</div>'; }).join('')+'</div>';
  }
  return hero + breakdown + ytd + hist;
}
function slipRow(k,v,cls){ return '<div class="slip-row '+(cls||'')+'"><span>'+esc(k)+'</span><span>'+v+'</span></div>'; }
function wirePayslip(){ wireFiles(); }
function wireFiles(){
  document.querySelectorAll('[data-slip]').forEach(function(el){
    el.addEventListener('click', function(){ var pp=el.dataset.slip.split('-'); openSlipFile(pp[0],pp[1]); }); });
  document.querySelectorAll('[data-doc]').forEach(function(el){
    el.addEventListener('click', function(){ openDocFile(el.dataset.doc); }); });
}
function openUrl(u){
  if (window.liff && liff.openWindow) { try { liff.openWindow({url:u, external:true}); return; } catch(e){} }
  window.open(u, '_blank');
}

// ── File proxy viewer (เปิดไฟล์ในแอป · ไม่ต้องแชร์ Drive) ──
function openSlipFile(month, yearBE){
  // ปุ่ม "เปิดเต็มจอ" → ขอลิงก์แชร์ชั่วคราว เปิด Safari/Chrome (ซูม/โหลดได้บน iOS)
  fetchFile('slipFile', {month:month, yearBE:yearBE}, function(){
    openViaShareLink('slipShareLink', {month:month, yearBE:yearBE});
  });
}
function openDocFile(url){ fetchFile('docFile', {url:url}); }
function fetchFile(action, params, externalFn){
  if (CFG.MOCK){ toast('โหมดพรีวิว — ต่อข้อมูลจริงถึงเปิดไฟล์ได้ค่ะ'); return; }
  showViewer('loading');
  api(action, params).then(function(r){
    if(!r.ok){
      if(r.openDirect && r.url){ closeViewer(); return openUrl(r.url); }
      closeViewer(); return toast(r.error||'เปิดไฟล์ไม่ได้','err');
    }
    var blob = b64toBlob(r.b64, r.mime||'application/pdf');
    showViewer('file', URL.createObjectURL(blob), r.name, r.mime, externalFn);
  }).catch(function(e){ closeViewer(); toast(String(e.message||e),'err'); });
}
// เปิดไฟล์ผ่านลิงก์แชร์ชั่วคราว → เบราว์เซอร์ภายนอก (Safari/Chrome) ซูม/โหลดได้บนมือถือ
function openViaShareLink(action, params){
  toast('กำลังเปิดในเบราว์เซอร์…');
  api(action, params).then(function(r){
    if(!r.ok || !r.url) return toast(r.error||'เปิดไม่ได้','err');
    closeViewer();
    openUrl(r.url);   // liff.openWindow external → ออกไป Safari/Chrome
  }).catch(function(e){ toast(String(e.message||e),'err'); });
}
function b64toBlob(b64, mime){
  var bin=atob(b64), len=bin.length, arr=new Uint8Array(len);
  for(var i=0;i<len;i++) arr[i]=bin.charCodeAt(i);
  return new Blob([arr], {type:mime});
}
function showViewer(state, url, name, mime, externalFn){
  var v=document.getElementById('viewer');
  if(!v){ v=document.createElement('div'); v.id='viewer'; v.className='viewer'; document.body.appendChild(v); }
  if(state==='loading'){
    v.innerHTML='<div class="vw-box"><div class="vw-load">⏳ กำลังเปิดไฟล์…</div></div>';
    v.classList.add('show'); return;
  }
  var isImg = /^image\//i.test(mime||'');
  // รูป → <img> พอดีจอ (แตะเพื่อซูมเต็มขนาด) · PDF/อื่น → iframe (preview)
  var content = isImg
    ? '<div class="vw-imgwrap"><img class="vw-img" src="'+url+'" alt="เอกสาร"></div>'
    : '<iframe class="vw-frame" src="'+url+'"></iframe>';
  var hint = isImg ? '' : '<div class="vw-hint">'+ico('file')+' ซูม/บันทึกไม่ได้ในนี้ → แตะปุ่มด้านล่าง เปิดในเบราว์เซอร์</div>';
  // ปุ่มเดียว: สลิป (มี externalFn) → เปิดเบราว์เซอร์ภายนอก · เอกสารอื่น → ดาวน์โหลด blob
  var actBtn = externalFn
    ? '<button class="vw-btn open" data-act="ext">⬇️ ดาวน์โหลด / เปิดเต็มจอ</button>'
    : '<button class="vw-btn open" data-act="dl">⬇️ ดาวน์โหลด</button>';
  v.innerHTML='<div class="vw-box"><div class="vw-bar"><span class="vw-name">'+esc(name||'เอกสาร')+'</span>'+
    '<button class="vw-x" data-vwclose>✕</button></div>'+
    content+ hint +
    '<div class="vw-actions one">'+ actBtn +'</div></div>';
  v.classList.add('show');
  v.querySelector('[data-vwclose]').addEventListener('click', closeViewer);
  var ab=v.querySelector('[data-act]');
  if(ab) ab.addEventListener('click', function(){
    if (ab.dataset.act==='ext' && externalFn) externalFn(); else downloadBlobUrl(url, name);
  });
  if(isImg){
    var img=v.querySelector('.vw-img');
    if(img) img.addEventListener('click', function(){ img.classList.toggle('zoom'); });
  }
}
// เปิดไฟล์ด้วยตัวอ่านของระบบ (ซูม/บันทึกได้ — เหมาะ iOS/LINE webview ที่ iframe ซูมไม่ได้)
function openFileExternal(url){
  try { var w = window.open(url, '_blank'); if (w) return; } catch(e){}
  downloadBlobUrl(url, 'document');   // fallback ถ้าเปิดแท็บใหม่ไม่ได้
}
// ดาวน์โหลดจริง (programmatic click — เชื่อถือได้กว่า <a download> เฉยๆ บนมือถือ)
function downloadBlobUrl(url, name){
  var a=document.createElement('a');
  a.href=url; a.download=name||'document.pdf'; a.target='_blank';
  document.body.appendChild(a); a.click();
  setTimeout(function(){ a.remove(); }, 150);
}
function closeViewer(){ var v=document.getElementById('viewer'); if(v) v.classList.remove('show'); }

// ── Confirm modal (สรุปยืนยันก่อนส่ง) ──
function confirmModal(opts){
  var c=document.getElementById('confirm');
  if(!c){ c=document.createElement('div'); c.id='confirm'; c.className='cfm'; document.body.appendChild(c); }
  var ac = opts.accent==='ot' ? 'ot' : '';
  var rows = opts.rows.map(function(r){
    return '<div class="cfm-row"><span class="cfm-k">'+escIco(r.k)+'</span><span class="cfm-v">'+escIco(r.v)+'</span></div>'; }).join('');
  c.innerHTML='<div class="cfm-box">'+
    '<div class="cfm-head '+ac+'">'+opts.emoji+' '+esc(opts.title)+'</div>'+
    '<div class="cfm-body">'+rows+'<div class="cfm-note">ตรวจสอบให้ถูกต้องก่อนส่งนะคะ</div></div>'+
    '<div class="cfm-act">'+
      '<button class="cfm-btn ghost" data-cfm-cancel>✕ แก้ไข</button>'+
      '<button class="cfm-btn go '+ac+'" data-cfm-ok>'+ico('check')+' ยืนยันส่ง</button>'+
    '</div></div>';
  c.classList.add('show');
  c.querySelector('[data-cfm-cancel]').addEventListener('click', closeConfirm);
  c.querySelector('[data-cfm-ok]').addEventListener('click', function(){ closeConfirm(); opts.onConfirm(); });
}
// กล่องแจ้งให้ "รับทราบ" — ใช้กับเรื่องที่ต้องลงมือทำต่อ (toast หายใน 3 วิ อ่านไม่ทัน/พลาดได้)
function noticeBox(title, msg, emoji){
  modalForm({ title: title, emoji: emoji || ico('alert'),
    body: '<div class="hr-note" style="font-size:13.5px;line-height:1.65">' + esc(msg) + '</div>',
    okLabel: 'รับทราบ', onOk: function(){ closeConfirm(); } });
}
function closeConfirm(){ var c=document.getElementById('confirm'); if(c) c.classList.remove('show'); }
// modal ฟอร์มทั่วไป (reuse .cfm) — opts:{title,emoji,accent,body,okLabel,onOk(c),onMount(c)}
// onOk รับ element modal (อ่าน input เอง) · ต้องเรียก closeConfirm() เองหลังสำเร็จ
function modalForm(opts){
  var c=document.getElementById('confirm');
  if(!c){ c=document.createElement('div'); c.id='confirm'; c.className='cfm'; document.body.appendChild(c); }
  var ac = opts.accent==='ot' ? 'ot' : '';
  c.innerHTML='<div class="cfm-box">'+
    '<div class="cfm-head '+ac+'">'+(opts.emoji||'')+' '+esc(opts.title)+'</div>'+
    '<div class="cfm-body cfm-scroll">'+opts.body+'</div>'+
    '<div class="cfm-act">'+
      '<button class="cfm-btn ghost" data-cfm-cancel>✕ ยกเลิก</button>'+
      '<button class="cfm-btn go '+ac+'" data-cfm-ok>'+(opts.okLabel||ico('check')+' บันทึก')+'</button>'+
    '</div></div>';
  c.classList.add('show');
  c.querySelector('[data-cfm-cancel]').addEventListener('click', closeConfirm);
  c.querySelector('[data-cfm-ok]').addEventListener('click', function(){ opts.onOk(c); });
  if(opts.onMount) opts.onMount(c);
}
function baht(n){ return (Number(n)||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})+' ฿'; }
function baht0(n){ return (Number(n)||0).toLocaleString('th-TH',{maximumFractionDigits:0})+' ฿'; }

// ════════════ VIEW: DOCUMENTS ════════════
function backBar(){ return '<button class="backbar" data-back="1">‹ กลับหน้าหลัก</button>'; }
function bindBack(){ var b=document.querySelector('[data-back]'); if(b) b.addEventListener('click',function(){ goTo('home'); }); }
function loadDocuments(){
  api('documents',{}).then(function(r){
    var m=document.getElementById('main'); if(!m) return;
    if(!r.ok){ m.innerHTML = backBar()+emptyBox(ico('alert'), r.error||'โหลดไม่ได้'); bindBack(); return; }
    if(!r.documents.length){ m.innerHTML = backBar()+emptyBox(ico('inbox'),'ยังไม่มีเอกสารสำหรับคุณ'); bindBack(); return; }
    var list = r.documents.map(function(d){
      return '<div class="hist"><div class="hist-ic">'+ico('file')+'</div><div class="hist-main">'+
        '<div class="hist-type">'+esc(d.name)+'</div>'+
        '<div class="hist-meta">'+esc(d.category)+' · '+esc(d.scope)+'</div></div>'+
        '<button class="slip-mini" data-doc="'+esc(d.url)+'">⬇</button></div>'; }).join('');
    m.innerHTML = backBar()+'<div class="card"><div class="card-title"><span class="ic"></span>เอกสาร '+r.documents.length+' รายการ</div>'+list+'</div>';
    bindBack(); wireFiles();
  }).catch(function(e){ var m=document.getElementById('main'); if(m){ m.innerHTML=backBar()+emptyBox(ico('alert','e-ico'),String(e.message||e)); bindBack(); } });
}


// ════════════ 📊 แดชบอร์ด (รวมภาพรวมทั้งบริษัท) ════════════
// เดิม HR ต้องเดินเข้า 3 เมนู (อนุมัติ · พนักงาน · payroll) ถึงจะเห็นภาพรวม
// หน้านี้รวมให้จบในจอเดียว + กดลัดไปหน้าที่ต้องทำต่อ
//   • ฝั่งลา/คน = คำขอเดียว (hrOverview)
//   • ฝั่งเงินเดือน = คนละ Apps Script project จึงเรียกของ payroll แยก
//     และเห็นเฉพาะ ADMIN/OWNER (ข้อมูลเงินเดือน)
function loadDashboard(){
  var m = document.getElementById('main'); if(!m) return;
  var canPay = S.profile && S.profile.canAdmin;
  m.innerHTML = backBar()+
    '<div id="dbPend"><div class="card"><div class="skel" style="height:96px"></div></div></div>'+
    '<div id="dbPeople"><div class="card"><div class="skel" style="height:120px"></div></div></div>'+
    '<div id="dbLeaveOt"><div class="card"><div class="skel" style="height:120px"></div></div></div>'+
    (canPay ? '<div id="dbPay"><div class="card"><div class="skel" style="height:120px"></div></div></div>' : '');
  bindBack();

  api('hrOverview',{}).then(function(r){
    if(!r || !r.ok){ document.getElementById('dbPend').innerHTML = emptyBox(ico('lock'), (r&&r.error)||'ไม่มีสิทธิ์'); return; }
    paintDbPending(r.pending);
    paintDbPeople(r.people);
    paintDbLeaveOt(r.leaveOt);
  }).catch(function(e){
    var b=document.getElementById('dbPend'); if(b) b.innerHTML = emptyBox(ico('alert','e-ico'), String(e.message||e));
  });

  if(canPay) loadDbPayroll();
}

/** ① ค้างอนุมัติ — ตัวเลขค้าง + กดลัดไปหน้าอนุมัติ */
function paintDbPending(n){
  var box=document.getElementById('dbPend'); if(!box) return;
  if(!n){ box.innerHTML=''; return; }
  var cell=function(lb,v,go){ return '<button class="db-cell'+(v?' hot':'')+'"'+(go?' data-go="'+go+'"':'')+'>'+
    '<div class="db-num">'+v+'</div><div class="db-lb">'+esc(lb)+'</div></button>'; };
  box.innerHTML='<div class="card">'+
    '<div class="emp-thead"><div class="card-title" style="margin:0"><span class="ic"></span>ค้างรออนุมัติ'+
      (n.total?' <b style="color:var(--red)">'+n.total+'</b>':'')+'</div>'+
      '<button class="btn btn-primary btn-sm" data-go="hr">ไปหน้าอนุมัติ ›</button></div>'+
    '<div class="db-grid">'+
      cell('ใบลา', n.leave, 'hr')+cell('ใบ OT', n.ot, 'hr')+
      cell('ลงทะเบียน', n.register, 'hr')+cell('เปลี่ยน LINE', n.lineChange, 'hr')+
      cell('ขอสิทธิ์ลาไม่รับค่าจ้าง', n.unpaidReq, 'hr')+
    '</div>'+
    (n.total ? '' : '<div class="mg-sub2" style="margin-top:8px">'+ico('check')+' ไม่มีรายการค้าง</div>')+
  '</div>';
  box.querySelectorAll('[data-go]').forEach(function(el){
    el.addEventListener('click', function(){ goTo(el.dataset.go); }); });
}

/** ② คน — จำนวนพนักงาน + เข้าใหม่/ลาออกปีนี้ + แผนก */
function paintDbPeople(r){
  var box=document.getElementById('dbPeople'); if(!box) return;
  if(!r){ box.innerHTML=''; return; }
  var st=function(lb,v){ return '<div class="db-cell"><div class="db-num">'+v+'</div><div class="db-lb">'+esc(lb)+'</div></div>'; };
  var depts=(r.byDept||[]).slice(0,8).map(function(d){
    return '<div class="db-dept"><span>'+esc(d.dept||d.name||'-')+'</span><b>'+(d.count||d.n||0)+'</b></div>'; }).join('');
  box.innerHTML='<div class="card">'+
    '<div class="emp-thead"><div class="card-title" style="margin:0"><span class="ic"></span>พนักงาน</div>'+
      '<button class="btn btn-primary btn-sm" data-go="emps">ไปหน้าพนักงาน ›</button></div>'+
    '<div class="db-grid">'+
      st('ทำงานอยู่', r.active||0)+st('เข้าใหม่ปีนี้', r.joinTotal||0)+
      st('ลาออกปีนี้', r.exitTotal||0)+st('ยังไม่ผูก LINE', r.noLine||0)+
    '</div>'+
    (depts?'<div class="db-depts">'+depts+'</div>':'')+
  '</div>';
  var b=box.querySelector('[data-go]'); if(b) b.addEventListener('click', function(){ goTo('emps'); });
}

/** ③ ลา & OT รอบนี้ + ใครใช้วันลามากสุด */
function paintDbLeaveOt(r){
  var box=document.getElementById('dbLeaveOt'); if(!box) return;
  if(!r){ box.innerHTML=''; return; }
  var lv=r.leave||{}, ot=r.ot||{};
  var st=function(lb,v){ return '<div class="db-cell"><div class="db-num">'+(v||0)+'</div><div class="db-lb">'+esc(lb)+'</div></div>'; };
  var top=(r.topLeave||[]).map(function(x,i){
    return '<div class="db-dept"><span>'+(i+1)+'. '+esc(x.name)+(x.dept?' <span class="mg-sub2">'+esc(x.dept)+'</span>':'')+'</span><b>'+x.days+' วัน</b></div>'; }).join('');
  box.innerHTML='<div class="card">'+
    '<div class="emp-thead"><div class="card-title" style="margin:0"><span class="ic"></span>ลา &amp; OT รอบนี้'+
      (r.label?' <span class="mg-sub2">'+esc(r.label)+'</span>':'')+'</div>'+
      '<button class="btn btn-primary btn-sm" data-go="mgleave">จัดการการลา ›</button></div>'+
    '<div class="db-grid">'+
      st('ใบลาทั้งหมด', lv.total)+st('อนุมัติแล้ว', lv.approved)+
      st('ใบ OT', ot.count)+st('ชั่วโมง OT', ot.hours)+
    '</div>'+
    (top?('<div class="db-sub">'+ico('ticket')+' ใช้วันลามากสุด <span class="mg-sub2">(สะสมทั้งปี)</span></div><div class="db-depts">'+top+'</div>'):'')+
  '</div>';
  var b=box.querySelector('[data-go]'); if(b) b.addEventListener('click', function(){ goTo('mgleave'); });
}

/** ④ เงินเดือนรอบล่าสุด — ยอดรวมบริษัท + ปิดรอบถึงขั้นไหน (ADMIN/OWNER) */
function loadDbPayroll(){
  var box=document.getElementById('dbPay'); if(!box) return;
  if(!window.PAY || !PAY.api || !PAY.configure){ box.innerHTML=''; return; }
  if(!CFG.PAYROLL_API_URL || CFG.PAYROLL_API_URL.indexOf('PASTE')===0){ box.innerHTML=''; return; }
  // ยืมค่าตั้งค่า + ช่องทางล็อกอินของคอนโซลให้โมดูลเงินเดือน (ยังไม่ต้องเปิดหน้า Payroll)
  PAY.configure({ PAYROLL_API_URL: CFG.PAYROLL_API_URL, MOCK: !!CFG.PAYROLL_MOCK,
    host: { getAuth: function(){ return S.auth; }, onAuthExpired: reauth } });
  var nowY=new Date().getFullYear()+543;
  Promise.all([
    PAY.api('yearSummary',{yearBE:nowY}).catch(function(){ return null; }),
    PAY.api('stepStatus',{}).catch(function(){ return null; }),
  ]).then(function(a){ paintDbPayroll(a[0], a[1]); })
    .catch(function(){ box.innerHTML=''; });
}

function paintDbPayroll(sum, step){
  var box=document.getElementById('dbPay'); if(!box) return;
  if((!sum||!sum.ok) && (!step||!step.ok)){ box.innerHTML=''; return; }

  // เดือนล่าสุดที่มีข้อมูลจริง
  var last=null;
  if(sum && sum.ok) (sum.months||[]).forEach(function(m){ if((Number(m.net)||0)>0) last=m; });

  var money=function(n){ return (Number(n)||0).toLocaleString('th-TH',{maximumFractionDigits:0})+' บาท'; };
  var st=function(lb,v){ return '<div class="db-cell"><div class="db-num sm">'+v+'</div><div class="db-lb">'+esc(lb)+'</div></div>'; };

  var stepLine='';
  if(step && step.ok){
    var steps=step.steps||[], done=steps.filter(function(s){ return s.done; }).length;
    var nextLb=''; for(var i=0;i<steps.length;i++){ if(steps[i].key===step.next){ nextLb=steps[i].label; break; } }
    stepLine='<div class="db-sub">'+ico('clipboard')+' ปิดเดือน '+esc(step.label||step.periodLabel||'')+
      ' — ทำแล้ว <b>'+done+'/'+steps.length+'</b> ขั้น'+
      (step.allDone ? ' '+ico('check')+' ครบแล้ว' : (nextLb?' · ขั้นถัดไป: <b>'+esc(nextLb)+'</b>':''))+'</div>';
  }

  box.innerHTML='<div class="card">'+
    '<div class="emp-thead"><div class="card-title" style="margin:0"><span class="ic"></span>เงินเดือน'+
      (last?' <span class="mg-sub2">รอบ '+esc(_dbMonthLabel(last))+'</span>':'')+'</div>'+
      '<button class="btn btn-primary btn-sm" data-go="mgpay">จัดการ Payroll ›</button></div>'+
    (last?('<div class="db-grid">'+
      st('จ่ายรวม', money(last.net))+
      st('ภาษีหัก ณ ที่จ่าย', money(last.tax))+
      st('ประกันสังคม', money(last.sso))+
      st('จำนวนคน', (last.emp||0)+' คน')+
    '</div>'):'<div class="mg-sub2">ยังไม่มีข้อมูลเงินเดือนปีนี้</div>')+
    stepLine+
    '<div class="paste-help">ยอดรวมทั้งบริษัทเท่านั้น — ดูรายคนได้ที่หน้าจัดการ Payroll</div>'+
  '</div>';
  var b=box.querySelector('[data-go]'); if(b) b.addEventListener('click', function(){ goTo('mgpay'); });
}

/** ป้ายเดือนของรอบเงินเดือน เช่น "ส.ค. 2569" */
function _dbMonthLabel(m){
  var TH=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return (TH[(m.month||1)-1]||'') + ' ' + (m.yearBE||'');
}

// ════════════ VIEW: HR DASHBOARD (read-only) ════════════
function loadHr(){
  // ขอทีเดียวได้ครบ (แดชบอร์ด + คำขอลงทะเบียน + เปลี่ยน LINE + ลาไม่รับค่าจ้าง + เอกสาร)
  // ทุกคำขอมีต้นทุนคงที่ ~4.5 วิ — เดิมยิง 5-6 คำขอ รวมแล้วเกินเวลารอจนขึ้น "หมดเวลาเชื่อมต่อ"
  S.hrHistData=null;   // reset cache — โหลดประวัติสดทุกครั้งเปิดแผง HR
  var now=new Date();
  S.docF = S.docF || { mode:'period', year:now.getFullYear()+543, month:now.getMonth()+1, from:'', to:'' };
  var f = S.docF;
  api('hrBundle',{ mode:f.mode, year:f.year, month:f.month, from:f.from, to:f.to }).then(function(b){
    var m=document.getElementById('main'); if(!m) return;
    var r = b && b.dashboard;
    if(!b || !b.ok || !r || !r.ok){
      m.innerHTML = backBar()+emptyBox(ico('lock'), (b&&b.error) || (r&&r.error) || 'ไม่มีสิทธิ์'); bindBack(); return;
    }
    m.innerHTML = backBar()+'<div id="pendRegSlot"></div><div id="lineChgSlot"></div><div id="unpaidReqSlot"></div>'+renderHr(r);
    bindBack(); wireHrPending(); wireHrHistTabs(); wireHrSumFilter();
    paintPendingRegs(b.pendingReg);
    paintLineChanges(b.lineChange);
    paintUnpaidReqs(b.unpaidReq);
    paintDocDash(b.docStats);
    loadHrHistory();                     // ประวัติทั้งบริษัทหนัก — โหลดแยกทีหลัง
  }).catch(function(e){ var m=document.getElementById('main'); if(m){ m.innerHTML=backBar()+emptyBox(ico('alert','e-ico'),String(e.message||e)); bindBack(); } });
}
function wireHrHistTabs(){
  document.querySelectorAll('[data-hh]').forEach(function(el){
    el.addEventListener('click', function(){
      S.hrHist=el.dataset.hh;
      document.querySelectorAll('[data-hh]').forEach(function(b){
        var sel=b.dataset.hh===S.hrHist;
        b.classList.toggle('sel', sel);
        if(b.dataset.hh==='ot') b.classList.toggle('ot', sel);
      });
      var body=document.getElementById('hrHistBody'); if(body) body.innerHTML='<div class="skel" style="height:64px"></div>';
      paintHrHistory();
    });
  });
}
// 📝 รายการรออนุมัติลงทะเบียน — โหลดแยก แล้วแทรกบนสุดของแผง HR
function loadPendingRegs(){
  api('pendingRegistrations',{}).then(paintPendingRegs).catch(function(){});
  loadLineChanges();
}
function paintPendingRegs(r){
  var slot=document.getElementById('pendRegSlot');
  if(!slot || !r || !r.ok) return;
  if(!r.count){ slot.innerHTML=''; return; }
  slot.innerHTML = renderPendingRegs(r.pending);
  wirePendingRegs();
}
// 📱 คำขอเปลี่ยน LINE (พนักงานคนเดิม เครื่อง/บัญชีใหม่) — แทรกใต้การ์ดลงทะเบียน
function loadLineChanges(){
  api('lineChangeList',{}).then(paintLineChanges).catch(function(){});
}
function paintLineChanges(r){
  var slot=document.getElementById('lineChgSlot');
  if(!slot || !r || !r.ok) return;
  slot.innerHTML = r.count ? renderLineChanges(r.pending) : '';
  if(r.count) wireLineChanges();
}
function renderLineChanges(list){
  var canAdmin = S.profile && S.profile.canAdmin;
  var rows = list.map(function(x){
    var d = 'data-lcuid="'+esc(x.newUserId)+'" data-lcname="'+esc(x.typedName)+'"';
    // เปลี่ยนตัวตน = ADMIN/OWNER เท่านั้น (backend กันอีกชั้น) · คนอื่นเห็นได้แต่กดไม่ได้
    var acts = canAdmin
      ? '<div class="pend-act"><button class="pend-btn no" data-lcno="1" '+d+'>'+ico('x')+' ปฏิเสธ</button>'+
        '<button class="pend-btn ok" data-lcok="1" '+d+'>'+ico('check')+' อนุมัติ</button></div>'
      : '<div class="hr-note">'+ico('info')+' ต้องเป็น ADMIN/OWNER ถึงจะอนุมัติการเปลี่ยน LINE ได้</div>';
    return '<div class="pend"><div class="pend-top"><div class="hist-ic">'+ico('phone')+'</div><div class="hist-main">'+
      '<div class="hist-type">'+esc(x.typedName)+'</div>'+
      '<div class="hist-meta">'+(x.lineDisplay?'LINE ใหม่: '+esc(x.lineDisplay)+' · ':'')+esc(x.submittedAt)+'</div>'+
      '<div style="margin-top:5px"><span class="badge no">'+ico('phone')+' ขอย้ายไป LINE เครื่องใหม่'+
      (x.empId?' · '+esc(x.empId):'')+'</span></div></div></div>'+acts+'</div>'; }).join('');
  return '<div class="card"><div class="card-title"><span class="ic"></span>'+ico('phone')+' คำขอเปลี่ยน LINE ('+list.length+')</div>'+rows+
    '<div class="hr-note ok2">'+ico('alert')+' โทรหรือทักเจ้าตัวยืนยันก่อนอนุมัติทุกครั้ง — ถ้าไม่ใช่เจ้าตัวคือมีคนพยายามสวมรอย</div></div>';
}
function wireLineChanges(){
  document.querySelectorAll('[data-lcok]').forEach(function(el){
    el.addEventListener('click', function(){ decideLineChange(el.dataset.lcuid, el.dataset.lcname, 'approve'); }); });
  document.querySelectorAll('[data-lcno]').forEach(function(el){
    el.addEventListener('click', function(){ decideLineChange(el.dataset.lcuid, el.dataset.lcname, 'reject'); }); });
}
function decideLineChange(uid, name, decision){
  var send = function(){
    toast('กำลังดำเนินการ…');
    api('lineChangeDecide',{targetUserId:uid, decision:decision}).then(function(r){
      if(!r.ok){ if(r.already) loadHr(); return toast(r.error||'ทำรายการไม่สำเร็จ','err'); }
 toast((decision==='approve'?' เปลี่ยน LINE ให้ ':' ปฏิเสธคำขอของ ')+name+' แล้ว','ok');
      loadHr();
    }).catch(function(e){ toast(String(e.message||e),'err'); });
  };
  if(decision==='approve'){
    confirmModal({ title:'ยืนยันเปลี่ยน LINE', emoji:ico('phone'), accent:'leave',
      onConfirm:send, rows:[
        {k:'พนักงาน', v:name},
        {k:'ยืนยันตัวตนแล้ว?', v:'ต้องแน่ใจว่าเป็นเจ้าตัวจริง'},
        {k:'ผลลัพธ์', v:'ย้าย LINE + อัปเดตสลิปเงินเดือน · ประวัติอยู่ครบ'}
      ]});
  } else {
    confirmModal({ title:'ยืนยันปฏิเสธคำขอ', emoji:ico('x'), accent:'leave',
      onConfirm:send, rows:[
        {k:'ผู้ขอ', v:name},
        {k:'ผลลัพธ์', v:'แจ้งกลับผู้ขอให้ติดต่อ HR'}
      ]});
  }
}
function renderPendingRegs(list){
  var canAdmin = S.profile && S.profile.canAdmin;
  var rows = list.map(function(x){
    var match = x.matched
      ? '<span class="badge ok">'+ico('check')+' ตรงโควต้าลา · '+esc(x.empId)+(x.dept?' · '+esc(x.dept):'')+'</span>'
      : '<span class="badge no">'+ico('alert')+' ยังไม่มีข้อมูลในระบบ</span>';
    var d = 'data-uid="'+esc(x.userId)+'" data-name="'+esc(x.typedName)+'"';
    // ปุ่ม: ถ้าตรงโควต้าลา → อนุมัติ/ปฏิเสธ · ถ้าไม่ตรง + เป็น admin → เพิ่มเป็นพนักงานใหม่ (เพิ่ม+อนุมัติขั้นเดียว)
    // 🔁 ทางที่สาม: เป็นพนักงานคนเดิมที่เปลี่ยนเครื่อง/พิมพ์ชื่อไม่ตรง — ย้าย LINE ให้แทนการเพิ่มคนใหม่
    //    (ไม่มีทางนี้ HR จะกด ➕ เพิ่มข้อมูล จนได้พนักงานซ้ำทั้งชุด = เงินเดือน 2 ใบ)
    var moveBtn = canAdmin
      ? '<div class="pend-act2"><button class="pend-btn rmove" data-regmove="1" '+d+'>'+ico('user-check')+' เป็นคนเดิม — ย้าย LINE ให้</button></div>' : '';
    var acts = x.matched
      ? moveBtn+'<div class="pend-act"><button class="pend-btn no" data-regno="1" '+d+'>'+ico('x')+' ปฏิเสธ</button>'+
        '<button class="pend-btn ok" data-regok="1" '+d+'>'+ico('check')+' อนุมัติ</button></div>'
      : (canAdmin
          ? moveBtn+
            '<div class="pend-act2"><button class="pend-btn redit" data-regadd="1" '+d+'>'+ico('user-plus')+' เพิ่มเป็นพนักงานใหม่ + อนุมัติ</button></div>'+
            '<div class="hr-note">'+ico('alert')+' กดปุ่มสีฟ้าเฉพาะคนที่ยังไม่เคยมีในระบบจริง ๆ — ถ้าเป็นคนเดิมที่พิมพ์ชื่อไม่ตรง (เช่นพิมพ์ภาษาอังกฤษ) ให้กดปุ่มย้าย LINE</div>'+
            '<div class="pend-act"><button class="pend-btn no" data-regno="1" '+d+'>'+ico('x')+' ปฏิเสธ</button></div>'
          : '<div class="hr-note">'+ico('info')+' ชื่อนี้ยังไม่มีในระบบ — ให้ ADMIN เพิ่มข้อมูลพนักงานก่อน</div>'+
            '<div class="pend-act"><button class="pend-btn no" data-regno="1" '+d+'>'+ico('x')+' ปฏิเสธ</button></div>');
    return '<div class="pend"><div class="pend-top"><div class="hist-ic">'+ico('clipboard')+'</div><div class="hist-main">'+
      '<div class="hist-type">'+esc(x.typedName)+'</div>'+
      '<div class="hist-meta">'+(x.lineDisplay?'LINE: '+esc(x.lineDisplay)+' · ':'')+esc(x.submittedAt)+'</div>'+
      '<div style="margin-top:5px">'+match+'</div></div></div>'+acts+'</div>'; }).join('');
  return '<div class="card"><div class="card-title"><span class="ic"></span>'+ico('clipboard')+' รออนุมัติลงทะเบียน ('+list.length+')</div>'+
    '<div class="hr-note ok2">'+ico('info')+' ตรวจชื่อให้ตรงพนักงานจริงก่อนอนุมัติ · ระบบแจ้งพนักงานทาง LINE อัตโนมัติ</div>'+rows+'</div>';
}
function wirePendingRegs(){
  document.querySelectorAll('[data-regok]').forEach(function(el){
    el.addEventListener('click', function(){ decideReg(el.dataset.uid, el.dataset.name, 'approve'); }); });
  document.querySelectorAll('[data-regno]').forEach(function(el){
    el.addEventListener('click', function(){ decideReg(el.dataset.uid, el.dataset.name, 'reject'); }); });
  document.querySelectorAll('[data-regadd]').forEach(function(el){
    el.addEventListener('click', function(){ openAddEmpFromPending(el.dataset.uid, el.dataset.name); }); });
  document.querySelectorAll('[data-regmove]').forEach(function(el){
    el.addEventListener('click', function(){ openMoveFromPending(el.dataset.uid, el.dataset.name); }); });
}

/**
 * 🔁 "เป็นคนเดิม — ย้าย LINE ให้" บนการ์ดคำขอลงทะเบียน
 * เคสจริง 2 ก.ย.: พนักงานเปลี่ยนเครื่องแล้วพิมพ์ชื่อภาษาอังกฤษ ระบบหาชื่อไม่เจอ
 * → ตกมาเป็นคำขอลงทะเบียนใหม่ → HR กด ➕ เพิ่มข้อมูล → ได้พนักงานซ้ำทั้งชุด
 * ทางนี้ให้ HR ชี้ตัวว่าเป็นใครในทะเบียน แล้วย้าย LINE เข้าแถวเดิมแทน
 */
function openMoveFromPending(uid, typedName){
  toast('กำลังโหลดรายชื่อ…');
  api('emNameList',{}).then(function(r){
    if(!r.ok){ return toast(r.error||'โหลดรายชื่อไม่ได้','err'); }
    var people = r.people||[];
    var rowHtml = function(p){
      return '<label class="lcand" data-pname="'+esc(p.name)+'">'+
        '<input type="radio" name="rmv" value="'+esc(p.empId||'')+'" data-nm="'+esc(p.name)+'" data-line="'+(p.hasLine?'1':'')+'">'+
        '<span><b>'+esc(p.name)+'</b><br><span class="mg-sub2">'+esc(p.empId||'ไม่มีรหัส')+
        (p.dept?' · '+esc(p.dept):'')+' · '+(p.hasLine?'ผูก LINE อยู่ (จะสลับเป็นเครื่องใหม่)':'ยังไม่ผูก LINE')+
        '</span></span></label>'; };
    modalForm({ title:'ย้าย LINE ให้พนักงานคนเดิม', emoji:ico('rotate'),
      body:'<div class="cfm-row"><span class="cfm-k">ชื่อที่พนักงานพิมพ์มา</span><span class="cfm-v">'+esc(typedName)+'</span></div>'+
           '<label class="field-lb">'+ico('search')+' ค้นชื่อ / รหัส / แผนก</label>'+
           '<input type="text" id="rmvSearch" placeholder="พิมพ์บางส่วนของชื่อ" autocomplete="off">'+
           '<div id="rmvList" style="max-height:280px;overflow:auto;margin-top:8px">'+people.slice(0,40).map(rowHtml).join('')+'</div>'+
           '<div class="cfm-note">ยืนยันตัวตนกับเจ้าตัวก่อนกดทุกครั้ง — ใครก็ยื่นคำขอในชื่อคนอื่นได้<br>'+
           'ย้ายแล้วประวัติลา / OT / สลิป ของคนนั้นอยู่ครบ ไม่เกิดพนักงานซ้ำ</div>',
      okLabel:ico('rotate')+' ย้ายให้คนนี้',
      onMount:function(c){
        var box = c.querySelector('#rmvList');
        c.querySelector('#rmvSearch').addEventListener('input', function(ev){
          var q = (ev.target.value||'').trim().toLowerCase();
          var hit = q ? people.filter(function(p){
            return (p.name+' '+(p.empId||'')+' '+(p.dept||'')).toLowerCase().indexOf(q)>=0; }) : people;
          box.innerHTML = hit.slice(0,40).map(rowHtml).join('') ||
            '<div class="mg-sub2">ไม่พบชื่อนี้ในทะเบียน</div>';
        });
      },
      onOk:function(c){
        var pick = c.querySelector('input[name="rmv"]:checked');
        if(!pick){ toast('เลือกพนักงานก่อนนะคะ','err'); return; }
        closeConfirm();
        var nm = pick.dataset.nm;
        confirmModal({ title:'ย้าย LINE ให้ '+nm, emoji:ico('rotate'),
          rows:[{k:'บัญชีที่ขอเข้าใช้', v:typedName},
                {k:'ย้ายให้', v:nm+' ('+(pick.value||'-')+')'},
                {k:'ผลที่เกิด', v:'เครื่องเดิมของคนนี้ใช้ไม่ได้ · ประวัติอยู่ครบ'}],
          onConfirm:function(){
            toast('กำลังย้าย…');
            api('emLineMove',{empId:pick.value||'', name:nm, newUserId:uid}).then(function(res){
              if(!res.ok){
                if(res.needMerge){ noticeBox('ต้องรวมร่างแทน', res.error+'\n\nไปที่ '+ico('users')+' พนักงาน → เปิดคนนั้น → แท็บ '+ico('phone')+' LINE → '+ico('eraser')+' รวมร่าง', ico('eraser')); return; }
                toast(res.error||'ย้ายไม่สำเร็จ','err'); return;
              }
              toast('ย้าย LINE ให้ '+res.name+' แล้ว'+(res.payrollUpdated?' · สลิปตามไปด้วย':''),'ok');
              loadHr();
            }).catch(function(e){ toast(String(e.message||e),'err'); });
          }});
      }});
  }).catch(function(e){ toast(String(e.message||e),'err'); });
}
function decideReg(uid, name, decision){
  var send = function(reason){
    toast('กำลังดำเนินการ…');
    api('decideRegistration',{targetUserId:uid, decision:decision, reason:reason||''}).then(function(r){
      if(!r.ok){ if(r.already) loadHr(); return toast(r.error||'ทำรายการไม่สำเร็จ','err'); }
 toast((decision==='approve'?' อนุมัติ ':' ปฏิเสธ ')+name+' แล้ว','ok'); loadHr();
    }).catch(function(e){ toast(String(e.message||e),'err'); });
  };
  if(decision==='approve'){
    confirmModal({ title:'ยืนยันอนุมัติลงทะเบียน', emoji:ico('check'), accent:'leave',
      onConfirm:function(){ send(''); }, rows:[
        {k:'พนักงาน', v:name},
        {k:'ผลลัพธ์', v:'ผูก LINE + เข้าใช้ระบบได้ทันที'}
      ]});
  } else {
    confirmModal({ title:'ยืนยันปฏิเสธคำขอ', emoji:ico('x'), accent:'leave',
      onConfirm:function(){ send(''); }, rows:[
        {k:'พนักงาน', v:name},
        {k:'ผลลัพธ์', v:'แจ้งพนักงานให้ติดต่อ HR'}
      ]});
  }
}
function wireHrPending(){
  document.querySelectorAll('[data-appr]').forEach(function(el){
    el.addEventListener('click', function(){ doHrApprove(el.dataset.kind, el.dataset.id, el.dataset.name); }); });
  document.querySelectorAll('[data-rej]').forEach(function(el){
    el.addEventListener('click', function(){ doHrReject(el.dataset.kind, el.dataset.id, el.dataset.name); }); });
  document.querySelectorAll('[data-doc]').forEach(function(el){
    el.addEventListener('click', function(){ doHrRequestDoc(el.dataset.kind, el.dataset.id, el.dataset.name); }); });
  document.querySelectorAll('[data-redit]').forEach(function(el){
    el.addEventListener('click', function(){ doHrReturnEdit(el.dataset.kind, el.dataset.id, el.dataset.name); }); });
  document.querySelectorAll('[data-viewdoc]').forEach(function(el){
    el.addEventListener('click', function(){ doHrViewDocs(el.dataset.kind, el.dataset.id); }); });
  document.querySelectorAll('[data-hist]').forEach(function(el){
    el.addEventListener('click', function(){ doHrViewHistory(el.dataset.kind, el.dataset.uid, el.dataset.empid, el.dataset.name); }); });
}
// 📨 HR ดูเอกสารที่พนักงานแนบ — list ไฟล์ในโฟลเดอร์ → เปิด viewer ในแอป (ไม่ต้องเข้า Drive/mail)
function doHrViewDocs(kind, id){
  toast('กำลังโหลดเอกสาร…');
  api('hrReviewDocs',{kind:kind,id:id}).then(function(r){
    if(!r.ok) return toast(r.error||'เปิดเอกสารไม่ได้','err');
    if(r.files.length===1) return fetchFile('hrDocFile',{fileId:r.files[0].fileId});
    // หลายไฟล์ — chooser
    var c=document.getElementById('confirm');
    if(!c){ c=document.createElement('div'); c.id='confirm'; c.className='cfm'; document.body.appendChild(c); }
    var btns=r.files.map(function(f){ return '<button class="rej-opt" data-fid="'+esc(f.fileId)+'">'+ico('file')+' '+esc(f.name)+'</button>'; }).join('');
    c.innerHTML='<div class="cfm-box"><div class="cfm-head">'+ico('send')+' เอกสารแนบ ('+r.files.length+' ไฟล์)</div>'+
      '<div class="cfm-body"><div class="rej-grid">'+btns+'</div></div>'+
      '<div class="cfm-act" style="grid-template-columns:1fr"><button class="cfm-btn ghost" data-cfm-cancel>ปิด</button></div></div>';
    c.classList.add('show');
    c.querySelector('[data-cfm-cancel]').addEventListener('click', closeConfirm);
    c.querySelectorAll('[data-fid]').forEach(function(el){
      el.addEventListener('click', function(){ closeConfirm(); fetchFile('hrDocFile',{fileId:el.dataset.fid}); }); });
  }).catch(function(e){ toast(String(e.message||e),'err'); });
}
// 📊 HR ดูประวัติการลา/OT ของพนักงานคนนั้น — ใช้ประเมินก่อนอนุมัติ (modal ในแอป)
// ปัดทศนิยม ≤3 หลัก + ตัด trailing zero (กัน floating point เพี้ยน เช่น 0.0004999… → 0)
function num3(v){ return String(Math.round((Number(v)||0)*1000)/1000); }
function balNum(v){ return v==null?'—':num3(v); }
// ตารางสิทธิ์การลาครบทุกประเภท (ใช้ไป/คงเหลือ) — ข้อมูลพิจารณาหลักใน modal ประวัติ
function leaveStatsTable(stats, fallbackBal){
  if(stats && stats.length){
    var rows = stats.map(function(s){
      var rem=s.remaining, low=(rem!=null && rem<=0);
      return '<div class="lstat-row">'+
        '<span class="ls-t">'+s.emoji+' '+esc(s.name)+'</span>'+
        '<span class="ls-u">'+(s.used==null?'—':num3(s.used))+'</span>'+
        '<span class="ls-r'+(low?' low':'')+'">'+(rem==null?'—':num3(rem))+(low?' '+ico('alert'):'')+'</span></div>';
    }).join('');
    return '<div class="lstat"><div class="lstat-h">'+ico('ticket')+' สิทธิ์การลา (ปีนี้)</div>'+
      '<div class="lstat-row head"><span>ประเภท</span><span>ใช้ไป</span><span>คงเหลือ</span></div>'+rows+'</div>';
  }
  if(fallbackBal) return '<div class="hr-bal">'+ico('ticket')+' คงเหลือ · '+ico('sun')+' '+balNum(fallbackBal.vac)+' · '+ico('home')+' '+balNum(fallbackBal.biz)+' · '+ico('thermometer')+' '+balNum(fallbackBal.sick)+'</div>';
  return '';
}
function doHrViewHistory(kind, uid, empid, name){
  toast('กำลังโหลดประวัติ…');
  api('hrEmpHistory',{kind:kind,targetUserId:uid||'',empId:empid||''}).then(function(r){
    if(!r.ok) return toast(r.error||'โหลดประวัติไม่ได้','err');
    var c=document.getElementById('confirm');
    if(!c){ c=document.createElement('div'); c.id='confirm'; c.className='cfm'; document.body.appendChild(c); }
    var nm = esc(r.name||name||''), head, bodyInner;
    if(kind==='ot'){
 head=' ประวัติ OT · '+nm;
      bodyInner = (r.history&&r.history.length)
        ? '<div class="card">'+r.history.map(function(o){
            return '<div class="hist"><div class="hist-ic">'+ico('clock')+'</div><div class="hist-main">'+
              '<div class="hist-type">'+esc(o.otType||'OT')+'</div>'+
              '<div class="hist-meta">'+ico('calendar')+' '+esc(o.otDate)+' · '+ico('clock')+' '+esc(o.startTime)+'–'+esc(o.endTime)+' · '+o.hours+' ชม.</div></div>'+
              statusBadge(o.status)+'</div>'; }).join('')+'</div>'
        : emptyBox(ico('leaf'),'ยังไม่มีประวัติ OT');
    } else {
 head=' ประวัติการลา · '+nm;
      var sumCard = lvSummaryCard(r.summary || lvSummary(r.history||[]));
      // 🎫 ตารางสิทธิ์การลาครบทุกประเภท (ใช้ไป/คงเหลือ) — ข้อมูลพิจารณาหลัก วางบนสุด
      var statsTable = leaveStatsTable(r.leaveStats, r.balances);
      var list = (r.history&&r.history.length)
        ? '<div class="card">'+r.history.map(function(h){
            var dt=h.startDate+(h.endDate&&h.endDate!==h.startDate?' — '+h.endDate:'');
            return '<div class="hist"><div class="hist-ic">'+typeIco(h.type)+'</div><div class="hist-main">'+
              '<div class="hist-type">'+esc(h.type)+'</div>'+
              '<div class="hist-meta">'+ico('calendar')+' '+dt+' · '+h.days+' วัน</div></div>'+statusBadge(h.status)+'</div>'; }).join('')+'</div>'
        : emptyBox(ico('leaf'),'ยังไม่มีประวัติการลา');
      bodyInner = statsTable + sumCard + list;
    }
    c.innerHTML='<div class="cfm-box"><div class="cfm-head">'+head+'</div>'+
      '<div class="cfm-body cfm-scroll">'+bodyInner+'</div>'+
      '<div class="cfm-act" style="grid-template-columns:1fr"><button class="cfm-btn ghost" data-cfm-cancel>ปิด</button></div></div>';
    c.classList.add('show');
    c.querySelector('[data-cfm-cancel]').addEventListener('click', closeConfirm);
  }).catch(function(e){ toast(String(e.message||e),'err'); });
}
// 📎 HR ขอเอกสารเพิ่ม (พนักงานอัปโหลดทางแชต LINE) — prompt detail แล้วยิง API
function doHrRequestDoc(kind, id, name){
 var detail = window.prompt('ขอเอกสารเพิ่มจาก '+name+'\n\nระบุเอกสารที่ต้องการ (เช่น ใบรับรองแพทย์):');
  if(detail===null) return;
  detail = String(detail).trim(); if(!detail) return toast('กรุณาระบุเอกสารที่ต้องการ','err');
  toast('กำลังส่งคำขอ…');
  api('hrRequestDoc',{kind:kind,id:id,docDetail:detail}).then(function(r){
    if(!r.ok) return toast(r.error||'ส่งคำขอไม่สำเร็จ','err');
 toast('ส่งคำขอเอกสารแล้ว · แจ้งพนักงานทาง LINE','ok'); loadHr();
  }).catch(function(e){ toast(String(e.message||e),'err'); });
}
// 📝 HR ส่งกลับให้แก้ไข (พนักงานแก้ในเว็บแอป) — ใบลาเท่านั้น
function doHrReturnEdit(kind, id, name){
  confirmModal({ title:'ส่งกลับให้แก้ไข', emoji:ico('pencil'), accent: kind==='ot'?'ot':'leave',
    onConfirm:function(){
      toast('กำลังส่งกลับ…');
      api('hrReturnEdit',{kind:kind,id:id}).then(function(r){
        if(!r.ok) return toast(r.error||'ส่งกลับไม่สำเร็จ','err');
 toast('ส่งกลับให้แก้ไขแล้ว · แจ้งพนักงานทาง LINE','ok'); loadHr();
      }).catch(function(e){ toast(String(e.message||e),'err'); });
    }, rows:[
      {k:'ของ',  v:name},
      {k:'รหัส',  v:id},
      {k:'ผลลัพธ์', v:'พนักงานแก้ไขในเว็บแอปแล้วส่งกลับ'}
    ]});
}
function doHrApprove(kind, id, name){
  confirmModal({ title:'ยืนยันอนุมัติ', emoji:ico('check'), accent: kind==='ot'?'ot':'leave',
    onConfirm:function(){ hrDecide(kind, id, 'approve', ''); }, rows:[
 {k:'ประเภท', v: kind==='ot'?'⏰ OT':' ลา'},
      {k:'ของ',   v:name},
      {k:'รหัส',   v:id}
    ]});
}
function doHrReject(kind, id, name){
  var reasons = kind==='ot'
    ? ['ไม่ได้แจ้งล่วงหน้า','ช่วงเวลาไม่ถูกต้อง','งานไม่จำเป็นต้อง OT','ข้อมูลไม่ถูกต้อง']
    : ['เอกสารไม่ครบ','วันชนกับงาน','สิทธิ์ลาไม่พอ','ข้อมูลไม่ถูกต้อง'];
  var c=document.getElementById('confirm');
  if(!c){ c=document.createElement('div'); c.id='confirm'; c.className='cfm'; document.body.appendChild(c); }
  var btns = reasons.map(function(rs){ return '<button class="rej-opt" data-r="'+esc(rs)+'">'+esc(rs)+'</button>'; }).join('');
  c.innerHTML='<div class="cfm-box"><div class="cfm-head" style="background:var(--red-deep)">'+ico('x')+' ไม่อนุมัติ — เลือกเหตุผล</div>'+
    '<div class="cfm-body"><div style="font-size:13px;color:var(--muted);margin-bottom:10px">'+esc(name)+' · '+esc(id)+'</div>'+
    '<div class="rej-grid">'+btns+'<button class="rej-opt custom" data-r="__custom__">'+ico('signature')+' ระบุเอง</button></div></div>'+
    '<div class="cfm-act" style="grid-template-columns:1fr"><button class="cfm-btn ghost" data-cfm-cancel>ยกเลิก</button></div></div>';
  c.classList.add('show');
  c.querySelector('[data-cfm-cancel]').addEventListener('click', closeConfirm);
  c.querySelectorAll('.rej-opt').forEach(function(el){
    el.addEventListener('click', function(){
      var rs = el.dataset.r;
      if(rs==='__custom__'){ rs = window.prompt('ระบุเหตุผลไม่อนุมัติ:'); if(!rs) return; }
      closeConfirm();
      // การ์ดยืนยันก่อนไม่อนุมัติ (consistent กับ LINE)
      confirmModal({ title:'ยืนยันไม่อนุมัติ', emoji:ico('x'), accent: kind==='ot'?'ot':'leave',
        onConfirm:function(){ hrDecide(kind, id, 'reject', rs); }, rows:[
 {k:'ประเภท', v: kind==='ot'?'⏰ OT':' ลา'},
          {k:'ของ',   v:name},
          {k:'รหัส',   v:id},
          {k:'เหตุผล', v:rs}
        ]});
    }); });
}
function hrDecide(kind, id, decision, reason){
  toast('กำลังดำเนินการ…');
  api('approve', {kind:kind, id:id, decision:decision, reason:reason||''}).then(function(r){
    if(!r.ok){ if(r.already) loadHr(); return toast(r.error||'ทำรายการไม่สำเร็จ','err'); }
 toast((decision==='approve'?' อนุมัติ ':' ไม่อนุมัติ ')+id+' แล้ว','ok');
    loadHr();
  }).catch(function(e){ toast(String(e.message||e),'err'); });
}
/**
 * แดชบอร์ดเอกสาร (หน้าอนุมัติ) — โหลดแยกจาก hrDashboard เพราะเลือกเดือนได้เอง
 *   ซ้าย = เอกสารทั้งหมดในระบบ (สะสม ไม่จำกัดช่วง)
 *   ขวา = ที่ยังไม่อนุมัติ ของ "เดือนที่เลือก"
 */
function loadDocDash(){
  var box = document.getElementById('docDash'); if(!box) return;
  var now = new Date();
  S.docF = S.docF || { mode:'period', year:now.getFullYear()+543, month:now.getMonth()+1, from:'', to:'' };
  var f = S.docF;
  api('hrDocStats', { mode:f.mode, year:f.year, month:f.month, from:f.from, to:f.to })
    .then(paintDocDash).catch(function(){ box.innerHTML=''; });
}
function paintDocDash(r){
  var box = document.getElementById('docDash'); if(!box) return;
  if(!r || !r.ok){ box.innerHTML=''; return; }
  renderDocDash(box, r);
}

/** แถบตัวกรองของแดชบอร์ดเอกสาร — ชุดเดียวกับ "สรุปการลา & OT" (รอบ/เดือน/ปี/ช่วงวันที่) */
function docFilterBar(){
  var f=S.docF, now=new Date(), curY=now.getFullYear()+543;
  var modeSel='<select class="hr-fsel" id="docMode">'+
    [['period','รอบเดือนนี้ (26–25)'],['month','เลือกเดือน'],['year','เลือกปี'],['range','ช่วงวันที่']]
      .map(function(o){ return '<option value="'+o[0]+'"'+(f.mode===o[0]?' selected':'')+'>'+o[1]+'</option>'; }).join('')+'</select>';
  var years=[]; for(var y=curY;y>=curY-4;y--) years.push(y);
  var yearOpts=years.map(function(y){ return '<option value="'+y+'"'+((f.year||curY)===y?' selected':'')+'>'+y+'</option>'; }).join('');
  var monthOpts=TH_MO_SHORT.map(function(m,i){ return '<option value="'+(i+1)+'"'+((f.month||(now.getMonth()+1))===(i+1)?' selected':'')+'>'+m+'</option>'; }).join('');
  var inputs='';
  if(f.mode==='month') inputs='<select class="hr-fsel" id="docMonth">'+monthOpts+'</select><select class="hr-fsel" id="docYear">'+yearOpts+'</select>';
  else if(f.mode==='year') inputs='<select class="hr-fsel" id="docYear">'+yearOpts+'</select>';
  else if(f.mode==='range') inputs='<input type="date" class="hr-fdate" id="docFrom" value="'+esc(f.from)+'"><span class="hr-fdash">–</span><input type="date" class="hr-fdate" id="docTo" value="'+esc(f.to)+'">';
  return '<div class="hr-filter">'+ico('search')+' '+modeSel+inputs+'<button class="hr-fbtn" id="docGo">ดูข้อมูล</button></div>';
}

function wireDocFilter(){
  var mode=document.getElementById('docMode');
  if(mode) mode.addEventListener('change', function(){
    S.docF.mode=mode.value;
    var bar=document.querySelector('#docDash .hr-filter');
    if(bar){ bar.outerHTML=docFilterBar(); wireDocFilter(); }
  });
  var go=document.getElementById('docGo');
  if(go) go.addEventListener('click', function(){
    var m=document.getElementById('docMonth'), y=document.getElementById('docYear');
    var fr=document.getElementById('docFrom'), to=document.getElementById('docTo');
    if(m) S.docF.month=parseInt(m.value,10);
    if(y) S.docF.year=parseInt(y.value,10);
    if(fr) S.docF.from=fr.value;
    if(to) S.docF.to=to.value;
    if(S.docF.mode==='range' && (!S.docF.from || !S.docF.to)) return toast('เลือกช่วงวันที่ให้ครบค่ะ','err');
    loadDocDash();
  });
}

function renderDocDash(box, ds){
  var KIND = [
    ['leave',     'ใบลา',                    '#2f80ed'],
    ['ot',        'ใบ OT',                      '#f2994a'],
    ['register',  'คำขอลงทะเบียน',           '#27ae60'],
    ['unpaidReq', 'ขอสิทธิ์ลาไม่รับค่าจ้าง', '#9b51e0'],
  ];
  var parts = KIND.map(function(k){
    return { name:k[1], count:(ds.byKind && ds.byKind[k[0]]) || 0, color:k[2] };
  });
  var TIP = { leave:'นับตามวันเริ่มลา', ot:'นับตามวันที่ทำ OT',
              register:'ไม่มีช่วงเวลากำกับ — นับที่ค้างทั้งหมด',
              unpaidReq:'ไม่มีช่วงเวลากำกับ — นับที่ค้างทั้งหมด' };
  var pendCards = KIND.map(function(k){
    var n = (ds.pendingByKind && ds.pendingByKind[k[0]]) || 0;
    return '<div class="doc-p'+(n?' on':'')+'" title="'+esc(TIP[k[0]]||'')+'"><div class="doc-p-t">'+k[1]+'</div>'+
      '<div class="doc-p-n">'+n+'</div><div class="doc-p-u">ฉบับ</div></div>';
  }).join('');

  box.innerHTML =
    '<div class="doc-dash">'+
      '<div class="card doc-card">'+
        '<div class="card-title"><span class="ic"></span>เอกสารทั้งหมดในระบบ</div>'+
        docDonut(parts, ds.total, 'เอกสาร')+
      '</div>'+
      '<div class="card doc-card">'+
        '<div class="card-title"><span class="ic"></span>เอกสารที่ยังไม่ได้รับการอนุมัติ</div>'+
        docFilterBar()+
        '<div class="hr-sum-lb">'+ico('calendar')+' '+esc(ds.periodLabel||'')+'</div>'+
        '<div class="doc-pgrid">'+pendCards+'</div>'+
      '</div>'+
    '</div>';
  wireDocFilter();
}

/** โดนัท + รายการข้างๆ (ใช้ซ้ำได้ทั้งเอกสารรวมและใบลาแยกประเภท) */
function docDonut(list, total, centerLabel){
  var items = (list||[]).filter(function(x){ return x.count > 0; });
  if(!items.length) return '<div class="mg-sub2">ยังไม่มีเอกสารในรอบนี้</div>';
  // วาดสัดส่วนจากผลรวมของรายการเสมอ วงจะได้เต็มพอดี (total ที่ส่งมาอาจนับคนละฐาน)
  total = items.reduce(function(a,x){ return a + x.count; }, 0);
  if(!total) return '<div class="mg-sub2">ยังไม่มีเอกสารในรอบนี้</div>';
  var R = 54, C = 2*Math.PI*R, off = 0;
  var arcs = items.map(function(d){
    var len = C * (d.count/total);
    var seg = '<circle cx="70" cy="70" r="'+R+'" fill="none" stroke="'+d.color+'" stroke-width="22"'+
      ' stroke-dasharray="'+len.toFixed(2)+' '+(C-len).toFixed(2)+'" stroke-dashoffset="'+(-off).toFixed(2)+'"'+
      ' transform="rotate(-90 70 70)"></circle>';
    off += len; return seg;
  }).join('');
  var legend = items.map(function(d){
    return '<div class="lg-row"><span class="lg-dot" style="background:'+d.color+'"></span>'+
      '<span class="lg-name">'+esc(d.name)+'</span><span class="lg-num">'+d.count+' ฉบับ</span></div>';
  }).join('');
  return '<div class="donut-wrap">'+
    '<svg viewBox="0 0 140 140" class="donut">'+arcs+
      '<text x="70" y="64" text-anchor="middle" class="donut-n">'+total+'</text>'+
      '<text x="70" y="82" text-anchor="middle" class="donut-l">'+esc(centerLabel||'')+'</text>'+
    '</svg><div class="donut-lg">'+legend+'</div></div>';
}

function renderHr(r){
  // การ์ดสรุป (ลา+OT) + แถบตัวกรอง (รอบ/เดือน/ปี/ช่วงวันที่) — ค่าเริ่มจาก hrDashboard (รอบ 26–25)
  var sumCard='<div class="card hr-sum-card"><div class="card-title"><span class="ic"></span>สรุปการลา &amp; OT</div>'+
    hrSumFilterBar()+
    '<div id="hrSumGrid">'+hrSumGrids(r.leave, r.ot, r.monthLabel)+'</div></div>';

  var pend = r.pending.length ? r.pending.map(function(x){
    var emo = x.kind==='ot' ? ico('clock') : typeIco(x.type);
    var when, amt;
    if(x.kind==='ot'){
      when = esc(x.date)+(x.startTime?(' · '+esc(x.startTime)+'–'+esc(x.endTime)):'');
      amt = x.hours+' ชม.';
    } else {
      when = esc(x.date)+(x.endDate&&x.endDate!==x.date?(' – '+esc(x.endDate)):'');
      amt = x.days+' วัน';
    }
    var d = 'data-kind="'+x.kind+'" data-id="'+esc(x.id)+'" data-name="'+esc(x.name)+'" data-uid="'+esc(x.userId||'')+'" data-empid="'+esc(x.empId||'')+'"';
    // เหตุผล + สิทธิ์คงเหลือ (ช่วยตัดสินใจในการ์ดเลย ไม่ต้องกดดูประวัติ)
    var info = '';
    if(x.reason) info += '<div class="pend-info">'+ico('message')+' '+esc(x.reason)+'</div>';
    if(x.kind!=='ot' && x.remaining!=null) info += '<div class="pend-info bal">'+ico('ticket')+' สิทธิ์'+esc(x.type)+'คงเหลือ <b>'+balNum(x.remaining)+'</b> วัน</div>';
    return '<div class="pend">'+
      '<div class="pend-l">'+
        '<div class="pend-kind'+(x.kind==='ot'?' ot':'')+'">'+(x.kind==='ot'?ico('clock')+' คำขอ OT':ico('clipboard')+' คำขอลา')+'</div>'+
        '<div class="pend-top">'+(x.photo?empAvatar(x,34):'<div class="hist-ic">'+emo+'</div>')+'<div class="hist-main">'+
          '<div class="hist-type">'+esc(x.name)+(x.resubmit?' <span class="re-badge">'+ico('rotate')+' แก้ไขส่งใหม่</span>':'')+'</div>'+
          '<div class="hist-meta">'+esc(x.type)+' · '+when+' · <b>'+amt+'</b> · '+esc(x.id)+'</div></div></div>'+
        info+
      '</div>'+
      '<div class="pend-r">'+
        '<div class="pend-main2">'+
          '<button class="pend-btn no" data-rej="1" '+d+'>'+ico('x')+' ไม่อนุมัติ</button>'+
          '<button class="pend-btn ok" data-appr="1" '+d+'>'+ico('check')+' อนุมัติ</button>'+
        '</div>'+
        '<div class="pend-sub">'+
          '<button class="pend-btn hist" data-hist="1" '+d+'>'+ico('chart')+' ประวัติ</button>'+
          (x.kind!=='ot' ? '<button class="pend-btn doc" data-doc="1" '+d+'>'+ico('paperclip')+' ขอเอกสาร</button>' : '')+
          '<button class="pend-btn redit" data-redit="1" '+d+'>'+ico('pencil')+' ส่งกลับแก้ไข</button>'+
          (x.docUrl ? '<button class="pend-btn viewdoc" data-viewdoc="1" '+d+'>'+ico('send')+' ดูแนบ</button>' : '')+
        '</div>'+
      '</div>'+
      '</div>'; }).join('')
    : '<div class="empty" style="padding:20px"><div class="e-emo">'+ico('check','e-ico')+'</div><div class="e-txt">ไม่มีรายการค้างอนุมัติ</div></div>';
  var pendCard='<div class="card"><div class="card-title"><span class="ic"></span>รออนุมัติ ('+r.pending.length+')</div>'+
    (r.pending.length?'<div class="hr-note ok2">'+ico('info')+' กดอนุมัติ/ไม่อนุมัติได้เลย · ระบบแจ้งพนักงานทาง LINE อัตโนมัติ</div>':'')+
    '<div class="hr-pend-list">'+pend+'</div></div>';

  // ประวัติทั้งบริษัท — แท็บ ลา/OT/ลงทะเบียน · เรียงวันที่ใหม่→เก่า · lazy load
  var histCard='<div class="card"><div class="card-title"><span class="ic"></span>'+ico('scroll')+' ประวัติทั้งบริษัท</div>'+
    '<div class="htabs">'+
      '<button class="htab'+(S.hrHist==='all'?' sel':'')+'" data-hh="all">'+ico('folder')+' ทั้งหมด</button>'+
      '<button class="htab'+(S.hrHist==='leave'?' sel':'')+'" data-hh="leave">'+ico('clipboard')+' การลา</button>'+
      '<button class="htab'+(S.hrHist==='ot'?' sel ot':'')+'" data-hh="ot">⏰ OT</button>'+
      '<button class="htab'+(S.hrHist==='reg'?' sel':'')+'" data-hh="reg">'+ico('user-plus')+' ลงทะเบียน</button>'+
    '</div>'+
    '<div id="hrHistBody"><div class="skel" style="height:64px"></div></div></div>';

  return '<div id="docDash"></div>' + sumCard+pendCard+histCard;
}

// ════════════ แผง HR: ตัวกรองสรุป (รอบ/เดือน/ปี/ช่วงวันที่) ════════════
var TH_MO_SHORT=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
function hrSumFilterBar(){
  var f=S.hrSum, now=new Date(), curY=now.getFullYear()+543;
  var modeSel='<select class="hr-fsel" id="hrSumMode">'+
    [['period','รอบเดือนนี้ (26–25)'],['month','เลือกเดือน'],['year','เลือกปี'],['range','ช่วงวันที่']]
      .map(function(o){ return '<option value="'+o[0]+'"'+(f.mode===o[0]?' selected':'')+'>'+o[1]+'</option>'; }).join('')+'</select>';
  // ปี (พ.ศ.) ย้อนหลัง 4 ปี
  var years=[]; for(var y=curY;y>=curY-4;y--) years.push(y);
  var yearOpts=years.map(function(y){ return '<option value="'+y+'"'+((f.year||curY)===y?' selected':'')+'>'+y+'</option>'; }).join('');
  var monthOpts=TH_MO_SHORT.map(function(m,i){ return '<option value="'+(i+1)+'"'+((f.month||(now.getMonth()+1))===(i+1)?' selected':'')+'>'+m+'</option>'; }).join('');
  var inputs='';
  if(f.mode==='month') inputs='<select class="hr-fsel" id="hrSumMonth">'+monthOpts+'</select><select class="hr-fsel" id="hrSumYear">'+yearOpts+'</select>';
  else if(f.mode==='year') inputs='<select class="hr-fsel" id="hrSumYear">'+yearOpts+'</select>';
  else if(f.mode==='range') inputs='<input type="date" class="hr-fdate" id="hrSumFrom" value="'+esc(f.from)+'"><span class="hr-fdash">–</span><input type="date" class="hr-fdate" id="hrSumTo" value="'+esc(f.to)+'">';
  return '<div class="hr-filter">'+ico('search')+' '+modeSel+inputs+'<button class="hr-fbtn" id="hrSumGo">ดูข้อมูล</button></div>';
}
function hrSumGrids(lv, ot, label){
  var stat=function(num,lb){ return '<div class="hr-stat"><div class="hr-num">'+num+'</div><div class="hr-lb">'+lb+'</div></div>'; };
  return '<div class="hr-sum-lb">'+ico('calendar')+' '+esc(label||'')+'</div>'+
    '<div class="hr-sum-2col">'+
      '<div class="hr-sum-block"><div class="hr-sum-h">การลา</div>'+
        '<div class="hr-grid">'+stat(lv.total,'ยื่นทั้งหมด')+stat(lv.approved,'อนุมัติ')+stat(lv.pending,'รออนุมัติ')+stat(lv.rejected,'ไม่อนุมัติ')+'</div></div>'+
      '<div class="hr-sum-block ot"><div class="hr-sum-h">OT</div>'+
        '<div class="hr-grid ot">'+stat(ot.count,'รายการ')+stat(ot.approved,'อนุมัติ')+stat(ot.pending,'รออนุมัติ')+stat(ot.rejected,'ไม่อนุมัติ')+'</div></div>'+
    '</div>';
}
function wireHrSumFilter(){
  var mode=document.getElementById('hrSumMode');
  if(mode) mode.addEventListener('change', function(){
    S.hrSum.mode=mode.value;
    // re-render แถบตัวกรอง (input เปลี่ยนตามโหมด) — คงค่าการ์ดเดิมไว้
    var bar=document.querySelector('.hr-filter'); if(bar) bar.outerHTML=hrSumFilterBar(); wireHrSumFilter();
  });
  var go=document.getElementById('hrSumGo');
  if(go) go.addEventListener('click', loadHrSummary);
}
function loadHrSummary(){
  var f=S.hrSum;
  var my=document.getElementById('hrSumYear'), mm=document.getElementById('hrSumMonth');
  var fr=document.getElementById('hrSumFrom'), to=document.getElementById('hrSumTo');
  if(my) f.year=+my.value; if(mm) f.month=+mm.value;
  if(fr) f.from=isoToThai(fr.value); if(to) f.to=isoToThai(to.value);
  if(f.mode==='range' && (!f.from||!f.to)) return toast('เลือกช่วงวันที่ให้ครบค่ะ','err');
  var g=document.getElementById('hrSumGrid'); if(g) g.innerHTML='<div class="skel" style="height:120px"></div>';
  api('hrSummary',{mode:f.mode,year:f.year,month:f.month,from:f.from,to:f.to}).then(function(r){
    var gg=document.getElementById('hrSumGrid'); if(!gg) return;
    if(!r.ok){ gg.innerHTML='<div class="hr-note">'+esc(r.error||'โหลดไม่ได้')+'</div>'; return; }
    gg.innerHTML=hrSumGrids(r.leave, r.ot, r.label);
  }).catch(function(e){ var gg=document.getElementById('hrSumGrid'); if(gg) gg.innerHTML='<div class="hr-note">'+esc(String(e.message||e))+'</div>'; });
}
// "yyyy-mm-dd" (input date) → "dd/MM/yyyy" พ.ศ.
function isoToThai(iso){ if(!iso) return ''; var p=iso.split('-'); if(p.length!==3) return ''; return p[2]+'/'+p[1]+'/'+((+p[0])+543); }

// ════════════ แผง HR: ประวัติทั้งบริษัท (4 แท็บ) ════════════
function loadHrHistory(){
  // โหลดครั้งเดียว cache ใน S.hrHistData แล้วสลับแท็บ client-side
  if(S.hrHistData){ paintHrHistory(); return; }
  api('hrAllHistory',{}).then(function(r){
    if(!r.ok){ var b=document.getElementById('hrHistBody'); if(b) b.innerHTML=emptyBox(ico('lock','e-ico'),r.error||'โหลดไม่ได้'); return; }
    S.hrHistData = r; paintHrHistory();
  }).catch(function(e){ var b=document.getElementById('hrHistBody'); if(b) b.innerHTML=emptyBox(ico('alert','e-ico'),String(e.message||e)); });
}
function paintHrHistory(){
  var b=document.getElementById('hrHistBody'); if(!b||!S.hrHistData) return;
  var d=S.hrHistData, t=S.hrHist, list, empty;
  if(t==='leave'){ list=d.leave; empty='ยังไม่มีประวัติการลา'; }
  else if(t==='ot'){ list=d.ot; empty='ยังไม่มีประวัติ OT'; }
  else if(t==='reg'){ list=d.reg; empty='ยังไม่มีประวัติลงทะเบียน'; }
  else { list=d.leave.concat(d.ot).concat(d.reg).sort(function(a,b){ return (b.ts||0)-(a.ts||0); }); empty='ยังไม่มีประวัติ'; }
  var showKind = (S.hrHist==='all');
  b.innerHTML = !list.length ? emptyBox(ico('leaf','e-ico'),empty) :
    '<div class="hr-hist">'+list.map(function(h){ return histRow(h, showKind); }).join('')+'</div>';
}
// ป้ายประเภท (โชว์ในแท็บ "ทั้งหมด" เพื่อแยก ลา/OT/ลงทะเบียน)
function kindChip(kind){
  if(kind==='ot') return '<span class="hist-kind k-ot">OT</span>';
  if(kind==='reg') return '<span class="hist-kind k-reg">ลงทะเบียน</span>';
  return '<span class="hist-kind k-leave">การลา</span>';
}
// บรรทัดผู้อนุมัติ/ไม่อนุมัติ + เวลา (จาก audit log) — เฉพาะลา/OT ที่ดำเนินการแล้ว
function apprLine(h){
  if(!h.by) return '';
  var st=String(h.status||''), rej=st.indexOf('ไม่อนุมัติ')>=0;
  return '<div class="appr-by'+(rej?' no':'')+'">'+(rej?'✕ ไม่อนุมัติ':'✓ อนุมัติ')+'โดย '+esc(h.by)+
    (h.decidedAt?' · '+esc(h.decidedAt):'')+
    (rej&&h.decideReason?' · '+ico('pencil')+' '+esc(h.decideReason):'')+'</div>';
}
// render 1 รายการประวัติตามชนิด (leave/ot/reg) — reuse ทั้งแท็บเดี่ยว + แท็บทั้งหมด
function histRow(h, showKind){
  var chip = showKind ? kindChip(h.kind) : '';
  if(h.kind==='ot'){
    return '<div class="hist"><div class="hist-ic">'+ico('clock')+'</div>'+
      '<div class="hist-main"><div class="hist-type">'+chip+esc(h.name)+'</div>'+
      '<div class="hist-meta"><span>'+esc(h.otType||'OT')+'</span><span>·</span><span>'+ico('calendar')+' '+esc(h.otDate)+'</span><span>·</span>'+
      '<span>'+ico('clock')+' '+esc(h.startTime)+'–'+esc(h.endTime)+'</span><span>·</span><span>'+h.hours+' ชม.</span></div>'+apprLine(h)+'</div>'+
      statusBadge(h.status)+'</div>';
  }
  if(h.kind==='reg'){
    var meta='<span>'+(h.empId?esc(h.empId):'ยังไม่มีในระบบ')+(h.dept?' · '+esc(h.dept):'')+'</span><span>·</span><span>'+ico('calendar')+' '+esc(h.submittedAt)+'</span>';
    if(h.by) meta+='<span>·</span><span>'+(h.status==='rejected'?'✕':'✓')+' โดย '+esc(h.by)+(h.decidedAt?' · '+esc(h.decidedAt):'')+'</span>';
    if(h.reason) meta+='<span>·</span><span>'+ico('message')+' '+esc(h.reason)+'</span>';
    return '<div class="hist"><div class="hist-ic">'+ico('clipboard')+'</div>'+
      '<div class="hist-main"><div class="hist-type">'+chip+esc(h.name)+'</div>'+
      '<div class="hist-meta">'+meta+'</div></div>'+regBadge(h.status)+'</div>';
  }
  // leave (default)
  var dt=h.startDate+(h.endDate&&h.endDate!==h.startDate?' — '+h.endDate:'');
  return '<div class="hist"><div class="hist-ic">'+typeIco(h.type)+'</div>'+
    '<div class="hist-main"><div class="hist-type">'+chip+esc(h.name)+'</div>'+
    '<div class="hist-meta"><span>'+esc(h.type)+'</span><span>·</span><span>'+ico('calendar')+' '+dt+'</span><span>·</span><span>'+ico('hourglass')+' '+h.days+' วัน</span></div>'+apprLine(h)+'</div>'+
    statusBadge(h.status)+'</div>';
}
// badge สถานะลงทะเบียน (pending/approved/rejected)
function regBadge(st){
  st=String(st||'');
  if(st==='approved') return '<span class="badge ok">'+ico('check')+' อนุมัติ</span>';
  if(st==='rejected') return '<span class="badge no">'+ico('x')+' ปฏิเสธ</span>';
  return '<span class="badge wait">⏳ รออนุมัติ</span>';
}

// ════════════ VIEW: ปฏิทินการลารวม (HR · APPROVER+) ════════════
var LC_TYPES = {
 sick:{e:'',label:'ลาป่วย'}, biz:{e:'',label:'ลากิจ'}, vac:{e:'',label:'ลาพักร้อน'},
 unpaid:{e:'',label:'ไม่รับค่าจ้าง'}, bday:{e:'',label:'ลาวันเกิด'}, special:{e:'',label:'วันเกิดคนพิเศษ'}
};
function dkeyISO(d){ return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
function lcDayKey(y,mo1,d){ return y+'-'+('0'+mo1).slice(-2)+'-'+('0'+d).slice(-2); }
function viewLeaveCal(){
  var legend = Object.keys(LC_TYPES).map(function(k){
    return '<span class="lc-li"><i class="lc-sw lev-'+k+'"></i>'+LC_TYPES[k].label+'</span>'; }).join('');
  var typeOpts = '<option value="">ทุกประเภท</option>'+Object.keys(LC_TYPES).map(function(k){
    return '<option value="'+k+'"'+(S.leaveCalType===k?' selected':'')+'>'+LC_TYPES[k].label+'</option>'; }).join('');
  return '<div class="lc-top">'+
      '<div class="lc-nav"><button id="lcPrev" class="lc-navbtn">‹</button>'+
        '<span class="lc-month" id="lcMonth">…</span>'+
        '<button id="lcNext" class="lc-navbtn">›</button></div>'+
      '<div class="lc-filters">'+
        '<select class="lc-sel" id="lcDept"><option value="">ทุกแผนก</option></select>'+
        '<select class="lc-sel" id="lcType">'+typeOpts+'</select></div>'+
    '</div>'+
    '<div class="lc-legend">'+legend+'</div>'+
    '<div class="lc-body"><div class="lc-cal" id="lcCal"><div class="skel" style="height:300px"></div></div>'+
      '<aside class="lc-detail" id="lcDetail"></aside></div>';
}
function wireLeaveCal(){
  if(!S.leaveCalMonth){ var n=new Date(); S.leaveCalMonth=new Date(n.getFullYear(),n.getMonth(),1); }
  var prev=document.getElementById('lcPrev'), next=document.getElementById('lcNext');
  prev&&prev.addEventListener('click',function(){ var m=S.leaveCalMonth; S.leaveCalMonth=new Date(m.getFullYear(),m.getMonth()-1,1); S.leaveCalSel=null; loadLeaveCal(); });
  next&&next.addEventListener('click',function(){ var m=S.leaveCalMonth; S.leaveCalMonth=new Date(m.getFullYear(),m.getMonth()+1,1); S.leaveCalSel=null; loadLeaveCal(); });
  var dp=document.getElementById('lcDept'), tp=document.getElementById('lcType');
  dp&&dp.addEventListener('change',function(){ S.leaveCalDept=dp.value; renderLeaveCalGrid(); renderLeaveCalPanel(S.leaveCalSel); });
  tp&&tp.addEventListener('change',function(){ S.leaveCalType=tp.value; renderLeaveCalGrid(); renderLeaveCalPanel(S.leaveCalSel); });
}
function loadLeaveCal(){
  if(!S.leaveCalMonth){ var n=new Date(); S.leaveCalMonth=new Date(n.getFullYear(),n.getMonth(),1); }
  var y=S.leaveCalMonth.getFullYear(), mo1=S.leaveCalMonth.getMonth()+1;
  var ml=document.getElementById('lcMonth'); if(ml) ml.textContent=TH_MONTHS[mo1-1]+' '+(y+543);
  api('hrLeaveCalendar',{year:y,month:mo1}).then(function(r){
    var c=document.getElementById('lcCal'); if(!c) return;
    if(!r.ok){ c.innerHTML=emptyBox(ico('lock','e-ico'),r.error||'ไม่มีสิทธิ์'); return; }
    S.leaveCalItems=r.items||[];
    var dp=document.getElementById('lcDept');
    if(dp && (r.depts||[]).length){ dp.innerHTML='<option value="">ทุกแผนก</option>'+r.depts.map(function(d){
      return '<option value="'+esc(d)+'"'+(S.leaveCalDept===d?' selected':'')+'>'+esc(d)+'</option>'; }).join(''); }
    renderLeaveCalGrid(); renderLeaveCalPanel(S.leaveCalSel);
  }).catch(function(e){ var c=document.getElementById('lcCal'); if(c)c.innerHTML=emptyBox(ico('alert','e-ico'),String(e.message||e)); });
}
function lcFiltered(){
  return S.leaveCalItems.filter(function(it){
    if(S.leaveCalDept && it.dept!==S.leaveCalDept) return false;
    if(S.leaveCalType && it.typeKey!==S.leaveCalType) return false;
    return true; });
}
function renderLeaveCalGrid(){
  var c=document.getElementById('lcCal'); if(!c) return;
  var cv=S.leaveCalMonth, y=cv.getFullYear(), mo=cv.getMonth();
  var first=new Date(y,mo,1).getDay(), dim=new Date(y,mo+1,0).getDate(), prevDim=new Date(y,mo,0).getDate();
  var items=lcFiltered(), todayK=dkeyISO(new Date());
  function on(key){ return items.filter(function(it){ return it.start<=key && key<=it.end; }); }
  var h='<div class="lc-grid">';
  ['อา','จ','อ','พ','พฤ','ศ','ส'].forEach(function(dn,i){ h+='<div class="lc-dow'+(i===0||i===6?' we':'')+'">'+dn+'</div>'; });
  for(var i=0;i<first;i++){ h+='<div class="lc-cell other"><div class="lc-dn">'+(prevDim-first+1+i)+'</div></div>'; }
  for(var d=1;d<=dim;d++){
    var key=lcDayKey(y,mo+1,d), day=on(key), dow=new Date(y,mo,d).getDay();
    var hn=holidayName(new Date(y,mo,d));   // วันหยุดบริษัท (ใช้ helper เดิม + S.holidays)
    var cls=((dow===0||dow===6)?' we':'')+(key===todayK?' today':'')+(key===S.leaveCalSel?' sel':'')+(hn?' lc-hol':'');
    var holChip=hn?'<div class="lc-holname" title="'+esc(hn)+'">'+ico('sparkle')+' '+esc(hn)+'</div>':'';
    var evs=day.slice(0,3).map(function(it){ return '<div class="lc-ev lev-'+it.typeKey+(it.pending?' pend':'')+'" title="'+esc(it.name)+' · '+esc(it.typeName)+'">'+esc(it.name)+'</div>'; }).join('');
    var more=day.length>3?'<div class="lc-more">+'+(day.length-3)+' อื่นๆ</div>':'';
    h+='<div class="lc-cell'+cls+'" data-k="'+key+'"><div class="lc-dn">'+d+'</div>'+holChip+'<div class="lc-evs">'+evs+more+'</div></div>';
  }
  var trail=(7-((first+dim)%7))%7;
  for(var t=1;t<=trail;t++){ h+='<div class="lc-cell other"><div class="lc-dn">'+t+'</div></div>'; }
  h+='</div>';
  c.innerHTML=h;
  c.querySelectorAll('.lc-cell[data-k]').forEach(function(el){
    el.addEventListener('click',function(){ S.leaveCalSel=el.dataset.k; renderLeaveCalGrid(); renderLeaveCalPanel(S.leaveCalSel); }); });
}
function renderLeaveCalPanel(key){
  var el=document.getElementById('lcDetail'); if(!el) return;
  var items=lcFiltered();
  var foot='<div class="lc-foot">'+ico('clipboard')+' เดือนนี้ <b>'+items.length+'</b> ใบลา · แตะวันบนปฏิทินเพื่อดูรายละเอียด</div>';
  if(!key){ el.innerHTML='<div class="lc-dempty"><span class="e">'+ico('calendar')+'</span>เลือกวันบนปฏิทิน</div>'+foot; return; }
  var day=items.filter(function(it){ return it.start<=key && key<=it.end; });
  var p=key.split('-'), dlabel=(+p[2])+' '+TH_MONTHS[(+p[1])-1]+' '+((+p[0])+543);
  var head='<div class="lc-ddate">'+dlabel+'</div><div class="lc-dsub">'+day.length+' รายการลา</div>';
  var cards=day.length?day.map(function(it){
    return '<div class="lc-dcard lev-'+it.typeKey+'"><div class="lc-dnm">'+(LC_TYPES[it.typeKey]?LC_TYPES[it.typeKey].e:ico('clipboard'))+' '+esc(it.name)+'</div>'+
      '<div class="lc-dmt">'+esc(it.dept||'')+' · '+esc(it.typeName)+' · '+it.days+' วัน</div>'+
      '<span class="badge '+(it.pending?'wait':'ok')+'">'+(it.pending?'⏳ รออนุมัติ':ico('check')+' อนุมัติ')+'</span></div>'; }).join('')
    : '<div class="lc-dempty"><span class="e">'+ico('leaf')+'</span>วันนี้ไม่มีใครลา</div>';
  el.innerHTML=head+cards+foot;
}

// ════════════════════════════════════════════════════════════════
//  VIEW: จัดการการลา (mgleave · PC HR Console เฟส 3 · ADMIN/OWNER)
//  list+filter · ✏️ แก้ใบรออนุมัติ · 🚫 ยกเลิก(คืนโควต้า) · ➕ ยื่นแทน · 🎫 โควต้า · 📤 export
// ════════════════════════════════════════════════════════════════
// "dd/MM/yyyy(พ.ศ./ค.ศ.)" → "yyyy-MM-dd"(ค.ศ.) สำหรับ prefill input date
function thaiToIso(s){ var p=String(s||'').split('/'); if(p.length<3) return ''; var d=+p[0],m=+p[1],y=+p[2]; if(y>2500)y-=543; if(!d||!m||!y) return ''; return y+'-'+('0'+m).slice(-2)+'-'+('0'+d).slice(-2); }

function viewMgleave(){
  if(!(S.profile&&S.profile.canAdmin)) return backBar()+emptyBox(ico('lock'),'เฉพาะผู้ดูแลระบบ (ADMIN/OWNER)');
 var tabs=[['report',' สรุปการลา'],['list',' รายการใบลา'],['files',' ไฟล์รายงาน'],['tools',' ตั้งค่า']];
  return backBar()+
    '<div class="mg-tabs">'+tabs.map(function(t){return '<button class="mg-tab'+(S.mgTab===t[0]?' on':'')+'" data-mgtab="'+t[0]+'">'+t[1]+'</button>';}).join('')+'</div>'+
    '<div id="mgTab"></div>';
}
// ── แท็บ 📋 รายการใบลา ──
function mgListTabHtml(){
  return '<div class="card">'+
    '<div class="hr-note ok2">'+ico('clipboard')+' ดู/แก้/ยกเลิกใบลารายใบ · คลิกแถวดูรายละเอียด</div>'+
    mgFilterBar()+
    '<div class="mg-tools">'+
      '<input type="text" id="mgSearch" class="mg-srch" placeholder="ค้นชื่อ/รหัสพนักงาน…" value="'+esc(S.mgSearch||'')+'">'+
      '<select id="mgStatus" class="hr-fsel">'+
        [['all','ทุกสถานะ'],['pending','รออนุมัติ'],['approved','อนุมัติแล้ว'],['rejected','ไม่อนุมัติ'],['cancel','ยกเลิก']]
          .map(function(o){return '<option value="'+o[0]+'"'+(S.mgStatus===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+
      '</select>'+
      '<button class="mg-act export" id="mgExportBtn">'+ico('upload')+' Export</button>'+
    '</div>'+
  '</div>'+
  '<div id="mgList"><div class="card"><div class="skel" style="height:120px"></div></div></div>';
}
// ── แท็บ ⚙️ ตั้งค่า (ยื่นแทน · โควต้า) ──
function mgToolsTabHtml(){
  return '<div class="card">'+
    '<div class="hr-note ok2">'+ico('settings')+' เครื่องมือจัดการ — ทุกการกระทำบันทึก audit + แจ้ง LINE พนักงาน</div>'+
    '<div class="mg-toolgrid">'+
      '<button class="mg-tool add" id="mgAddBtn"><b>'+ico('plus')+' ยื่นลาแทนพนักงาน</b><span>เลือกคน + กรอกใบลา · ติ๊ก "อนุมัติเลย" ได้</span></button>'+
      '<button class="mg-tool quota" id="mgQuotaBtn"><b>'+ico('ticket')+' ปรับโควต้าวันลา</b><span>แก้โควต้าทั้งปีรายคน 6 ประเภท</span></button>'+
    '</div>'+
  '</div>'+
  // 📊 รายงานการลารายเดือน — ลำดับเดียวกับฝั่ง OT (สร้าง → ตรวจ → ส่ง)
  '<div class="card">'+
    '<div class="hr-note ok2">'+ico('chart')+' รายงานการลารายเดือน — รวมวันลาที่อนุมัติแล้วในรอบ 26–25 · เดิมทำได้จากเมนูในชีตเท่านั้น</div>'+
    '<div class="mg-toolgrid">'+
      '<button class="mg-tool" id="mglBuildBtn"><b>'+ico('chart')+' 1. สร้างรายงานเดือน</b><span>เขียนแท็บ "รายงาน MM-YYYY" ในชีตระบบลา · กดซ้ำได้ สร้างทับให้</span></button>'+
      '<button class="mg-tool" id="mglExportBtn"><b>'+ico('upload')+' 2. ออกไฟล์รายงาน</b><span>คัดลอกแท็บเป็นไฟล์แชร์ → เปิดตรวจก่อนส่ง · ยังไม่ส่ง LINE</span></button>'+
      '<button class="mg-tool" id="mglSendBtn"><b>'+ico('send')+' 3. ส่งเข้ากลุ่ม HR</b><span>ส่งสรุปยอด + ลิงก์ไฟล์เข้ากลุ่ม LINE ของ HR</span></button>'+
      '<button class="mg-tool" id="mglStatusBtn"><b>'+ico('clipboard')+' สถานะเดือนนี้ (ดูย้อนหลัง)</b><span>สร้างแล้วยัง · ไฟล์ล่าสุด · ส่งกลุ่มไปเมื่อไร</span></button>'+
    '</div>'+
    '<div class="hr-note" style="margin-top:12px">'+ico('rotate')+' ลำดับปลอดภัย: <b>1.สร้างรายงาน</b> → <b>2.ออกไฟล์</b> (เปิดตรวจ) → <b>3.ส่งกลุ่ม</b> · '+ico('alert')+' ข้อมูลการลาเป็นข้อมูลส่วนบุคคล ส่งเข้ากลุ่ม HR เท่านั้น</div>'+
  '</div>'+
  '<div id="mglResult"></div>'+
  '<div class="card">'+
    '<div class="mg-head">'+ico('ticket')+' โควต้าวันลารายคน (ทั้งปี) <span class="mg-sub2">— คลิกแถวเพื่อแก้โควต้า</span></div>'+
    '<div id="mgQuotaTbl"><div class="skel" style="height:120px"></div></div>'+
  '</div>';
}

// ════════════ 📊 รายงานการลารายเดือน (ทำจากเว็บ) ════════════
// ลำดับเดียวกับฝั่ง OT: 1) สร้างรายงาน → 2) ออกไฟล์ (เปิดตรวจ) → 3) ส่งเข้ากลุ่ม HR
// แกนคำนวณใช้ตัวเดิมที่เมนูชีตใช้ ตัวเลขจึงตรงกับที่เคยส่งทุกเดือน
function _mglYMSelect_(){
  var TH=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  var now=new Date(), nowY=now.getFullYear()+543;
  // ค่าเริ่ม = รอบที่เพิ่งปิด (วันที่ 26 ขึ้นไปนับเป็นรอบเดือนถัดไป)
  var curM=now.getMonth()+1; if(now.getDate()>=26){ curM++; if(curM>12) curM=1; }
  var mons=''; for(var mo=1;mo<=12;mo++) mons+='<option value="'+mo+'"'+(curM===mo?' selected':'')+'>'+TH[mo-1]+'</option>';
  var yrs=''; for(var y=nowY;y>=nowY-3;y--) yrs+='<option value="'+y+'"'+(nowY===y?' selected':'')+'>'+y+'</option>';
  return '<div class="cfm-row"><span class="cfm-k">เดือน (ปลายรอบ)</span><span class="cfm-v">'+
      '<select class="hr-fsel" id="mglMon">'+mons+'</select> <select class="hr-fsel" id="mglYr">'+yrs+'</select></span></div>'+
    '<div id="mglPrev" class="hr-note" style="margin-top:8px"></div>';
}
function _mglPrev(mEnd, yrBE){
  var yCE=yrBE-543, s=new Date(yCE,mEnd-2,26), e=new Date(yCE,mEnd-1,25), pad=function(n){return (n<10?'0':'')+n;};
  var fmt=function(d){return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+(d.getFullYear()+543);};
  return { label:fmt(s)+' – '+fmt(e), tab:'รายงาน '+pad(mEnd)+'-'+yrBE };
}
function _mglWirePrev(c){
  var upd=function(){ var mo=+c.querySelector('#mglMon').value, yr=+c.querySelector('#mglYr').value, pv=_mglPrev(mo,yr);
    var el=c.querySelector('#mglPrev'); if(el) el.innerHTML=ico('calendar')+' รอบ <b>'+pv.label+'</b> · '+ico('folder')+' แท็บ: '+esc(pv.tab); };
  c.querySelector('#mglMon').addEventListener('change',upd); c.querySelector('#mglYr').addEventListener('change',upd); upd();
}
function _mglPick(c){ return { month:+c.querySelector('#mglMon').value, yearBE:+c.querySelector('#mglYr').value }; }

/** ขั้น 1 — สร้าง/สร้างทับแท็บรายงานในชีตระบบลา */
function openMglBuild(){
  modalForm({ title:'สร้างรายงานการลารายเดือน', emoji:ico('chart'), okLabel:ico('chart')+' สร้างรายงาน',
    body:'<div class="hr-note ok2" style="margin-bottom:10px">รวมวันลาที่ <b>อนุมัติแล้ว</b> ในรอบ → เขียนแท็บ "รายงาน MM-YYYY" ในชีตระบบลา · กดซ้ำได้ ระบบสร้างทับให้</div>'+_mglYMSelect_(),
    onMount:_mglWirePrev,
    onOk:function(c){ var s=_mglPick(c);
      var btn=c.querySelector('[data-cfm-ok]'); if(btn){btn.disabled=true;btn.textContent='กำลังสร้าง…';}
      api('mgLeaveReportBuild',s).then(function(r){
        if(!r.ok){ if(btn){btn.disabled=false;btn.textContent='สร้างรายงาน';} return toast(r.error||'สร้างไม่สำเร็จ','err'); }
        closeConfirm(); renderMglResult('build', r); toast('สร้างรายงาน '+r.tabName+' แล้ว','ok');
      }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent='สร้างรายงาน';} toast(String(e.message||e),'err'); }); }
  });
}

/** ขั้น 2 — คัดลอกแท็บเป็นไฟล์แชร์ (เปิดตรวจก่อนส่ง) */
function openMglExport(){
  modalForm({ title:'ออกไฟล์รายงาน (เปิดตรวจก่อนส่ง)', emoji:ico('upload'), okLabel:ico('upload')+' ออกไฟล์',
    body:'<div class="hr-note ok2" style="margin-bottom:10px">คัดลอกแท็บรายงานเป็นไฟล์ใหม่ + เปิดสิทธิ์ "ใครมีลิงก์ดูได้" · ต้องกดสร้างรายงานเดือนนั้นก่อน</div>'+_mglYMSelect_(),
    onMount:_mglWirePrev,
    onOk:function(c){ var s=_mglPick(c);
      var btn=c.querySelector('[data-cfm-ok]'); if(btn){btn.disabled=true;btn.textContent='กำลังออกไฟล์…';}
      api('mgLeaveReportExport',s).then(function(r){
        if(!r.ok){ if(btn){btn.disabled=false;btn.textContent='ออกไฟล์';}
          if(r.needBuild) return noticeBox('ยังไม่มีรายงานเดือนนี้', r.error+'\n\nกดปุ่ม "1. สร้างรายงานเดือน" ก่อนค่ะ', ico('alert'));
          return toast(r.error||'ออกไฟล์ไม่สำเร็จ','err'); }
        closeConfirm(); renderMglResult('export', r); toast('ออกไฟล์แล้ว','ok');
      }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent='ออกไฟล์';} toast(String(e.message||e),'err'); }); }
  });
}

/** ขั้น 3 — ส่งสรุป + ลิงก์เข้ากลุ่ม HR (ไม่ส่งรายคน) */
function openMglSend(){
  modalForm({ title:'ส่งรายงานเข้ากลุ่ม HR', emoji:ico('send'), okLabel:ico('send')+' ส่งเข้ากลุ่ม',
    body:'<div class="hr-note ok2" style="margin-bottom:10px">ส่งสรุปยอด + ลิงก์ไฟล์เข้า<b>กลุ่ม HR</b> ทาง LINE · ระบบหยิบไฟล์ล่าสุดของเดือนนั้นให้เอง</div>'+_mglYMSelect_()+
      '<div class="hr-note" style="margin-top:8px">'+ico('alert')+' ข้อมูลการลาเป็นข้อมูลส่วนบุคคล — ส่งเข้ากลุ่ม HR เท่านั้น ไม่ส่งให้พนักงานรายคน</div>',
    onMount:_mglWirePrev,
    onOk:function(c){ var s=_mglPick(c);
      var btn=c.querySelector('[data-cfm-ok]'); if(btn){btn.disabled=true;btn.textContent='กำลังส่ง…';}
      api('mgLeaveReportSend',s).then(function(r){
        if(!r.ok){ if(btn){btn.disabled=false;btn.textContent='ส่งเข้ากลุ่ม';}
          if(r.needExport) return noticeBox('ยังไม่มีไฟล์ของเดือนนี้', r.error+'\n\nกดปุ่ม "2. ออกไฟล์รายงาน" ก่อนค่ะ', ico('alert'));
          return toast(r.error||'ส่งไม่สำเร็จ','err'); }
        closeConfirm(); renderMglResult('send', r); toast('ส่งเข้ากลุ่ม HR แล้ว','ok');
      }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent='ส่งเข้ากลุ่ม';} toast(String(e.message||e),'err'); }); }
  });
}

/** เดือนนี้ทำถึงไหนแล้ว — เปิดดูย้อนหลังได้ ไม่ต้องจำเอง */
function openMglStatus(){
  modalForm({ title:'สถานะรายงานเดือนนี้', emoji:ico('clipboard'), okLabel:ico('search')+' ดูสถานะ',
    body:'<div class="hr-note ok2" style="margin-bottom:10px">ดูว่าเดือนที่เลือกสร้างรายงานแล้วหรือยัง · ออกไฟล์ล่าสุดเมื่อไร · ส่งเข้ากลุ่มไปแล้วหรือยัง</div>'+_mglYMSelect_(),
    onMount:_mglWirePrev,
    onOk:function(c){ var s=_mglPick(c);
      api('mgLeaveReportStatus',s).then(function(r){
        if(!r.ok) return toast(r.error||'ดูสถานะไม่ได้','err');
        closeConfirm(); renderMglResult('status', r);
      }).catch(function(e){ toast(String(e.message||e),'err'); }); }
  });
}

function renderMglResult(kind, r){
  var box=document.getElementById('mglResult'); if(!box) return;
  var line=function(k,v){ return '<div class="cfm-row"><span class="cfm-k">'+esc(k)+'</span><span class="cfm-v">'+v+'</span></div>'; };
  var link=function(u,t){ return u?'<a href="'+esc(u)+'" target="_blank" rel="noopener">'+esc(t||'เปิด')+' ↗</a>':'<span class="mg-sub2">—</span>'; };
  var head='', body='';

  if(kind==='build'){
    head=ico('chart')+' สร้างรายงาน <b>'+esc(r.tabName)+'</b> เรียบร้อย';
    body=line('พนักงานในรายงาน', r.empCount+' คน')+line('ใบลาที่นับ', r.leaveCount+' ใบ (อนุมัติแล้ว)')+
         line('แท็บในชีต', link(r.url, r.tabName))+
         '<div class="hr-note" style="margin-top:10px">'+ico('rotate')+' ตรวจในแท็บก่อน → กด <b>2. ออกไฟล์รายงาน</b> → <b>3. ส่งเข้ากลุ่ม HR</b></div>';
  } else if(kind==='export'){
    head=ico('upload')+' ออกไฟล์ <b>'+esc(r.tabName)+'</b> แล้ว';
    body=line('ชื่อไฟล์', esc(r.filename))+line('ลิงก์ (ใครมีลิงก์ดูได้)', link(r.url,'เปิดไฟล์'))+
         '<div class="hr-note" style="margin-top:10px">'+ico('folder')+' ไฟล์เข้าทะเบียนแล้ว — เปิดซ้ำได้ที่แท็บ "ไฟล์รายงาน"</div>';
  } else if(kind==='send'){
    head=ico('send')+' ส่งเข้ากลุ่ม HR แล้ว · <b>'+esc(r.tabName)+'</b>';
    body=line('ลิงก์ที่ส่งไป', link(r.url,'เปิดไฟล์'));
  } else {
    head=ico('clipboard')+' สถานะ <b>'+esc(r.tabName)+'</b>';
    body=line('สร้างรายงานแล้ว', r.hasTab ? (ico('check')+' แล้ว · '+link(r.tabUrl,'เปิดแท็บ')) : (ico('x')+' ยังไม่ได้สร้าง'))+
         line('ไฟล์ล่าสุด', r.lastFile ? (esc(r.lastFile.at)+' · '+link(r.lastFile.url,'เปิดไฟล์')+' <span class="mg-sub2">โดย '+esc(r.lastFile.by)+'</span>') : '<span class="mg-sub2">ยังไม่ได้ออกไฟล์</span>')+
         line('ส่งเข้ากลุ่ม HR', r.lastSend ? (ico('check')+' '+esc(r.lastSend.at)+' <span class="mg-sub2">โดย '+esc(r.lastSend.by)+'</span>') : '<span class="mg-sub2">ยังไม่ได้ส่ง</span>');
  }
  box.innerHTML='<div class="card"><div class="hr-note ok2">'+head+'</div>'+body+'</div>';
}

function mgFilterBar(){
  var f=S.mgFilter;
  var modeSel='<select class="hr-fsel" id="mgMode">'+
    [['period','รอบเดือนนี้ (26–25)'],['month','เลือกเดือน'],['year','เลือกปี'],['range','ช่วงวันที่'],['all','ทั้งหมด']]
      .map(function(o){return '<option value="'+o[0]+'"'+(f.mode===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>';
  var nowY=new Date().getFullYear()+543, curM=new Date().getMonth()+1;
  var yrs=''; for(var y=nowY;y>=nowY-3;y--) yrs+='<option value="'+y+'"'+((f.year||nowY)===y?' selected':'')+'>'+y+'</option>';
  var TH=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  var mons=''; for(var mo=1;mo<=12;mo++) mons+='<option value="'+mo+'"'+((f.month||curM)===mo?' selected':'')+'>'+TH[mo-1]+'</option>';
  var inputs='';
  if(f.mode==='month') inputs='<select class="hr-fsel" id="mgMonth">'+mons+'</select><select class="hr-fsel" id="mgYear">'+yrs+'</select>';
  else if(f.mode==='year') inputs='<select class="hr-fsel" id="mgYear">'+yrs+'</select>';
  else if(f.mode==='range') inputs='<input type="date" class="hr-fdate" id="mgFrom" value="'+esc(thaiToIso(f.from))+'"><span class="hr-fdash">–</span><input type="date" class="hr-fdate" id="mgTo" value="'+esc(thaiToIso(f.to))+'">';
  return '<div class="hr-filter">'+ico('search')+' '+modeSel+inputs+'<button class="hr-fbtn" id="mgGo">ดูข้อมูล</button></div>';
}
function wireMgleave(){
  bindBack();
  if(!(S.profile&&S.profile.canAdmin)) return;
  document.querySelectorAll('[data-mgtab]').forEach(function(el){ el.addEventListener('click',function(){ switchMgTab(el.dataset.mgtab); }); });
  switchMgTab(S.mgTab||'report');
}
function switchMgTab(tab){
  S.mgTab=tab;
  document.querySelectorAll('[data-mgtab]').forEach(function(el){ el.classList.toggle('on', el.dataset.mgtab===tab); });
  var box=document.getElementById('mgTab'); if(!box) return;
  if(tab==='list'){ box.innerHTML=mgListTabHtml(); wireMgListTab(); loadMgleave(); }
  else if(tab==='files'){ box.innerHTML=rptFilesTabHtml('leave'); loadRptMonths('leave'); }
  else if(tab==='tools'){ box.innerHTML=mgToolsTabHtml(); wireMgToolsTab(); ensureMgUsers(); }
  else { box.innerHTML=mgReportTabHtml(); wireMgReportTab(); loadMgReport(); }
}
function ensureMgUsers(){ if(!S.mgUsers) api('adminBootstrap',{}).then(function(r){ if(r.ok){ S.mgUsers=r.users; S.mgRoles=r.roles; } }).catch(function(){}); }
function wireMgListTab(){
  wireMgFilter();
  var s=document.getElementById('mgSearch'); if(s) s.addEventListener('input',function(){ S.mgSearch=s.value; paintMgList(); });
  var st=document.getElementById('mgStatus'); if(st) st.addEventListener('change',function(){ S.mgStatus=st.value; paintMgList(); });
  var ex=document.getElementById('mgExportBtn'); if(ex) ex.addEventListener('click',doMgExport);
  ensureMgUsers();
}
function wireMgToolsTab(){
  var add=document.getElementById('mgAddBtn'); if(add) add.addEventListener('click',function(){ openMgProxy(); });
  var q=document.getElementById('mgQuotaBtn'); if(q) q.addEventListener('click',function(){ openMgQuota(); });
  var rb=document.getElementById('mglBuildBtn');  if(rb) rb.addEventListener('click', openMglBuild);
  var re=document.getElementById('mglExportBtn'); if(re) re.addEventListener('click', openMglExport);
  var rs=document.getElementById('mglSendBtn');   if(rs) rs.addEventListener('click', openMglSend);
  var rt=document.getElementById('mglStatusBtn'); if(rt) rt.addEventListener('click', openMglStatus);
  renderMgQuotaTable();
}
function renderMgQuotaTable(){
  var box=document.getElementById('mgQuotaTbl'); if(!box) return;
  if(!S.mgUsers){ api('adminBootstrap',{}).then(function(r){ if(r.ok){ S.mgUsers=r.users; S.mgRoles=r.roles; } renderMgQuotaTable(); }).catch(function(){ box.innerHTML=emptyBox(ico('alert'),'โหลดรายชื่อไม่ได้'); }); return; }
 var QF=[['sick',' ป่วย'],['biz',' กิจ'],['vac',' พักร้อน'],['bday',' วันเกิด'],['special',' คนพิเศษ'],['unpaid',' ไม่รับเงิน']];
  var us=(S.mgUsers||[]).filter(function(u){return u.lineUserId;}).sort(function(a,b){return String(a.name||'').localeCompare(String(b.name||''),'th');});
  if(!us.length){ box.innerHTML=emptyBox(ico('leaf'),'ยังไม่มีพนักงาน'); return; }
  var head='<tr><th class="ce">#</th><th class="ce">รหัส</th><th class="lft">ชื่อ-นามสกุล</th><th class="lft">แผนก</th>'+QF.map(function(o){return '<th class="ce">'+o[1]+'</th>';}).join('')+'</tr>';
  var rows=us.map(function(u,i){ var q=u.quota||{};
    return '<tr class="mg-tr" data-mgq="'+esc(u.lineUserId)+'"><td class="ce">'+(i+1)+'</td>'+
      '<td class="mg-sub2 ce">'+esc(u.empId||'-')+'</td>'+
      '<td class="lft"><b>'+esc(u.name)+'</b></td><td class="lft">'+esc(u.dept||'-')+'</td>'+
      QF.map(function(o){ var v=q[o[0]]; return '<td class="ce">'+(v!=null?mgNum(v):'-')+'</td>'; }).join('')+'</tr>';
  }).join('');
  box.innerHTML='<div class="mg-tbwrap"><table class="mg-table mg-qt"><thead>'+head+'</thead><tbody>'+rows+'</tbody></table></div>';
  box.querySelectorAll('[data-mgq]').forEach(function(el){ el.addEventListener('click',function(){ openMgQuota(el.dataset.mgq); }); });
}
function wireMgFilter(){
  var mode=document.getElementById('mgMode');
  if(mode) mode.addEventListener('change',function(){ S.mgFilter.mode=mode.value; var bar=document.querySelector('#mgTab .hr-filter'); if(bar) bar.outerHTML=mgFilterBar(); wireMgFilter(); });
  var go=document.getElementById('mgGo'); if(go) go.addEventListener('click',loadMgleave);
}
function loadMgleave(){
  if(!(S.profile&&S.profile.canAdmin)) return;
  var f=S.mgFilter;
  var my=document.getElementById('mgYear'), mm=document.getElementById('mgMonth');
  var fr=document.getElementById('mgFrom'), to=document.getElementById('mgTo');
  if(my) f.year=+my.value; if(mm) f.month=+mm.value;
  if(fr) f.from=isoToThai(fr.value); if(to) f.to=isoToThai(to.value);
  if(f.mode==='range' && (!f.from||!f.to)) return toast('เลือกช่วงวันที่ให้ครบค่ะ','err');
  var box=document.getElementById('mgList'); if(box) box.innerHTML='<div class="card"><div class="skel" style="height:120px"></div></div>';
  api('mgLeaveList',{mode:f.mode,year:f.year,month:f.month,from:f.from,to:f.to}).then(function(r){
    if(!r.ok){ if(box) box.innerHTML=emptyBox(ico('lock','e-ico'),r.error||'โหลดไม่ได้'); return; }
    S.mgData=r; paintMgList();
  }).catch(function(e){ if(box) box.innerHTML=emptyBox(ico('alert','e-ico'),String(e.message||e)); });
}

// ════════════ แท็บ 📊 สรุปวันลารายคน (matrix) ════════════
var MG_RPT_TYPES=[['sick',' ป่วย',true],['biz',' กิจ',true],['vac',' พักร้อน',true],['bday',' วันเกิด',true],['bdaysp',' คนพิเศษ',true],['deduct',' ลาหักเงิน',false]];
function mgNum(n){ n=Number(n)||0; return n%1===0?String(n):n.toFixed(2).replace(/0+$/,'').replace(/\.$/,''); }
function mgRptFilterBar(){
  var f=S.mgRptFilter;
  var modeSel='<select class="hr-fsel" id="mgrMode">'+
    [['period','รอบเดือนนี้ (26–25)'],['month','เลือกเดือน'],['year','เลือกปี'],['range','ช่วงวันที่']]
      .map(function(o){return '<option value="'+o[0]+'"'+(f.mode===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>';
  var nowY=new Date().getFullYear()+543, curM=new Date().getMonth()+1;
  var yrs=''; for(var y=nowY;y>=nowY-3;y--) yrs+='<option value="'+y+'"'+((f.year||nowY)===y?' selected':'')+'>'+y+'</option>';
  var TH=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  var mons=''; for(var mo=1;mo<=12;mo++) mons+='<option value="'+mo+'"'+((f.month||curM)===mo?' selected':'')+'>'+TH[mo-1]+'</option>';
  var inputs='';
  if(f.mode==='month') inputs='<select class="hr-fsel" id="mgrMonth">'+mons+'</select><select class="hr-fsel" id="mgrYear">'+yrs+'</select>';
  else if(f.mode==='year') inputs='<select class="hr-fsel" id="mgrYear">'+yrs+'</select>';
  else if(f.mode==='range') inputs='<input type="date" class="hr-fdate" id="mgrFrom" value="'+esc(thaiToIso(f.from))+'"><span class="hr-fdash">–</span><input type="date" class="hr-fdate" id="mgrTo" value="'+esc(thaiToIso(f.to))+'">';
  return '<div class="hr-filter">'+ico('search')+' '+modeSel+inputs+'<button class="hr-fbtn" id="mgrGo">ดูข้อมูล</button></div>';
}
function mgReportTabHtml(){
  return '<div class="card">'+
    '<div class="hr-note ok2">'+ico('chart')+' สรุปการลา รายคน — เดือนนี้/ในช่วง · สะสมทั้งปี · คงเหลือ · '+ico('dot')+' ไฮไลต์เกินสิทธิ์</div>'+
    mgRptFilterBar()+
    '<div class="mg-tools" style="justify-content:flex-end"><button class="mg-act export" id="mgRptExportBtn">'+ico('upload')+' Export Sheet</button></div>'+
    '<div id="mgReport"><div class="skel" style="height:160px"></div></div>'+
  '</div>';
}
function wireMgReportTab(){
  var ex=document.getElementById('mgRptExportBtn'); if(ex) ex.addEventListener('click',doMgReportExport);
  wireMgrFilter();
}
function wireMgrFilter(){
  var mode=document.getElementById('mgrMode');
  if(mode) mode.addEventListener('change',function(){ S.mgRptFilter.mode=mode.value; var bar=document.querySelector('#mgTab .hr-filter'); if(bar) bar.outerHTML=mgRptFilterBar(); wireMgrFilter(); });
  var go=document.getElementById('mgrGo'); if(go) go.addEventListener('click',loadMgReport);
}
function loadMgReport(){
  if(!(S.profile&&S.profile.canAdmin)) return;
  var f=S.mgRptFilter;
  var my=document.getElementById('mgrYear'), mm=document.getElementById('mgrMonth');
  var fr=document.getElementById('mgrFrom'), to=document.getElementById('mgrTo');
  if(my) f.year=+my.value; if(mm) f.month=+mm.value;
  if(fr) f.from=isoToThai(fr.value); if(to) f.to=isoToThai(to.value);
  if(f.mode==='range' && (!f.from||!f.to)) return toast('เลือกช่วงวันที่ให้ครบค่ะ','err');
  var box=document.getElementById('mgReport'); if(box) box.innerHTML='<div class="skel" style="height:160px"></div>';
  api('mgLeaveReport',{mode:f.mode,year:f.year,month:f.month,from:f.from,to:f.to}).then(function(r){
    if(!r.ok){ if(box) box.innerHTML=emptyBox(ico('lock','e-ico'),r.error||'โหลดไม่ได้'); return; }
    S.mgRptData=r; paintMgReport();
  }).catch(function(e){ if(box) box.innerHTML=emptyBox(ico('alert','e-ico'),String(e.message||e)); });
}
function paintMgReport(){
  var box=document.getElementById('mgReport'); if(!box||!S.mgRptData) return;
  var d=S.mgRptData, ps=d.persons||[], firstLb=esc(d.rangeLabel||'เดือนนี้');
  if(!ps.length){ box.innerHTML=emptyBox(ico('leaf'),'ไม่มีข้อมูลในช่วงที่เลือก'); return; }
  var h1='<tr><th rowspan="2" class="ce">#</th><th rowspan="2" class="ce">รหัส</th><th rowspan="2" class="lft">ชื่อ-นามสกุล</th><th rowspan="2" class="lft">แผนก</th><th rowspan="2" class="ce">เริ่มงาน</th><th rowspan="2" class="ce">สาขา</th>';
  var h2='<tr>';
  MG_RPT_TYPES.forEach(function(t){
    h1+='<th colspan="'+(t[2]?3:2)+'" class="grp ce">'+t[1]+'</th>';
    h2+='<th class="sub ce">'+firstLb+'</th><th class="sub ce">สะสม</th>'+(t[2]?'<th class="sub ce">เหลือ</th>':'');
  });
  h1+='</tr>'; h2+='</tr>';
  var rows=ps.map(function(p,i){
    var tds='';
    MG_RPT_TYPES.forEach(function(t){
      var k=t[0], inr=Number(p.inRange[k])||0, ytd=Number(p.ytd[k])||0;
      tds+='<td class="ce">'+(inr?'<b>'+mgNum(inr)+'</b>':'')+'</td><td class="ce">'+(ytd?mgNum(ytd):'')+'</td>';
      if(t[2]){ var q=Number(p.quota[k])||0, rem=q-ytd, hasQ=q>0;
        var cls=hasQ?(rem<0?'neg':(rem<=1?'low':'')):'';
        tds+='<td class="ce '+cls+'">'+(hasQ?mgNum(rem):'<span class="mg-sub2">–</span>')+'</td>'; }
    });
    return '<tr'+(p.retired?' class="rtd"':'')+'><td class="ce">'+(i+1)+'</td><td class="mg-sub2">'+esc(p.empId)+'</td>'+
      '<td class="lft"><b>'+esc(p.name)+'</b>'+(p.retired?' <span class="mg-sub2">(ลาออก)</span>':'')+'</td>'+
      '<td class="lft">'+esc(p.dept||'-')+'</td><td class="mg-sub2 ce">'+esc(p.startWork||'-')+'</td><td class="ce">'+esc(p.branch||'-')+'</td>'+tds+'</tr>';
  }).join('');
  box.innerHTML='<div class="mg-head">'+ico('chart')+' '+esc(d.label||'')+' · '+ps.length+' คน <span class="mg-legend">'+ico('dot')+' เกินสิทธิ์ · '+ico('dot')+' เหลือ≤1 · – ไม่ได้ตั้งโควต้า</span></div>'+
    '<div class="mg-tbwrap"><table class="mg-table mg-rpt"><thead>'+h1+h2+'</thead><tbody>'+rows+'</tbody></table></div>';
}
function doMgReportExport(){
  var f=S.mgRptFilter;
  toast('กำลังสร้างรายงาน… (อาจใช้เวลาสักครู่)');
  api('mgReportExport',{mode:f.mode,year:f.year,month:f.month,from:f.from,to:f.to}).then(function(r){
    if(!r.ok) return toast(r.error||'export ไม่สำเร็จ','err');
    modalForm({ title:'Export สำเร็จ', emoji:ico('upload'), accent:'leave', okLabel:'↗ เปิดรายงาน',
      body:'<div class="cfm-row"><span class="cfm-k">รายงาน</span><span class="cfm-v">'+esc(r.label||'')+'</span></div>'+
        '<div class="cfm-row"><span class="cfm-k">พนักงาน</span><span class="cfm-v">'+r.count+' คน</span></div>'+
        '<div class="hr-note ok2" style="margin:10px 0">'+ico('file')+' Google Sheet (ใครมีลิงก์ดูได้) — '+ico('alert')+' ข้อมูลส่วนบุคคล อย่าแชร์นอกทีม HR</div>'+
        '<a href="'+esc(r.url)+'" target="_blank" rel="noopener" class="mg-link">'+esc(r.url)+'</a>',
      onOk:function(){ window.open(r.url,'_blank'); closeConfirm(); }
    });
  }).catch(function(e){ toast(String(e.message||e),'err'); });
}
// จัดกลุ่มสถานะ (สำหรับ filter + ปุ่ม) — pending/approved/rejected/cancel
function mgStatusGroup(st){
  st=String(st||'');
  if(st.indexOf('ยกเลิก')>=0) return 'cancel';
  if(st.indexOf('ไม่อนุมัติ')>=0) return 'rejected';
  if(st.indexOf('ส่งกลับ')>=0||st.indexOf('แก้ไข')>=0) return 'pending';
  if(st.indexOf('รอ')>=0) return 'pending';
  if(st.indexOf('อนุมัติ')>=0) return 'approved';
  return 'pending';
}
function mgCounts(list){
  var c={all:list.length,pending:0,approved:0,rejected:0,cancel:0};
  list.forEach(function(it){ var g=mgStatusGroup(it.status); if(c[g]!=null) c[g]++; });
  return c;
}
function mgSummaryBar(c){
  var defs=[['all','ทั้งหมด',c.all],['pending','รอ',c.pending],['approved','อนุมัติ',c.approved],['rejected','ไม่อนุมัติ',c.rejected],['cancel','ยกเลิก',c.cancel]];
  return '<div class="mg-sum">'+defs.map(function(d){
    return '<button class="mg-chip s-'+d[0]+(S.mgStatus===d[0]?' on':'')+'" data-mgf="'+d[0]+'"><b>'+d[2]+'</b><span>'+d[1]+'</span></button>'; }).join('')+'</div>';
}
function paintMgList(){
  var box=document.getElementById('mgList'); if(!box||!S.mgData) return;
  var q=(S.mgSearch||'').trim().toLowerCase();
  var bySearch=S.mgData.leaves.filter(function(it){
    if(!q) return true;
    return String(it.name).toLowerCase().indexOf(q)>=0 || String(it.empId).toLowerCase().indexOf(q)>=0;
  });
  var counts=mgCounts(bySearch), sf=S.mgStatus||'all';
  var list=bySearch.filter(function(it){ return sf==='all'||mgStatusGroup(it.status)===sf; });
  var head='<div class="mg-head">'+ico('clipboard')+' '+esc(S.mgData.label||'')+' · '+S.mgData.count+' ใบ'+(S.mgData.count>500?' (แสดง 500 ล่าสุด)':'')+'</div>';
  var table = !list.length ? emptyBox(ico('leaf'),'ไม่มีใบลาตามเงื่อนไข') :
    '<div class="mg-tbwrap"><table class="mg-table"><thead><tr>'+
      '<th>วันที่ยื่น</th><th class="ce">รหัส</th><th>พนักงาน</th><th>แผนก</th><th>ประเภท</th><th>วันที่ลา</th><th class="ce">จำนวน</th><th class="ce">สถานะ</th><th class="ce">จัดการ</th>'+
    '</tr></thead><tbody>'+list.map(mgRowTable).join('')+'</tbody></table></div>';
  box.innerHTML='<div class="card">'+head+mgSummaryBar(counts)+table+'</div>';
  box.querySelectorAll('[data-mgf]').forEach(function(el){ el.addEventListener('click',function(){ S.mgStatus=el.dataset.mgf; var ss=document.getElementById('mgStatus'); if(ss) ss.value=el.dataset.mgf; paintMgList(); }); });
  box.querySelectorAll('[data-mgrow]').forEach(function(el){ el.addEventListener('click',function(){ openMgDetail(el.dataset.mgrow); }); });
  box.querySelectorAll('[data-mgedit]').forEach(function(el){ el.addEventListener('click',function(ev){ ev.stopPropagation(); openMgEdit(el.dataset.mgedit); }); });
  box.querySelectorAll('[data-mgcancel]').forEach(function(el){ el.addEventListener('click',function(ev){ ev.stopPropagation(); openMgCancel(el.dataset.mgcancel); }); });
  box.querySelectorAll('[data-mgdoc]').forEach(function(el){ el.addEventListener('click',function(ev){ ev.stopPropagation(); window.open(el.dataset.mgdoc,'_blank'); }); });
}
function mgFindLeave(id){ return (S.mgData&&S.mgData.leaves||[]).filter(function(x){return x.id===id;})[0]; }
function mgRowTable(h){
  var grp=mgStatusGroup(h.status);
  var dt=h.startDate+(h.endDate&&h.endDate!==h.startDate?' – '+h.endDate:'');
  // ปุ่มชิดขวา ไม่เว้นช่อง · กว้างเท่ากันทุกปุ่ม · ยกเลิกขวาสุด (2 ก็ชิด 2 · 3 ก็ 3)
  var acts;
  if(grp==='pending'||grp==='approved'){
    var b='';
    if(grp==='pending') b+='<button class="mg-ib edit" data-mgedit="'+esc(h.id)+'">'+ico('pencil')+' แก้ไข</button>';
    if(h.docUrl) b+='<button class="mg-ib doc" data-mgdoc="'+esc(h.docUrl)+'">'+ico('paperclip')+' เอกสารแนบ</button>';
    b+='<button class="mg-ib cx" data-mgcancel="'+esc(h.id)+'">'+ico('ban')+' ยกเลิก</button>';
    acts='<div class="mg-acts2">'+b+'</div>';
  } else acts='<span class="mg-sub2">ปิดแล้ว</span>';
  return '<tr class="mg-tr" data-mgrow="'+esc(h.id)+'">'+
    '<td class="mg-sub2">'+esc(h.submittedAt||'-')+'</td>'+
    '<td class="mg-sub2 ce">'+esc(h.empId||'-')+'</td>'+
    '<td class="lft"><b>'+esc(h.name)+'</b></td>'+
    '<td class="lft">'+esc(h.dept||'-')+'</td>'+
    '<td>'+typeIco(h.type)+' '+esc(h.type)+'</td>'+
    '<td>'+esc(dt)+'</td>'+
    '<td class="ce">'+esc(h.timeDisplay||h.days)+'</td>'+
    '<td class="ce">'+statusBadge(h.status)+'</td>'+
    '<td class="mg-actcell">'+acts+'</td>'+
  '</tr>';
}
// คลิกแถว → รายละเอียดเต็ม + เอกสาร + ปุ่มแก้/ยกเลิก
function openMgDetail(id){
  var h=mgFindLeave(id); if(!h) return;
  var grp=mgStatusGroup(h.status);
  var row=function(k,v){ return '<div class="cfm-row"><span class="cfm-k">'+k+'</span><span class="cfm-v">'+v+'</span></div>'; };
  var body=
    row('พนักงาน', esc(h.name)+(h.empId?' ('+esc(h.empId)+')':''))+
    (h.dept?row('แผนก', esc(h.dept)):'')+
    row('ประเภท', typeIco(h.type)+' '+esc(h.type))+
    row('ช่วงวันลา', esc(h.startDate+(h.endDate&&h.endDate!==h.startDate?' – '+h.endDate:'')))+
    row('จำนวน', esc(h.timeDisplay||h.days+' วัน'))+
    row('วันที่ยื่น', esc(h.submittedAt||'-'))+
    row('สถานะ', statusBadge(h.status))+
    (h.reason?row('เหตุผล', esc(h.reason)):'')+
    (h.by?row('ผู้ดำเนินการ', esc(h.by)+(h.decidedAt?' · '+esc(h.decidedAt):'')):'')+
    row('เลขที่', esc(h.id))+
    (h.docUrl?'<a href="'+esc(h.docUrl)+'" target="_blank" rel="noopener" class="mg-doclink">'+ico('paperclip')+' เปิดเอกสารแนบ</a>':'')+
    ((grp==='pending'||grp==='approved')?'<div class="mg-dacts">'+
      (grp==='pending'?'<button class="pend-btn redit" id="mgdEdit">'+ico('pencil')+' แก้ไข</button>':'')+
      '<button class="pend-btn no" id="mgdCancel">'+ico('ban')+' ยกเลิก</button></div>':'');
  modalForm({ title:'รายละเอียดใบลา', emoji:ico('clipboard'), accent:'leave', okLabel:'ปิด', body:body,
    onMount:function(c){
      var e=c.querySelector('#mgdEdit'); if(e) e.addEventListener('click',function(){ closeConfirm(); openMgEdit(id); });
      var x=c.querySelector('#mgdCancel'); if(x) x.addEventListener('click',function(){ closeConfirm(); openMgCancel(id); });
    },
    onOk:function(){ closeConfirm(); }
  });
}

// ── ตัวช่วยฟอร์มลา (ใช้ร่วม แก้ไข + ยื่นแทน) ──
function mgTypeOptions(sel){
  var lt=S.leaveTypes||{}, out='';
  ['sick','biz','vac','bday','special','unpaid'].forEach(function(k){ if(lt[k]) out+='<option value="'+k+'"'+(sel===k?' selected':'')+'>'+lt[k].emoji+' '+esc(lt[k].name)+'</option>'; });
  return out;
}
function mgPeriodOptions(sel){
  return [['full','เต็มวัน'],['morning','ครึ่งเช้า'],['afternoon','ครึ่งบ่าย'],['hours','ราย ชม.']]
    .map(function(o){return '<option value="'+o[0]+'"'+(sel===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('');
}
function mgEmpOptions(sel){
  var us=S.mgUsers||[], out='<option value="">— เลือกพนักงาน —</option>';
  us.filter(function(u){return u.lineUserId;}).sort(function(a,b){return String(a.name||'').localeCompare(String(b.name||''),'th');})
    .forEach(function(u){ out+='<option value="'+esc(u.lineUserId)+'"'+(sel===u.lineUserId?' selected':'')+'>'+esc(u.name)+(u.empId?' ('+esc(u.empId)+')':'')+'</option>'; });
  return out;
}
function mgLeaveFormBody(o){
  var emp = o.showEmp ? '<label class="field-lb">'+ico('user')+' พนักงาน</label><select id="mgfEmp" class="hr-fsel mg-full">'+mgEmpOptions(o.empSel)+'</select>' : '';
  return emp+
    '<label class="field-lb">'+ico('clipboard')+' ประเภทการลา</label><select id="mgfType" class="hr-fsel mg-full">'+mgTypeOptions(o.type||'vac')+'</select>'+
    '<label class="field-lb">'+ico('calendar')+' วันที่ลา</label><div class="mg-drow"><input type="date" class="hr-fdate" id="mgfFrom" value="'+esc(o.fromIso||'')+'"><span class="hr-fdash">–</span><input type="date" class="hr-fdate" id="mgfTo" value="'+esc(o.toIso||'')+'"></div>'+
    '<label class="field-lb">'+ico('clock')+' ช่วงเวลา</label><select id="mgfPeriod" class="hr-fsel mg-full">'+mgPeriodOptions(o.period||'full')+'</select>'+
    '<div id="mgfTime" class="mg-time"'+(o.period==='hours'?'':' style="display:none"')+'><label class="field-lb">⏰ เวลา (วันเดียว · สูงสุด 8 ชม.)</label><div class="mg-drow"><input type="time" class="hr-fdate" id="mgfSt" value="'+esc(o.stime||'')+'"><span class="hr-fdash">→</span><input type="time" class="hr-fdate" id="mgfEt" value="'+esc(o.etime||'')+'"></div></div>'+
    '<label class="field-lb">'+ico('pencil')+' เหตุผล</label><textarea id="mgfReason" rows="2" placeholder="ระบุเหตุผล (ถ้ามี)…">'+esc(o.reason||'')+'</textarea>';
}
function mgWireFormPeriod(c){
  var ps=c.querySelector('#mgfPeriod'), tm=c.querySelector('#mgfTime');
  if(ps&&tm) ps.addEventListener('change',function(){ tm.style.display = ps.value==='hours'?'':'none'; });
}
function mgReadForm(c){
  return { type:c.querySelector('#mgfType').value,
    startDate:isoToThai(c.querySelector('#mgfFrom').value),
    endDate:isoToThai(c.querySelector('#mgfTo').value||c.querySelector('#mgfFrom').value),
    period:c.querySelector('#mgfPeriod').value,
    startTime:(c.querySelector('#mgfSt')||{}).value||'',
    endTime:(c.querySelector('#mgfEt')||{}).value||'',
    reason:(c.querySelector('#mgfReason').value||'').trim() };
}

// 🚫 ยกเลิกใบลา
function openMgCancel(id){
  var h=mgFindLeave(id); if(!h) return;
  var wasApproved=mgStatusGroup(h.status)==='approved';
  modalForm({ title:'ยกเลิกใบลา', emoji:ico('ban'), accent:'leave', okLabel:ico('ban')+' ยืนยันยกเลิก',
    body:'<div class="cfm-row"><span class="cfm-k">พนักงาน</span><span class="cfm-v">'+esc(h.name)+'</span></div>'+
      '<div class="cfm-row"><span class="cfm-k">ประเภท</span><span class="cfm-v">'+esc(h.type)+'</span></div>'+
      '<div class="cfm-row"><span class="cfm-k">วันที่</span><span class="cfm-v">'+esc(h.startDate+(h.endDate&&h.endDate!==h.startDate?' — '+h.endDate:''))+'</span></div>'+
      '<div class="cfm-row"><span class="cfm-k">จำนวน</span><span class="cfm-v">'+esc(h.timeDisplay||h.days+' วัน')+'</span></div>'+
      (wasApproved?'<div class="hr-note ok2" style="margin:10px 0">'+ico('rotate')+' ใบนี้อนุมัติแล้ว — ยกเลิกจะ<b>คืนสิทธิ์ลา '+h.days+' วัน</b>ให้พนักงานอัตโนมัติ</div>':'')+
      '<label class="field-lb">'+ico('pencil')+' เหตุผลการยกเลิก (แจ้งพนักงานทาง LINE)</label>'+
      '<textarea id="mgCxReason" rows="2" placeholder="เช่น พนักงานแจ้งยกเลิก / ลงผิด…"></textarea>',
    onOk:function(c){
      var reason=(c.querySelector('#mgCxReason').value||'').trim();
      var btn=c.querySelector('[data-cfm-ok]'); if(btn){btn.disabled=true;btn.textContent='กำลังยกเลิก…';}
      api('mgCancelLeave',{leaveId:id,reason:reason}).then(function(r){
 if(!r.ok){ if(btn){btn.disabled=false;btn.textContent=' ยืนยันยกเลิก';} return toast(r.error||'ยกเลิกไม่สำเร็จ','err'); }
 closeConfirm(); toast('ยกเลิกใบลาแล้ว'+(r.restored?' · คืนสิทธิ์ '+r.restored+' วัน':''),'ok'); S.mgData=null; loadMgleave();
 }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent=' ยืนยันยกเลิก';} toast(String(e.message||e),'err'); });
    }
  });
}
// ✏️ แก้ใบลา (รออนุมัติ)
function openMgEdit(id){
  var h=mgFindLeave(id); if(!h) return;
  modalForm({ title:'แก้ไขใบลา', emoji:ico('pencil'), accent:'leave', okLabel:ico('check')+' บันทึก',
    body:'<div class="hr-note ok2" style="margin-bottom:10px">'+ico('pencil')+' '+esc(h.name)+' · '+esc(h.id)+' — บันทึกแล้วยังต้องอนุมัติอีกครั้ง</div>'+
      mgLeaveFormBody({ type:h.typeKey||'vac', period:inferPeriod(h), fromIso:thaiToIso(h.startDate), toIso:thaiToIso(h.endDate), reason:h.reason }),
    onMount:mgWireFormPeriod,
    onOk:function(c){
      var p=mgReadForm(c); if(!p.startDate) return toast('เลือกวันที่ลา','err'); p.leaveId=id;
      var btn=c.querySelector('[data-cfm-ok]'); if(btn){btn.disabled=true;btn.textContent='กำลังบันทึก…';}
      api('mgEditLeave',p).then(function(r){
 if(!r.ok){ if(btn){btn.disabled=false;btn.textContent=' บันทึก';} return toast(r.error||'บันทึกไม่สำเร็จ','err'); }
 closeConfirm(); toast('แก้ไขใบลาแล้ว · '+r.leaveId,'ok'); S.mgData=null; loadMgleave();
 }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent=' บันทึก';} toast(String(e.message||e),'err'); });
    }
  });
}
// ➕ ยื่นลาแทนพนักงาน
function openMgProxy(){
  if(!S.mgUsers) return toast('กำลังโหลดรายชื่อพนักงาน… ลองอีกครั้งค่ะ');
  modalForm({ title:'ยื่นลาแทนพนักงาน', emoji:ico('plus'), accent:'leave', okLabel:ico('plus')+' ยื่นใบลา',
    body:mgLeaveFormBody({ showEmp:true, type:'vac', period:'full' })+
      '<label class="mg-check"><input type="checkbox" id="mgfAuto"><span>'+ico('check')+' อนุมัติเลย (หักโควต้าทันที · ไม่ต้องรออนุมัติ)</span></label>',
    onMount:mgWireFormPeriod,
    onOk:function(c){
      var emp=c.querySelector('#mgfEmp').value; if(!emp) return toast('เลือกพนักงานก่อนค่ะ','err');
      var p=mgReadForm(c); if(!p.startDate) return toast('เลือกวันที่ลา','err');
      p.targetUserId=emp; p.autoApprove=c.querySelector('#mgfAuto').checked?'1':'';
      var btn=c.querySelector('[data-cfm-ok]'); if(btn){btn.disabled=true;btn.textContent='กำลังยื่น…';}
      api('mgProxySubmit',p).then(function(r){
 if(!r.ok){ if(btn){btn.disabled=false;btn.textContent=' ยื่นใบลา';} return toast(r.error||'ยื่นไม่สำเร็จ','err'); }
        closeConfirm(); toast((r.approved?'ยื่นแทน+อนุมัติแล้ว · ':'ยื่นแทนแล้ว (รออนุมัติ) · ')+r.leaveId,'ok'); S.mgData=null; loadMgleave();
 }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent=' ยื่นใบลา';} toast(String(e.message||e),'err'); });
    }
  });
}
// 🎫 ปรับโควต้ารายคน (pre = lineUserId ที่ preselect — จากคลิกแถวตาราง)
function openMgQuota(pre){
  if(!S.mgUsers) return toast('กำลังโหลดรายชื่อพนักงาน… ลองอีกครั้งค่ะ');
 var qf=[['sick',' ลาป่วย'],['biz',' ลากิจ'],['vac',' พักร้อน'],['bday',' วันเกิด'],['special',' คนพิเศษ'],['unpaid',' ไม่รับค่าจ้าง']];
  modalForm({ title:'ปรับโควต้าวันลา', emoji:ico('ticket'), accent:'leave', okLabel:ico('save')+' บันทึกโควต้า',
    body:'<label class="field-lb">'+ico('user')+' พนักงาน</label><select id="mgqEmp" class="hr-fsel mg-full">'+mgEmpOptions(pre||'')+'</select>'+
      '<div class="hr-note" style="margin:10px 0">กรอกเฉพาะช่องที่ต้องการเปลี่ยน (เว้นว่าง=ไม่แก้) · เป็นโควต้า "ทั้งปี"</div>'+
      '<div class="mg-qgrid">'+qf.map(function(o){return '<label class="mg-qf"><span>'+o[1]+'</span><input type="number" min="0" step="0.5" class="mg-qin" data-q="'+o[0]+'" placeholder="—"></label>';}).join('')+'</div>',
    onMount:function(c){
      var sel=c.querySelector('#mgqEmp');
      var fill=function(){
        var u=(S.mgUsers||[]).filter(function(x){return x.lineUserId===sel.value;})[0], q=(u&&u.quota)||{};
        c.querySelectorAll('.mg-qin').forEach(function(inp){ var k=inp.dataset.q; inp.value=''; inp.placeholder=(q[k]!=null?('ปัจจุบัน '+q[k]):'—'); });
      };
      sel.addEventListener('change',fill);
      if(pre){ sel.value=pre; fill(); }
    },
    onOk:function(c){
      var sel=c.querySelector('#mgqEmp'), u=(S.mgUsers||[]).filter(function(x){return x.lineUserId===sel.value;})[0];
      if(!u) return toast('เลือกพนักงานก่อนค่ะ','err');
      var quota={},n=0; c.querySelectorAll('.mg-qin').forEach(function(inp){ if(inp.value!==''){ quota[inp.dataset.q]=+inp.value; n++; } });
      if(!n) return toast('ยังไม่ได้กรอกช่องไหนเลยค่ะ','err');
      var btn=c.querySelector('[data-cfm-ok]'); if(btn){btn.disabled=true;btn.textContent='กำลังบันทึก…';}
      api('setLeaveQuota',{empId:u.empId,quota:quota}).then(function(r){
 if(!r.ok){ if(btn){btn.disabled=false;btn.textContent=' บันทึกโควต้า';} return toast(r.error||'บันทึกไม่สำเร็จ','err'); }
 closeConfirm(); toast('ปรับโควต้า '+u.name+' แล้ว ('+r.changed+' รายการ)','ok');
        S.mgUsers=null; api('adminBootstrap',{}).then(function(rr){ if(rr.ok){ S.mgUsers=rr.users; if(S.mgTab==='tools') renderMgQuotaTable(); } });
 }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent=' บันทึกโควต้า';} toast(String(e.message||e),'err'); });
    }
  });
}
// 📤 Export → Google Sheet
function doMgExport(){
  var f=S.mgFilter;
  toast('กำลังสร้างรายงาน… (อาจใช้เวลาสักครู่)');
  api('mgExportLeave',{mode:f.mode,year:f.year,month:f.month,from:f.from,to:f.to}).then(function(r){
    if(!r.ok) return toast(r.error||'export ไม่สำเร็จ','err');
    modalForm({ title:'Export สำเร็จ', emoji:ico('upload'), accent:'leave', okLabel:'↗ เปิดรายงาน',
      body:'<div class="cfm-row"><span class="cfm-k">ช่วง</span><span class="cfm-v">'+esc(r.label||'')+'</span></div>'+
        '<div class="cfm-row"><span class="cfm-k">จำนวน</span><span class="cfm-v">'+r.count+' ใบ</span></div>'+
        '<div class="hr-note ok2" style="margin:10px 0">'+ico('file')+' ไฟล์ Google Sheet (ใครมีลิงก์ดูได้) — '+ico('alert')+' มีข้อมูลส่วนบุคคล อย่าแชร์นอกทีม HR</div>'+
        '<a href="'+esc(r.url)+'" target="_blank" rel="noopener" class="mg-link">'+esc(r.url)+'</a>',
      onOk:function(){ window.open(r.url,'_blank'); closeConfirm(); }
    });
  }).catch(function(e){ toast(String(e.message||e),'err'); });
}

// ════════════════════════════════════════════════════════════════
//  VIEW: จัดการ OT (mgot · PC HR Console เฟส 4 · ADMIN/OWNER) — 3 แท็บ
//  📊 สรุป OT (คำนวณสด) · 📋 รายการ OT (ดู/แก้/ยกเลิก) · ⚙️ ตั้งค่า (ยื่นแทน)
// ════════════════════════════════════════════════════════════════
function viewMgot(){
  if(!(S.profile&&S.profile.canAdmin)) return backBar()+emptyBox(ico('lock'),'เฉพาะผู้ดูแลระบบ (ADMIN/OWNER)');
 var tabs=[['report',' สรุป OT'],['list',' รายการ OT'],['files',' ไฟล์รายงาน'],['tools',' ตั้งค่า']];
  return backBar()+
    '<div class="mg-tabs">'+tabs.map(function(t){return '<button class="mg-tab'+(S.otTab===t[0]?' on':'')+'" data-ottab="'+t[0]+'">'+t[1]+'</button>';}).join('')+'</div>'+
    '<div id="otTab"></div>';
}
function wireMgot(){
  bindBack();
  if(!(S.profile&&S.profile.canAdmin)) return;
  document.querySelectorAll('[data-ottab]').forEach(function(el){ el.addEventListener('click',function(){ switchOtTab(el.dataset.ottab); }); });
  switchOtTab(S.otTab||'report');
}
function switchOtTab(tab){
  S.otTab=tab;
  document.querySelectorAll('[data-ottab]').forEach(function(el){ el.classList.toggle('on', el.dataset.ottab===tab); });
  var box=document.getElementById('otTab'); if(!box) return;
  if(tab==='list'){ box.innerHTML=otListTabHtml(); wireOtListTab(); loadOtList(); }
  else if(tab==='files'){ box.innerHTML=rptFilesTabHtml('ot'); loadRptMonths('ot'); }
  else if(tab==='tools'){ box.innerHTML=otToolsTabHtml(); wireOtToolsTab(); ensureMgUsers(); }
  else { box.innerHTML=otReportTabHtml(); wireOtReportTab(); loadOtReport(); }
}
// filter bar ร่วม (prefix กัน id ชนกับ mgleave)
function otFilterBar(prefix, f){
  var modeSel='<select class="hr-fsel" id="'+prefix+'Mode">'+
    [['period','รอบเดือนนี้ (26–25)'],['month','เลือกเดือน'],['year','เลือกปี'],['range','ช่วงวันที่'],['all','ทั้งหมด']]
      .map(function(o){return '<option value="'+o[0]+'"'+(f.mode===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>';
  var nowY=new Date().getFullYear()+543, curM=new Date().getMonth()+1;
  var yrs=''; for(var y=nowY;y>=nowY-3;y--) yrs+='<option value="'+y+'"'+((f.year||nowY)===y?' selected':'')+'>'+y+'</option>';
  var TH=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  var mons=''; for(var mo=1;mo<=12;mo++) mons+='<option value="'+mo+'"'+((f.month||curM)===mo?' selected':'')+'>'+TH[mo-1]+'</option>';
  var inputs='';
  if(f.mode==='month') inputs='<select class="hr-fsel" id="'+prefix+'Month">'+mons+'</select><select class="hr-fsel" id="'+prefix+'Year">'+yrs+'</select>';
  else if(f.mode==='year') inputs='<select class="hr-fsel" id="'+prefix+'Year">'+yrs+'</select>';
  else if(f.mode==='range') inputs='<input type="date" class="hr-fdate" id="'+prefix+'From" value="'+esc(thaiToIso(f.from))+'"><span class="hr-fdash">–</span><input type="date" class="hr-fdate" id="'+prefix+'To" value="'+esc(thaiToIso(f.to))+'">';
  return '<div class="hr-filter">'+ico('search')+' '+modeSel+inputs+'<button class="hr-fbtn" id="'+prefix+'Go">ดูข้อมูล</button></div>';
}
function otReadFilter(prefix, f){
  var my=document.getElementById(prefix+'Year'), mm=document.getElementById(prefix+'Month');
  var fr=document.getElementById(prefix+'From'), to=document.getElementById(prefix+'To');
  if(my) f.year=+my.value; if(mm) f.month=+mm.value;
  if(fr) f.from=isoToThai(fr.value); if(to) f.to=isoToThai(to.value);
}
function _otMoney(n){ return (Number(n)||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function otTypeKeyOf(name){ var t=S.otTypes||{}; for(var k in t){ if(t[k]===name) return k; } return Object.keys(t)[0]||'1'; }
function otTypeOptions(sel){ var t=S.otTypes||{}; return Object.keys(t).map(function(k){ return '<option value="'+k+'"'+(sel===k?' selected':'')+'>'+esc(t[k])+'</option>'; }).join(''); }

// ── แท็บ 📋 รายการ OT ──
function otListTabHtml(){
  return '<div class="card">'+
    '<div class="hr-note ok2">'+ico('clipboard')+' ดู/แก้/ยกเลิก OT รายใบ · คลิกแถวดูรายละเอียด · OT ไม่มีโควต้า</div>'+
    otFilterBar('otl', S.mgotFilter)+
    '<div class="mg-tools">'+
      '<input type="text" id="otSearch" class="mg-srch" placeholder="ค้นชื่อ / รหัส / เลขที่ OT…" value="'+esc(S.mgotSearch||'')+'">'+
      '<select id="otStatusF" class="hr-fsel">'+
        [['all','ทุกสถานะ'],['pending','รออนุมัติ'],['approved','อนุมัติแล้ว'],['rejected','ไม่อนุมัติ'],['cancel','ยกเลิก']]
          .map(function(o){return '<option value="'+o[0]+'"'+(S.mgotStatus===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+
      '</select>'+
      '<button class="mg-act export" id="otExportBtn">'+ico('upload')+' Export</button>'+
    '</div>'+
  '</div>'+
  '<div id="otList"><div class="card"><div class="skel" style="height:120px"></div></div></div>';
}
function wireOtListTab(){
  wireOtListFilter();
  var s=document.getElementById('otSearch'); if(s) s.addEventListener('input',function(){ S.mgotSearch=s.value; paintOtList(); });
  var st=document.getElementById('otStatusF'); if(st) st.addEventListener('change',function(){ S.mgotStatus=st.value; paintOtList(); });
  var ex=document.getElementById('otExportBtn'); if(ex) ex.addEventListener('click',doOtExport);
  ensureMgUsers();
}
function wireOtListFilter(){
  var m=document.getElementById('otlMode'); if(m) m.addEventListener('change',function(){ S.mgotFilter.mode=m.value; var bar=document.querySelector('#otTab .hr-filter'); if(bar) bar.outerHTML=otFilterBar('otl',S.mgotFilter); wireOtListFilter(); });
  var go=document.getElementById('otlGo'); if(go) go.addEventListener('click',loadOtList);
}
function loadOtList(){
  if(!(S.profile&&S.profile.canAdmin)) return;
  otReadFilter('otl', S.mgotFilter); var f=S.mgotFilter;
  if(f.mode==='range'&&(!f.from||!f.to)) return toast('เลือกช่วงวันที่ให้ครบค่ะ','err');
  var box=document.getElementById('otList'); if(box) box.innerHTML='<div class="card"><div class="skel" style="height:120px"></div></div>';
  api('mgOtList',{mode:f.mode,year:f.year,month:f.month,from:f.from,to:f.to}).then(function(r){
    if(!r.ok){ if(box) box.innerHTML=emptyBox(ico('lock','e-ico'),r.error||'โหลดไม่ได้'); return; }
    S.mgotData=r; paintOtList();
  }).catch(function(e){ if(box) box.innerHTML=emptyBox(ico('alert','e-ico'),String(e.message||e)); });
}
function otCounts(list){ var c={all:list.length,pending:0,approved:0,rejected:0,cancel:0}; list.forEach(function(it){ var g=mgStatusGroup(it.status); if(c[g]!=null) c[g]++; }); return c; }
function otSummaryBar(c){
  var defs=[['all','ทั้งหมด',c.all],['pending','รอ',c.pending],['approved','อนุมัติ',c.approved],['rejected','ไม่อนุมัติ',c.rejected],['cancel','ยกเลิก',c.cancel]];
  return '<div class="mg-sum">'+defs.map(function(d){ return '<button class="mg-chip s-'+d[0]+(S.mgotStatus===d[0]?' on':'')+'" data-otf="'+d[0]+'"><b>'+d[2]+'</b><span>'+d[1]+'</span></button>'; }).join('')+'</div>';
}
function paintOtList(){
  var box=document.getElementById('otList'); if(!box||!S.mgotData) return;
  var q=(S.mgotSearch||'').trim().toLowerCase();
  var bySearch=(S.mgotData.ot||[]).filter(function(it){ if(!q) return true;
    return String(it.name).toLowerCase().indexOf(q)>=0
        || String(it.empId).toLowerCase().indexOf(q)>=0
        || String(it.otId).toLowerCase().indexOf(q)>=0; });
  var counts=otCounts(bySearch), sf=S.mgotStatus||'all';
  var list=bySearch.filter(function(it){ return sf==='all'||mgStatusGroup(it.status)===sf; });
  var head='<div class="mg-head">'+ico('clipboard')+' '+esc(S.mgotData.label||'')+' · '+S.mgotData.count+' ใบ'+(S.mgotData.count>500?' (แสดง 500 ล่าสุด)':'')+'</div>';
  var table=!list.length?emptyBox(ico('leaf'),'ไม่มี OT ตามเงื่อนไข'):
    '<div class="mg-tbwrap"><table class="mg-table"><thead><tr>'+
      '<th>เลขที่</th><th>วันที่ยื่น</th><th class="ce">รหัส</th><th>พนักงาน</th><th>แผนก</th><th>วันที่ทำ</th><th class="ce">เวลา</th><th class="ce">ชม.</th><th>ประเภท</th><th class="ce">ไม่หักพัก</th><th class="ce">สถานะ</th><th class="ce">จัดการ</th>'+
    '</tr></thead><tbody>'+list.map(otRowTable).join('')+'</tbody></table></div>';
  box.innerHTML='<div class="card">'+head+otSummaryBar(counts)+table+'</div>';
  box.querySelectorAll('[data-otf]').forEach(function(el){ el.addEventListener('click',function(){ S.mgotStatus=el.dataset.otf; var ss=document.getElementById('otStatusF'); if(ss) ss.value=el.dataset.otf; paintOtList(); }); });
  box.querySelectorAll('[data-otrow]').forEach(function(el){ el.addEventListener('click',function(){ openOtDetail(el.dataset.otrow); }); });
  box.querySelectorAll('[data-otedit]').forEach(function(el){ el.addEventListener('click',function(ev){ ev.stopPropagation(); openOtEdit(el.dataset.otedit); }); });
  box.querySelectorAll('[data-otnb]').forEach(function(el){ el.addEventListener('click',function(ev){ ev.stopPropagation(); toggleOtNoBreak(el); }); });
  box.querySelectorAll('[data-otcancel]').forEach(function(el){ el.addEventListener('click',function(ev){ ev.stopPropagation(); openOtCancel(el.dataset.otcancel); }); });
}
/** ติ๊ก/ปลด "ไม่หักพัก" จากตาราง — อัปเดตในที่ ไม่ต้องโหลดตารางใหม่ทั้งหน้า */
function toggleOtNoBreak(el){
  var id=el.dataset.otnb, want=el.dataset.nbval;
  el.disabled=true;                                  // กันกดรัวระหว่างรอ
  api('mgSetOtNoBreak',{otId:id,noBreak:want}).then(function(r){
    el.disabled=false;
    if(!r.ok){ paintOtList(); return toast(r.error||'บันทึกไม่สำเร็จ','err'); }
    var o=otFind(id); if(o) o.noBreak=r.noBreak;    // อัปเดตข้อมูลในหน่วยความจำด้วย
    paintOtList();
    toast(r.summary||'บันทึกแล้ว','ok');
    if(r.warn) noticeBox('บันทึกแล้ว — แต่มีเรื่องต้องทำต่อ', r.warn);
  }).catch(function(e){ el.disabled=false; paintOtList(); toast(String(e.message||e),'err'); });
}

function otFind(id){ return (S.mgotData&&S.mgotData.ot||[]).filter(function(x){return x.otId===id;})[0]; }
/**
 * ช่อง "ไม่หักพัก" ในตาราง — ติ๊กบ็อกซ์เหมือนในชีต ติ๊กได้เลยไม่ต้องเปิดฟอร์ม
 * ติ๊ก = ไม่หักพัก 0.5 ชม. · ใบที่ยกเลิก/ไม่อนุมัติ ติ๊กไม่ได้ (แต่ยังเห็นค่าเดิม)
 */
function nbCell(o, grp){
  var on = !!o.noBreak, ro = (grp!=='pending' && grp!=='approved');
  return '<input type="checkbox" class="nb-box"'+(on?' checked':'')+(ro?' disabled':'')+
    (ro?'':' data-otnb="'+esc(o.otId)+'" data-nbval="'+(on?'0':'1')+'"')+
    ' title="'+(ro?'ใบนี้ปิดแล้ว แก้ไม่ได้':'ติ๊ก = ไม่หักพัก 0.5 ชม. (พนักงานไม่ได้พักจริง)')+'">';
}

function otRowTable(o){
  var grp=mgStatusGroup(o.status), acts;
  if(grp==='pending'||grp==='approved'){
    var b='';
    if(grp==='pending'||grp==='approved') b+='<button class="mg-ib edit" data-otedit="'+esc(o.otId)+'">'+ico('pencil')+' แก้ไข</button>';
    b+='<button class="mg-ib cx" data-otcancel="'+esc(o.otId)+'">'+ico('ban')+' ยกเลิก</button>';
    acts='<div class="mg-acts2">'+b+'</div>';
  } else acts='<span class="mg-sub2">ปิดแล้ว</span>';
  return '<tr class="mg-tr" data-otrow="'+esc(o.otId)+'">'+
    '<td class="ot-id">'+esc(o.otId||'-')+'</td>'+
    '<td class="mg-sub2">'+esc(o.submittedAt||'-')+'</td>'+
    '<td class="mg-sub2 ce">'+esc(o.empId||'-')+'</td>'+
    '<td class="lft"><b>'+esc(o.name)+'</b></td>'+
    '<td class="lft">'+esc(o.dept||'-')+'</td>'+
    '<td>'+esc(o.otDate)+'</td>'+
    '<td class="ce mg-sub2">'+esc(o.startTime)+'–'+esc(o.endTime)+'</td>'+
    '<td class="ce"><b>'+esc(o.hours)+'</b></td>'+
    '<td>'+esc(o.otType)+'</td>'+
    '<td class="ce">'+nbCell(o,grp)+'</td>'+
    '<td class="ce">'+statusBadge(o.status)+'</td>'+
    '<td class="mg-actcell">'+acts+'</td>'+
  '</tr>';
}
function openOtDetail(id){
  var o=otFind(id); if(!o) return;
  var grp=mgStatusGroup(o.status);
  var row=function(k,v){ return '<div class="cfm-row"><span class="cfm-k">'+k+'</span><span class="cfm-v">'+v+'</span></div>'; };
  var body=row('พนักงาน',esc(o.name)+(o.empId?' ('+esc(o.empId)+')':''))+
    (o.dept?row('แผนก',esc(o.dept)):'')+
    row('วันที่ทำ OT',esc(o.otDate))+
    row('เวลา',esc(o.startTime)+' – '+esc(o.endTime))+
    row('จำนวน',esc(o.hours)+' ชม.')+
    row('ประเภท',esc(o.otType))+
    row('วันที่ยื่น',esc(o.submittedAt||'-'))+
    row('สถานะ',statusBadge(o.status))+
    (o.reason?row('เหตุผล',esc(o.reason)):'')+
    (o.by?row('ผู้ดำเนินการ',esc(o.by)+(o.decidedAt?' · '+esc(o.decidedAt):'')):'')+
    row('หักพัก',o.noBreak?'<b>ไม่หักพัก</b> (HR ตั้งไว้)':'หักตามปกติ')+
    row('เลขที่',esc(o.otId))+
    ((grp==='pending'||grp==='approved')?'<div class="mg-dacts">'+'<button class="pend-btn redit" id="otdEdit">'+ico('pencil')+' แก้ไข</button>'+'<button class="pend-btn no" id="otdCancel">'+ico('ban')+' ยกเลิก</button></div>':'');
  modalForm({ title:'รายละเอียด OT', emoji:'⏰', accent:'ot', okLabel:'ปิด', body:body,
    onMount:function(c){ var e=c.querySelector('#otdEdit'); if(e) e.addEventListener('click',function(){ closeConfirm(); openOtEdit(id); }); var x=c.querySelector('#otdCancel'); if(x) x.addEventListener('click',function(){ closeConfirm(); openOtCancel(id); }); },
    onOk:function(){ closeConfirm(); } });
}
function openOtCancel(id){
  var o=otFind(id); if(!o) return;
  var wasApproved=mgStatusGroup(o.status)==='approved';
  modalForm({ title:'ยกเลิก OT', emoji:ico('ban'), accent:'ot', okLabel:ico('ban')+' ยืนยันยกเลิก',
    body:'<div class="cfm-row"><span class="cfm-k">พนักงาน</span><span class="cfm-v">'+esc(o.name)+'</span></div>'+
      '<div class="cfm-row"><span class="cfm-k">วันที่ทำ</span><span class="cfm-v">'+esc(o.otDate)+'</span></div>'+
      '<div class="cfm-row"><span class="cfm-k">เวลา/ชม.</span><span class="cfm-v">'+esc(o.startTime)+'–'+esc(o.endTime)+' · '+esc(o.hours)+' ชม.</span></div>'+
      (wasApproved?'<div class="hr-note" style="margin:10px 0">'+ico('alert')+' OT นี้อนุมัติแล้ว — ถ้า<b>คำนวณ OT รอบนี้ + import payroll ไปแล้ว</b> ต้องสั่งคำนวณ+import ใหม่ด้วยนะคะ</div>':'')+
      '<label class="field-lb">'+ico('pencil')+' เหตุผลการยกเลิก (แจ้งพนักงานทาง LINE)</label>'+
      '<textarea id="otCxReason" rows="2" placeholder="เช่น แจ้งผิด / ไม่ได้ทำจริง…"></textarea>',
    onOk:function(c){ var reason=(c.querySelector('#otCxReason').value||'').trim(); var btn=c.querySelector('[data-cfm-ok]'); if(btn){btn.disabled=true;btn.textContent='กำลังยกเลิก…';}
 api('mgCancelOt',{otId:id,reason:reason}).then(function(r){ if(!r.ok){ if(btn){btn.disabled=false;btn.textContent=' ยืนยันยกเลิก';} return toast(r.error||'ยกเลิกไม่สำเร็จ','err'); }
 closeConfirm(); toast('ยกเลิก OT แล้ว','ok'); S.mgotData=null; loadOtList(); }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent=' ยืนยันยกเลิก';} toast(String(e.message||e),'err'); }); }
  });
}
function otFormBody(o){
  var emp=o.showEmp?'<label class="field-lb">'+ico('user')+' พนักงาน</label><select id="otfEmp" class="hr-fsel mg-full">'+mgEmpOptions(o.empSel)+'</select>':'';
  return emp+
    '<label class="field-lb">'+ico('calendar')+' วันที่ทำ OT</label><input type="date" class="hr-fdate mg-full" id="otfDate" value="'+esc(o.dateIso||'')+'">'+
    '<label class="field-lb">'+ico('clock')+' เวลา (เริ่ม – สิ้นสุด)</label><div class="mg-drow"><input type="time" class="hr-fdate" id="otfSt" value="'+esc(o.start||'')+'"><span class="hr-fdash">–</span><input type="time" class="hr-fdate" id="otfEt" value="'+esc(o.end||'')+'"></div>'+
    '<label class="field-lb">'+ico('clipboard')+' ประเภท OT</label><select id="otfType" class="hr-fsel mg-full">'+otTypeOptions(o.type)+'</select>'+
    '<label class="field-lb">'+ico('pencil')+' เหตุผล / รายละเอียดงาน</label><textarea id="otfReason" rows="2" placeholder="รายละเอียดงาน…">'+esc(o.reason||'')+'</textarea>'+
    // override ของระบบคำนวณ OT — ติ๊กแล้วรายการนี้ไม่ถูกหักพัก 0.5 ชม.
    // (พักเที่ยง 1 ชม. ยังหักปกติถ้า OT คร่อมเที่ยง)
    '<label class="mg-check"><input type="checkbox" id="otfNoBreak"'+(o.noBreak?' checked':'')+'><span>'+ico('coffee')+' ไม่หักพัก 0.5 ชม. (พนักงานไม่ได้พักจริง)</span></label>';
}
function otReadForm(c){
  var nb=c.querySelector('#otfNoBreak');
  return { otDate:isoToThai(c.querySelector('#otfDate').value), startTime:(c.querySelector('#otfSt')||{}).value||'', endTime:(c.querySelector('#otfEt')||{}).value||'', otType:c.querySelector('#otfType').value, reason:(c.querySelector('#otfReason').value||'').trim(),
    // ส่ง 1/0 เสมอ — ส่งค่าว่างแปลว่า "ไม่แตะ" ฝั่งหลังบ้านจะไม่ล้างค่าที่ติ๊กไว้
    noBreak: nb && nb.checked ? '1' : '0' };
}
function openOtEdit(id){
  var o=otFind(id); if(!o) return;
  var wasApproved=mgStatusGroup(o.status)==='approved';
  modalForm({ title:'แก้ไข OT', emoji:'⏰', accent:'ot', okLabel:ico('check')+' บันทึก',
    body:'<div class="hr-note '+(wasApproved?'':'ok2')+'" style="margin-bottom:10px">'+ico('pencil')+' '+esc(o.name)+' · '+esc(o.otId)+
      (wasApproved
        ? ' — ใบนี้<b>อนุมัติแล้ว</b> บันทึกแล้วยัง<b>อนุมัติอยู่</b> ไม่ต้องอนุมัติซ้ำ'
        : ' — บันทึกแล้วยังต้องอนุมัติอีกครั้ง')+'</div>'+
      otFormBody({ dateIso:thaiToIso(o.otDate), start:o.startTime, end:o.endTime, type:otTypeKeyOf(o.otType), reason:o.reason, noBreak:o.noBreak }),
    onOk:function(c){ var p=otReadForm(c); if(!p.otDate) return toast('เลือกวันที่','err'); if(!p.startTime||!p.endTime) return toast('ใส่เวลาให้ครบ','err'); p.otId=id;
      var btn=c.querySelector('[data-cfm-ok]'); if(btn){btn.disabled=true;btn.textContent='กำลังบันทึก…';}
 api('mgEditOt',p).then(function(r){ if(!r.ok){ if(btn){btn.disabled=false;btn.textContent=' บันทึก';} return toast(r.error||'บันทึกไม่สำเร็จ','err'); }
 closeConfirm(); toast('แก้ไข OT แล้ว · '+r.otId,'ok');
        if(r.warn) noticeBox('แก้ไขแล้ว — แต่มีเรื่องต้องทำต่อ', r.warn);
 S.mgotData=null; loadOtList(); }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent=' บันทึก';} toast(String(e.message||e),'err'); }); }
  });
}
function openOtProxy(){
  if(!S.mgUsers) return toast('กำลังโหลดรายชื่อพนักงาน… ลองอีกครั้งค่ะ');
  modalForm({ title:'ยื่น OT แทนพนักงาน', emoji:'⏰', accent:'ot', okLabel:ico('plus')+' ยื่น OT',
    body:otFormBody({ showEmp:true })+
      '<label class="mg-check"><input type="checkbox" id="otfAuto"><span>'+ico('check')+' อนุมัติเลย (ไม่ต้องรออนุมัติ)</span></label>',
    onOk:function(c){ var emp=c.querySelector('#otfEmp').value; if(!emp) return toast('เลือกพนักงานก่อนค่ะ','err'); var p=otReadForm(c); if(!p.otDate) return toast('เลือกวันที่','err'); if(!p.startTime||!p.endTime) return toast('ใส่เวลาให้ครบ','err'); p.targetUserId=emp; p.autoApprove=c.querySelector('#otfAuto').checked?'1':'';
      var btn=c.querySelector('[data-cfm-ok]'); if(btn){btn.disabled=true;btn.textContent='กำลังยื่น…';}
 api('mgProxyOt',p).then(function(r){ if(!r.ok){ if(btn){btn.disabled=false;btn.textContent=' ยื่น OT';} return toast(r.error||'ยื่นไม่สำเร็จ','err'); }
        closeConfirm(); toast((r.approved?'ยื่นแทน+อนุมัติแล้ว · ':'ยื่นแทนแล้ว (รออนุมัติ) · ')+r.otId,'ok'); if(r.warn) noticeBox('ยื่นแทนแล้ว — แต่มีเรื่องต้องทำต่อ', r.warn); S.mgotData=null; if(S.otTab==='list') loadOtList(); }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent='➕ ยื่น OT';} toast(String(e.message||e),'err'); }); }
  });
}
// ── แท็บ ⚙️ ตั้งค่า ──
function otToolsTabHtml(){
  return '<div class="card">'+
    '<div class="hr-note ok2">'+ico('settings')+' เครื่องมือจัดการ OT — บันทึก audit + แจ้ง LINE พนักงาน</div>'+
    '<div class="mg-toolgrid">'+
      '<button class="mg-tool add" id="otAddBtn"><b>'+ico('plus')+' ยื่น OT แทนพนักงาน</b><span>เลือกคน + กรอกวันเวลา · ติ๊ก "อนุมัติเลย" ได้</span></button>'+
      '<button class="mg-tool" id="otCalcBtn"><b>'+ico('calc')+' 1. คำนวณรอบ OT</b><span>เลือกเดือน (รอบ 26–25) → เขียนชีต "การคำนวณ OT" ให้ payroll ดึงต่อ</span></button>'+
      '<button class="mg-tool" id="otGenBtn"><b>'+ico('file')+' 2. สร้างเอกสารสรุป</b><span>สร้างใบสรุป OT รายคน → เปิดตรวจก่อนส่ง · ยังไม่ส่ง LINE</span></button>'+
      '<button class="mg-tool" id="otSendBtn"><b>'+ico('upload')+' 3. ส่ง LINE สรุป</b><span>หลังตรวจเอกสาร → ส่ง LINE + แชร์ตามอีเมล · กันส่งซ้ำ</span></button>'+
      '<button class="mg-tool" id="otStatusBtn"><b>'+ico('clipboard')+' สถานะรอบนี้ (ดูย้อนหลัง)</b><span>ใครมีเอกสารแล้ว · ส่ง LINE ไปแล้วเมื่อไร · ใครยังค้าง</span></button>'+
    '</div>'+
    '<div class="hr-note" style="margin-top:12px">'+ico('rotate')+' ลำดับปลอดภัย: <b>1.คำนวณรอบ</b> → <b>2.สร้างเอกสาร</b> (เปิดตรวจ) → <b>3.ส่ง LINE</b> · '+ico('alert')+' แก้/ยกเลิก OT หลังคำนวณ ต้องกดคำนวณรอบใหม่ + import payroll ใหม่ · '+ico('clipboard')+' ปิดหน้าไปแล้วกลับมาดูได้ที่ "สถานะรอบนี้"</div>'+
  '</div>'+
  '<div id="otToolsResult"></div>';
}
function _otSt(s){ var m={sent:['#e8f5e9','#2e7d32',' ส่งแล้ว'],skipped:['#eceff1','#546e7a','⏭ ข้าม (ส่งแล้ว)'],noLine:['#fff3e0','#e65100',' ไม่มี LINE'],noDoc:['#fff3e0','#e65100',' ยังไม่มีเอกสาร'],created:['#e3f2fd','#1565c0','🆕 สร้างใหม่'],existing:['#eceff1','#546e7a','✓ มีอยู่แล้ว'],fail:['#ffebee','#c62828',' ล้มเหลว']};
  var c=m[s]||m.fail; return '<span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:12px;font-weight:700;background:'+c[0]+';color:'+c[1]+'">'+c[2]+'</span>'; }
function renderOtCalcResult(r){
  var box=document.getElementById('otToolsResult'); if(!box) return;
  var ps=r.persons||[];
  var rows=ps.map(function(e,i){ return '<tr'+(e.dup?' style="background:#fff8e1"':'')+'><td class="ce">'+(i+1)+'</td><td class="lft"><b>'+esc(e.name)+'</b>'+(e.dup?' '+ico('alert'):'')+'</td><td class="lft">'+esc(e.dept||'-')+'</td>'+
    '<td class="ce">'+e.count+'</td><td class="ce">'+mgNum(e.hours)+'</td><td class="ce">'+mgNum(e.h1)+'</td><td class="ce">'+mgNum(e.h15)+'</td><td class="ce">'+mgNum(e.h3)+'</td><td class="ce"><b>'+_otMoney(e.total)+'</b></td></tr>'; }).join('');
  box.innerHTML='<div class="card">'+
    '<div class="hr-note ok2">'+ico('calc')+' คำนวณรอบ <b>'+esc(r.label||'')+'</b> เสร็จ · '+r.empCount+' คน · '+r.recCount+' รายการ'+(r.dupCount?(' · <b style="color:#c0392b">'+ico('alert')+' ซ้ำ '+r.dupCount+' — ตรวจสอบ</b>'):'')+'</div>'+
    '<div class="mg-head">'+ico('folder')+' เขียนลงชีต "'+esc(r.sheetName||'')+'" (OT SS) · payroll ดึงต่อได้'+(r.sheetUrl?(' <a href="'+esc(r.sheetUrl)+'" target="_blank" rel="noopener">เปิดชีต ↗</a>'):'')+'</div>'+
    '<div class="mg-tbwrap"><table class="mg-table mg-rpt"><thead><tr><th class="ce">#</th><th class="lft">ชื่อ</th><th class="lft">แผนก</th><th class="ce">ใบ</th><th class="ce">ชม.</th><th class="ce">1x</th><th class="ce">1.5x</th><th class="ce">3x</th><th class="ce">รวมเงิน</th></tr></thead><tbody>'+rows+
    '<tr class="ot-tot"><td colspan="3" class="lft"><b>รวมทั้งหมด</b></td><td class="ce"><b>'+r.recCount+'</b></td><td class="ce"></td><td class="ce"></td><td class="ce"></td><td class="ce"></td><td class="ce"><b>'+_otMoney(r.grandTotal)+'</b></td></tr>'+
    '</tbody></table></div>'+
    ((r.keptSent||r.keptDocs)?('<div class="hr-note" style="margin-top:10px">'+ico('save')+' คงข้อมูลเดิมไว้ให้แล้ว — ลิงก์เอกสาร <b>'+(r.keptDocs||0)+'</b> คน · สถานะ "ส่งแล้ว" <b>'+(r.keptSent||0)+'</b> คน (คำนวณใหม่ไม่ทำให้ระบบลืมว่าส่งใครไปแล้ว)</div>'):'')+
    ((r.changedAfterSent&&r.changedAfterSent.length)?('<div class="hr-note" style="margin-top:8px;background:#fff8e1;color:#7f6000"><b>'+ico('alert')+' ยอดเปลี่ยนหลังส่งสรุปไปแล้ว '+r.changedAfterSent.length+' คน</b><br>'+
      r.changedAfterSent.map(function(c){ return '• '+esc(c.name)+': '+_otMoney(c.oldTotal)+' → <b>'+_otMoney(c.newTotal)+'</b>'; }).join('<br>')+
      '<br><br>ถ้าต้องการส่งยอดใหม่ให้เฉพาะคนเหล่านี้ → <b>'+ico('file')+' สร้างเอกสาร</b> (ติ๊ก regen + ใส่ชื่อ) แล้ว <b>'+ico('upload')+' ส่ง LINE</b> (ติ๊ก force + ใส่ชื่อเดิม)</div>'):'')+
    '<div class="hr-note" style="margin-top:10px">'+ico('check')+' ตรวจถูกต้อง → กด <b>'+ico('upload')+' ส่งสรุป OT</b> ด้านบน เพื่อส่ง Doc + LINE ให้พนักงาน</div>'+
  '</div>';
  if(box.scrollIntoView) box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
// แปลรหัส error จาก LINE API → บอกวิธีแก้ (ล้มเหลวทุกคน = ปัญหาระดับระบบ)
function _otFailHint(ds){
  var errs=[]; (ds||[]).forEach(function(e){ if(e.status==='fail'&&e.err&&errs.indexOf(e.err)<0) errs.push(e.err); });
  if(!errs.length) return '';
  var all=errs.join(' '), tip='';
  if(all.indexOf('401')>=0)      tip=ico('key')+' Access token หมดอายุ/ถูกออกใหม่ → อัปเดต <b>LINE_CHANNEL_ACCESS_TOKEN</b> ใน Script Properties (ทั้งไฟล์ลาและไฟล์ OT)';
 else if(all.indexOf('429')>=0) tip=' โควตาข้อความ LINE เดือนนี้หมด → เช็คใน LINE OA Manager แล้วรอรอบเดือนใหม่ หรืออัปแพ็กเกจ';
 else if(all.indexOf('403')>=0) tip=' แผน LINE OA ไม่อนุญาต push message → เช็คแพ็กเกจใน LINE OA Manager';
 else if(all.indexOf('400')>=0) tip=' ข้อความหรือผู้รับไม่ถูกต้อง — พนักงานบล็อกบอท/ยังไม่เพิ่มเพื่อน หรือลิงก์เอกสารผิดรูป';
  return '<div class="hr-note" style="margin-top:10px;background:#ffebee;color:#c62828"><b>'+ico('x')+' สาเหตุที่ระบบตอบกลับ:</b><br>'+
    errs.map(function(x){ return esc(x); }).join('<br>')+(tip?('<br><br>'+tip):'')+'</div>';
}
function renderOtSendResult(r){
  var box=document.getElementById('otToolsResult'); if(!box) return;
  var ds=r.details||[];
  var rows=ds.map(function(e,i){ return '<tr><td class="ce">'+(i+1)+'</td><td class="lft"><b>'+esc(e.name)+'</b></td><td class="lft">'+esc(e.dept||'-')+'</td>'+
    '<td class="ce">'+_otMoney(e.total)+'</td><td class="ce">'+_otSt(e.status)+
      (e.status==='fail'&&e.err?('<div style="font-size:11px;color:#c62828;margin-top:4px;word-break:break-word;text-align:left">'+esc(e.err)+'</div>'):'')+'</td>'+
    '<td class="ce">'+(e.docUrl?('<a href="'+esc(e.docUrl)+'" target="_blank" rel="noopener">'+ico('file')+' Doc</a>'):'-')+'</td>'+
    '<td class="ce">'+(e.hasEmail?ico('mail'):'<span class="muted2">—</span>')+'</td></tr>'; }).join('');
  box.innerHTML='<div class="card">'+
    '<div class="hr-note '+(r.fail?'':'ok2')+'">'+ico('upload')+' ส่ง LINE <b>'+esc(r.label||'')+'</b> · '+ico('check')+' ส่ง '+r.sent+' คน'+(r.skipped?(' · ⏭ ข้าม '+r.skipped):'')+(r.noDoc?(' · '+ico('file')+' ยังไม่มีเอกสาร '+r.noDoc):'')+(r.noLine?(' · '+ico('alert')+' ไม่มี LINE '+r.noLine):'')+(r.fail?(' · '+ico('x')+' ล้มเหลว '+r.fail):'')+
      (r.onlyMode?(' · '+ico('target')+' <b>ส่งเฉพาะที่เลือก</b> (ไม่แตะอีก '+(r.notSelected||0)+' คน)'):'')+'</div>'+
    '<div class="mg-tbwrap"><table class="mg-table mg-rpt"><thead><tr><th class="ce">#</th><th class="lft">ชื่อ</th><th class="lft">แผนก</th><th class="ce">ยอด OT</th><th class="ce">สถานะ</th><th class="ce">เอกสาร</th><th class="ce">อีเมล</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    _otFailHint(ds)+
    (r.noDoc?'<div class="hr-note" style="margin-top:10px">'+ico('file')+' "ยังไม่มีเอกสาร" = กด "'+ico('file')+' 2. สร้างเอกสาร" ก่อน แล้วค่อยส่ง LINE อีกครั้ง</div>':'')+
    (r.noLine?'<div class="hr-note" style="margin-top:8px">'+ico('alert')+' "ไม่มี LINE" = พนักงานยังไม่ได้ผูก LINE → ให้ลงทะเบียนก่อน แล้วกดส่งซ้ำ (ติ๊ก force)</div>':'')+
    (r.skipped?'<div class="hr-note" style="margin-top:8px">⏭ "ข้าม" = เคยส่งไปแล้ว · ถ้าต้องการส่งใหม่ ติ๊ก '+ico('rotate')+' force</div>':'')+
  '</div>';
  if(box.scrollIntoView) box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function wireOtToolsTab(){
  var a=document.getElementById('otAddBtn'); if(a) a.addEventListener('click',openOtProxy);
  var b=document.getElementById('otCalcBtn'); if(b) b.addEventListener('click',openOtCalcRound);
  var gd=document.getElementById('otGenBtn'); if(gd) gd.addEventListener('click',openOtGenDocs);
  var s=document.getElementById('otSendBtn'); if(s) s.addEventListener('click',openOtSendSummary);
  var stt=document.getElementById('otStatusBtn'); if(stt) stt.addEventListener('click',openOtStatus);
}
// เลือกเดือน-ปี (รอบ 26–25) + preview รอบ/ชื่อชีต
function _mgotYMSelect_(){
  var TH=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  var nowY=new Date().getFullYear()+543, curM=new Date().getMonth()+1;
  var mons=''; for(var mo=1;mo<=12;mo++) mons+='<option value="'+mo+'"'+(curM===mo?' selected':'')+'>'+TH[mo-1]+'</option>';
  var yrs=''; for(var y=nowY;y>=nowY-3;y--) yrs+='<option value="'+y+'"'+(nowY===y?' selected':'')+'>'+y+'</option>';
  return '<div class="cfm-row"><span class="cfm-k">เดือน (ปลายรอบ)</span><span class="cfm-v"><select class="hr-fsel" id="mgotMon">'+mons+'</select> <select class="hr-fsel" id="mgotYr">'+yrs+'</select></span></div>'+
    '<div id="mgotPrev" class="hr-note" style="margin-top:8px"></div>';
}
function _mgotPrevCalc(mEnd, yrBE){
  var yCE=yrBE-543, s=new Date(yCE,mEnd-2,26), e=new Date(yCE,mEnd-1,25), pad=function(n){return (n<10?'0':'')+n;};
  var fmt=function(d){return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+(d.getFullYear()+543);};
  return { label:fmt(s)+' – '+fmt(e), sheet:'การคำนวณ OT '+pad(mEnd)+'-'+yCE };
}
function _mgotWirePrev(c){
  var upd=function(){ var mo=+c.querySelector('#mgotMon').value, yr=+c.querySelector('#mgotYr').value, pv=_mgotPrevCalc(mo,yr);
    var el=c.querySelector('#mgotPrev'); if(el) el.innerHTML=ico('calendar')+' รอบ <b>'+pv.label+'</b> · '+ico('folder')+' ชีต: '+esc(pv.sheet); };
  c.querySelector('#mgotMon').addEventListener('change',upd); c.querySelector('#mgotYr').addEventListener('change',upd); upd();
}
function openOtCalcRound(){
  modalForm({ title:'คำนวณรอบ OT', emoji:ico('calc'), accent:'ot', okLabel:ico('calc')+' คำนวณรอบ',
    body:'<div class="hr-note ok2" style="margin-bottom:10px">คำนวณ OT ที่ "อนุมัติแล้ว" ในรอบ → เขียนชีต "การคำนวณ OT" (payroll ดึงต่อได้)</div>'+_mgotYMSelect_(),
    onMount:_mgotWirePrev,
    onOk:function(c){ var mo=+c.querySelector('#mgotMon').value, yr=+c.querySelector('#mgotYr').value;
      var btn=c.querySelector('[data-cfm-ok]'); if(btn){btn.disabled=true;btn.textContent='⏳ กำลังคำนวณ…';}
 api('mgOtCalcRound',{month:mo,year:yr}).then(function(r){ if(!r.ok){ if(btn){btn.disabled=false;btn.textContent=' คำนวณรอบ';} return toast(r.error||'คำนวณไม่สำเร็จ','err'); }
 closeConfirm(); renderOtCalcResult(r); toast('คำนวณรอบ '+r.label+' แล้ว · '+r.empCount+' คน','ok');
 }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent=' คำนวณรอบ';} toast(String(e.message||e),'err'); }); }
  });
}
// 🎯 ช่อง "ทำเฉพาะบางคน" — เว้นว่าง = ทุกคนตามเดิม · พิมพ์ชื่อบางส่วนหรือรหัสก็ได้ คั่นด้วย ,
function _mgotOnlyInput_(id){
  return '<div style="margin-top:10px">'+
    '<label class="field-lb" for="'+id+'">'+ico('target')+' ทำเฉพาะบางคน (ไม่ใส่ = ทุกคน)</label>'+
    '<input class="mg-qin" id="'+id+'" type="text" style="width:100%" placeholder="เช่น กฤษดา  หรือ  E012, สมชาย" autocomplete="off">'+
    '<div class="hr-note" style="margin-top:6px">ใส่ชื่อ (บางส่วนก็ได้) หรือรหัสพนักงาน · หลายคนคั่นด้วยจุลภาค — คนที่ไม่ได้เลือกจะไม่ถูกแตะเลย</div>'+
  '</div>';
}
function openOtGenDocs(){
  modalForm({ title:'สร้างเอกสารสรุป OT', emoji:ico('file'), accent:'ot', okLabel:ico('file')+' สร้างเอกสาร',
    body:'<div class="hr-note ok2" style="margin-bottom:10px">สร้างใบสรุป OT รายคน (Google Doc) เพื่อ<b>เปิดตรวจก่อนส่ง</b> · ยังไม่ส่ง LINE · ต้องคำนวณรอบก่อน</div>'+_mgotYMSelect_()+
      '<label class="mg-check" style="margin-top:10px"><input type="checkbox" id="mgotRegen"><span>'+ico('rotate')+' สร้างใหม่ทับของเดิม (regen)</span></label>'+
      _mgotOnlyInput_('mgotGenOnly')+
      '<div class="hr-note" style="margin-top:8px">⏳ ถ้าคนเยอะอาจใช้เวลาสักครู่ — รอจนขึ้นผลค่ะ</div>',
    onMount:_mgotWirePrev,
    onOk:function(c){ var mo=+c.querySelector('#mgotMon').value, yr=+c.querySelector('#mgotYr').value, regen=c.querySelector('#mgotRegen').checked?'1':'';
      var only=(c.querySelector('#mgotGenOnly')||{}).value||'';
      var btn=c.querySelector('[data-cfm-ok]'); if(btn){btn.disabled=true;btn.textContent='⏳ กำลังสร้าง…';}
 api('mgOtGenDocs',{month:mo,year:yr,regen:regen,only:only}).then(function(r){ if(!r.ok){ if(btn){btn.disabled=false;btn.textContent=' สร้างเอกสาร';} return toast(r.error||'สร้างไม่สำเร็จ','err'); }
 closeConfirm(); renderOtGenResult(r); toast('สร้างเอกสาร '+r.label+' · '+(r.created+r.existing)+' ไฟล์','ok');
 }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent=' สร้างเอกสาร';} toast(String(e.message||e),'err'); }); }
  });
}
function renderOtGenResult(r){
  var box=document.getElementById('otToolsResult'); if(!box) return;
  var ds=r.details||[];
  var rows=ds.map(function(e,i){ return '<tr><td class="ce">'+(i+1)+'</td><td class="lft"><b>'+esc(e.name)+'</b></td><td class="lft">'+esc(e.dept||'-')+'</td>'+
    '<td class="ce">'+_otMoney(e.total)+'</td><td class="ce">'+_otSt(e.status)+
      (e.status==='fail'&&e.err?('<div style="font-size:11px;color:#c62828;margin-top:4px;word-break:break-word;text-align:left">'+esc(e.err)+'</div>'):'')+'</td>'+
    '<td class="ce">'+(e.docUrl?('<a href="'+esc(e.docUrl)+'" target="_blank" rel="noopener">'+ico('file')+' เปิดตรวจ</a>'):'-')+'</td></tr>'; }).join('');
  box.innerHTML='<div class="card">'+
    '<div class="hr-note '+(r.fail?'':'ok2')+'">'+ico('file')+' สร้างเอกสาร <b>'+esc(r.label||'')+'</b> · 🆕 สร้างใหม่ '+r.created+' · ✓ มีอยู่ '+r.existing+(r.fail?(' · '+ico('x')+' ล้มเหลว '+r.fail):'')+
      (r.onlyMode?(' · '+ico('target')+' <b>เฉพาะที่เลือก</b> (ไม่แตะอีก '+(r.notSelected||0)+' คน)'):'')+'</div>'+
    '<div class="mg-head">'+ico('send')+' เปิดตรวจเอกสารให้เรียบร้อย แล้วกด <b>'+ico('upload')+' 3. ส่ง LINE</b> ด้านบน</div>'+
    '<div class="mg-tbwrap"><table class="mg-table mg-rpt"><thead><tr><th class="ce">#</th><th class="lft">ชื่อ</th><th class="lft">แผนก</th><th class="ce">ยอด OT</th><th class="ce">สถานะ</th><th class="ce">เอกสาร</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
  '</div>';
  if(box.scrollIntoView) box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function openOtSendSummary(){
  modalForm({ title:'ส่ง LINE สรุป OT', emoji:ico('upload'), accent:'ot', okLabel:ico('upload')+' ส่ง LINE',
    body:'<div class="hr-note ok2" style="margin-bottom:10px">ส่ง LINE + แชร์เอกสารตามอีเมล · เฉพาะคนที่<b>มีเอกสารแล้ว</b>และ<b>ยังไม่เคยส่ง</b> · '+ico('alert')+' ต้องกด "'+ico('file')+' สร้างเอกสาร" ก่อน</div>'+_mgotYMSelect_()+
      '<label class="mg-check" style="margin-top:10px"><input type="checkbox" id="mgotForce"><span>'+ico('rotate')+' ส่งซ้ำคนที่ส่งไปแล้ว (force)</span></label>'+
      _mgotOnlyInput_('mgotSendOnly')+
      '<div class="hr-note" style="margin-top:8px">⏳ ถ้าคนเยอะอาจใช้เวลาสักครู่ — รอจนขึ้นผลค่ะ</div>',
    onMount:_mgotWirePrev,
    onOk:function(c){ var mo=+c.querySelector('#mgotMon').value, yr=+c.querySelector('#mgotYr').value, force=c.querySelector('#mgotForce').checked?'1':'';
      var only=(c.querySelector('#mgotSendOnly')||{}).value||'';
      var btn=c.querySelector('[data-cfm-ok]'); if(btn){btn.disabled=true;btn.textContent='⏳ กำลังส่ง…';}
 api('mgOtSendSummary',{month:mo,year:yr,force:force,only:only}).then(function(r){ if(!r.ok){ if(btn){btn.disabled=false;btn.textContent=' ส่งสรุป';} return toast(r.error||'ส่งไม่สำเร็จ','err'); }
 closeConfirm(); renderOtSendResult(r); toast('ส่งสรุป '+r.label+' · ส่ง '+r.sent+' คน', r.fail?'err':'ok');
 }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent=' ส่งสรุป';} toast(String(e.message||e),'err'); }); }
  });
}
// 📋 สถานะรอบนี้ — เปิดดูย้อนหลังได้ตลอด (อ่านจากชีตจริง ไม่ใช่ผลค้างในหน้าจอ)
function openOtStatus(){
  modalForm({ title:'สถานะรอบ OT', emoji:ico('clipboard'), accent:'ot', okLabel:ico('clipboard')+' ดูสถานะ',
    body:'<div class="hr-note ok2" style="margin-bottom:10px">ดูว่ารอบนี้ <b>ใครมีเอกสารแล้ว · ใครส่ง LINE ไปแล้วเมื่อไร · ใครยังค้าง</b> — อ่านสดจากชีต ปิดหน้าไปแล้วกลับมาดูได้เสมอ</div>'+_mgotYMSelect_(),
    onMount:_mgotWirePrev,
    onOk:function(c){ var mo=+c.querySelector('#mgotMon').value, yr=+c.querySelector('#mgotYr').value;
      var btn=c.querySelector('[data-cfm-ok]'); if(btn){btn.disabled=true;btn.textContent='⏳ กำลังอ่าน…';}
 api('mgOtStatus',{month:mo,year:yr}).then(function(r){ if(!r.ok){ if(btn){btn.disabled=false;btn.textContent=' ดูสถานะ';} return toast(r.error||'อ่านไม่สำเร็จ','err'); }
        closeConfirm(); renderOtStatus(r);
 }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent=' ดูสถานะ';} toast(String(e.message||e),'err'); }); }
  });
}
function _otStatBadge(e){
  if(e.changed) return '<span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:12px;font-weight:700;background:#fff8e1;color:#7f6000">'+ico('alert')+' ยอดเปลี่ยนหลังส่ง</span>';
  if(e.sent)    return '<span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:12px;font-weight:700;background:#e8f5e9;color:#2e7d32">'+ico('check')+' ส่งแล้ว</span>';
  if(e.hasDoc)  return '<span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:12px;font-weight:700;background:#e3f2fd;color:#1565c0">'+ico('file')+' มีเอกสาร · ยังไม่ส่ง</span>';
  return '<span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:12px;font-weight:700;background:#fff3e0;color:#e65100">⏳ ยังไม่สร้างเอกสาร</span>';
}
function _otLogLabel(a){
 if(a.indexOf('CALC')>=0) return ' คำนวณรอบ';
 if(a.indexOf('GEN')>=0) return ' สร้างเอกสาร';
 return ' ส่ง LINE';
}
function renderOtStatus(r){
  var box=document.getElementById('otToolsResult'); if(!box) return;
  var logs=(r.logs||[]).map(function(l){ return '<tr><td class="ce" style="white-space:nowrap">'+esc(l.at||'')+'</td><td class="lft">'+_otLogLabel(l.action||'')+'</td><td class="lft">'+esc(l.actor||'-')+'</td><td class="lft" style="font-size:12px">'+esc(l.details||'')+'</td></tr>'; }).join('');
  var logBox='<div class="mg-head" style="margin-top:14px">'+ico('clock')+' ประวัติการทำรายการรอบนี้ '+(r.logs&&r.logs.length?('· '+r.logs.length+' ครั้ง'):'')+'</div>'+
    (logs? '<div class="mg-tbwrap"><table class="mg-table mg-rpt"><thead><tr><th class="ce">เวลา</th><th class="lft">ทำอะไร</th><th class="lft">ใครกด</th><th class="lft">รายละเอียด</th></tr></thead><tbody>'+logs+'</tbody></table></div>'
         : '<div class="hr-note">ยังไม่มีประวัติผ่านเว็บสำหรับรอบนี้ (ถ้าทำผ่านเมนูในชีต จะไม่ถูกบันทึกที่นี่)</div>');

  if(!r.exists){
    box.innerHTML='<div class="card">'+
      '<div class="hr-note">'+ico('folder')+' ยังไม่มีชีต "<b>'+esc(r.sheetName||'')+'</b>" สำหรับรอบ '+esc(r.label||'')+' — กด <b>'+ico('calc')+' 1. คำนวณรอบ OT</b> ก่อนค่ะ</div>'+logBox+'</div>';
    if(box.scrollIntoView) box.scrollIntoView({behavior:'smooth',block:'nearest'});
    return;
  }
  var t=r.totals||{}, ps=r.persons||[];
  var rows=ps.map(function(e,i){ return '<tr'+(e.changed?' style="background:#fff8e1"':'')+'><td class="ce">'+(i+1)+'</td><td class="mg-sub2 ce">'+esc(e.empId)+'</td><td class="lft"><b>'+esc(e.name)+'</b></td><td class="lft">'+esc(e.dept||'-')+'</td>'+
    '<td class="ce">'+e.count+'</td><td class="ce"><b>'+_otMoney(e.total)+'</b></td>'+
    '<td class="ce">'+_otStatBadge(e)+(e.sentAt?('<div style="font-size:11px;color:#666;margin-top:3px">'+esc(e.sentAt)+'</div>'):'')+'</td>'+
    '<td class="ce">'+(e.docUrl?('<a href="'+esc(e.docUrl)+'" target="_blank" rel="noopener">'+ico('file')+' เปิด</a>'):'<span class="muted2">—</span>')+'</td>'+
    '<td class="ce">'+(e.hasLine?ico('message'):'<span class="muted2">—</span>')+' '+(e.hasEmail?ico('mail'):'<span class="muted2">—</span>')+'</td></tr>'; }).join('');
  box.innerHTML='<div class="card">'+
    '<div class="hr-note ok2">'+ico('clipboard')+' สถานะรอบ <b>'+esc(r.label||'')+'</b> · '+ico('users')+' '+t.people+' คน · '+ico('file')+' มีเอกสาร '+t.withDoc+' · '+ico('check')+' ส่งแล้ว '+t.sent+' · ⏳ ยังไม่ส่ง '+t.pending+
      (t.changed?(' · <b style="color:#c0392b">'+ico('alert')+' ยอดเปลี่ยนหลังส่ง '+t.changed+'</b>'):'')+' · '+ico('wallet')+' รวม '+_otMoney(t.grand)+'</div>'+
    '<div class="mg-head">'+ico('folder')+' ชีต "'+esc(r.sheetName||'')+'"'+(r.sheetUrl?(' <a href="'+esc(r.sheetUrl)+'" target="_blank" rel="noopener">เปิดชีต ↗</a>'):'')+' <span class="mg-legend">'+ico('message')+' = ผูก LINE แล้ว · '+ico('mail')+' = มีอีเมลรับเอกสาร</span></div>'+
    '<div class="mg-tbwrap"><table class="mg-table mg-rpt"><thead><tr><th class="ce">#</th><th class="ce">รหัส</th><th class="lft">ชื่อ-นามสกุล</th><th class="lft">แผนก</th><th class="ce">ใบ</th><th class="ce">ยอด OT</th><th class="ce">สถานะ</th><th class="ce">เอกสาร</th><th class="ce">LINE/เมล</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    (t.changed?'<div class="hr-note" style="margin-top:10px;background:#fff8e1;color:#7f6000"><b>'+ico('alert')+' ยอดเปลี่ยนหลังส่ง</b> = คนกลุ่มนี้ได้รับสรุปไปแล้ว แต่มีการคำนวณรอบใหม่ทีหลังจนยอดไม่ตรงกับที่ส่งไป → กด <b>'+ico('file')+' สร้างเอกสาร</b> (ติ๊ก regen + ใส่ชื่อเฉพาะคนนั้น) แล้ว <b>'+ico('upload')+' ส่ง LINE</b> (ติ๊ก force + ใส่ชื่อเดิม)</div>':'')+
    (t.pending?'<div class="hr-note" style="margin-top:8px">⏳ "ยังไม่ส่ง" '+t.pending+' คน — ตรวจเอกสารแล้วกด <b>'+ico('upload')+' 3. ส่ง LINE สรุป</b> ได้เลย (ระบบข้ามคนที่ส่งแล้วอัตโนมัติ)</div>':'')+
    logBox+
  '</div>';
  if(box.scrollIntoView) box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
// ── แท็บ 📊 สรุป OT (คำนวณสด) ──
function otReportTabHtml(){
  return '<div class="card">'+
    '<div class="hr-note ok2">'+ico('chart')+' สรุป OT รายคน — คำนวณสด (ชม. + เงิน 1x/1.5x/3x) · เฉพาะใบที่อนุมัติแล้ว · ตรงสูตรระบบ OT</div>'+
    otFilterBar('otr', S.mgotRptFilter)+
    '<div class="mg-tools" style="justify-content:flex-end"><button class="mg-act export" id="otRptExportBtn">'+ico('upload')+' Export Sheet</button></div>'+
    '<div id="otReport"><div class="skel" style="height:160px"></div></div>'+
  '</div>';
}
function wireOtReportTab(){ var ex=document.getElementById('otRptExportBtn'); if(ex) ex.addEventListener('click',doOtSummaryExport); wireOtRptFilter(); }
function wireOtRptFilter(){
  var m=document.getElementById('otrMode'); if(m) m.addEventListener('change',function(){ S.mgotRptFilter.mode=m.value; var bar=document.querySelector('#otTab .hr-filter'); if(bar) bar.outerHTML=otFilterBar('otr',S.mgotRptFilter); wireOtRptFilter(); });
  var go=document.getElementById('otrGo'); if(go) go.addEventListener('click',loadOtReport);
}
function loadOtReport(){
  if(!(S.profile&&S.profile.canAdmin)) return;
  otReadFilter('otr', S.mgotRptFilter); var f=S.mgotRptFilter;
  if(f.mode==='range'&&(!f.from||!f.to)) return toast('เลือกช่วงวันที่ให้ครบค่ะ','err');
  var box=document.getElementById('otReport'); if(box) box.innerHTML='<div class="skel" style="height:160px"></div>';
  api('mgOtSummary',{mode:f.mode,year:f.year,month:f.month,from:f.from,to:f.to}).then(function(r){ if(!r.ok){ if(box) box.innerHTML=emptyBox(ico('lock','e-ico'),r.error||'โหลดไม่ได้'); return; } S.mgotRptData=r; paintOtReport(); }).catch(function(e){ if(box) box.innerHTML=emptyBox(ico('alert','e-ico'),String(e.message||e)); });
}
function paintOtReport(){
  var box=document.getElementById('otReport'); if(!box||!S.mgotRptData) return;
  var d=S.mgotRptData, ps=d.persons||[], t=d.totals||{};
  if(!ps.length){ box.innerHTML=emptyBox(ico('leaf'),'ไม่มี OT ที่อนุมัติในช่วงนี้'); return; }
  var rows=ps.map(function(e,i){ return '<tr><td class="ce">'+(i+1)+'</td><td class="mg-sub2 ce">'+esc(e.empId)+'</td><td class="lft"><b>'+esc(e.name)+'</b></td><td class="lft">'+esc(e.dept||'-')+'</td>'+
    '<td class="ce">'+e.count+'</td><td class="ce">'+mgNum(e.hours)+'</td>'+
    '<td class="ce">'+mgNum(e.h1)+'</td><td class="ce">'+_otMoney(e.m1)+'</td>'+
    '<td class="ce">'+mgNum(e.h15)+'</td><td class="ce">'+_otMoney(e.m15)+'</td>'+
    '<td class="ce">'+mgNum(e.h3)+'</td><td class="ce">'+_otMoney(e.m3)+'</td>'+
    '<td class="ce"><b>'+_otMoney(e.total)+'</b></td></tr>'; }).join('');
  var foot='<tr class="ot-tot"><td colspan="4" class="lft"><b>รวมทั้งหมด</b></td><td class="ce"><b>'+t.count+'</b></td><td class="ce"><b>'+mgNum(t.hours)+'</b></td><td class="ce"></td><td class="ce"><b>'+_otMoney(t.m1)+'</b></td><td class="ce"></td><td class="ce"><b>'+_otMoney(t.m15)+'</b></td><td class="ce"></td><td class="ce"><b>'+_otMoney(t.m3)+'</b></td><td class="ce"><b>'+_otMoney(t.total)+'</b></td></tr>';
  box.innerHTML='<div class="mg-head">'+ico('chart')+' '+esc(d.label||'')+' · '+ps.length+' คน <span class="mg-legend">เงินบาท · คำนวณสดตามสูตรระบบ OT</span></div>'+
    '<div class="mg-tbwrap"><table class="mg-table mg-rpt"><thead><tr><th class="ce">#</th><th class="ce">รหัส</th><th class="lft">ชื่อ-นามสกุล</th><th class="lft">แผนก</th><th class="ce">ใบ</th><th class="ce">ชม.</th><th class="ce">ชม.1x</th><th class="ce">เงิน1x</th><th class="ce">ชม.1.5x</th><th class="ce">เงิน1.5x</th><th class="ce">ชม.3x</th><th class="ce">เงิน3x</th><th class="ce">รวมเงิน</th></tr></thead><tbody>'+rows+foot+'</tbody></table></div>';
}
function doOtExport(){ var f=S.mgotFilter; toast('กำลังสร้างรายงาน… (อาจใช้เวลาสักครู่)'); api('mgOtExport',{mode:f.mode,year:f.year,month:f.month,from:f.from,to:f.to}).then(otExportResult).catch(function(e){ toast(String(e.message||e),'err'); }); }
function doOtSummaryExport(){ var f=S.mgotRptFilter; toast('กำลังสร้างรายงาน… (อาจใช้เวลาสักครู่)'); api('mgOtSummaryExport',{mode:f.mode,year:f.year,month:f.month,from:f.from,to:f.to}).then(otExportResult).catch(function(e){ toast(String(e.message||e),'err'); }); }
function otExportResult(r){
  if(!r.ok) return toast(r.error||'export ไม่สำเร็จ','err');
  modalForm({ title:'Export สำเร็จ', emoji:ico('upload'), accent:'ot', okLabel:'↗ เปิดรายงาน',
    body:'<div class="cfm-row"><span class="cfm-k">จำนวน</span><span class="cfm-v">'+r.count+' แถว</span></div>'+
      '<div class="hr-note ok2" style="margin:10px 0">'+ico('file')+' Google Sheet (ใครมีลิงก์ดูได้) — '+ico('alert')+' ข้อมูลส่วนบุคคล อย่าแชร์นอกทีม HR</div>'+
      '<a href="'+esc(r.url)+'" target="_blank" rel="noopener" class="mg-link">'+esc(r.url)+'</a>',
    onOk:function(){ window.open(r.url,'_blank'); closeConfirm(); } });
}

// ════════════ VIEW: SETTINGS (admin · ADMIN/OWNER) ════════════
function loadSettings(){
  api('adminBootstrap',{}).then(function(r){
    var m=document.getElementById('main'); if(!m) return;
    if(!r.ok){ m.innerHTML=backBar()+emptyBox(ico('lock','e-ico'),r.error||'ไม่มีสิทธิ์'); bindBack(); return; }
    S.adminUsers=r.users; S.adminRoles=r.roles; S.adminCaller=r.callerId; S.adminOwnerCount=r.ownerCount; S.adminSchedules=r.schedules||[];
    m.innerHTML=backBar()+renderSettings(r); bindBack(); wireSettings();
  }).catch(function(e){ var m=document.getElementById('main'); if(m){ m.innerHTML=backBar()+emptyBox(ico('alert','e-ico'),String(e.message||e)); bindBack(); } });
}
function renderSettings(r){
  // หน้าแรกเมนูพนักงาน = แดชบอร์ด + ค้นหา + ตาราง (ปรับตามแบบที่พี่กี้ส่ง 27 ส.ค. 69)
  return '<div id="empDash"><div class="card"><div class="skel" style="height:90px"></div></div></div>'+
    '<div class="card">'+
      '<div class="card-title"><span class="ic"></span>รายชื่อพนักงาน ('+r.users.length+') · OWNER '+r.ownerCount+' คน</div>'+
      '<div class="mg-tools">'+
        '<input type="text" id="empSearch" class="mg-srch" placeholder="ค้นชื่อ / รหัส / แผนก / ตำแหน่ง…" value="'+esc(S.empQ||'')+'">'+
        '<select id="empStatusF" class="hr-fsel">'+
          [['all','ทุกสถานะ'],['active','ทำงานอยู่'],['left','ลาออกแล้ว']].map(function(o){
            return '<option value="'+o[0]+'"'+((S.empStatus||'active')===o[0]?' selected':'')+'>'+o[1]+'</option>'; }).join('')+
        '</select>'+
        '<select id="empDeptF" class="hr-fsel">'+optsOf(r.users,'dept','ทุกแผนก',S.empDept)+'</select>'+
        '<select id="empPosF" class="hr-fsel">'+optsOf(r.users,'position','ทุกตำแหน่ง',S.empPos)+'</select>'+
        '<button class="btn btn-primary" data-addemp style="width:auto;white-space:nowrap">'+ico('plus')+' เพิ่มพนักงาน</button>'+
      '</div>'+
      '<div id="empTable"></div>'+
    '</div>';
}

/** optsOf — สร้าง <option> จากค่าที่มีจริงในข้อมูล (ไม่ต้องมีตารางตั้งค่าแยก) */
function optsOf(users, field, allLabel, cur){
  var set = {};
  (users||[]).forEach(function(u){ var v=(u[field]||'').trim(); if(v) set[v]=1; });
  var list = Object.keys(set).sort(function(a,b){ return a.localeCompare(b,'th'); });
  return '<option value="">'+esc(allLabel)+'</option>'+
    list.map(function(v){ return '<option value="'+esc(v)+'"'+(cur===v?' selected':'')+'>'+esc(v)+'</option>'; }).join('');
}

/** ตารางรายชื่อ — ลำดับ · รหัส · ชื่อ · ตำแหน่ง · แผนก · สถานะ · จัดการ */
function paintEmpTable(){
  var box = document.getElementById('empTable'); if(!box) return;
  var q = (S.empQ||'').trim().toLowerCase();
  var sf = S.empStatus || 'active';
  var list = (S.adminUsers||[]).filter(function(u){
    var isLeft = String(u.status||'').indexOf('ลาออก') >= 0;
    if(sf==='active' && isLeft) return false;
    if(sf==='left' && !isLeft) return false;
    if(S.empDept && (u.dept||'') !== S.empDept) return false;
    if(S.empPos  && (u.position||'') !== S.empPos) return false;
    if(!q) return true;
    return [u.name,u.empId,u.dept,u.position,u.branch].join(' ').toLowerCase().indexOf(q) >= 0;
  });

  if(!list.length){ box.innerHTML = emptyBox(ico('leaf'),'ไม่พบพนักงานตามที่ค้น'); return; }

  var rows = list.map(function(u,i){
    var isLeft = String(u.status||'').indexOf('ลาออก') >= 0;
    var isSelf = u.lineUserId && u.lineUserId === S.adminCaller;
    // คนที่ยังไม่ผูก LINE ไม่มี lineUserId ให้อ้าง — ใช้เลขบัตรเป็นกุญแจแทน
    var okey = empKeyOf(u);
    return '<tr class="mg-tr">'+
      '<td class="ce mg-sub2">'+(i+1)+'</td>'+
      '<td class="ce"><span class="emp-code">'+esc(u.empId||'-')+'</span></td>'+
      '<td class="lft"><span class="emp-name-cell">'+empAvatar(u, 30)+
        '<a class="emp-link" data-eopen="'+esc(okey)+'"><b>'+esc(u.name)+'</b></a></span>'+
        (isSelf?' <span class="re-badge">คุณ</span>':'')+
        (u.notCounted?' <span class="pill" title="'+esc(u.notCountedReason||'ไม่นับเป็นพนักงาน')+'">ไม่นับ</span>':'')+
        (u.hasLine===false?'<div class="mg-sub2">ยังไม่ผูก LINE</div>':'')+'</td>'+
      '<td class="lft">'+esc(u.position||'-')+'</td>'+
      '<td class="lft">'+esc(u.dept||'-')+'</td>'+
      '<td class="ce">'+(isLeft
          ? '<span class="pill">ลาออก</span>'+(u.resignDate?'<div class="mg-sub2">'+esc(u.resignDate)+'</div>':'')
          : '<span class="pill ok">ทำงานอยู่</span>')+'</td>'+
      '<td class="mg-actcell"><div class="mg-acts2">'+
        '<button class="mg-ib edit" data-eopen="'+esc(okey)+'">'+ico('pencil')+' เปิด</button>'+
        (u.hasLine===false
          ? '<button class="mg-ib" disabled title="ต้องผูก LINE ก่อนถึงตั้งบทบาทได้">'+ico('user')+' บทบาท</button>'
          : '<button class="mg-ib" data-srole="'+esc(u.lineUserId)+'">'+ico('user')+' บทบาท</button>')+
        '<button class="mg-ib" data-squota="'+esc(u.empId)+'">'+ico('sun')+' โควต้า</button>'+
      '</div></td></tr>'; }).join('');

  box.innerHTML = '<div class="mg-tbwrap"><table class="mg-table"><thead><tr>'+
      '<th class="ce">ลำดับ</th><th class="ce">รหัสพนักงาน</th><th class="lft">ชื่อ-นามสกุล</th>'+
      '<th class="lft">ตำแหน่ง</th><th class="lft">แผนก</th><th class="ce">สถานะ</th><th class="ce">จัดการ</th>'+
    '</tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<div class="emp-thead" style="margin-top:8px">'+
      '<span class="mg-sub2">แสดง '+list.length+' คน</span>'+
      '<button class="mg-ib" data-photosync>'+ico('camera')+' ดึงรูปจาก LINE</button></div>';
  wireEmpTable();
  var ps = document.querySelector('[data-photosync]');
  if(ps) ps.addEventListener('click', function(){ syncEmpPhotos(ps); });
}

/** ดึงรูปโปรไฟล์ LINE ของทุกคนมาเก็บ (กดเป็นรอบๆ พอ — รูปไม่ได้เปลี่ยนบ่อย) */
function syncEmpPhotos(btn){
  // ดึงทีละรอบ (รอบละ ~20 คน) แล้วต่อ offset ไปเรื่อย ๆ จน done
  // เดิมยิงรวดเดียวทุกคน → เกิน 20 วิที่ api() รอไหว ขึ้น "หมดเวลาเชื่อมต่อ" ทั้งที่หลังบ้านยังทำอยู่
  var acc = { updated:0, failed:0, noPic:0, samples:[], why:'' };
 var reset = function(){ if(btn){ btn.disabled=false; btn.textContent=' ดึงรูปจาก LINE'; } };
  if(btn) btn.disabled = true;

  var step = function(offset){
    if(btn) btn.textContent = 'กำลังดึงรูป… '+(offset?offset+' คน':'');
    api('emPhotoSync',{offset:offset}).then(function(r){
      if(!r.ok){ reset(); return toast(r.error||'ดึงรูปไม่สำเร็จ','err'); }
      acc.updated += (r.updated||0);
      acc.failed  += (r.failed||0);
      acc.noPic   += (r.noPic||0);
      if(r.why) acc.why = r.why;
      (r.samples||[]).forEach(function(x){ if(acc.samples.length<3) acc.samples.push(x); });

      if(!r.done && r.processed){
        if(btn) btn.textContent = 'กำลังดึงรูป… '+r.nextOffset+'/'+r.total;
        step(r.nextOffset);
        return;
      }
      reset();
      if(acc.failed){
        // ดึงไม่ได้ = มีอะไรต้องแก้ (โทเคน/เพื่อนบอท) — บอกให้ครบ ไม่ใช่ toast วูบเดียว
        noticeBox(ico('camera')+' ผลการดึงรูปจาก LINE',
          'อัปเดตรูปสำเร็จ '+acc.updated+' คน'+
          (acc.noPic?'\nไม่ได้ตั้งรูปโปรไฟล์ใน LINE '+acc.noPic+' คน':'')+
          '\nดึงไม่ได้ '+acc.failed+' คน\n\nสาเหตุ: '+(acc.why||'-')+
          (acc.samples.length?'\nตัวอย่าง: '+acc.samples.join(', '):''));
      } else {
        toast('อัปเดตรูป '+acc.updated+' คน'+(acc.noPic?' · ไม่ได้ตั้งรูปใน LINE '+acc.noPic+' คน':''),'ok');
      }
      loadSettings();
    }).catch(function(e){
      reset();
      toast(String(e.message||e)+(acc.updated?' (ได้แล้ว '+acc.updated+' คน — กดใหม่เพื่อทำต่อ)':''),'err');
    });
  };
  step(0);
}

function wireEmpTable(){
  document.querySelectorAll('[data-eopen]').forEach(function(el){
    el.addEventListener('click',function(){ openEmpPage(el.dataset.eopen); }); });
  document.querySelectorAll('[data-srole]').forEach(function(el){
    el.addEventListener('click',function(ev){ ev.stopPropagation(); openRoleModal(el.dataset.srole); }); });
  document.querySelectorAll('[data-squota]').forEach(function(el){
    el.addEventListener('click',function(ev){ ev.stopPropagation(); openQuotaModal(el.dataset.squota); }); });
}

function wireSettings(){
  var add=document.querySelector('[data-addemp]'); if(add) add.addEventListener('click', openAddEmployeeModal);
  var q=document.getElementById('empSearch');
  if(q) q.addEventListener('input', function(){ S.empQ=q.value; paintEmpTable(); });
  var sf=document.getElementById('empStatusF');
  if(sf) sf.addEventListener('change', function(){ S.empStatus=sf.value; paintEmpTable(); });
  var df=document.getElementById('empDeptF');
  if(df) df.addEventListener('change', function(){ S.empDept=df.value; paintEmpTable(); });
  var pf=document.getElementById('empPosF');
  if(pf) pf.addEventListener('change', function(){ S.empPos=pf.value; paintEmpTable(); });
  paintEmpTable();
  loadEmpDash();
  document.querySelectorAll('[data-ssalary]').forEach(function(el){ el.addEventListener('click',function(){ openSalaryHistory(el.dataset.ssalary, el.dataset.sname); }); });
  document.querySelectorAll('[data-eopen]').forEach(function(el){ el.addEventListener('click',function(){ openEmpPage(el.dataset.eopen); }); });
}
// ➕ body ฟอร์มเพิ่มพนักงาน (reuse ได้ทั้งหน้าตั้งค่า + การ์ดคำขอลงทะเบียน) · prefill ชื่อ/นามสกุลได้
function _addEmpFormBody_(pfName, pfLast){
  var scheds=S.adminSchedules||[];
  var schedOpts=scheds.length
    ? scheds.map(function(s){ return '<option value="'+esc(s.code)+'">'+esc(s.code)+(s.desc?' · '+esc(s.desc):'')+'</option>'; }).join('')
    : '<option value="">— ไม่พบกะ (ตั้งค่าชีตเวลาการทำงานก่อน) —</option>';
  var rc=function(label,inner){ return '<div class="set-row col"><label>'+label+'</label>'+inner+'</div>'; };
  var inp=function(f,ph,val){ return '<input type="text" data-f="'+f+'"'+(ph?' placeholder="'+ph+'"':'')+(val?' value="'+esc(val)+'"':'')+'>'; };
  var num=function(f,v){ return '<input type="number" inputmode="decimal" min="0" step="0.5" data-f="'+f+'" value="'+(v!=null?v:'')+'">'; };
  return ''+
    '<div class="set-sec">ข้อมูลจำเป็น *</div>'+
    '<div class="set-2col">'+rc('ชื่อ *',inp('name','',pfName))+rc('นามสกุล *',inp('lastName','',pfLast))+'</div>'+
    '<div class="set-2col">'+rc('รหัสพนักงาน *',inp('empId'))+rc('แผนก *',inp('dept'))+'</div>'+
    '<div class="set-2col">'+rc('เงินเดือน *',num('salary'))+rc('รหัสกะ *','<select data-f="sched">'+schedOpts+'</select>')+'</div>'+
    '<div class="set-sec">สิทธิ์ลา (วัน/ปี · พักร้อนกรอกตามอายุงาน)</div>'+
    '<div class="set-2col">'+
      '<div class="set-row"><label>'+ico('thermometer')+' ป่วย</label>'+num('q_sick',30)+'</div>'+
      '<div class="set-row"><label>'+ico('clipboard')+' กิจ</label>'+num('q_biz',3)+'</div>'+
      '<div class="set-row"><label>'+ico('sun')+' พักร้อน</label>'+num('q_vac',0)+'</div>'+
    '</div>'+
    '<div class="set-hint">ℹ️ ลาวันเกิด / คนพิเศษ / ลากิจไม่รับค่าจ้าง — <b>ไม่ให้สิทธิ์อัตโนมัติ</b> · ถ้าจะให้ กดปุ่ม '+ico('sun')+' โควต้า ของคนนั้นทีหลัง</div>'+
    '<div class="set-sec">payroll/OT (เติมทีหลังได้)</div>'+
    rc('ตำแหน่ง',inp('position'))+rc('Email',inp('email'))+
    '<div class="set-2col">'+rc('ธนาคาร',inp('bank'))+rc('เลขบัญชี',inp('bankAcc'))+'</div>'+
    rc('เลขบัตรประชาชน (13 หลัก)',inp('taxId'))+rc('วันเริ่มงาน (dd/MM/yyyy)',inp('startDate'))+
    '<div class="set-2col">'+
      rc('หัก ปกส.','<select data-f="ssoFlag"><option>ใช่</option><option>ไม่ใช่</option></select>')+
      rc('หักภาษี','<select data-f="taxFlag"><option>ใช่</option><option>ไม่ใช่</option></select>')+'</div>';
}
function _collectAddEmp_(cc){
  var pl={quota:{}};
  cc.querySelectorAll('[data-f]').forEach(function(el){
    var f=el.dataset.f;
    if(f.indexOf('q_')===0) pl.quota[f.substring(2)]=el.value; else pl[f]=el.value;
  });
  return pl;
}
// ➕ ฟอร์มเพิ่มพนักงานใหม่ (หน้าตั้งค่า)
function openAddEmployeeModal(){
 _settingsModal_('เพิ่มพนักงานใหม่', _addEmpFormBody_('',''), function(cc){
    var pl=_collectAddEmp_(cc);
    closeConfirm(); toast('กำลังเพิ่มพนักงาน…');
    api('addEmployee',pl).then(function(r){
      if(!r.ok) return toast(r.error||'เพิ่มไม่สำเร็จ','err');
 var msg=' เพิ่ม '+r.fullName+' แล้ว ('+(r.written?r.written.length:0)+' ที่)';
 if(r.warnings&&r.warnings.length) msg+=' '+r.warnings.join('; ');
      toast(msg,'ok'); loadSettings();
    }).catch(function(e){ toast(String(e.message||e),'err'); });
  });
}
// ➕+✅ เพิ่มพนักงาน + อนุมัติผูก LINE ในขั้นเดียว (จากการ์ดคำขอที่ยังไม่มีข้อมูลในระบบ)
function openAddEmpFromPending(uid, typedName){
  var go=function(){
    var parts=String(typedName||'').trim().split(/\s+/);
    var pfName=parts.shift()||''; var pfLast=parts.join(' ');
    var body='<div class="hr-note ok2">พนักงานคนนี้ลงทะเบียนมาก่อนมีข้อมูล — กรอกให้ครบ ระบบจะ <b>เพิ่มข้อมูล + อนุมัติผูก LINE</b> ในขั้นเดียวค่ะ</div>'+
             _addEmpFormBody_(pfName,pfLast);
 _settingsModal_('เพิ่มพนักงาน + อนุมัติ', body, function(cc){
      var pl=_collectAddEmp_(cc); pl.targetUserId=uid;
      closeConfirm(); toast('กำลังเพิ่ม + อนุมัติ…');
      api('addEmployeeApprove',pl).then(function(r){
        if(!r.ok) return toast(r.error||'ไม่สำเร็จ','err');
 var msg=(r.linked?' เพิ่ม '+r.fullName+' + ผูก LINE แล้ว':' เพิ่ม '+r.fullName+' แล้ว');
 if(r.warnings&&r.warnings.length) msg+=' '+r.warnings.join('; ');
        toast(msg, r.linked?'ok':'err'); loadHr();
      }).catch(function(e){ toast(String(e.message||e),'err'); });
    });
  };
  // ต้องมีรายการกะ (โหลดจาก adminBootstrap) — ฟอร์มใช้ dropdown รหัสกะ
  if(S.adminSchedules) return go();
  toast('กำลังโหลดฟอร์ม…');
  api('adminBootstrap',{}).then(function(r){
    if(!r.ok) return toast(r.error||'ต้องเป็น ADMIN/OWNER เพื่อเพิ่มพนักงาน','err');
    S.adminSchedules=r.schedules||[]; S.adminUsers=r.users; S.adminRoles=r.roles;
    S.adminCaller=r.callerId; S.adminOwnerCount=r.ownerCount;
    go();
  }).catch(function(e){ toast(String(e.message||e),'err'); });
}
// modal กลาง — head + body + ปุ่มบันทึก
function _settingsModal_(head, body, onSave){
  var c=document.getElementById('confirm');
  if(!c){ c=document.createElement('div'); c.id='confirm'; c.className='cfm'; document.body.appendChild(c); }
  c.innerHTML='<div class="cfm-box"><div class="cfm-head">'+head+'</div>'+
    '<div class="cfm-body cfm-scroll">'+body+'</div>'+
    '<div class="cfm-act"><button class="cfm-btn ghost" data-cfm-cancel>ยกเลิก</button>'+
    '<button class="cfm-btn go" data-cfm-ok>'+ico('save')+' บันทึก</button></div></div>';
  c.classList.add('show');
  c.querySelector('[data-cfm-cancel]').addEventListener('click', closeConfirm);
  c.querySelector('[data-cfm-ok]').addEventListener('click', function(){ onSave(c); });
  return c;
}
function _findUser_(key,val){ return (S.adminUsers||[]).filter(function(x){return x[key]===val;})[0]; }
function openRoleModal(uid){
  var u=_findUser_('lineUserId',uid); if(!u) return;
 if(uid===S.adminCaller) return toast('เปลี่ยนบทบาทตัวเองไม่ได้','err');
  var btns=S.adminRoles.map(function(rr){ return '<button type="button" class="role-opt'+(rr===u.role?' sel':'')+'" data-r="'+rr+'">'+rr+'</button>'; }).join('');
  var c=_settingsModal_(ico('user')+' บทบาท · '+esc(u.name),
    '<div class="set-cur">ปัจจุบัน: <b>'+esc(u.role)+'</b></div><div class="role-grid">'+btns+'</div>',
    function(cc){
      var sel=cc.querySelector('.role-opt.sel'); var nr=sel?sel.dataset.r:u.role;
      if(nr===u.role){ closeConfirm(); return; }
      closeConfirm(); toast('กำลังบันทึก…');
      api('setRole',{targetUserId:uid,role:nr}).then(function(r){
        if(!r.ok) return toast(r.error||'ไม่สำเร็จ','err');
 toast('เปลี่ยนเป็น '+nr+' แล้ว','ok'); loadSettings();
      }).catch(function(e){ toast(String(e.message||e),'err'); });
    });
  c.querySelectorAll('.role-opt').forEach(function(el){ el.addEventListener('click',function(){
    c.querySelectorAll('.role-opt').forEach(function(x){x.classList.remove('sel');}); el.classList.add('sel'); }); });
}
function openQuotaModal(empId){
  var u=_findUser_('empId',empId);
  if(!u) return toast('ไม่พบพนักงาน','err');
  if(!u.quota) return toast('ไม่พบแถวโควต้าของ '+u.name+' ในชีตโควต้าลา','err');
  var q=u.quota;
  // แก้ได้ครบทั้ง 6 ประเภท — เดิมโชว์แค่ 3 ตัวแรก อีก 3 ตัวต้องไปแก้ในชีตเอง
  // (คนเก่ายังมีสิทธิ์วันเกิด/คนพิเศษ/ไม่รับค่าจ้างค้างอยู่ ต้องล้างได้จากหน้านี้)
 var types=[['sick',' ลาป่วย'],['biz',' ลากิจ'],['vac',' ลาพักร้อน'],
 ['bday',' ลาวันเกิด'],['special',' ลาวันเกิดคนพิเศษ'],['unpaid',' ลากิจไม่รับค่าจ้าง']];
  var body='<div class="set-hint">หน่วย: วัน (สิทธิ์ต่อปี) · ใส่ 0 = ไม่ให้สิทธิ์ (แถวนั้นจะหายจากตารางสิทธิ์ ถ้ายังไม่เคยลา)</div>'+
    types.map(function(t){
      return '<div class="set-row"><label>'+t[1]+'</label><input type="number" inputmode="decimal" min="0" step="0.5" data-q="'+t[0]+'" value="'+(q[t[0]]!=null?q[t[0]]:0)+'"></div>';
    }).join('')+
    '<button type="button" class="btn btn-sm mg-full" data-qzero style="margin-top:6px">'+ico('eraser')+' ล้างสิทธิ์ วันเกิด · คนพิเศษ · ไม่รับค่าจ้าง (ตั้งเป็น 0)</button>'+
    '<div class="set-hint">พนักงานใหม่ไม่ได้ 3 ประเภทนี้อัตโนมัติแล้ว · ปุ่มนี้ไว้ล้างของคนเก่าที่ยังค้างอยู่</div>';
 var c=_settingsModal_('โควต้าลา · '+esc(u.name), body, function(cc){
    var quota={}; cc.querySelectorAll('[data-q]').forEach(function(el){ quota[el.dataset.q]=el.value; });
    closeConfirm(); toast('กำลังบันทึก…');
    api('setLeaveQuota',{empId:empId,quota:quota}).then(function(r){
      if(!r.ok) return toast(r.error||'ไม่สำเร็จ','err');
 toast('แก้โควต้าแล้ว'+(r.changed?' ('+r.changed+' รายการ)':''),'ok'); afterEmpEdit();
    }).catch(function(e){ toast(String(e.message||e),'err'); });
  });
  var zb=c.querySelector('[data-qzero]');
  if(zb) zb.addEventListener('click', function(){
    ['bday','special','unpaid'].forEach(function(k){
      var el=c.querySelector('[data-q="'+k+'"]'); if(el) el.value=0; });
 toast('ตั้งเป็น 0 แล้ว — กด บันทึก เพื่อยืนยัน');
  });
}
/**
 * afterEmpEdit — บันทึกเสร็จแล้วรีเฟรชที่ "หน้าเดิม"
 *   อยู่หน้ารายบุคคล → โหลดรายชื่อใหม่เงียบๆ แล้ววาดหน้าเดิม (เดิมเด้งกลับหน้ารายชื่อทุกครั้ง)
 */
function afterEmpEdit(){
  if(!S.empPage){ loadSettings(); return; }
  var key = S.empPage.user.empId;
  api('adminBootstrap',{}).then(function(r){
    if(!r.ok) return loadSettings();
    S.adminUsers = r.users;
    var u = (r.users||[]).filter(function(x){ return String(x.empId)===String(key); })[0];
    if(!u){ loadSettings(); return; }
    S.empPage.user = u;
    renderEmpPage();
  }).catch(function(){ loadSettings(); });
}

function openInfoModal(uid){
  var u=_findUser_('lineUserId',uid); if(!u) return;
  var fields=[['dept','แผนก'],['email','Email'],['startDate','วันเริ่มงาน (dd/MM/yyyy)'],['branch','สาขา'],['status','สถานะพนักงาน']];
  var body='<div class="set-ro">ชื่อ: <b>'+esc(u.name)+'</b> · รหัส '+esc(u.empId||'-')+' <span style="color:var(--muted)">(แก้ไม่ได้)</span></div>'+
    fields.map(function(f){
      return '<div class="set-row col"><label>'+f[1]+'</label><input type="text" data-f="'+f[0]+'" value="'+esc(u[f[0]]||'')+'"></div>';
    }).join('');
 _settingsModal_('ข้อมูล · '+esc(u.name), body, function(cc){
    var payload={targetUserId:uid}; cc.querySelectorAll('[data-f]').forEach(function(el){ payload[el.dataset.f]=el.value; });
    closeConfirm(); toast('กำลังบันทึก…');
    api('updateEmployee',payload).then(function(r){
      if(!r.ok) return toast(r.error||'ไม่สำเร็จ','err');
 toast('แก้ข้อมูลแล้ว'+(r.changed&&r.changed.length?' ('+r.changed.length+' ช่อง)':''),'ok'); afterEmpEdit();
    }).catch(function(e){ toast(String(e.message||e),'err'); });
  });
}

// ════════════ HELPERS ════════════
function refresh(){ api('bootstrap',{}).then(function(r){ if(r.ok){ apply(r); if(S.view==='home'||S.view==='profile') render(); } }).catch(function(){}); }
function statusBadge(st){
  st = String(st||'');
  // ป้ายบนหน้าจอใช้ไอคอนเส้น — ค่าสถานะจริงในชีตยังเป็นอิโมจิเหมือนเดิม (backend เทียบสตริงนั้น)
  if (st.indexOf('ยกเลิก')>=0) return '<span class="badge cancel">'+ico('ban')+' ยกเลิก</span>';
  if (st.indexOf('แก้ไข')>=0 || st.indexOf('ส่งกลับ')>=0) return '<span class="badge edit">'+ico('pencil')+' ต้องแก้ไข</span>';
  if (st.indexOf('รอ')>=0) return '<span class="badge wait">'+ico('hourglass')+' รออนุมัติ</span>';   // "รอการอนุมัติ" — เช็คก่อน (มีคำว่า "อนุมัติ" ข้างใน)
  if (st.indexOf('ไม่อนุมัติ')>=0) return '<span class="badge no">'+ico('x')+' ไม่อนุมัติ</span>';
  if (st.indexOf('อนุมัติ')>=0) return '<span class="badge ok">'+ico('check')+' อนุมัติ</span>';
  return '<span class="badge wait">'+ico('hourglass')+' รออนุมัติ</span>';
}
function dkey(d){ return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate(); }
function fmtThai(d){ return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+(d.getFullYear()+543); }
// วันหยุดบริษัท: รองรับทั้ง ค.ศ. (backend formatDate) และ พ.ศ. (ปี>2500 → -543)
function _holParse_(dateStr){ var p=String(dateStr).split('/'); if(p.length!==3) return null;
  var yy=+p[2]; if(yy>2500) yy-=543; return {y:yy, mo:(+p[1])-1, d:+p[0]}; }
function _ymdKey_(y,mo,d){ return y+'-'+mo+'-'+d; }
function holidayName(dt){
  var t=_ymdKey_(dt.getFullYear(),dt.getMonth(),dt.getDate());
  for(var i=0;i<S.holidays.length;i++){
    var hp=_holParse_(S.holidays[i].date);
    if(hp && _ymdKey_(hp.y,hp.mo,hp.d)===t) return S.holidays[i].name||'วันหยุดบริษัท';
  }
  return '';
}
function isHoliday(dt){ return !!holidayName(dt); }
function holidaysInMonth(y,mo){
  var out=[];
  S.holidays.forEach(function(h){
    var hp=_holParse_(h.date);
    if(hp && hp.y===y && hp.mo===mo) out.push({day:hp.d, name:h.name||'วันหยุดบริษัท'});
  });
  return out.sort(function(a,b){ return a.day-b.day; });
}
// กล่องใต้ปฏิทิน: กะของฉัน + เวลา + วันหยุดบริษัทเดือนนี้ + legend สี
function buildCalLegend(y,mo){
  var s=S.schedule, box='';
  if(s){
    var tm=(s.start&&s.end)?(' · '+esc(s.start)+'–'+esc(s.end)):'';
    box+='<div class="cal-sched"><span class="cs-ic">'+ico('calendar')+'</span>'+
      '<div><div class="cs-main">กะของคุณ: '+esc(s.label||s.code)+tm+'</div>'+
      (s.offLabel?'<div class="cs-sub">หยุด: '+esc(s.offLabel)+'</div>':'')+'</div></div>';
  } else {
    box+='<div class="cal-sched"><span class="cs-ic">'+ico('calendar')+'</span><div class="cs-main">หยุดเสาร์–อาทิตย์ (ยังไม่กำหนดกะ)</div></div>';
  }
  var hol=holidaysInMonth(y,mo);
  if(hol.length){
    box+='<div class="cal-hols"><div class="ch-title">'+ico('sparkle')+' วันหยุดบริษัทเดือนนี้</div>'+
      hol.map(function(x){ return '<div class="ch-row"><b>'+x.day+'</b> '+esc(x.name)+'</div>'; }).join('')+'</div>';
  }
  box+='<div class="cal-legend">'+
    '<span class="lg"><i class="sw holiday"></i>วันหยุดบริษัท</span>'+
    '<span class="lg"><i class="sw off"></i>วันหยุดของคุณ</span>'+
    '<span class="lg"><i class="sw today"></i>วันนี้</span></div>';
  return box;
}
function countLeaveDays(f){
  if (f.period==='morning'||f.period==='afternoon') return 0.5;
  if (f.period==='hours'){ var h=otHours(f.stime,f.etime); return h>0?Math.round(h/8*100)/100:0; }
  // นับเฉพาะวันทำงาน — ข้ามวันหยุดกะ + วันหยุดบริษัท (ตรงกับ backend _countWorkDays_)
  var offSet=(S.schedule&&S.schedule.off&&S.schedule.off.length)?S.schedule.off:[0,6];
  var s=f.start, e=f.end||f.start;
  var cur=new Date(s.getFullYear(),s.getMonth(),s.getDate());
  var end=new Date(e.getFullYear(),e.getMonth(),e.getDate());
  if(end<cur) return 0;
  var n=0,guard=0;
  while(cur<=end && guard<400){
    if(offSet.indexOf(cur.getDay())<0 && !holidayName(cur)) n++;
    cur.setDate(cur.getDate()+1); guard++;
  }
  return n;
}
function endBeforeStart(s,e){ if(!s||!e) return false; return tmin(e)<tmin(s); }
function tmin(t){ var p=String(t).split(':'); return (parseInt(p[0])||0)*60+(parseInt(p[1])||0); }
function otHours(s,e){
  if(!s||!e) return 0;
  var sm=tmin(s), em=tmin(e); if(sm===em) return 0;
  if(em<sm) em+=1440;
  return Math.round((em-sm)/60*100)/100;
}
/** ปุ่ม ในหน้าโปรไฟล์ตัวเอง — พนักงานเปลี่ยนรูปเองได้ ไม่ต้องรอ HR */
function wireMyPhotoBtn(){
  var b = document.querySelector('[data-myphoto]'); if(!b) return;
  b.addEventListener('click', function(ev){
    ev.stopPropagation();
    pickAndUploadPhoto('', function(url){ S.avatar = url; paintAvatar(); render(); });
  });
}

function paintAvatar(){ if(!S.avatar)return; var img='<img src="'+S.avatar+'">';
  var a=document.getElementById('hd-avatar'); if(a) a.innerHTML=img;
  var t=document.getElementById('tb-avatar'); if(t) t.innerHTML=img; }
function emptyBox(emo,txt){ return '<div class="card"><div class="empty"><div class="e-emo">'+emo+'</div><div class="e-txt">'+escIco(txt)+'</div></div></div>'; }
function viewSoon(title,desc){ return '<div class="card"><div class="soon"><div class="soon-emo">'+ico('tools')+'</div>'+
  '<div class="soon-t">'+escIco(title)+'</div><div class="soon-d">'+escIco(desc)+'</div>'+
  '<div class="soon-b">กำลังพัฒนา — เร็วๆ นี้ค่ะ</div></div></div>'; }
/**
 * escIco — esc() ที่ยอมให้ไอคอนของระบบผ่านได้
 * ข้อมูลจากผู้ใช้ยัง escape เหมือนเดิม · ผ่านเฉพาะ <svg class="ico …"> ที่ ico() สร้าง
 * (helper อย่าง empRow/pfRow ทำ esc(v) ไอคอนที่ส่งเข้าไปเลยโผล่เป็นโค้ดดิบ)
 */
function escIco(v){
  return String(v==null?'':v)
    .split(/(<svg class="ico[\s\S]*?<\/svg>)/)
    .map(function(p,i){ return i%2 ? p : esc(p); })
    .join('');
}
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
var _tt;
function toast(msg,kind){ var t=document.getElementById('toast'); t.textContent=msg; t.className='toast show'+(kind?' '+kind:''); clearTimeout(_tt); _tt=setTimeout(function(){ t.className='toast'; },3200); }

// ════════════ แท็บ 📚 ไฟล์รายงาน (ใช้ร่วม ลา/OT) ════════════
// ระบบจดทุกไฟล์ที่กด Export ไว้ในชีต "ทะเบียนรายงาน"
// เดิมลิงก์โผล่ครั้งเดียวตอนกด ปิดหน้าต่างแล้วต้องไปงมใน Drive เอง
// เขียนเต็มประโยคไปเลย — ต่อคำเอาแล้วเว้นวรรคไทย/อังกฤษเพี้ยน ('ไฟล์รายงานOTที่เคย')
var RPT_NOTE = { leave:' รายงานการลารายเดือน — กดเปิดแท็บในชีตได้เลย', ot:' รายงาน OT รายเดือน — กดเปิดแท็บในชีตได้เลย' };

function rptFilesTabHtml(group){
  return '<div class="card">'+
    '<div class="hr-note ok2">'+RPT_NOTE[group]+' — กดเปิดซ้ำได้ ไม่ต้องหาใน Drive</div>'+
    '<div id="rptMonths"><div class="skel" style="height:70px"></div></div>'+
  '</div>';
}

/**
 * ดึงรายงานเก่าจาก audit log เข้าทะเบียน — ทะเบียนเพิ่งมี ของก่อนหน้าจึงยังไม่อยู่ในลิสต์
 * 2 จังหวะเหมือนปุ่มอื่น: ดูก่อน → ยืนยัน
 */
function doRptBackfill(group){
  var btn=document.getElementById('rptBackfill'); if(btn){ btn.disabled=true; btn.textContent='กำลังตรวจ…'; }
 var reset=function(){ var b=document.getElementById('rptBackfill'); if(b){ b.disabled=false; b.textContent=' ดึงรายงานเก่าเข้าทะเบียน'; } };

  api('mgReportBackfill',{}).then(function(r){
    reset();
    if(!r.ok) return toast(r.error||'ตรวจไม่สำเร็จ','err');
    if(!r.found) return toast('ไม่มีรายงานเก่าที่ตกหล่น — ทะเบียนครบแล้วค่ะ','ok');

    modalForm({ title:'ดึงรายงานเก่าเข้าทะเบียน', emoji:ico('rotate'), okLabel:ico('check')+' เพิ่มเข้าทะเบียน',
      body:'<div class="hr-note ok2" style="white-space:pre-line;line-height:1.7">'+esc(r.report)+'</div>',
      onOk:function(c){
        var b=c.querySelector('[data-cfm-ok]'); if(b){ b.disabled=true; b.textContent='กำลังเพิ่ม…'; }
        api('mgReportBackfill',{mode:'commit'}).then(function(r2){
 if(!r2.ok){ if(b){ b.disabled=false; b.textContent=' เพิ่มเข้าทะเบียน'; } return toast(r2.error||'เพิ่มไม่สำเร็จ','err'); }
 closeConfirm(); toast('เพิ่มแล้ว '+r2.added+' ไฟล์','ok');
          loadRptFiles(group);
 }).catch(function(e){ if(b){ b.disabled=false; b.textContent=' เพิ่มเข้าทะเบียน'; } toast(String(e.message||e),'err'); });
      } });
  }).catch(function(e){ reset(); toast(String(e.message||e),'err'); });
}

function wireRptFiles(group){
  var b=document.getElementById('rptBackfill');
  if(b) b.addEventListener('click',function(){ doRptBackfill(group); });
}

/** รายงานรายเดือนที่เป็นแท็บในชีตอยู่แล้ว (มีมาก่อนมีทะเบียน) */
function loadRptMonths(group){
  api('mgMonthlyReports',{group:group}).then(function(r){
    var box=document.getElementById('rptMonths'); if(!box) return;
    if(!r.ok) return box.innerHTML=emptyBox(ico('alert'), r.error||'โหลดไม่สำเร็จ');
    if(!(r.months||[]).length)
      return box.innerHTML=emptyBox(ico('file'),'ยังไม่มีแท็บรายงานรายเดือนในชีต');
    box.innerHTML=
      '<div class="mg-tbwrap"><table class="mg-table rpt-tbl"><thead><tr>'+
        '<th class="ce">ลำดับ</th><th>เดือน</th><th>ตั้งแต่</th><th>ถึงวันที่</th>'+
        '<th class="ce">จำนวนรายการ</th><th>แท็บในชีต</th><th class="ce">จัดการ</th>'+
      '</tr></thead><tbody>'+
      r.months.map(function(m,i){
        return '<tr>'+
          '<td class="ce mg-sub2">'+(i+1)+'</td>'+
          '<td><b>'+esc(m.label)+'</b></td>'+
          '<td>'+esc(m.from||'-')+'</td>'+
          '<td>'+esc(m.to||'-')+'</td>'+
          '<td class="ce"><b>'+m.rows+'</b></td>'+
          '<td class="mg-sub2">'+esc(m.name)+'</td>'+
          '<td class="ce"><a class="rpt-open" href="'+esc(m.url)+'" target="_blank" rel="noopener">เปิดรายงาน</a></td>'+
        '</tr>';
      }).join('')+
      '</tbody></table></div>';
  }).catch(function(e){
    var box=document.getElementById('rptMonths'); if(box) box.innerHTML=emptyBox(ico('plug'), String(e.message||e));
  });
}

function loadRptFiles(group){
  api('mgReportFiles',{group:group}).then(function(r){
    // ผู้ใช้อาจสลับแท็บไปแล้วระหว่างรอ — อย่าวาดทับของใหม่
    var box=document.getElementById('rptFiles'); if(!box) return;
    if(!r.ok) return box.innerHTML=emptyBox(ico('alert'), r.error||'โหลดไม่สำเร็จ');
    box.innerHTML=rptFilesHtml(r.files||[]);
  }).catch(function(e){
    var box=document.getElementById('rptFiles'); if(box) box.innerHTML=emptyBox(ico('plug'), String(e.message||e));
  });
}

function rptFilesHtml(files){
  if(!files.length) return emptyBox(ico('folder'),'ยังไม่เคยออกไฟล์รายงาน<br>กดปุ่ม Export ในแท็บอื่นแล้วไฟล์จะมาโผล่ที่นี่');

  // จัดกลุ่มตามช่วงข้อมูล (เช่น "ส.ค. 2569") — HR หาเป็นเดือน ไม่ได้หาเป็นวันที่กด
  var order=[], byLabel={};
  files.forEach(function(f){
    var k=f.label||'(ไม่ระบุช่วง)';
    if(!byLabel[k]){ byLabel[k]=[]; order.push(k); }
    byLabel[k].push(f);
  });

  return order.map(function(k){
    return '<div class="rpt-grp">'+
      '<div class="rpt-grp-h">'+ico('calendar')+' '+esc(k)+' <span class="rpt-n">'+byLabel[k].length+' ไฟล์</span></div>'+
      byLabel[k].map(rptFileRow).join('')+
    '</div>';
  }).join('');
}

function rptFileRow(f){
  return '<div class="rpt-row">'+
    '<div class="rpt-main">'+
      '<div class="rpt-kind">'+esc(f.kind||'-')+(f.count!==''&&f.count!=null?' <span class="rpt-n">'+esc(String(f.count))+'</span>':'')+'</div>'+
      '<div class="rpt-meta">'+esc(f.at||'')+(f.by?' · '+esc(f.by):'')+'</div>'+
    '</div>'+
    (f.url
      ? '<a class="rpt-open" href="'+esc(f.url)+'" target="_blank" rel="noopener">เปิดไฟล์</a>'
      : '<span class="rpt-none">ไม่มีลิงก์</span>')+
  '</div>';
}

// ════════════ MOCK (พรีวิว UI) ════════════
var MOCK_LT = {vac:{name:'ลาพักร้อน',emoji:ico('sun')},biz:{name:'ลากิจ',emoji:ico('home')},sick:{name:'ลาป่วย',emoji:ico('thermometer')},
  unpaid:{name:'ลากิจไม่รับค่าจ้าง',emoji:ico('file')},bday:{name:'ลาวันเกิด',emoji:ico('cake')},special:{name:'ลาวันเกิดคนพิเศษ',emoji:ico('heart')}};
var MOCK_OTT = {'1':'มีงานด่วน','2':'งานไม่เสร็จ','3':'ลูกค้าร้องขอ','4':'อื่นๆ'};
var MOCK_LV_HIST = [
  {leaveId:'LV-001',type:'ลาป่วย',startDate:'13/05/2569',endDate:'13/05/2569',days:1,status:'อนุมัติ'},
  {leaveId:'LV-002',type:'ลาพักร้อน',startDate:'19/05/2569',endDate:'28/05/2569',days:4,status:'อนุมัติ'},
  {leaveId:'LV-003',type:'ลากิจ',startDate:'02/06/2569',endDate:'02/06/2569',days:1,status:'รอการอนุมัติ'}];
var MOCK_OT_HIST = [
  {otId:'OT-001',otDate:'03/06/2569',startTime:'18:00',endTime:'21:30',hours:3.5,otType:'มีงานด่วน',otTypeKey:'1',status:'อนุมัติ'},
  {otId:'OT-002',otDate:'28/05/2569',startTime:'22:00',endTime:'01:00',hours:3,otType:'ลูกค้าร้องขอ',otTypeKey:'3',status:'รอการอนุมัติ'},
  {otId:'OT-003',otDate:'25/05/2569',startTime:'19:00',endTime:'22:00',hours:3,otType:'อื่นๆ',otTypeKey:'4',status:'✏️ ส่งกลับให้แก้ไข'}];
var MOCK_SLIPS = [
  {label:'พฤษภาคม 2569',net:27850,income:30000,sso:750,tax:400,deduct:2150,ot:1200,ytdInc:148000,ytdTax:1900,ytdSso:3750,slipUrl:''},
  {label:'เมษายน 2569',net:26500,income:28500,sso:750,tax:350,deduct:2000,ot:0,ytdInc:118000,ytdTax:1500,ytdSso:3000,slipUrl:''}];
function mockBootstrap(){
  S.auth={userId:'MOCK'};
  S.profile={name:'นางสาวชนัญชิดา โชคธนอนันต์',empId:'EMP-001',dept:'สำนักงานใหญ่',role:'OWNER',canApprove:true,canAdmin:true};
  S.balances={vac:{name:'พักร้อน',emoji:ico('sun'),remaining:16},biz:{name:'ลากิจ',emoji:ico('home'),remaining:10},sick:{name:'ลาป่วย',emoji:ico('thermometer'),remaining:29},
    unpaid:{name:'ไม่รับค่าจ้าง',emoji:ico('file'),remaining:7},bday:{name:'วันเกิด',emoji:ico('cake'),remaining:1},special:{name:'คนพิเศษ',emoji:ico('heart'),remaining:1}};
  S.holidays=[{date:'03/06/2569',name:'วันเฉลิมฯ พระราชินี'},{date:'29/07/2569',name:'วันอาสาฬหบูชา'}];
  S.schedule={code:'S01',label:'จันทร์-ศุกร์',workDays:[1,2,3,4,5],off:[0,6],offLabel:'เสาร์-อาทิตย์',start:'9:30',end:'18:30'};
  S.leaveTypes=MOCK_LT; S.otTypes=MOCK_OTT; S.otThisMonth={hours:6.5,count:2,period:'26/5 – 25/6/2569'};
  S.recent=[
    {kind:'ot',title:'OT · มีงานด่วน',dateText:'03/06/2569',amount:'3.5 ชม.',status:'อนุมัติ'},
    {kind:'leave',title:'ลากิจ',dateText:'02/06/2569',amount:'1 วัน',status:'รอการอนุมัติ'},
    {kind:'ot',title:'OT · ลูกค้าร้องขอ',dateText:'28/05/2569',amount:'3 ชม.',status:'รอการอนุมัติ'}];
  document.getElementById('loader').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  setupNavRoles(); render();
}
// สถานะปิดรอบ (mock) — เปลี่ยนค่าได้จริงเวลากดในหน้าเว็บ จะได้เทส flow ครบ
var MOCK_LOCKS={leave:{locked:false,at:'',by:''},ot:{locked:false,at:'',by:''}};

var MOCK_RPT_FILES=[
  {at:'25/08/2569 14:20',group:'ot',kind:'สรุป OT รายคน',label:'ส.ค. 2569',name:'สรุป OT รายคน_ส.ค. 2569_20260825-142000.xlsx',url:'#',by:'พี่กี้',count:12},
  {at:'25/08/2569 14:18',group:'ot',kind:'รายการ OT',label:'ส.ค. 2569',name:'รายการ OT_ส.ค. 2569_20260825-141800.xlsx',url:'#',by:'พี่กี้',count:48},
  {at:'26/07/2569 09:05',group:'ot',kind:'สรุป OT รายคน',label:'ก.ค. 2569',name:'สรุป OT รายคน_ก.ค. 2569.xlsx',url:'#',by:'พี่กี้',count:11},
  {at:'25/08/2569 15:02',group:'leave',kind:'สรุปการลารายคน',label:'ส.ค. 2569',name:'สรุปการลา_ส.ค. 2569.xlsx',url:'#',by:'พี่กี้',count:28},
  {at:'25/08/2569 15:00',group:'leave',kind:'รายการใบลา',label:'ส.ค. 2569',name:'รายการใบลา_ส.ค. 2569.xlsx',url:'#',by:'พี่กี้',count:19},
  {at:'26/07/2569 09:10',group:'leave',kind:'สรุปการลารายคน',label:'ก.ค. 2569',name:'สรุปการลา_ก.ค. 2569.xlsx',url:'#',by:'พี่กี้',count:27}];

var MOCK_OT_LIST=[
  {otId:'OT-20260824193507',name:'กฤษดา ชัยวิเศษ',empId:'1349901180118',dept:'Developers',
   otDate:'21/08/2569',startTime:'19:30',endTime:'20:00',hours:0.5,otType:'อื่นๆ',status:'อนุมัติแล้ว',
   submittedAt:'24/08/2569 19:52',by:'จิรภัทร แสงศรี',decidedAt:'25/08/2569 14:31',reason:'เลิกงานร้าน Darat spa',noBreak:false},
  {otId:'OT-20260825133012',name:'สุวิมล ศิริเวช',empId:'1119900675743',dept:'CRM & Telesale',
   otDate:'20/08/2569',startTime:'19:00',endTime:'20:00',hours:1,otType:'มีงานด่วน',status:'อนุมัติแล้ว',
   submittedAt:'25/08/2569 13:30',by:'จิรภัทร แสงศรี',decidedAt:'25/08/2569 14:31',reason:'ปิดยอดสิ้นเดือน',noBreak:true},
  {otId:'OT-20260825133155',name:'สุวิมล ศิริเวช',empId:'1119900675743',dept:'CRM & Telesale',
   otDate:'22/08/2569',startTime:'19:00',endTime:'21:30',hours:2.5,otType:'มีงานด่วน',status:'รอการอนุมัติ',
   submittedAt:'25/08/2569 13:32',reason:'ตามงานลูกค้า',noBreak:false},
  {otId:'OT-20260820090011',name:'ณัฐวัฒน์ พากเพียร',empId:'1100200300400',dept:'Developers',
   otDate:'18/08/2569',startTime:'19:30',endTime:'21:00',hours:1.5,otType:'อื่นๆ',status:'🚫 ยกเลิก',
   submittedAt:'20/08/2569 09:00',reason:'ยกเลิกเอง',noBreak:false}];

function mockApi(action, params){
  return new Promise(function(resolve){ setTimeout(function(){
    if(action==='history') resolve({ok:true,count:MOCK_LV_HIST.length,history:MOCK_LV_HIST});
    else if(action==='otHistory') resolve({ok:true,count:MOCK_OT_HIST.length,history:MOCK_OT_HIST});
    else if(action==='submit') resolve({ok:true,leaveId:'LV-MOCK'});
    else if(action==='otSubmit') resolve({ok:true,otId:'OT-MOCK',hours:otHours(S.otForm.start,S.otForm.end)});
    else if(action==='submitOtEdit') resolve({ok:true,otId:(params&&params.otId)||'OT-MOCK',hours:otHours(S.otForm.start,S.otForm.end)});
    else if(action==='payslip') resolve({ok:true,latest:MOCK_SLIPS[0],slips:MOCK_SLIPS});
    else if(action==='slipShareLink') resolve({ok:true,url:'#'});
    else if(action==='addEmployee') resolve({ok:true,fullName:(params&&params.name||'')+' '+(params&&params.lastName||''),written:['โควต้าลา','วันลาคงเหลือ','payroll (ลำดับ 99)','OT อัตราค่าจ้าง'],warnings:[]});
    else if(action==='emSalaryHistory') resolve({ok:true,current:23000,history:[
      {from:'26/12/2568',rate:15000,prev:null,diff:null,pct:null,reason:'ยกมา (จากทะเบียน 01-2569)',by:'ระบบ (seed)',at:'27/08/2569'},
      {from:'26/02/2569',rate:18000,prev:15000,diff:3000,pct:20,reason:'ผ่านทดลองงาน',by:'พี่กี้',at:'27/08/2569'},
      {from:'16/08/2569',rate:23000,prev:18000,diff:5000,pct:27.8,reason:'ปรับตำแหน่ง Senior',by:'พี่กี้',at:'27/08/2569'}]});
    else if(action==='emAddSalary') resolve({ok:true,summary:'บันทึกแล้ว (mock)'});
    else if(action==='emJobHistory') resolve({ok:true,employed:true,serviceDays:400,serviceText:'1 ปี 1 เดือน 5 วัน',
      events:['เข้างาน','ผ่านทดลองงาน','ย้ายแผนก','เลื่อนตำแหน่ง','ตักเตือน','พักงาน','กลับเข้าทำงาน','ลาออก','เลิกจ้าง'],
      jobs:[{date:'15/07/2568',event:'เข้างาน',detail:'ตำแหน่ง Developers',by:'seed'},
            {date:'15/10/2568',event:'ผ่านทดลองงาน',detail:'',by:'พี่กี้'}]});
    else if(action==='emAddJob') resolve({ok:true,summary:'บันทึกแล้ว (mock)'});
    // แผนกเยอะเท่าของจริง (16 แผนก) — ไว้เช็คว่า legend ไม่ล้น/ไม่ถูกตัด
    else if(action==='emStats') resolve({ok:true,yearBE:2569,total:28,active:23,left:5,hasJobs:true,
      byDept:[{name:'CRM & Telesale',count:6},{name:'Content Creator',count:3},{name:'Live Sale',count:3},
              {name:'Marketing',count:3},{name:'Developers',count:2},{name:'CEO & MD',count:1},
              {name:'ธุรการประสานงานบัญชี',count:1},{name:'senior Graphic Designer',count:1},
              {name:'Graphic Design',count:1},{name:'คลังสินค้า',count:1},{name:'จัดซื้อ',count:1},
              {name:'บัญชี',count:1},{name:'บุคคล',count:1},{name:'ผู้ช่วยผู้บริหาร',count:1},
              {name:'ยิงแอด',count:1},{name:'แอดมินเพจ',count:1}],
      notCounted:1, noLine:2,
      joins:[1,1,1,0,1,2,2,1,0,0,0,0], exits:[0,0,0,1,0,2,1,1,0,0,0,0], joinTotal:9, exitTotal:5});
    else if(action==='emSetCount') resolve({ok:true, summary:'บันทึกแล้ว (mock)'});
    else if(action==='hrDocStats') resolve({ok:true, mode:(params&&params.mode)||'period',
      periodLabel:(params&&params.mode==='year') ? 'ปี 2569'
        : (params&&params.mode==='month') ? 'ส.ค. 2569'
        : (params&&params.mode==='range') ? '01/08/2569 – 15/08/2569' : '26/7 – 25/8/2569',
      total:642, byKind:{leave:412,ot:198,register:24,unpaidReq:8},
      pendingByKind:{leave:2,ot:1,register:2,unpaidReq:0}});
    else if(action==='emPhotoSync') resolve({ok:true, updated:9, failed:1, noPic:2, total:12,
      offset:0, nextOffset:12, processed:12, done:true, why:'ยังไม่ได้เพิ่มบอทเป็นเพื่อน',
      samples:['นายทดสอบ ระบบ (404)'], summary:'อัปเดตรูป 9 คน · ดึงไม่ได้ 1 คน'});
    else if(action==='emPhotoUpload') resolve({ok:true, url:(params&&params.dataUrl)||'', summary:'อัปโหลดรูปเรียบร้อย (mock)'});
    else if(action==='emPhotoClear') resolve({ok:true, summary:'ลบรูปที่อัปแล้ว (mock)'});
    else if(action==='emAllowGet') resolve({ok:true, taxYear:2569, status:'อนุมัติ',
      approved:{spouse:1, childYears:'2559,2563', parent:2, disabled:0, maternity:0,
                lifeIns:80000, healthSelf:20000, healthParent:10000, spouseLife:0,
                pvd:36000, rmf:0, ssf:50000, esg:0, pensionIns:0,
                donate:5000, donate2x:0, donatePolitical:0,
                homeInterest:45000, otherAmt:0, otherName:'',
                evidence:'', note:'รับ ล.ย.01 ฉบับจริงแล้ว'},
      current:null, basis:{rate:23000},
      preview:{ total:326000, items:[
        {label:'ลดหย่อนส่วนตัว',value:60000,amount:60000},
        {label:'คู่สมรสไม่มีเงินได้',amount:60000},
        {label:'บุตร 2 คน',amount:90000},
        {label:'บิดามารดา 2 คน',amount:60000},
        {label:'ประกันชีวิต + สุขภาพตนเอง',amount:100000},
        {label:'กองทุนสำรองเลี้ยงชีพ',amount:36000}],
        notes:['ประกันชีวิต 80,000 + สุขภาพ 20,000 → หักได้ 100,000 (เพดานรวม)'] },
      history:[{status:'อนุมัติ',by:'พี่กี้',at:'27/08/2569 18:40',approver:'พี่กี้',approvedAt:'27/08/2569 18:40',reason:''}]});
    else if(action==='emAllowSave') resolve({ok:true, summary:'บันทึกแล้ว (mock)'});
    else if(action==='emAllowDecide') resolve({ok:true, summary:'ยกเลิกแล้ว (mock)'});
    else if(action==='emSchedule') resolve({ok:true, empId:params&&params.empId,
      schedule:{code:'S01',label:'กะสำนักงาน จ–ศ',workDays:[1,2,3,4,5],off:[0,6],
                offLabel:'เสาร์–อาทิตย์',start:'9:00',end:'18:00'},
      schedules:[{code:'S01',desc:'จ-ศ 09:00-18:00'},{code:'S02',desc:'จ-ส 08:00-17:00'},{code:'RM01',desc:'Remote'}],
      dowNames:['อา','จ','อ','พ','พฤ','ศ','ส']});
    else if(action==='emSetSchedule') resolve({ok:true, changed:true, code:params&&params.code,
      summary:'เปลี่ยนกะแล้ว (mock)'});
    else if(action==='emPayrollSet') resolve({ok:true, changed:['หักภาษี'], summary:'แก้ 1 ช่อง',
      values:{bank:params&&params.bank, bankAcc:params&&params.bankAcc,
              ssoFlag:params&&params.ssoFlag, taxFlag:params&&params.taxFlag}});
    else if(action==='emLeaveSummary') resolve({ok:true, empId:params&&params.empId, hasQuota:true, yearBE:2569,
      rows:[{key:'vac',name:'ลาพักร้อน',emoji:ico('sun'),quota:6,used:2.5,remain:3.5},
            {key:'biz',name:'ลากิจ',emoji:ico('home'),quota:3,used:3,remain:0},
            {key:'sick',name:'ลาป่วย',emoji:ico('thermometer'),quota:30,used:1,remain:29},
            {key:'bday',name:'ลาวันเกิด',emoji:ico('cake'),quota:1,used:0,remain:1},
            {key:'special',name:'ลาวันเกิดคนพิเศษ',emoji:ico('heart'),quota:1,used:0,remain:1},
            {key:'unpaid',name:'ลากิจไม่รับค่าจ้าง',emoji:ico('file'),quota:3,used:4,remain:-1}]});
    else if(action==='adminBootstrap') resolve({ok:true,callerId:'MOCK',ownerCount:1,
      schedules:[{code:'S01',desc:'จ-ศ 09:00-18:00'},{code:'S02',desc:'จ-ส 08:00-17:00'},{code:'RM01',desc:'Remote'}],
      roles:['EMPLOYEE','REVIEWER','APPROVER','ADMIN','OWNER'],leaveTypes:MOCK_LT,
      users:[
        {lineUserId:'MOCK',name:'นางสาวชนัญชิดา โชคธนอนันต์',empId:'1100100100101',dept:'สำนักงานใหญ่',email:'mock@theelf.co',role:'OWNER',startDate:'01/01/2566',branch:'สนญ.',status:'ทำงานอยู่',statusSource:'ประวัติการจ้าง',hasLine:true,notCounted:true,notCountedReason:'เจ้าของบริษัท',position:'CEO',ssoFlag:'ไม่ใช่',taxFlag:'ใช่',bank:'ไทยพาณิชย์',bankAcc:'1234567890',quota:{sick:30,biz:3,vac:6,bday:1,special:1,unpaid:3}},
        // คนที่ยังไม่ผูก LINE (รปภ./แม่บ้าน) — ต้องขึ้นในรายชื่อได้แม้ไม่มี LineUserID
        {lineUserId:'',name:'นายวิชาญ จันทร์นวล',empId:'3330900441374',dept:'ปฏิบัติการ',email:'',role:'EMPLOYEE',startDate:'26/12/2568',branch:'สนญ.',status:'ทำงานอยู่',statusSource:'ชีตพนักงาน',hasLine:false,notCounted:false,position:'รักษาความปลอดภัย',ssoFlag:'ใช่',taxFlag:'ใช่',bank:'ไทยพาณิชย์',bankAcc:'4291934333',quota:{sick:30,biz:3,vac:6,bday:1,special:1,unpaid:3}},
        {lineUserId:'MOCK2',name:'นายพงศกร วัฒนไพศาล',empId:'1100200200202',dept:'Developers',email:'mock2@theelf.co',role:'ADMIN',startDate:'15/03/2567',branch:'สนญ.',status:'ปกติ',photo:'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%232f80ed"/><text x="32" y="42" font-size="28" fill="white" text-anchor="middle">พ</text></svg>',position:'Tech Lead',ssoFlag:'ใช่',taxFlag:'ใช่',bank:'กสิกรไทย',bankAcc:'9876543210',quota:{sick:30,biz:3,vac:6,bday:1,special:1,unpaid:3}},
        {lineUserId:'MOCK3',name:'นางสาวปิยะฉัตร ทองแท้',empId:'1100300300303',dept:'CRM & Telesale',email:'mock3@theelf.co',role:'APPROVER',startDate:'01/06/2567',branch:'สนญ.',status:'ปกติ',position:'หัวหน้าทีม CRM',ssoFlag:'ใช่',taxFlag:'ใช่',bank:'กสิกรไทย',bankAcc:'1112223330',quota:{sick:30,biz:3,vac:6,bday:1,special:1,unpaid:3}},
        {lineUserId:'MOCK4',name:'นายอรรถพล ศรีสุวรรณ',empId:'1100400400404',dept:'CRM & Telesale',email:'mock4@theelf.co',role:'EMPLOYEE',startDate:'16/09/2567',branch:'สนญ.',status:'ปกติ',position:'Telesale',ssoFlag:'ใช่',taxFlag:'ไม่ใช่',bank:'กรุงไทย',bankAcc:'2223334440',quota:{sick:30,biz:3,vac:6,bday:1,special:1,unpaid:3}},
        {lineUserId:'MOCK5',name:'นางสาวธัญชนก พูนทรัพย์',empId:'1100500500505',dept:'Content Creator',email:'mock5@theelf.co',role:'EMPLOYEE',startDate:'01/11/2567',branch:'สนญ.',status:'ปกติ',position:'Content Creator',ssoFlag:'ใช่',taxFlag:'ไม่ใช่',bank:'กสิกรไทย',bankAcc:'3334445550',quota:{sick:30,biz:3,vac:6,bday:1,special:1,unpaid:3}},
        {lineUserId:'MOCK6',name:'นายกิตติภพ เรืองฤทธิ์',empId:'1100600600606',dept:'Graphic Design',email:'mock6@theelf.co',role:'EMPLOYEE',startDate:'02/01/2568',branch:'สนญ.',status:'ปกติ',position:'Graphic Designer',ssoFlag:'ใช่',taxFlag:'ไม่ใช่',bank:'ไทยพาณิชย์',bankAcc:'4445556660',quota:{sick:30,biz:3,vac:6,bday:1,special:1,unpaid:3}},
        {lineUserId:'MOCK7',name:'นางสาวมนัสนันท์ ใจงาม',empId:'1100700700707',dept:'Live Sale',email:'mock7@theelf.co',role:'REVIEWER',startDate:'01/03/2568',branch:'สนญ.',status:'ปกติ',position:'Live Host',ssoFlag:'ใช่',taxFlag:'ไม่ใช่',bank:'กรุงเทพ',bankAcc:'5556667770',quota:{sick:30,biz:3,vac:6,bday:1,special:1,unpaid:3}},
        {lineUserId:'MOCK8',name:'นายวรากร สมบูรณ์ทรัพย์',empId:'1100800800808',dept:'บัญชี',email:'mock8@theelf.co',role:'EMPLOYEE',startDate:'16/05/2568',branch:'สนญ.',status:'ปกติ',position:'บัญชี',ssoFlag:'ใช่',taxFlag:'ใช่',bank:'กสิกรไทย',bankAcc:'6667778880',quota:{sick:30,biz:3,vac:6,bday:1,special:1,unpaid:3}},
        {lineUserId:'MOCK9',name:'นางสาวเบญจวรรณ อินทร์แก้ว',empId:'1100900900909',dept:'Developers',email:'mock9@theelf.co',role:'EMPLOYEE',startDate:'01/07/2568',branch:'สนญ.',status:'ปกติ',position:'Frontend Dev',ssoFlag:'ใช่',taxFlag:'ใช่',bank:'ไทยพาณิชย์',bankAcc:'7778889990',quota:{sick:30,biz:3,vac:6,bday:1,special:1,unpaid:3}},
        {lineUserId:'MOCK10',name:'นายภูริช ธนกิจไพศาล',empId:'1101001001010',dept:'Live Sale',email:'mock10@theelf.co',role:'EMPLOYEE',startDate:'01/02/2568',branch:'สนญ.',status:'ลาออก (31/07/2569)',position:'Live Host',ssoFlag:'ใช่',taxFlag:'ไม่ใช่',bank:'กรุงไทย',bankAcc:'8889990000',quota:{sick:30,biz:3,vac:6,bday:1,special:1,unpaid:3}}]});
    else if(action==='setRole'||action==='setLeaveQuota'||action==='updateEmployee') resolve({ok:true,changed:1});
    else if(action==='documents') resolve({ok:true,documents:[
      {name:'หนังสือรับรองเงินเดือน พ.ค. 69',url:'#',category:'หนังสือรับรอง',scope:'ส่วนตัว'},
      {name:'นโยบายวันลา ปี 2569',url:'#',category:'นโยบาย',scope:'ทั้งบริษัท'},
      {name:'ฟอร์มเบิกค่ารักษาพยาบาล',url:'#',category:'แบบฟอร์ม',scope:'ทั้งบริษัท'}]});
    else if(action==='mgOtList') resolve({ok:true,label:'รอบเดือนนี้ (26–25)',count:MOCK_OT_LIST.length,ot:MOCK_OT_LIST});
    else if(action==='mgOtCalcDrift') resolve({ok:true,hasSheet:true,sheetName:'การคำนวณ OT 08-2026',
      inSync:false,diffCount:2,sheetCount:48,liveCount:49,added:['OT-A'],changed:['OT-B (0.5 → 1.5 ชม.)'],removed:[],
      summary:'มีใบที่เปลี่ยนหลังกดคำนวณ — ใบใหม่/เพิ่งอนุมัติ 1 ใบ · แก้ชั่วโมง 1 ใบ\nต้องกด “คำนวณ OT รอบเดือน” ใหม่ก่อนปิดรอบ ไม่งั้น payroll จะดึงยอดเก่าไปจ่าย'});
    else if(action==='mgPeriodLocks') resolve({ok:true,period:'08-2569',leave:MOCK_LOCKS.leave,ot:MOCK_LOCKS.ot});
    else if(action==='mgSetPeriodLock'){
      var _k=(params&&params.kind)||'ot', _on=String((params&&params.locked)||'')==='1';
      var _st=_on?{locked:true,at:'26/08/2569 14:30',by:'พี่กี้'}:{locked:false,at:'',by:''};
      if(_k==='both'){ MOCK_LOCKS.leave=_st; MOCK_LOCKS.ot=Object.assign({},_st); }
      else MOCK_LOCKS[_k]=_st;
      resolve({ok:true,period:'08-2569',kind:_k,locked:_on,
 summary:(_on?' ปิดรอบ ':' ปลดล็อกรอบ ')+'08-2569'});
    }
    else if(action==='mgLeaveReportBuild') resolve({ok:true,month:params.month,yearBE:params.yearBE,
      tabName:'รายงาน 08-2569',url:'#',empCount:30,leaveCount:12,label:'สิงหาคม 2569'});
    else if(action==='mgLeaveReportExport') resolve({ok:true,month:params.month,yearBE:params.yearBE,
      tabName:'รายงาน 08-2569',filename:'รายงานการลา_08-2569_20260902-110000',url:'#'});
    else if(action==='mgLeaveReportSend') resolve({ok:true,tabName:'รายงาน 08-2569',url:'#'});
    else if(action==='mgLeaveReportStatus') resolve({ok:true,tabName:'รายงาน 08-2569',hasTab:true,tabUrl:'#',
      lastFile:{at:'02/09/2569 11:00',name:'รายงานการลา_08-2569',url:'#',by:'พี่กี้ HR'},
      lastSend:{at:'02/09/2569 11:05',by:'พี่กี้ HR'}});
    else if(action==='mgMonthlyReports') resolve({ok:true,group:(params&&params.group)||'leave',months:
      ((params&&params.group)==='ot'
        ? [{month:8,yearBE:2569,label:'ส.ค. 2569',name:'การคำนวณ OT 08-2026',rows:48,from:'26/07/2569',to:'25/08/2569',url:'#'},
           {month:7,yearBE:2569,label:'ก.ค. 2569',name:'การคำนวณ OT 07-2026',rows:41,from:'26/06/2569',to:'25/07/2569',url:'#'}]
        : [{month:7,yearBE:2569,label:'ก.ค. 2569',name:'รายงาน 07-2569',rows:22,from:'26/06/2569',to:'25/07/2569',url:'#'},
           {month:6,yearBE:2569,label:'มิ.ย. 2569',name:'รายงาน 06-2569',rows:22,from:'26/05/2569',to:'25/06/2569',url:'#'},
           {month:5,yearBE:2569,label:'พ.ค. 2569',name:'รายงาน 05-2569',rows:22,from:'26/04/2569',to:'25/05/2569',url:'#'}])});
    else if(action==='mgReportBackfill') resolve(params&&params.mode==='commit'
      ? {ok:true,added:3,found:3,report:'เพิ่มเข้าทะเบียนแล้ว 3 ไฟล์'}
      : {ok:true,dryRun:true,found:3,report:'พบรายงานเก่าที่ยังไม่อยู่ในทะเบียน 3 ไฟล์\n\n  • รายการ OT 2 ไฟล์\n  • สรุปการลารายคน 1 ไฟล์\n\nกดยืนยันเพื่อเพิ่มเข้าทะเบียน (ไม่แตะไฟล์ต้นฉบับ)'});
    else if(action==='mgReportFiles') resolve({ok:true,files:MOCK_RPT_FILES.filter(function(f){return !params||!params.group||f.group===params.group;})});
    else if(action==='mgSetOtNoBreak'){
      var _o=(MOCK_OT_LIST.filter(function(x){return x.otId===(params&&params.otId);})[0])||{};
      _o.noBreak=String((params&&params.noBreak)||'')==='1';
      resolve({ok:true,otId:_o.otId,noBreak:_o.noBreak,warn:'',
 summary:(_o.noBreak?' ตั้งไม่หักพัก · ':' หักพักตามปกติ · ')+(_o.name||'')});
    }
    else if(action==='mgEditOt') resolve({ok:true,otId:(params&&params.otId)||'OT-MOCK',hours:1.5,wasApproved:true,warn:''});
    else if(action==='approve') resolve({ok:true,id:'(mock)',status:'✅'});
    else if(action==='hrOverview') resolve({ok:true,role:'OWNER',
      pending:{leave:2,ot:1,register:2,lineChange:1,unpaidReq:0,total:6},
      people:{ok:true,yearBE:2569,total:32,active:23,left:5,notCounted:1,noLine:2,
        byDept:[{name:'CRM & Telesale',count:6},{name:'Content Creator',count:3},{name:'Live Sale',count:3},{name:'Marketing',count:3}],
        joinTotal:9,exitTotal:5},
      leaveOt:{label:'26/8 – 25/9/2569',leave:{total:8,approved:5,pending:2,rejected:1},
        ot:{count:6,hours:24.5,approved:4,pending:1,rejected:1},
        topLeave:[{name:'นางสาวชนัญชิดา โชคธนอนันต์',dept:'สำนักงานใหญ่',days:5},{name:'นายตัวอย่าง ทดสอบ',dept:'ฝ่ายขาย',days:3}]}});
    else if(action==='hrBundle'){ Promise.all([mockApi('hrDashboard',params),mockApi('pendingRegistrations',params),
      mockApi('lineChangeList',params),mockApi('unpaidReqList',params),mockApi('hrDocStats',params)])
      .then(function(a){ resolve({ok:true,dashboard:a[0],pendingReg:a[1],lineChange:a[2],unpaidReq:a[3],docStats:a[4]}); }); }
    else if(action==='hrDashboard') resolve({ok:true,monthLabel:'มิถุนายน 2569',
      leave:{total:8,approved:5,pending:2,rejected:1},ot:{hours:24.5,count:6,approved:4,pending:1,rejected:1},
      employees:[{name:'นางสาวชนัญชิดา โชคธนอนันต์',dept:'สำนักงานใหญ่',vac:16,biz:10,sick:29,used:5,status:'ปกติ'},
        {name:'นายตัวอย่าง ทดสอบ',dept:'ฝ่ายขาย',vac:6,biz:0,sick:28,used:12,status:'⚠️ เกินสิทธิ์'}],
      pending:[{kind:'leave',id:'LV-003',name:'นางสาวชนัญชิดา โชคธนอนันต์',type:'ลากิจ',date:'02/06/2569',endDate:'03/06/2569',days:2,reason:'ไปทำธุระที่ต่างจังหวัด',remaining:8,userId:'MOCK',empId:'EMP-001'},
        {kind:'ot',id:'OT-002',name:'นายตัวอย่าง ทดสอบ',type:'ลูกค้าร้องขอ',date:'28/05/2569',startTime:'18:00',endTime:'21:00',hours:3,reason:'ลูกค้าขอแก้งานด่วน',userId:'MOCK2',empId:'EMP-002'}]});
    else if(action==='hrLeaveCalendar'){ var ly=params.year,lm=('0'+params.month).slice(-2);
      resolve({ok:true,year:ly,month:params.month,depts:['Live Sale','CRM & Telesale','Content Creator'],items:[
        {id:'LV-1',name:'สมชาย ใจดี',dept:'Live Sale',typeName:'ลาป่วย',typeKey:'sick',start:ly+'-'+lm+'-02',end:ly+'-'+lm+'-03',days:2,status:'อนุมัติ',pending:false},
        {id:'LV-2',name:'วิชัย ตั้งใจ',dept:'CRM & Telesale',typeName:'ลาพักร้อน',typeKey:'vac',start:ly+'-'+lm+'-09',end:ly+'-'+lm+'-11',days:3,status:'อนุมัติ',pending:false},
        {id:'LV-3',name:'ก้อง พากเพียร',dept:'Content Creator',typeName:'ลากิจ',typeKey:'biz',start:ly+'-'+lm+'-09',end:ly+'-'+lm+'-09',days:1,status:'รอการอนุมัติ',pending:true},
        {id:'LV-4',name:'สุดา รักงาน',dept:'Live Sale',typeName:'ลาวันเกิด',typeKey:'bday',start:ly+'-'+lm+'-04',end:ly+'-'+lm+'-04',days:1,status:'อนุมัติ',pending:false}]}); }
    else if(action==='emNameList') resolve({ok:true,count:3,people:[
      {name:'นรินทร์ทิพย์ ลือชา',empId:'1349901087436',dept:'CRM & Telesale',hasLine:true,userId:'Uold000'},
      {name:'ทัดพร วณิชย์ชาญพงศ์',empId:'1349900703532',dept:'CRM & Telesale',hasLine:true,userId:'Uoth000'},
      {name:'วิชาญ จันทร์นวล',empId:'3330900441374',dept:'ปฏิบัติการ',hasLine:false,userId:''}]});
    else if(action==='pendingRegistrations') resolve({ok:true,count:2,pending:[
      {userId:'MOCKP1',typedName:'นภา สดใส',lineDisplay:'Napa S.',submittedAt:'09/06/2569 08:10',matched:true,empId:'EMP-010',dept:'ฝ่ายขาย'},
      {userId:'MOCKP2',typedName:'ก้อง พากเพียร',lineDisplay:'Kong',submittedAt:'09/06/2569 08:25',matched:false,empId:'',dept:''}]});
    else if(action==='lineChangeList') resolve({ok:true,count:1,pending:[
      {newUserId:'Unew001',typedName:'สมชาย ใจดี',lineDisplay:'Somchai',empId:'1100100100101',
       oldUserId:'Uold001',submittedAt:'31/08/2569 10:20'}]});
    else if(action==='emLineInfo') resolve({ok:true,linked:true,row:5,userId:'Uold00000000000000000000000000',
      name:'นรินทร์ทิพย์ ลือชา',empId:'1349901087436',dept:'CRM & Telesale',role:'EMPLOYEE',
      registeredAt:'04/04/2026 9:39',payroll:{found:true,userId:'Uold00000000000000000000000000',seq:'12',inSync:true},
      extras:[{row:3,userId:'Udupe0000000000000000000000000'}],
      candidates:[{kind:'change',userId:'Unew00000000000000000000000000',label:'นรินทร์ทิพย์ ลือชา',sub:'คำขอเปลี่ยน LINE · 02/09/2569 10:16'},
        {kind:'dup',userId:'Udup000000000000000000000000000',label:'Narintip Luecha',sub:'ร่างซ้ำ · LineUsers row 30'}],
      history:[{at:'02/09/2569 10:16',userId:'Unew00000000000000000000000000',oldUserId:'Uold00000000000000000000000000',
        typedName:'นรินทร์ทิพย์ ลือชา',status:'pending',by:'',decidedAt:'',reason:''}]});
    else if(action==='emLineMove') resolve({ok:true,name:'(mock)',payrollUpdated:true,photoCleared:true});
    else if(action==='emLineUnlink') resolve({ok:true,name:'(mock)',payrollCleared:true});
    else if(action==='emLineMerge') resolve(params.dryRun?{ok:true,dryRun:true,dupName:'Narintip Luecha',
      realName:'นรินทร์ทิพย์ ลือชา',newUserId:'Udup000000000000000000000000000',oldUserId:'Uold00000000000000000000000000',
      deletes:[{sheet:'LineUsers',row:30},{sheet:'โควต้าลา',row:31},{sheet:'วันลาคงเหลือ',row:31},
        {sheet:'พนักงาน',row:35},{sheet:'อัตราค่าจ้าง',row:31}],
      extras:[{row:3,userId:'Udupe0000000000000000000000000'}],activity:{leaves:0,ots:0,registers:[]},blockers:[],warnings:[]}
      : {ok:true,deleted:['LineUsers row 30','โควต้าลา row 31'],payrollUpdated:true,photoCleared:true,name:'(mock)'});
    else if(action==='lineChangeDecide') resolve({ok:true,name:'(mock)',status:params.decision==='approve'?'approved':'rejected',payrollUpdated:true});
    else if(action==='decideRegistration') resolve({ok:true,name:'(mock)',status:params.decision==='approve'?'approved':'rejected'});
    else if(action==='addEmployeeApprove') resolve({ok:true,fullName:(params&&params.name||'')+' '+(params&&params.lastName||''),written:['โควต้าลา','วันลาคงเหลือ','payroll','OT'],linked:true,warnings:[]});
    else if(action==='hrSummary') resolve({ok:true,mode:params.mode,label:'(ตัวอย่าง) '+({period:'รอบ 26–25',month:'รายเดือน',year:'รายปี',range:'ช่วงวันที่'}[params.mode]||''),
      leave:{total:8,approved:5,pending:2,rejected:1},ot:{count:6,hours:24.5,approved:4,pending:1,rejected:1}});
    else if(action==='hrAllHistory') resolve({ok:true,
      leave:MOCK_LV_HIST.map(function(h,i){ var done=h.status.indexOf('รอ')<0&&h.status.indexOf('แก้')<0;
        return {kind:'leave',name:'นางสาวชนัญชิดา โชคธนอนันต์',type:h.type,startDate:h.startDate,endDate:h.endDate,days:h.days,status:h.status,by:done?'พี่กี้ HR':'',decidedAt:done?'13/05/2569 10:30:15':'',decideReason:'',ts:300-i*10}; }),
      ot:MOCK_OT_HIST.map(function(o,i){ var done=o.status.indexOf('รอ')<0&&o.status.indexOf('แก้')<0&&o.status.indexOf('ส่งกลับ')<0;
        return {kind:'ot',name:'นายตัวอย่าง ทดสอบ',otType:o.otType,otDate:o.otDate,startTime:o.startTime,endTime:o.endTime,hours:o.hours,status:o.status,by:done?'พี่กี้ HR':'',decidedAt:done?'04/06/2569 09:15:00':'',decideReason:'',ts:250-i*10}; }),
      reg:[{kind:'reg',name:'นภา สดใส',empId:'EMP-010',dept:'ฝ่ายขาย',status:'approved',submittedAt:'09/06/2569 08:10',decidedAt:'09/06/2569 09:00',by:'HR แอดมิน',reason:'',ts:280},
        {kind:'reg',name:'ก้อง พากเพียร',empId:'',dept:'',status:'rejected',submittedAt:'09/06/2569 08:25',decidedAt:'09/06/2569 09:05',by:'HR แอดมิน',reason:'ชื่อไม่ตรงระบบ',ts:190},
        {kind:'reg',name:'มานี รักดี',empId:'EMP-011',dept:'Live Sale',status:'pending',submittedAt:'10/06/2569 10:00',decidedAt:'',by:'',reason:'',ts:200}]});
    else if(action==='hrEmpHistory'){
      if(params&&params.kind==='ot') resolve({ok:true,kind:'ot',name:'นายตัวอย่าง ทดสอบ',history:MOCK_OT_HIST,count:MOCK_OT_HIST.length});
      else resolve({ok:true,kind:'leave',name:'นางสาวชนัญชิดา โชคธนอนันต์',history:MOCK_LV_HIST,count:MOCK_LV_HIST.length,
        summary:lvSummary(MOCK_LV_HIST),balances:{vac:16,biz:10,sick:29},
        leaveStats:[{key:'vac',name:'พักร้อน',emoji:ico('sun'),used:2.5,remaining:3.5},{key:'biz',name:'ลากิจ',emoji:ico('home'),used:3,remaining:0},
          {key:'sick',name:'ลาป่วย',emoji:ico('thermometer'),used:5,remaining:25},{key:'bday',name:'ลาวันเกิด',emoji:ico('cake'),used:0,remaining:1},
          {key:'special',name:'วันเกิดคนพิเศษ',emoji:ico('heart'),used:0,remaining:1},{key:'unpaid',name:'ลาไม่รับค่าจ้าง',emoji:ico('file'),used:2,remaining:1}]}); }
    else resolve({ok:true,profile:S.profile,balances:S.balances,holidays:S.holidays,schedule:S.schedule,leaveTypes:S.leaveTypes,
      otTypes:S.otTypes,otThisMonth:S.otThisMonth,recent:S.recent});
  },220); });
}

// ════════════ 📄 สิทธิ์ลาไม่รับค่าจ้าง (v.76) ════════════
// พนักงาน "ขอสิทธิ์" ก่อน (บอกแค่จำนวนวัน+เหตุผล ยังไม่ระบุวัน) → HR คุยแล้วให้สิทธิ์
// → ปุ่ม 📄 ในฟอร์มยื่นใบลาถึงจะโผล่ (renderTypeGrid เช็ค balances.unpaid.remaining)

// ── ฝั่ง HR: การ์ดคำขอรออนุมัติ (แทรกบนแผง HR)
function loadUnpaidReqs(){
  api('unpaidReqList',{scope:'pending'}).then(paintUnpaidReqs).catch(function(){});
}
function paintUnpaidReqs(r){
  var slot=document.getElementById('unpaidReqSlot');
  if(!slot || !r || !r.ok) return;
  if(!r.count){ slot.innerHTML=''; return; }
  slot.innerHTML = renderUnpaidReqs(r.list);
  wireUnpaidReqs();
}
function renderUnpaidReqs(list){
  var rows = list.map(function(x){
    var d = 'data-upid="'+esc(x.reqId)+'" data-upname="'+esc(x.name)+'" data-updays="'+esc(String(x.askDays))+'"';
    return '<div class="pend"><div class="pend-top"><div class="hist-ic">'+ico('file')+'</div><div class="hist-main">'+
      '<div class="hist-type">'+esc(x.name)+' — ขอ '+esc(String(x.askDays))+' วัน</div>'+
      '<div class="hist-meta">'+esc(x.empId||'-')+(x.dept?' · '+esc(x.dept):'')+' · '+esc(x.submittedAt)+'</div>'+
      '<div class="hist-meta" style="margin-top:4px">'+ico('message')+' '+esc(x.reason||'-')+'</div></div></div>'+
      '<div class="pend-act"><button class="pend-btn no" data-upno="1" '+d+'>'+ico('x')+' ไม่อนุมัติ</button>'+
      '<button class="pend-btn ok" data-upok="1" '+d+'>'+ico('check')+' ให้สิทธิ์</button></div></div>'; }).join('');
  return '<div class="card"><div class="card-title"><span class="ic"></span>'+ico('file')+' คำขอลาไม่รับค่าจ้าง ('+list.length+')</div>'+
    '<div class="hr-note ok2">'+ico('info')+' คุยกับพนักงานให้ชัดก่อนให้สิทธิ์ · ให้กี่วันก็ได้ (ไม่ต้องเท่าที่ขอ) · ระบบเพิ่มโควตาให้อัตโนมัติแล้วแจ้งพนักงานทาง LINE</div>'+rows+'</div>';
}
function wireUnpaidReqs(){
  document.querySelectorAll('[data-upok]').forEach(function(el){
    el.addEventListener('click', function(){ openUnpaidGrant(el.dataset.upid, el.dataset.upname, el.dataset.updays); }); });
  document.querySelectorAll('[data-upno]').forEach(function(el){
    el.addEventListener('click', function(){ openUnpaidReject(el.dataset.upid, el.dataset.upname); }); });
}
function openUnpaidGrant(reqId, name, askDays){
  modalForm({ title:'ให้สิทธิ์ลาไม่รับค่าจ้าง · '+name, emoji:ico('file'), okLabel:ico('check')+' ให้สิทธิ์',
    body:'<div class="set-row col"><label>จำนวนวันที่ให้สิทธิ์ (พนักงานขอ '+esc(askDays)+' วัน)</label>'+
         '<input type="number" inputmode="decimal" min="0.5" step="0.5" data-f="days" value="'+esc(askDays)+'"></div>'+
         '<div class="set-row col"><label>หมายเหตุ (ไม่บังคับ — พนักงานเห็นใน LINE)</label>'+
         '<input type="text" data-f="note" placeholder="เช่น ให้ 2 วัน ตามที่คุยกันไว้"></div>'+
         '<div class="set-hint">ℹ️ ระบบจะบวกโควตา "ลากิจไม่ได้รับค่าจ้าง" ให้ทันที · พนักงานต้องไปยื่นใบลาเลือกวันจริงอีกที แล้ว HR อนุมัติใบลาตามปกติ</div>',
    onOk:function(c){
      var days=(c.querySelector('[data-f="days"]')||{}).value;
      var note=(c.querySelector('[data-f="note"]')||{}).value||'';
      if(!days || Number(days)<=0) return toast('กรอกจำนวนวันก่อนค่ะ','err');
      closeConfirm(); toast('กำลังให้สิทธิ์…');
      api('unpaidReqDecide',{reqId:reqId, decision:'approve', days:days, note:note}).then(function(r){
        if(!r.ok) return toast(r.error||'ทำรายการไม่สำเร็จ','err');
 toast('ให้สิทธิ์ '+name+' '+r.grant+' วันแล้ว (คงเหลือ '+r.remaining+')','ok'); loadHr();
      }).catch(function(e){ toast(String(e.message||e),'err'); });
    }});
}
function openUnpaidReject(reqId, name){
  modalForm({ title:'ไม่อนุมัติคำขอ · '+name, emoji:ico('x'), okLabel:ico('x')+' ไม่อนุมัติ',
    body:'<div class="set-row col"><label>เหตุผล (พนักงานเห็นใน LINE)</label>'+
         '<input type="text" data-f="note" placeholder="เช่น ให้ใช้สิทธิ์ลาพักร้อนก่อน"></div>',
    onOk:function(c){
      var note=(c.querySelector('[data-f="note"]')||{}).value||'';
      closeConfirm(); toast('กำลังดำเนินการ…');
      api('unpaidReqDecide',{reqId:reqId, decision:'reject', note:note}).then(function(r){
        if(!r.ok) return toast(r.error||'ทำรายการไม่สำเร็จ','err');
 toast('ไม่อนุมัติคำขอของ '+name,'ok'); loadHr();
      }).catch(function(e){ toast(String(e.message||e),'err'); });
    }});
}

// ── ฝั่งพนักงาน: หน้าขอสิทธิ์ + ประวัติคำขอของตัวเอง
function viewUnpaidReq(){
  var st = S.profile && S.unpaidReq ? S.unpaidReq : (S.unpaidReq||{});
  var rem = (S.balances && S.balances.unpaid && S.balances.unpaid.grantLeft!=null) ? S.balances.unpaid.grantLeft : 0;
  var banner = st.pending
    ? '<div class="hr-note">⏳ คำขอของคุณ ('+esc(String(st.askDays||''))+' วัน) กำลังรอ HR พิจารณา — ขอใหม่ได้เมื่อคำขอนี้ถูกดำเนินการแล้วค่ะ</div>'
    : '';
  var quotaLine = rem>0
    ? '<div class="hr-note ok2">'+ico('check')+' ตอนนี้คุณมีสิทธิ์ลาไม่รับค่าจ้างคงเหลือ <b>'+esc(String(rem))+' วัน</b> — ไปที่ "ยื่นใบลา" แล้วเลือก '+ico('file')+' ลาไม่รับค่าจ้าง ได้เลย</div>'
    : '';
  return '<div class="card">'+
    '<div class="card-title"><span class="ic"></span>'+ico('file')+' ขอสิทธิ์ลาไม่รับค่าจ้าง</div>'+
    quotaLine + banner +
    '<div class="hr-note">'+ico('info')+' ขั้นตอน: ① ส่งคำขอ (บอกจำนวนวัน + เหตุผล — <b>ยังไม่ต้องระบุวันที่ลา</b>) → ② HR คุยกับคุณแล้วให้สิทธิ์ → ③ คุณค่อยยื่นใบลา เลือกวันจริง → ④ HR อนุมัติใบลา</div>'+
    (st.pending ? '' :
      '<label class="field-lb">'+ico('calendar')+' จำนวนวันที่ต้องการขอ</label>'+
      '<input type="number" id="upDays" inputmode="decimal" min="0.5" step="0.5" placeholder="เช่น 2">'+
      '<label class="field-lb">'+ico('pencil')+' เหตุผล</label>'+
      '<textarea id="upReason" rows="3" placeholder="เช่น ต้องกลับต่างจังหวัดดูแลคุณแม่ ใช้สิทธิ์ลาอื่นหมดแล้ว"></textarea>'+
      '<div style="margin-top:12px"><button id="btnUpReq" class="btn btn-primary">ส่งคำขอ</button></div>')+
    '</div><div id="upHist"><div class="card"><div class="skel" style="height:60px"></div></div></div>';
}
function wireUnpaidReq(){
  var b=document.getElementById('btnUpReq');
  if(b) b.addEventListener('click', submitUnpaidReq);
  loadMyUnpaidReqs();
}
function submitUnpaidReq(){
  var days=(document.getElementById('upDays')||{}).value;
  var reason=((document.getElementById('upReason')||{}).value||'').trim();
  if(!days || Number(days)<=0) return toast('กรอกจำนวนวันที่ต้องการขอค่ะ','err');
  if(!reason) return toast('ระบุเหตุผลด้วยนะคะ','err');
  confirmModal({ title:'ยืนยันส่งคำขอ', emoji:ico('file'), accent:'leave',
    rows:[{k:'ประเภท',v:'ขอสิทธิ์ลาไม่รับค่าจ้าง'},{k:'จำนวนวันที่ขอ',v:days+' วัน'},{k:'เหตุผล',v:reason}],
    onConfirm:function(){
      toast('กำลังส่งคำขอ…');
      api('unpaidReqSubmit',{days:days, reason:reason}).then(function(r){
        if(!r.ok) return toast(r.error||'ส่งไม่สำเร็จ','err');
 toast('ส่งคำขอแล้ว รอ HR พิจารณาค่ะ','ok');
        S.unpaidReq={pending:true, askDays:Number(days), lastStatus:'รอการอนุมัติ'};
        goTo('unpaidreq');
      }).catch(function(e){ toast(String(e.message||e),'err'); });
    }});
}
function loadMyUnpaidReqs(){
  api('unpaidReqList',{scope:'mine'}).then(function(r){
    var el=document.getElementById('upHist'); if(!el) return;
    if(!r.ok || !r.count){ el.innerHTML=''; return; }
    var rows=r.list.map(function(x){
      var badge = x.status==='อนุมัติแล้ว' ? '<span class="badge ok">'+ico('check')+' ให้สิทธิ์ '+esc(String(x.grantDays))+' วัน</span>'
                : x.status==='ไม่อนุมัติ' ? '<span class="badge no">❌ ไม่อนุมัติ</span>'
                : '<span class="badge wait">⏳ รอ HR</span>';
      return '<div class="hist"><div class="hist-ic">'+ico('file')+'</div><div class="hist-main">'+
        '<div class="hist-type">ขอ '+esc(String(x.askDays))+' วัน '+badge+'</div>'+
        '<div class="hist-meta">'+esc(x.submittedAt)+(x.hr?' · '+esc(x.hr):'')+'</div>'+
        (x.note?'<div class="hist-meta">'+ico('pencil')+' '+esc(x.note)+'</div>':'')+'</div></div>'; }).join('');
    el.innerHTML='<div class="card"><div class="card-title"><span class="ic"></span>ประวัติคำขอของฉัน</div>'+rows+'</div>';
  }).catch(function(){});
}

// ════════════ 💹 ฐานเงินเดือน (ทะเบียนพนักงาน) ════════════
// ประวัติเก็บที่ไฟล์ทะเบียนพนักงาน — ปรับกี่ครั้งในงวดเดียวก็ได้
// แก้ = เพิ่มแถวใหม่เสมอ ของเดิมไม่ถูกลบ (ตรวจย้อนหลังได้ · ใช้ทำ ภ.ง.ด.1ก)
function openSalaryHistory(empId, name){
  if(!empId){ toast('คนนี้ยังไม่มีรหัสพนักงาน (เลขบัตร) ในระบบ','err'); return; }
  toast('กำลังโหลดประวัติ…');
  api('emSalaryHistory',{empId:empId,name:name||''}).then(function(r){
    if(!r.ok){ toast(r.error||'โหลดไม่สำเร็จ','err'); return; }
    var cur = r.current==null ? null : r.current;
    var rows = (r.history||[]).map(function(h){
      return '<div class="hist"><div class="hist-ic">'+ico('trend')+'</div><div class="hist-main">'+
        '<div class="hist-type">'+baht0(h.rate)+' <span class="hist-meta">ตั้งแต่ '+esc(h.from)+'</span></div>'+
        '<div class="hist-meta">'+esc(h.reason||'-')+(h.by?' · โดย '+esc(h.by):'')+'</div>'+
      '</div></div>'; }).join('');
    modalForm({ title:'ฐานเงินเดือน · '+(name||''), emoji:ico('trend'),
      body:'<div class="cfm-row"><span class="cfm-k">ฐานปัจจุบัน</span><span class="cfm-v"><b>'+
             (cur==null?'— (ยังไม่มีในทะเบียน)':baht0(cur))+'</b></span></div>'+
           (rows||'<div class="mg-sub2">ยังไม่มีประวัติในทะเบียน</div>')+
           '<div class="cfm-note">ปรับได้หลายครั้งในงวดเดียวกัน · แก้ = เพิ่มแถวใหม่ ของเดิมไม่หาย</div>',
      okLabel:ico('trend')+' ปรับฐานใหม่',
      onOk:function(){ closeConfirm(); openSalarySet(empId, name, cur); } });
  }).catch(function(e){ toast(String(e.message||e),'err'); });
}

function openSalarySet(empId, name, curRate){
  var iso = dkeyISO(new Date());
  modalForm({ title:'ปรับฐานเงินเดือน · '+(name||''), emoji:ico('trend'),
    body:'<div class="cfm-row"><span class="cfm-k">ฐานปัจจุบัน</span><span class="cfm-v">'+
           (curRate==null?'—':baht0(curRate))+'</span></div>'+
         '<label class="field-lb">'+ico('calendar')+' วันที่เริ่มใช้ฐานใหม่</label>'+
         '<input type="date" class="hr-fdate mg-full" id="salFrom" value="'+esc(iso)+'">'+
         '<label class="field-lb">'+ico('wallet')+' ฐานเงินเดือนใหม่ (บาท/เดือน)</label>'+
         '<input type="number" class="hr-fdate mg-full" id="salRate" min="1" step="100" placeholder="เช่น 20000">'+
         '<label class="field-lb">'+ico('pencil')+' เหตุผล</label>'+
         '<textarea id="salReason" rows="2" placeholder="เช่น ผ่านทดลองงาน / ปรับประจำปี"></textarea>'+
         '<div class="cfm-note">ระบบคิดเงินเดือนและ OT ตามฐานของแต่ละช่วงวันให้เอง</div>',
    okLabel:ico('check')+' บันทึก',
    onOk:function(c){
      var from = isoToThai(c.querySelector('#salFrom').value);
      var rate = parseFloat(c.querySelector('#salRate').value);
      var reason = c.querySelector('#salReason').value.trim();
      if(!from){ toast('ใส่วันที่เริ่มใช้ก่อนนะคะ','err'); return; }
      if(!(rate>0)){ toast('ใส่ฐานเงินเดือนใหม่ก่อนนะคะ','err'); return; }
      toast('กำลังบันทึก…');
      api('emAddSalary',{empId:empId,name:name||'',from:from,rate:rate,reason:reason}).then(function(r){
        if(!r.ok){ toast(r.error||'บันทึกไม่สำเร็จ','err'); return; }
        closeConfirm(); toast(r.summary||'บันทึกแล้ว');
      }).catch(function(e){ toast(String(e.message||e),'err'); });
    } });
}

// ════════════ 👤 หน้ารายบุคคล + แท็บด้านบน ════════════
// รายชื่อ → กดชื่อ → หน้าคนนี้ทั้งหน้า (แท็บอยู่ด้านบน)
// แท็บที่ข้อมูลพร้อมแล้ว: ข้อมูลหลัก · เงินเดือน · ประวัติการจ้าง
// ลำดับตามที่พี่กี้จัด: ข้อมูลคน → ประวัติ → แล้วค่อยเรื่องเงิน (เงินเดือนคู่กับภาษี)
var EMP_TABS = [
 { key:'info', label:' ข้อมูลหลัก' },
 { key:'job', label:' ประวัติการทำงาน' },
 { key:'salary', label:' เงินเดือน' },
 { key:'tax', label:' ลดหย่อนภาษี' },
 { key:'line', label:' LINE' },
];

/**
 * pickAndUploadPhoto — เลือกรูป → ย่อในเครื่อง → ส่งขึ้นระบบ
 *
 * ย่อก่อนส่งเสมอ: รูปจากกล้องมือถือ 3–5 MB แต่ที่จอแสดงจริงแค่ 32–46px
 *   ส่งดิบ = ช้า เปลือง Drive และ POST พังง่าย
 * ต้องใช้ POST เพราะ base64 ยัดใน URL (JSONP/GET) ยาวเกินที่ Apps Script รับ
 *
 * @param {string} targetUserId ว่าง = รูปของตัวเอง
 * @param {Function} done       เรียกเมื่อสำเร็จ พร้อม url ใหม่
 */
function pickAndUploadPhoto(targetUserId, done){
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.addEventListener('change', function(){
    var f = inp.files && inp.files[0]; if(!f) return;
    if(!/^image\//.test(f.type)) return toast('เลือกได้เฉพาะไฟล์รูป','err');
    toast('กำลังย่อรูป…');
    shrinkImage(f, 256, function(dataUrl){
      if(!dataUrl) return toast('อ่านไฟล์รูปไม่สำเร็จ','err');
      toast('กำลังอัปโหลด…');
      postApi('emPhotoUpload', { targetUserId: targetUserId||'', dataUrl: dataUrl })
        .then(function(r){
          if(!r.ok) return toast(r.error||'อัปโหลดไม่สำเร็จ','err');
 toast('อัปโหลดรูปแล้ว','ok');
          if(done) done(r.url);
        }).catch(function(e){ toast(String(e.message||e),'err'); });
    });
  });
  inp.click();
}

/** ย่อรูปเป็นสี่เหลี่ยมจัตุรัส (crop กลาง) แล้วคืน dataUrl JPEG */
function shrinkImage(file, size, cb){
  var fr = new FileReader();
  fr.onload = function(){
    var img = new Image();
    img.onload = function(){
      var side = Math.min(img.width, img.height);
      var cv = document.createElement('canvas');
      cv.width = size; cv.height = size;
      cv.getContext('2d').drawImage(img,
        (img.width-side)/2, (img.height-side)/2, side, side, 0, 0, size, size);
      try { cb(cv.toDataURL('image/jpeg', 0.82)); } catch(e){ cb(null); }
    };
    img.onerror = function(){ cb(null); };
    img.src = fr.result;
  };
  fr.onerror = function(){ cb(null); };
  fr.readAsDataURL(file);
}

/** postApi — เรียก API ด้วย POST (ข้อมูลก้อนใหญ่) · text/plain กัน preflight */
function postApi(action, payload){
  var body = Object.assign({}, S.auth || {}, payload || {});   // auth ชุดเดียวกับ api() (idToken/userId)
  if(CFG.MOCK) return mockApi(action, body);
  if(!CFG.API_URL || CFG.API_URL.indexOf('PASTE') === 0)
    return Promise.reject(new Error('ยังไม่ได้ตั้งค่า API_URL ใน config.js'));
  return fetch(CFG.API_URL + '?action=' + encodeURIComponent(action), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // text/plain = ไม่มี preflight (Apps Script ไม่ตอบ OPTIONS)
    body: JSON.stringify(body)
  }).then(function(res){ return res.json(); });
}

/**
 * empAvatar — รูปโปรไฟล์พนักงาน (จาก LINE) · ไม่มีรูปก็แสดงอักษรแรกของชื่อแทน
 * ใส่ onerror ไว้เพราะลิงก์รูป LINE หมดอายุได้เมื่อเจ้าตัวเปลี่ยนรูป — ไม่ให้จอเป็นไอคอนรูปแตก
 */
function empAvatar(u, size){
  var px = size || 32;
  var ini = String(u.name||'?').replace(/^(นาย|นาง|นางสาว)\s*/,'').trim().charAt(0) || '?';
  var st = 'width:'+px+'px;height:'+px+'px;font-size:'+Math.round(px*0.42)+'px';
  return u.photo
    ? '<span class="emp-ava" style="'+st+'"><img src="'+esc(u.photo)+'" alt="" '+
        'onerror="this.parentNode.innerHTML=\''+esc(ini)+'\'"></span>'
    : '<span class="emp-ava noimg" style="'+st+'">'+esc(ini)+'</span>';
}

/** กุญแจอ้างพนักงาน — มี LINE ใช้ lineUserId · ไม่มีก็ใช้เลขบัตร (ไม่งั้นคนไม่มี LINE ชนกันหมด) */
function empKeyOf(u){ return u.lineUserId || ('emp:'+(u.empId||'')); }

function openEmpPage(key){
  var list = S.adminUsers||[];
  var u = String(key).indexOf('emp:')===0
    ? list.filter(function(x){ return String(x.empId)===String(key).slice(4); })[0]
    : list.filter(function(x){ return x.lineUserId===key; })[0];
  if(!u){ toast('ไม่พบพนักงานคนนี้','err'); return; }
  S.empPage = { user:u, tab:(S.empPage && S.empPage.tab) || 'info' };
  renderEmpPage();
}

function renderEmpPage(){
  var m = document.getElementById('main'); if(!m || !S.empPage) return;
  var u = S.empPage.user;
  var tabs = EMP_TABS.map(function(t){
    return '<button class="mg-tab'+(S.empPage.tab===t.key?' on':'')+'" data-etab="'+t.key+'">'+t.label+'</button>'; }).join('');

  m.innerHTML =
    '<button class="backbar" data-eback="1">‹ กลับรายชื่อพนักงาน</button>'+
    '<div class="card emp-hd"><div class="emp-hd-top">'+
      '<span class="ava-wrap">'+empAvatar(u, 46)+
        (u.hasLine===false?'':'<button class="ava-edit" data-ephoto title="เปลี่ยนรูป">'+ico('camera')+'</button>')+'</span>'+
      '<div class="hist-main">'+
      '<div class="hist-type">'+esc(u.name)+'</div>'+
      '<div class="hist-meta">'+esc(u.empId||'-')+' · '+esc(u.dept||'-')+' · '+esc(u.role||'EMPLOYEE')+'</div>'+
    '</div></div></div>'+
    '<div class="mg-tabs">'+tabs+'</div>'+
    '<div id="empTab"><div class="card"><div class="skel" style="height:120px"></div></div></div>';

  var b = document.querySelector('[data-eback]');
  if(b) b.addEventListener('click', function(){ S.empPage=null; loadSettings(); });
  var ph = document.querySelector('[data-ephoto]');
  if(ph) ph.addEventListener('click', function(){
    pickAndUploadPhoto(u.lineUserId, function(url){ u.photo = url; renderEmpPage(); }); });
  document.querySelectorAll('[data-etab]').forEach(function(el){
    el.addEventListener('click', function(){ S.empPage.tab = el.dataset.etab; renderEmpPage(); }); });
  paintEmpTab();
}

function paintEmpTab(){
  var box = document.getElementById('empTab'); if(!box || !S.empPage) return;
  var u = S.empPage.user, tab = S.empPage.tab;
  if(tab==='info')   return paintEmpInfo(box, u);
  if(tab==='salary') return paintEmpSalary(box, u);
  if(tab==='job')    return paintEmpJob(box, u);
  if(tab==='tax')    return paintEmpTax(box, u);
  if(tab==='line')   return paintEmpLine(box, u);
}

function empRow(k,v){ return '<div class="pf-row"><span class="k">'+esc(k)+'</span><span class="v">'+escIco(v==null||v===''?'—':v)+'</span></div>'; }

function paintEmpInfo(box, u){
  box.innerHTML =
    '<div class="card">'+
      '<div class="emp-thead"><div class="card-title" style="margin:0"><span class="ic"></span>ข้อมูลพื้นฐาน</div>'+
        (u.hasLine===false
          ? '<span class="mg-sub2">ยังไม่ผูก LINE — แก้ข้อมูลที่ชีตพนักงาน</span>'
          : '<button class="btn btn-primary btn-sm" data-einfo>'+ico('pencil')+' แก้ไข</button>')+
      '</div>'+
      empRow('รหัสพนักงาน (เลขบัตร)', u.empId)+
      empRow('ชื่อ-สกุล', u.name)+
      empRow('แผนก', u.dept)+
      empRow('สาขา', u.branch)+
      empRow('อีเมล', u.email)+
      empRow('วันที่เริ่มงาน', u.startDate)+
      empRow('สถานะ', u.status + (u.statusSource?' (จาก'+u.statusSource+')':''))+
      empRow('บทบาทในระบบ', u.role)+
      empRow('ผูก LINE แล้ว', u.hasLine===false ? 'ยัง — ใช้ระบบผ่านมือถือไม่ได้' : 'ผูกแล้ว')+
      '<div class="pf-row"><span class="k">นับเป็นพนักงาน</span><span class="v">'+
        (u.notCounted
          ? '<span class="pill">ไม่นับ</span> '+esc(u.notCountedReason||'')
          : '<span class="pill ok">นับปกติ</span>')+
        ' <button class="mg-ib" data-ecount="1" style="margin-left:8px">'+
          (u.notCounted?'กลับมานับ':'ตั้งเป็นไม่นับ')+'</button></span></div>'+
    '</div>'+

    '<div class="card" id="empLeaveBox"><div class="card-title"><span class="ic"></span>สิทธิ์การลาปีนี้</div>'+
      '<div class="skel" style="height:120px"></div></div>';
  wireEmpCountBtn(u);
  var ib = document.querySelector('[data-einfo]');
  if(ib) ib.addEventListener('click', function(){ openInfoModal(u.lineUserId); });
  loadEmpLeave(u);
}

/** ตารางสิทธิ์ลารายคน — สิทธิ์ประจำปี · ใช้ไป · คงเหลือ ("ใช้ไป" นับจากใบลาจริง) */
function loadEmpLeave(u){
  api('emLeaveSummary',{empId:u.empId||''}).then(function(r){
    var box = document.getElementById('empLeaveBox'); if(!box) return;
    var head = '<div class="emp-thead"><div class="card-title" style="margin:0"><span class="ic"></span>'+
      'สิทธิ์การลาปี '+((r&&r.yearBE)||'')+'</div>'+
      '<button class="btn btn-primary btn-sm" data-equota>'+ico('pencil')+' แก้ไขโควต้า</button></div>';

    if(!r.ok || !r.hasQuota){
      box.innerHTML = head + '<div class="mg-sub2">'+esc((r&&r.note)||(r&&r.error)||'ยังไม่มีข้อมูลโควต้า')+'</div>';
    } else {
      var rows = r.rows.map(function(x,i){
        var neg = x.remain < 0;
        return '<tr class="mg-tr">'+
          '<td class="ce mg-sub2">'+(i+1)+'</td>'+
          '<td class="lft">'+x.emoji+' '+esc(x.name)+'</td>'+
          '<td class="ce">'+x.quota+' วัน</td>'+
          '<td class="ce">'+x.used+' วัน</td>'+
          '<td class="ce'+(neg?' neg':'')+'"><b>'+x.remain+' วัน</b>'+
            (neg?' <span class="pill err">เกินสิทธิ์</span>':'')+'</td></tr>'; }).join('');
      box.innerHTML = head +
        '<div class="mg-tbwrap"><table class="mg-table mg-rpt"><thead><tr>'+
          '<th class="ce">ลำดับ</th><th class="lft">ประเภทการลา</th><th class="ce">สิทธิ์ประจำปี</th>'+
          '<th class="ce">ใช้ไป</th><th class="ce">คงเหลือ</th>'+
        '</tr></thead><tbody>'+rows+'</tbody></table></div>'+
        '<div class="mg-sub2" style="margin-top:8px">"ใช้ไป" นับจากใบลาที่อนุมัติจริงในปีนี้ · ติดลบ = ใช้เกินสิทธิ์</div>';
    }
    var qb = document.querySelector('[data-equota]');
    if(qb) qb.addEventListener('click', function(){ openQuotaModal(u.empId); });
  }).catch(function(e){
    var box = document.getElementById('empLeaveBox'); if(!box) return;
    box.innerHTML = '<div class="card-title"><span class="ic"></span>สิทธิ์การลาปีนี้</div>'+
      '<div class="mg-sub2">'+esc(String(e&&e.message||e))+'</div>';
  });
}

/** ปุ่ม "ไม่นับเป็นพนักงาน" — เจ้าของ/ที่ปรึกษา ยังใช้ระบบได้ครบ แค่ไม่เข้าสถิติจำนวนคน */
function wireEmpCountBtn(u){
  var b = document.querySelector('[data-ecount]'); if(!b) return;
  b.addEventListener('click', function(){
    if(!u.empId){ toast('คนนี้ยังไม่มีเลขบัตรในระบบ ตั้งค่านี้ไม่ได้','err'); return; }

    if(u.notCounted){
      modalForm({ emoji:ico('hash'), title:'กลับมานับเป็นพนักงาน', okLabel:ico('check')+' นับตามปกติ',
        body:'<div class="cfm-note">ให้ <b>'+esc(u.name)+'</b> กลับมานับรวมในจำนวนพนักงานอีกครั้ง</div>',
        onOk:function(){ closeConfirm(); submitEmpCount(u, false, ''); } });
      return;
    }

    modalForm({ emoji:ico('hash'), title:'ไม่นับเป็นพนักงาน', okLabel:ico('check')+' บันทึก',
      body:'<div class="cfm-note">'+esc(u.name)+' จะยังใช้ระบบได้ทุกอย่าง (ลา · OT · สลิป) '+
           'แค่ไม่ถูกนับในจำนวนพนักงานหน้าภาพรวม</div>'+
           '<label class="field-lb">'+ico('pencil')+' เหตุผล</label>'+
           '<select id="ecReason" class="hr-fsel mg-full">'+
             '<option>เจ้าของบริษัท</option><option>ที่ปรึกษา</option>'+
             '<option>ผู้ดูแลระบบ</option><option value="__other__">อื่นๆ (ระบุเอง)</option>'+
           '</select>'+
           '<input id="ecOther" class="hr-fdate mg-full" placeholder="ระบุเหตุผล" style="display:none;margin-top:8px">',
      onMount:function(c){
        var sel=c.querySelector('#ecReason'), oth=c.querySelector('#ecOther');
        sel.addEventListener('change', function(){
          oth.style.display = sel.value==='__other__' ? 'block' : 'none'; });
      },
      onOk:function(c){
        var sel=c.querySelector('#ecReason'), oth=c.querySelector('#ecOther');
        var why = sel.value==='__other__' ? String(oth.value||'').trim() : sel.value;
        if(!why){ toast('ระบุเหตุผลด้วยค่ะ','err'); return; }
        closeConfirm(); submitEmpCount(u, true, why);
      } });
  });
}

function submitEmpCount(u, exclude, reason){
  api('emSetCount',{ empId:u.empId, name:u.name, exclude: exclude?'1':'0', reason:reason }).then(function(r){
    if(!r.ok){ toast(r.error||'บันทึกไม่สำเร็จ','err'); return; }
    toast(r.summary||'บันทึกแล้ว');
    u.notCounted = exclude; u.notCountedReason = reason;
    renderEmpPage();
    loadEmpDash();                       // ตัวเลขในภาพรวมต้องขยับตามทันที
  }).catch(function(e){ toast(String(e&&e.message||e),'err'); });
}

function paintEmpSalary(box, u){
  box.innerHTML = '<div class="card"><div class="skel" style="height:100px"></div></div>';
  api('emSalaryHistory',{empId:u.empId||'',name:u.name||''}).then(function(r){
    if(!r.ok){ box.innerHTML = emptyBox(ico('alert'), r.error||'โหลดไม่สำเร็จ'); return; }
    var hist = r.history || [];
    var last = hist.length - 1;
    var rows = hist.map(function(h,i){
      var chg = (h.prev==null)
        ? '<b>'+baht0(h.rate)+'</b> <span class="hist-meta">(ฐานตั้งต้น)</span>'
        : '<span class="sal-old">'+baht0(h.prev)+'</span> <span class="sal-ar">→</span> <b>'+baht0(h.rate)+'</b>'+
          (h.diff ? ' <span class="pill '+(h.diff>0?'ok':'warn')+'">'+(h.diff>0?'+':'')+baht0(h.diff)+
                    (h.pct!=null?' · '+(h.pct>0?'+':'')+h.pct+'%':'')+'</span>' : '');
      return '<tr class="mg-tr">'+
        '<td class="ce mg-sub2">'+(i+1)+'</td>'+
        '<td class="lft">'+chg+(i===last?' <span class="re-badge">ใช้อยู่</span>':'')+'</td>'+
        '<td class="lft">'+esc(h.reason||'-')+'</td>'+
        '<td class="ce">'+esc(h.from)+'</td>'+
        '<td class="lft">'+esc(h.by||'-')+'</td>'+
        '<td class="ce mg-sub2">'+esc(h.at||'-')+'</td></tr>'; }).join('');
    var table = rows
      ? '<div class="mg-tbwrap"><table class="mg-table mg-rpt sal-tb"><thead><tr>'+
          '<th class="ce">ลำดับ</th><th class="lft">ข้อมูลที่มีการเปลี่ยนแปลง</th><th class="lft">เหตุผล</th>'+
          '<th class="ce">มีผลตั้งแต่วันที่</th><th class="lft">ผู้ที่ทำรายการ</th><th class="ce">วันที่ทำรายการ</th>'+
        '</tr></thead><tbody>'+rows+'</tbody></table></div>'
      : '<div class="mg-sub2">ยังไม่มีประวัติ — กด "'+ico('plus')+' เพิ่ม" เพื่อบันทึกฐานเงินเดือน</div>';
    box.innerHTML = '<div class="card">'+
      '<div class="emp-thead"><div class="card-title" style="margin:0"><span class="ic"></span>การปรับฐานเงินเดือน</div>'+
        '<button class="btn btn-primary btn-sm" data-esalset>'+ico('plus')+' เพิ่ม</button></div>'+
      '<div class="pf-row"><span class="k">ฐานปัจจุบัน</span><span class="v"><b>'+
        (r.current==null?'— (ยังไม่มีในทะเบียน)':baht0(r.current))+'</b></span></div>'+
      table+
      '<div class="paste-help">ปรับได้หลายครั้งในงวดเดียวกัน · แก้ = เพิ่มแถวใหม่ ของเดิมไม่หาย</div></div>'+
      '<div class="card">'+
        '<div class="emp-thead"><div class="card-title" style="margin:0"><span class="ic"></span>การคิดเงินเดือน</div>'+
          '<button class="btn btn-primary btn-sm" data-epayset>'+ico('pencil')+' แก้ไข</button></div>'+
        empRow('หักประกันสังคม', u.ssoFlag || '—')+
        empRow('หักภาษี ณ ที่จ่าย', u.taxFlag || '—')+
        empRow('วิธีคิดภาษี', 'คำนวณใหม่ทุกเดือน (จากรายได้สะสมทั้งปี)')+
        empRow('ธนาคาร', u.bank)+
        empRow('เลขบัญชี', u.bankAcc)+
        '<div class="paste-help">ค่าเหล่านี้อยู่ในชีตพนักงานฝั่ง payroll — ระบบใช้ตัดสินตอนปิดเงินเดือน</div>'+
      '</div>';
    var b = box.querySelector('[data-esalset]');
    if(b) b.addEventListener('click', function(){ openSalarySet(u.empId||'', u.name, r.current); });
    var pb = box.querySelector('[data-epayset]');
    if(pb) pb.addEventListener('click', function(){ openPayrollSet(u); });
  }).catch(function(e){ box.innerHTML = emptyBox(ico('alert'), String(e.message||e)); });
}

/** แก้ตั้งค่าคิดเงินเดือน (ปกส./ภาษี/ธนาคาร/เลขบัญชี) — เขียนลงชีตพนักงานฝั่ง payroll */
function openPayrollSet(u){
  var yn = function(v){ return String(v||'').trim()==='ใช่' ? 'ใช่' : 'ไม่ใช่'; };
  var sel = function(id,label,cur){
    return '<label class="field-lb">'+label+'</label>'+
      '<select id="'+id+'" class="hr-fsel mg-full">'+
        '<option value="ใช่"'+(cur==='ใช่'?' selected':'')+'>ใช่ — หัก</option>'+
        '<option value="ไม่ใช่"'+(cur!=='ใช่'?' selected':'')+'>ไม่ใช่ — ไม่หัก</option>'+
      '</select>'; };

  modalForm({ emoji:ico('trend'), title:'ตั้งค่าคิดเงินเดือน · '+esc(u.name), okLabel:ico('save')+' บันทึก',
    body: sel('psSso',ico('building')+' หักประกันสังคม', yn(u.ssoFlag))+
          sel('psTax',ico('receipt')+' หักภาษี ณ ที่จ่าย', yn(u.taxFlag))+
          '<label class="field-lb">'+ico('building')+' ธนาคาร</label>'+
          '<input id="psBank" class="hr-fdate mg-full" value="'+esc(u.bank||'')+'" placeholder="เช่น ธนาคารไทยพาณิชย์">'+
          '<label class="field-lb">'+ico('card')+' เลขบัญชี</label>'+
          '<input id="psAcc" class="hr-fdate mg-full" value="'+esc(u.bankAcc||'')+'" placeholder="เลขบัญชีรับเงินเดือน">'+
          '<div class="cfm-note">ฐานเงินเดือนแก้ที่ "การปรับฐานเงินเดือน" ด้านบน (เก็บประวัติให้)</div>',
    onOk:function(c){
      var btn=c.querySelector('[data-cfm-ok]'); if(btn){btn.disabled=true;btn.textContent='กำลังบันทึก…';}
      api('emPayrollSet',{ empId:u.empId||'', name:u.name||'',
        ssoFlag:c.querySelector('#psSso').value, taxFlag:c.querySelector('#psTax').value,
        bank:c.querySelector('#psBank').value, bankAcc:c.querySelector('#psAcc').value
      }).then(function(r){
 if(!r.ok){ if(btn){btn.disabled=false;btn.textContent=' บันทึก';} return toast(r.error||'บันทึกไม่สำเร็จ','err'); }
        closeConfirm();
 toast(r.changed&&r.changed.length ? ' แก้แล้ว: '+r.changed.join(', ') : 'ไม่มีอะไรเปลี่ยน','ok');
        if(r.values) Object.assign(u, r.values);
        afterEmpEdit();
 }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent=' บันทึก';} toast(String(e.message||e),'err'); });
    } });
}

function paintEmpJob(box, u){
  box.innerHTML = '<div class="card"><div class="skel" style="height:100px"></div></div>';
  api('emJobHistory',{empId:u.empId||'',name:u.name||''}).then(function(r){
    if(!r.ok){ box.innerHTML = emptyBox(ico('alert'), r.error||'โหลดไม่สำเร็จ'); return; }
    var rows = (r.jobs||[]).map(function(j){
      return '<div class="hist"><div class="hist-ic">'+jobEmoji(j.event)+'</div><div class="hist-main">'+
        '<div class="hist-type">'+esc(j.event)+' <span class="hist-meta">'+esc(j.date)+'</span></div>'+
        (j.detail?'<div class="hist-meta">'+esc(j.detail)+'</div>':'')+
        (j.by?'<div class="hist-meta">โดย '+esc(j.by)+'</div>':'')+'</div></div>'; }).join('');
    // จับวันสำคัญจากประวัติ — เอาครั้งล่าสุดของแต่ละเหตุการณ์
    var lastOf = function(ev){
      var hit = (r.jobs||[]).filter(function(j){ return j.event===ev; });
      return hit.length ? hit[hit.length-1].date : ''; };
    var dIn = lastOf('เข้างาน'), dPass = lastOf('ผ่านทดลองงาน');
    var dOut = lastOf('ลาออก') || lastOf('เลิกจ้าง');

    box.innerHTML =
      // ── สถานะการทำงาน — ตัวเลขที่ระบบอื่นอ้างอิง (OT · payroll · ใบยื่น) ──
      '<div class="card"><div class="card-title"><span class="ic"></span>สถานะการทำงาน</div>'+
        empRow('วันที่เริ่มทำงาน', dIn || u.startDate)+
        empRow('อายุงาน', r.serviceText||'—')+
        empRow('วันผ่านทดลองงาน', dPass)+
        empRow('สถานะปัจจุบัน', r.employed===null?'—':(r.employed?'ทำงานอยู่':'พ้นสภาพแล้ว'))+
        empRow('วันสุดท้ายที่เป็นพนักงาน', dOut)+
        '<div class="paste-help">วันลาออก = ยังทำงานวันนั้น (พ้นสภาพวันถัดไป) — กฎเดียวกับที่ payroll ใช้คิดเงินตามวัน</div>'+
      '</div>'+

      // ── กะเวลาทำงาน — ระบบ OT ใช้ตัดสินวันทำงาน/วันหยุด และอัตรา 1x/1.5x/3x ──
      '<div class="card" id="empSchedBox"><div class="card-title"><span class="ic"></span>กะเวลาทำงาน</div>'+
        '<div class="skel" style="height:90px"></div></div>'+

      '<div class="card">'+
        '<div class="emp-thead"><div class="card-title" style="margin:0"><span class="ic"></span>ประวัติการจ้าง</div>'+
          '<button class="btn btn-primary btn-sm" data-ejobadd>'+ico('plus')+' บันทึกเหตุการณ์</button></div>'+
        (rows||'<div class="mg-sub2">ยังไม่มีประวัติ — กดปุ่มข้างบนเพื่อบันทึกวันเข้างาน</div>')+'</div>';
    var b = box.querySelector('[data-ejobadd]');
    if(b) b.addEventListener('click', function(){ openJobAdd(u, r.events||[]); });
    loadEmpSchedule(u);
  }).catch(function(e){ box.innerHTML = emptyBox(ico('alert'), String(e.message||e)); });
}

/** กะเวลาทำงานของพนักงาน — ผูกกับระบบ OT (ชีตอัตราค่าจ้าง col E) */
function loadEmpSchedule(u){
  api('emSchedule',{empId:u.empId||''}).then(function(r){
    var box = document.getElementById('empSchedBox'); if(!box) return;
    var head = '<div class="emp-thead"><div class="card-title" style="margin:0"><span class="ic"></span>'+
      'กะเวลาทำงาน</div><button class="btn btn-primary btn-sm" data-eschedset>'+ico('pencil')+' เปลี่ยนกะ</button></div>';
    if(!r.ok){ box.innerHTML = head+'<div class="mg-sub2">'+esc(r.error||'โหลดไม่ได้')+'</div>'; return; }

    var sc = r.schedule;
    if(!sc){
      box.innerHTML = head+'<div class="mg-sub2">ยังไม่ได้ผูกกะ — ระบบ OT จะใช้ค่าเริ่มต้น (จันทร์–ศุกร์)</div>';
    } else {
      var dn = r.dowNames||['อา','จ','อ','พ','พฤ','ศ','ส'];
      var work = (sc.workDays||[]).map(function(d){ return dn[d]; }).join(' · ');
      var off  = (sc.off||[]).map(function(d){ return dn[d]; }).join(' · ');
      box.innerHTML = head +
        empRow('รหัสกะ', sc.code)+
        empRow('ชื่อกะ', sc.label)+
        empRow('วันทำงาน', work||'—')+
        empRow('เวลาทำงาน', (sc.start&&sc.end) ? sc.start+' – '+sc.end : '—')+
        empRow('วันหยุดประจำสัปดาห์', sc.offLabel || off || '—')+
        '<div class="paste-help">ระบบ OT ใช้กะนี้ตัดสินว่าวันไหนเป็นวันทำงาน/วันหยุด แล้วคิดค่าล่วงเวลา 1x · 1.5x · 3x ตามนั้น</div>';
    }
    var sb = box.querySelector('[data-eschedset]');
    if(sb) sb.addEventListener('click', function(){ openScheduleSet(u, r); });
  }).catch(function(e){
    var box = document.getElementById('empSchedBox');
    if(box) box.innerHTML = '<div class="card-title"><span class="ic"></span>กะเวลาทำงาน</div>'+
      '<div class="mg-sub2">'+esc(String(e&&e.message||e))+'</div>';
  });
}

function openScheduleSet(u, r){
  var cur = (r.schedule && r.schedule.code) || '';
  var opts = '<option value="">— ไม่ผูกกะ (ใช้ค่าเริ่มต้น จ–ศ) —</option>'+
    (r.schedules||[]).map(function(s){
      return '<option value="'+esc(s.code)+'"'+(s.code===cur?' selected':'')+'>'+
        esc(s.code)+' — '+esc(s.desc||'')+'</option>'; }).join('');

  modalForm({ emoji:'⏰', title:'เปลี่ยนกะทำงาน · '+esc(u.name), okLabel:ico('save')+' บันทึก',
    body:'<label class="field-lb">'+ico('clock')+' กะเวลาทำงาน</label>'+
         '<select id="schCode" class="hr-fsel mg-full">'+opts+'</select>'+
         '<div class="cfm-note">กะมีผลกับการคิด OT ของรอบที่ยังไม่ปิด — เปลี่ยนแล้วให้กด "คำนวณ OT รอบเดือน" ใหม่</div>',
    onOk:function(c){
      var btn=c.querySelector('[data-cfm-ok]'); if(btn){btn.disabled=true;btn.textContent='กำลังบันทึก…';}
      api('emSetSchedule',{ empId:u.empId||'', name:u.name||'', code:c.querySelector('#schCode').value })
        .then(function(res){
 if(!res.ok){ if(btn){btn.disabled=false;btn.textContent=' บันทึก';} return toast(res.error||'ไม่สำเร็จ','err'); }
          closeConfirm(); toast(res.summary||'บันทึกแล้ว','ok'); loadEmpSchedule(u);
 }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent=' บันทึก';} toast(String(e.message||e),'err'); });
    } });
}

function jobEmoji(ev){
 return {'เข้างาน':'','ผ่านทดลองงาน':'','ย้ายแผนก':'','เลื่อนตำแหน่ง':'⬆️',
 'ตักเตือน':'','พักงาน':'⏸️','กลับเข้าทำงาน':'','ลาออก':'','เลิกจ้าง':''}[ev] || '';
}

function openJobAdd(u, events){
  var iso = dkeyISO(new Date());
  var list = (events && events.length) ? events : ['เข้างาน','ลาออก'];
  var opts = list.map(function(e){ return '<option value="'+esc(e)+'">'+esc(e)+'</option>'; }).join('');
  modalForm({ title:'บันทึกเหตุการณ์การทำงาน · '+u.name, emoji:ico('clipboard'),
    body:'<label class="field-lb">'+ico('pin')+' เหตุการณ์</label>'+
         '<select id="jobEvent" class="hr-fsel mg-full">'+opts+'</select>'+
         '<label class="field-lb">'+ico('calendar')+' วันที่</label>'+
         '<input type="date" class="hr-fdate mg-full" id="jobDate" value="'+esc(iso)+'">'+
         '<label class="field-lb">'+ico('pencil')+' รายละเอียด</label>'+
         '<textarea id="jobDetail" rows="2" placeholder="เช่น ตำแหน่ง / เหตุผลลาออก"></textarea>'+
         '<div class="cfm-note">วันลาออก = ยังนับว่าทำงานวันนั้น (จ่ายค่าจ้างถึงวันสุดท้าย)</div>',
    okLabel:ico('check')+' บันทึก',
    onOk:function(c){
      var ev = c.querySelector('#jobEvent').value;
      var dt = isoToThai(c.querySelector('#jobDate').value);
      if(!dt){ toast('ใส่วันที่ก่อนนะคะ','err'); return; }
      toast('กำลังบันทึก…');
      api('emAddJob',{empId:u.empId||'',name:u.name||'',date:dt,event:ev,
                      detail:c.querySelector('#jobDetail').value.trim()}).then(function(r){
        if(!r.ok){ toast(r.error||'บันทึกไม่สำเร็จ','err'); return; }
        closeConfirm(); toast(r.summary||'บันทึกแล้ว'); paintEmpTab();
      }).catch(function(e){ toast(String(e.message||e),'err'); });
    } });
}

// ════════════ 📱 บัญชี LINE ของพนักงาน (ADMIN/OWNER) ════════════
// เดิม HR ทำเองไม่ได้เลย — พนักงานเปลี่ยนเครื่อง/บัญชี LINE ทีต้องให้คนทำระบบ
// เข้าไปแก้ชีตให้ (LineUsers col A + รูป + payroll col E) แท็บนี้ยกมาไว้บนเว็บทั้งชุด
//   🔁 ย้าย LINE   เลือกเครื่องที่รออยู่ (คำขอเปลี่ยน/ลงทะเบียน) หรือวาง userId เอง
//   🧹 รวมร่างซ้ำ  เคสที่เผลอกด "เพิ่มข้อมูล" จนได้พนักงานคนใหม่ทั้งชุด
//   🔌 ปลด LINE    มือถือหาย/ออกจากบัญชีเดิมไม่ได้ → ล้างให้ลงทะเบียนใหม่
function shortUid(id){
  id = String(id||''); if(!id) return '—';
  return id.length > 18 ? id.slice(0,10)+'…'+id.slice(-6) : id;
}
function lineKindLabel(k){
 return { change:' คำขอเปลี่ยน LINE', register:' คำขอลงทะเบียน', dup:' ร่างซ้ำในระบบ' }[k] || ' บัญชี LINE';
}
function lineStatusLabel(s){
  return { pending:'⏳ รออนุมัติ', approved:'อนุมัติแล้ว', rejected:'❌ ปฏิเสธ' }[s] || esc(s||'—');
}

function paintEmpLine(box, u){
  box.innerHTML = '<div class="card"><div class="skel" style="height:130px"></div></div>';
  api('emLineInfo',{empId:u.empId||'', name:u.name||''}).then(function(r){
    if(!r.ok){ box.innerHTML = emptyBox(ico('alert'), r.error||'โหลดไม่สำเร็จ'); return; }
    box.innerHTML = empLineCards(r);
    wireEmpLine(box, u, r);
  }).catch(function(e){ box.innerHTML = emptyBox(ico('alert'), String(e.message||e)); });
}

function empLineCards(r){
  var warn = '';
  if(r.linked && r.payroll && r.payroll.found && r.payroll.inSync === false)
    warn += '<div class="hr-note warn">'+ico('alert')+' ชีตเงินเดือนชี้ไปคนละบัญชี ('+esc(shortUid(r.payroll.userId))+
            ') — สลิปจะส่งเข้าเครื่องเก่า กด '+ico('rotate')+' ย้าย LINE ซ้ำอีกครั้งเพื่อให้ตรงกัน</div>';
  if((r.extras||[]).length)
    warn += '<div class="hr-note warn">'+ico('alert')+' คนนี้มีอีก '+r.extras.length+' แถวใน LineUsers (row '+
            r.extras.map(function(x){ return x.row; }).join(', ')+') — ใช้ '+ico('eraser')+' รวมร่างซ้ำ เก็บให้เหลือแถวเดียว</div>';

  var cand = (r.candidates||[]).map(function(c){
    return '<div class="hist"><div class="hist-ic">'+(c.kind==='dup'?ico('userx'):(c.kind==='register'?ico('pencil'):ico('phone')))+'</div>'+
      '<div class="hist-main"><div class="hist-type">'+esc(c.label||'(ไม่มีชื่อ)')+'</div>'+
      '<div class="hist-meta">'+esc(c.sub||'')+'</div>'+
      '<div class="hist-meta">'+esc(shortUid(c.userId))+'</div></div>'+
      '<button class="btn btn-primary btn-sm" data-lcand="'+esc(c.userId)+'" data-lkind="'+esc(c.kind)+'" '+
        'data-lname="'+esc(c.label||'')+'">'+(c.kind==='dup'?ico('eraser')+' รวมร่าง':ico('rotate')+' ย้ายให้คนนี้')+'</button></div>';
  }).join('');

  var hist = (r.history||[]).map(function(h){
    return '<div class="hist"><div class="hist-ic">'+(h.status==='approved'?ico('check'):(h.status==='rejected'?ico('x'):'⏳'))+'</div>'+
      '<div class="hist-main"><div class="hist-type">'+lineStatusLabel(h.status)+
        ' <span class="hist-meta">'+esc(h.at||'')+'</span></div>'+
      '<div class="hist-meta">'+esc(shortUid(h.oldUserId))+' → '+esc(shortUid(h.userId))+'</div>'+
      (h.by?'<div class="hist-meta">โดย '+esc(h.by)+(h.decidedAt?' · '+esc(h.decidedAt):'')+'</div>':'')+
      (h.reason?'<div class="hist-meta">'+esc(h.reason)+'</div>':'')+'</div></div>';
  }).join('');

  return warn+
    '<div class="card">'+
      '<div class="emp-thead"><div class="card-title" style="margin:0"><span class="ic"></span>บัญชี LINE ที่ผูกอยู่</div>'+
        (r.linked?'<button class="btn btn-sm" data-lunlink>'+ico('plug')+' ปลด LINE</button>':'')+'</div>'+
      empRow('สถานะ', r.linked?ico('check')+' ผูกแล้ว':ico('dot')+' ยังไม่ผูก — พนักงานยังใช้บอท/เว็บไม่ได้')+
      empRow('LineUserID', r.linked?shortUid(r.userId):'—')+
      empRow('วันลงทะเบียน', r.registeredAt)+
      empRow('ชีตเงินเดือน (สลิป)', !r.payroll||!r.payroll.found ? 'ไม่พบแถวในชีตพนักงาน'
        : (r.payroll.inSync ? ico('check')+' ตรงกัน (ลำดับ '+esc(r.payroll.seq)+')' : ico('alert')+' ชี้คนละบัญชี'))+
      '<button class="btn btn-primary mg-full" data-lmove style="margin-top:10px">'+ico('rotate')+' ย้าย LINE ให้คนนี้</button>'+
      '<div class="paste-help">ย้ายแล้วประวัติลา / OT / สลิป อยู่ครบ — ระบบผูกด้วยรหัสพนักงาน ไม่ใช่บัญชี LINE</div>'+
    '</div>'+
    '<div class="card"><div class="card-title"><span class="ic"></span>เครื่องที่รอผูก ('+((r.candidates||[]).length)+')</div>'+
      (cand||'<div class="mg-sub2">ยังไม่มีคำขอค้าง — ถ้าพนักงานเพิ่งทักบอทจากเครื่องใหม่ กดรีเฟรชอีกที</div>')+
      '<div class="paste-help">'+ico('userx')+' ร่างซ้ำ = แถวที่ไม่มีตัวตนในชีตโควต้าลา (มักเกิดตอนเผลอกด "เพิ่มข้อมูล" ให้คนที่มีอยู่แล้ว)</div>'+
    '</div>'+
    '<div class="card"><div class="card-title"><span class="ic"></span>ประวัติการเปลี่ยน LINE</div>'+
      (hist||'<div class="mg-sub2">ยังไม่เคยเปลี่ยน</div>')+'</div>';
}

function wireEmpLine(box, u, r){
  var mv = box.querySelector('[data-lmove]');
  if(mv) mv.addEventListener('click', function(){ openLineMove(u, r); });
  var un = box.querySelector('[data-lunlink]');
  if(un) un.addEventListener('click', function(){ openLineUnlink(u, r); });
  box.querySelectorAll('[data-lcand]').forEach(function(el){
    el.addEventListener('click', function(){
      if(el.dataset.lkind === 'dup') openLineMerge(u, el.dataset.lname);
      else doLineMove(u, el.dataset.lcand, el.dataset.lname);
    });
  });
}

/** เลือกเครื่องจากรายการ หรือวาง LineUserID เอง */
function openLineMove(u, r){
  var opts = (r.candidates||[]).map(function(c){
    return '<label class="lcand"><input type="radio" name="lmv" value="'+esc(c.userId)+'" data-nm="'+esc(c.label||'')+'" data-kd="'+esc(c.kind)+'">'+
      '<span><b>'+esc(c.label||'(ไม่มีชื่อ)')+'</b><br><span class="mg-sub2">'+lineKindLabel(c.kind)+' · '+esc(shortUid(c.userId))+(c.kind==='dup'?' · เลือกแล้วจะพาไปหน้ารวมร่าง':'')+'</span></span></label>';
  }).join('');
  modalForm({ title:'ย้าย LINE · '+u.name, emoji:ico('rotate'),
    body:(opts?'<label class="field-lb">'+ico('phone')+' เลือกเครื่องที่รออยู่</label>'+opts:'')+
         '<label class="field-lb">หรือวาง LineUserID เอง</label>'+
         '<input type="text" id="lmvManual" placeholder="U1234…" autocomplete="off">'+
         '<div class="cfm-note">บัญชีเดิมจะใช้งานไม่ได้ทันที · ประวัติทั้งหมดตามมาให้เอง<br>'+
         'ยืนยันตัวตนกับเจ้าตัวก่อนกดทุกครั้ง — คนอื่นก็ยื่นคำขอในชื่อเขาได้</div>',
    okLabel:ico('rotate')+' ย้ายเลย',
    onOk:function(c){
      var pick = c.querySelector('input[name="lmv"]:checked');
      var manual = (c.querySelector('#lmvManual').value||'').trim();
      var uid = manual || (pick ? pick.value : '');
      if(!uid){ toast('เลือกเครื่อง หรือวาง LineUserID ก่อนนะคะ','err'); return; }
      closeConfirm();
      // เลือกร่างซ้ำ = ย้ายเฉย ๆ ไม่ได้ (จะเหลือแถวผีไว้กินเงินเดือนอีกใบ) → พาไปรวมร่างให้เลย
      if(pick && pick.dataset.kd === 'dup'){ openLineMerge(u, pick.dataset.nm); return; }
      doLineMove(u, uid, pick ? pick.dataset.nm : '');
    } });
}

function doLineMove(u, newUserId, candName){
  confirmModal({ title:'ย้าย LINE ให้ '+u.name, emoji:ico('rotate'),
    rows:[{k:'พนักงาน', v:u.name+' ('+(u.empId||'-')+')'},
          {k:'บัญชีใหม่', v:(candName?candName+' · ':'')+shortUid(newUserId)},
          {k:'ผลที่เกิด', v:'เครื่องเดิมใช้ไม่ได้ · ประวัติอยู่ครบ'}],
    onConfirm:function(){
      toast('กำลังย้าย…');
      api('emLineMove',{empId:u.empId||'', name:u.name||'', newUserId:newUserId}).then(function(r){
        if(!r.ok){
          if(r.needMerge){ noticeBox('ต้องรวมร่างแทน', r.error, ico('eraser')); return; }
          toast(r.error||'ย้ายไม่สำเร็จ','err'); return;
        }
        toast('ย้าย LINE ให้ '+r.name+' แล้ว'+(r.payrollUpdated?' · สลิปตามไปด้วย':''));
        paintEmpTab();
      }).catch(function(e){ toast(String(e.message||e),'err'); });
    } });
}

/** รวมร่างซ้ำ — ตรวจก่อนเสมอ แล้วให้ HR เห็นรายการที่จะลบก่อนยืนยัน */
function openLineMerge(u, dupName){
  toast('กำลังตรวจ…');
  api('emLineMerge',{dupName:dupName, realName:u.name||'', dryRun:true}).then(function(r){
    if(!r.ok){ toast(r.error||'ตรวจไม่ผ่าน','err'); return; }
    var del = (r.deletes||[]).map(function(d){
      return '<div class="cfm-row"><span class="cfm-k">'+esc(d.sheet)+'</span><span class="cfm-v">row '+d.row+'</span></div>'; }).join('');
    if((r.blockers||[]).length){
      noticeBox('ยังรวมร่างไม่ได้',
 r.blockers.join('\n')+'\n\nร่างนี้มีข้อมูลจริงผูกอยู่ ลบแล้วประวัติจะกำพร้า — เคลียร์ส่วนนั้นก่อนนะคะ', '');
      return;
    }
    modalForm({ title:'รวมร่างซ้ำเข้ากับ '+u.name, emoji:ico('eraser'),
      body:'<div class="cfm-row"><span class="cfm-k">ร่างที่จะลบ</span><span class="cfm-v">'+esc(r.dupName)+'</span></div>'+
           '<div class="cfm-row"><span class="cfm-k">LINE ที่จะย้ายมา</span><span class="cfm-v">'+esc(shortUid(r.newUserId))+'</span></div>'+
           '<label class="field-lb">'+ico('trash')+' จะลบ '+((r.deletes||[]).length)+' แถว</label>'+del+
           ((r.extras||[]).length
             ? '<label class="lcand" style="margin-top:8px"><input type="checkbox" id="lmgExtra" checked>'+
               '<span>ลบแถวซ้ำเก่าใน LineUsers อีก '+r.extras.length+' แถวด้วย</span></label>' : '')+
           ((r.warnings||[]).length?'<div class="cfm-note">'+esc(r.warnings.join(' · '))+'</div>':'')+
           '<div class="cfm-note">ยอดโควต้าลา / ประวัติ / ลำดับในชีตเงินเดือน ใช้ของคนเดิมทั้งหมด</div>',
      okLabel:ico('eraser')+' รวมร่างเลย',
      onOk:function(c){
        var ex = c.querySelector('#lmgExtra');
        closeConfirm(); toast('กำลังรวมร่าง…');
        api('emLineMerge',{dupName:r.dupName, realName:r.realName,
                           removeExtras:(ex && ex.checked)?'true':'false'}).then(function(res){
          if(!res.ok){ toast((res.blockers?res.blockers.join(' · '):res.error)||'ไม่สำเร็จ','err'); return; }
          toast('รวมร่างแล้ว · ลบ '+(res.deleted||[]).length+' แถว');
          paintEmpTab();
        }).catch(function(e){ toast(String(e.message||e),'err'); });
      } });
  }).catch(function(e){ toast(String(e.message||e),'err'); });
}

/** ปลด LINE — ใช้ตอนมือถือหาย/เข้าบัญชีเดิมไม่ได้ */
function openLineUnlink(u, r){
  modalForm({ title:'ปลด LINE ของ '+u.name, emoji:ico('plug'),
    body:'<div class="cfm-row"><span class="cfm-k">บัญชีที่จะปลด</span><span class="cfm-v">'+esc(shortUid(r.userId))+'</span></div>'+
         '<label class="field-lb">'+ico('pencil')+' เหตุผล (เก็บใน audit)</label>'+
         '<input type="text" id="lulReason" placeholder="เช่น มือถือหาย / เข้าบัญชีเดิมไม่ได้">'+
         '<div class="cfm-note">ปลดแล้วพนักงานจะใช้บอทและเว็บไม่ได้จนกว่าจะผูกใหม่<br>'+
         'ข้อมูลในระบบอยู่ครบ — ให้เจ้าตัวทักบอทแล้วพิมพ์ชื่อ-นามสกุล เพื่อยื่นขอผูกใหม่</div>',
    okLabel:ico('plug')+' ปลดเลย',
    onOk:function(c){
      var reason = (c.querySelector('#lulReason').value||'').trim();
      closeConfirm(); toast('กำลังปลด…');
      api('emLineUnlink',{empId:u.empId||'', name:u.name||'', reason:reason}).then(function(res){
        if(!res.ok){ toast(res.error||'ปลดไม่สำเร็จ','err'); return; }
        toast('ปลด LINE ของ '+res.name+' แล้ว');
        paintEmpTab();
      }).catch(function(e){ toast(String(e.message||e),'err'); });
    } });
}

// ════════════ 🧾 ค่าลดหย่อนภาษี (ทะเบียนพนักงาน เฟส 2) ════════════
// รอบนี้ HR กรอกแทนพนักงานจากแฟ้ม ล.ย.01 → บันทึกแล้วอนุมัติในคราวเดียว
// แก้ = เพิ่มใบใหม่เสมอ (ของเดิมไม่หาย) · ระบบ cap เพดานให้ ไม่ต้องคิดเอง

// ช่องในฟอร์ม — [key, ป้าย, คำใบ้]  (key ตรงกับ al_<key> ที่ API รับ)
// กลุ่มช่องกรอกลดหย่อน — col:'L'/'R' = ซ้าย/ขวาในหน้าจอ 2 คอลัมน์
// hint เขียนเพดานไว้ใต้ช่องทุกช่อง HR จะได้ไม่ต้องเปิดคู่มือ (ระบบตัดเพดานให้เองอยู่แล้ว)
var TAX_FORM = [
 { g:'‍‍ ส่วนตัวและครอบครัว', col:'L', f:[
    ['childYears', 'ปีเกิดบุตร (พ.ศ. คั่นด้วย ,)', 'เช่น 2559, 2563 — ระบบแยกสิทธิ์ 30,000/60,000 ให้เอง', 'text'],
    ['parent',     'บิดามารดาในอุปการะ (คน)',      'อายุ 60+ รายได้ไม่เกิน 30,000 · รวมของคู่สมรส สูงสุด 4 คน'],
    ['disabled',   'อุปการะคนพิการ (คน)',          '60,000 ต่อคน'],
    ['maternity',  'ค่าฝากครรภ์/คลอดบุตร (บาท)',   'ไม่เกิน 60,000 ต่อครรภ์'],
  ]},
 { g:' กองทุน / การลงทุน', col:'L', f:[
    ['pvd',        'กองทุนสำรองเลี้ยงชีพ / กบข. (บาท)', 'ไม่เกิน 15% ของค่าจ้าง'],
    ['rmf',        'RMF (บาท)',                          'ไม่เกิน 30% ของเงินได้'],
    ['ssf',        'SSF (บาท)',                          'ไม่เกิน 30% ของเงินได้ และ 200,000'],
    ['esg',        'ThaiESG (บาท)',                      'ไม่เกิน 30% ของเงินได้ และ 300,000 (แยกวง)'],
    ['pensionIns', 'ประกันชีวิตแบบบำนาญ (บาท)',          'ไม่เกิน 15% ของเงินได้ และ 200,000'],
  ]},
 { g:' ประกันชีวิต / ประกันสุขภาพ', col:'R', f:[
    ['lifeIns',      'เบี้ยประกันชีวิตตนเอง (บาท)',   'รวมกับประกันสุขภาพตนเอง ไม่เกิน 100,000'],
    ['healthSelf',   'ประกันสุขภาพตนเอง (บาท)',       'ไม่เกิน 25,000 (อยู่ในวง 100,000)'],
    ['healthParent', 'ประกันสุขภาพบิดามารดา (บาท)',   'ไม่เกิน 15,000'],
    ['spouseLife',   'ประกันชีวิตคู่สมรส (บาท)',      'คู่สมรสไม่มีเงินได้ · ไม่เกิน 10,000'],
  ]},
 { g:' เงินบริจาค', col:'R', f:[
    ['donate',          'เงินบริจาคทั่วไป (บาท)',      'หักได้ไม่เกิน 10% ของเงินได้หลังหักลดหย่อน'],
    ['donate2x',        'บริจาคการศึกษา/กีฬา (บาท)',   'หักได้ 2 เท่า แต่ไม่เกิน 10%'],
    ['donatePolitical', 'บริจาคพรรคการเมือง (บาท)',    'ไม่เกิน 10,000'],
  ]},
 { g:' ที่อยู่อาศัย และอื่นๆ', col:'R', f:[
    ['homeInterest', 'ดอกเบี้ยที่อยู่อาศัย (บาท)', 'ไม่เกิน 100,000'],
    ['otherAmt',     'ค่าลดหย่อนอื่น (บาท)',       'เช่น มาตรการรัฐรายปี'],
    ['otherName',    'ชื่อรายการลดหย่อนอื่น',      'เช่น Easy E-Receipt', 'text'],
  ]},
];

function taxStatusPill(st){
  if(st==='อนุมัติ')   return '<span class="pill ok">อนุมัติแล้ว</span>';
  if(st==='รออนุมัติ') return '<span class="pill warn">รออนุมัติ</span>';
  if(st==='ปฏิเสธ')    return '<span class="pill err">ปฏิเสธ</span>';
  if(st==='ยกเลิก')    return '<span class="pill err">ยกเลิกสิทธิ์</span>';
  return '<span class="pill">ยังไม่มีใบ</span>';
}

function paintEmpTax(box, u){
  box.innerHTML = '<div class="card"><div class="skel" style="height:120px"></div></div>';
  var year = S.empTaxYear || (new Date().getFullYear()+543);
  api('emAllowGet',{empId:u.empId||'',name:u.name||'',taxYear:year}).then(function(r){
    if(!r.ok){ box.innerHTML = emptyBox(ico('alert'), r.error||'โหลดไม่สำเร็จ'); return; }
    S.empTax = r;
    renderEmpTax(box, u, r);
  }).catch(function(e){ box.innerHTML = emptyBox(ico('alert'), String(e.message||e)); });
}

function renderEmpTax(box, u, r){
  r = r || {};
  r.preview = r.preview || { total: 0, items: [], notes: [] };
  r.basis   = r.basis   || {};
  var yrs = [r.taxYear-1, r.taxYear, r.taxYear+1].map(function(y){
    return '<option value="'+y+'"'+(y===r.taxYear?' selected':'')+'>ปีภาษี '+y+'</option>'; }).join('');

  var items = (r.preview.items||[]).map(function(it){
    return '<div class="pf-row"><span class="k">'+esc(it.label)+'</span><span class="v">'+baht0(it.amount)+'</span></div>'; }).join('');
  var notes = (r.preview.notes||[]).map(function(n){
    return '<div class="hist-meta">'+ico('alert')+' '+esc(n)+'</div>'; }).join('');

  var hist = (r.history||[]).slice().reverse().map(function(h){
    return '<tr class="mg-tr">'+
      '<td class="ce">'+taxStatusPill(h.status)+'</td>'+
      '<td class="lft">'+esc(h.by||'-')+'</td>'+
      '<td class="ce mg-sub2">'+esc(h.at||'-')+'</td>'+
      '<td class="lft">'+esc(h.approver||'-')+'</td>'+
      '<td class="ce mg-sub2">'+esc(h.approvedAt||'-')+'</td>'+
      '<td class="lft mg-sub2">'+esc(h.reason||'')+'</td></tr>'; }).join('');

  var cur = r.approved || r.current || {};
  var fld = function(f){
    var key=f[0], label=f[1], hint=f[2], type=f[3]||'number';
    var val = cur[key]==null ? '' : cur[key];
    return '<div class="tax-f"><label class="field-lb" for="tx_'+key+'">'+esc(label)+'</label>'+
      (type==='text'
        ? '<input type="text" class="hr-fdate mg-full" id="tx_'+key+'" maxlength="60" value="'+esc(val)+'">'
        : '<input type="number" class="hr-fdate mg-full" id="tx_'+key+'" min="0" step="100" value="'+esc(val===0?'':val)+'">')+
      '<div class="hist-meta">'+esc(hint)+'</div></div>'; };

  var groupCard = function(grp){
    return '<div class="card tax-card"><div class="card-title"><span class="ic"></span>'+esc(grp.g)+'</div>'+
      grp.f.map(fld).join('')+'</div>'; };

  var colL = TAX_FORM.filter(function(g){ return g.col==='L'; }).map(groupCard).join('');
  var colR = TAX_FORM.filter(function(g){ return g.col==='R'; }).map(groupCard).join('');

  // ลดหย่อนส่วนตัว + ปกส. ระบบหักให้อยู่แล้ว — โชว์ให้เห็นว่าไม่ต้องกรอกซ้ำ
  var personalCard =
    '<div class="card tax-card"><div class="card-title"><span class="ic"></span>'+ico('sparkle')+' ระบบหักให้อัตโนมัติ</div>'+
      '<div class="pf-row"><span class="k">ลดหย่อนส่วนตัว</span><span class="v">60,000 ฿ / ปี</span></div>'+
      '<div class="pf-row"><span class="k">ประกันสังคม</span><span class="v">ตามที่หักจริงในสลิป</span></div>'+
      '<div class="tax-f" style="margin-top:10px"><label class="field-lb" for="tx_spouse">'+ico('sparkle')+' คู่สมรสไม่มีเงินได้</label>'+
        '<select id="tx_spouse" class="hr-fsel mg-full">'+
          '<option value="0"'+(cur.spouse?'':' selected')+'>ไม่มี / คู่สมรสมีเงินได้</option>'+
          '<option value="1"'+(cur.spouse?' selected':'')+'>มี (หักได้ 60,000)</option>'+
        '</select><div class="hist-meta">ยื่นรวมกับคู่สมรสที่ไม่มีเงินได้ หักเพิ่มได้ 60,000</div></div>'+
    '</div>';

  box.innerHTML =
    '<div class="card">'+
      '<div class="emp-thead"><div class="card-title" style="margin:0"><span class="ic"></span>ค่าลดหย่อนภาษี</div>'+
        '<select id="taxYearSel" class="hr-fsel">'+yrs+'</select></div>'+
      '<div class="pf-row"><span class="k">สถานะใบล่าสุด</span><span class="v">'+taxStatusPill(r.status)+'</span></div>'+
      '<div class="pf-row"><span class="k">ยอดลดหย่อนที่ใช้คิดภาษี</span><span class="v"><b>'+baht0(r.preview.total)+'</b> / ปี</span></div>'+
      (r.approved ? '' : '<div class="mg-sub2">ยังไม่มีใบที่อนุมัติ — ระบบหักให้เฉพาะลดหย่อนส่วนตัว + ประกันสังคม</div>')+
      items+
      (notes ? '<div class="paste-help" style="text-align:left">'+notes+'</div>' : '')+
      '<div class="paste-help">ประมาณการจากฐาน '+(r.basis.rate?baht0(r.basis.rate)+'/เดือน':'— ยังไม่มีในทะเบียน')+
        ' · ยอดจริงคิดใหม่ทุกเดือนตอนปิดเงินเดือน</div>'+
    '</div>'+

    '<div class="tax-grid"><div>'+personalCard+colL+'</div><div>'+colR+
      '<div class="card tax-card"><div class="card-title"><span class="ic"></span>'+ico('paperclip')+' หลักฐาน / หมายเหตุ</div>'+
        '<div class="tax-f"><label class="field-lb" for="tx_evidence">'+ico('link')+' ลิงก์โฟลเดอร์หลักฐาน</label>'+
          '<input type="text" class="hr-fdate mg-full" id="tx_evidence" value="'+esc(cur.evidence||'')+
            '" placeholder="ลดหย่อนภาษี/'+r.taxYear+'/'+esc(u.name||'')+'"></div>'+
        '<div class="tax-f"><label class="field-lb" for="tx_note">'+ico('pencil')+' หมายเหตุ</label>'+
          '<textarea id="tx_note" rows="2" placeholder="เช่น รับ ล.ย.01 ฉบับจริงแล้ว">'+esc(cur.note||'')+'</textarea></div>'+
      '</div>'+
    '</div></div>'+

    '<div class="card tax-foot">'+
      '<div class="tax-foot-l"><div class="mg-sub2">ค่าลดหย่อนรวมที่อนุมัติล่าสุด</div>'+
        '<div class="tax-total">'+baht0(r.preview.total)+'</div></div>'+
      '<div class="tax-foot-r">'+
        (r.approved ? '<button class="btn btn-sm" data-taxrevoke>'+ico('ban')+' ยกเลิกสิทธิ์</button>' : '')+
        '<button class="btn btn-primary" data-taxsave>'+ico('check')+' บันทึกและอนุมัติ</button>'+
      '</div>'+
      '<div class="paste-help" style="width:100%">กรอกยอดตามเอกสารจริง — ระบบตัดเพดานให้เอง กรอกเกินไม่ทำให้ภาษีผิด · '+
        'บันทึกแล้วมีผลกับการคิดภาษีเดือนถัดไปทันที (ส่วนที่หักเกินไปแล้วเกลี่ยคืนในเดือนที่เหลือ)</div>'+
    '</div>'+

    (hist ? '<div class="card"><div class="card-title"><span class="ic"></span>ประวัติการยื่น/อนุมัติ</div>'+
      '<div class="mg-tbwrap"><table class="mg-table mg-rpt"><thead><tr>'+
        '<th class="ce">สถานะ</th><th class="lft">ผู้ยื่น</th><th class="ce">ยื่นเมื่อ</th>'+
        '<th class="lft">ผู้อนุมัติ</th><th class="ce">อนุมัติเมื่อ</th><th class="lft">หมายเหตุ</th>'+
      '</tr></thead><tbody>'+hist+'</tbody></table></div>'+
      '<div class="paste-help">ทุกการแก้ไขเก็บเป็นแถวใหม่ — ตรวจย้อนได้ว่าใครกรอก ใครอนุมัติ</div></div>' : '');

  var sel = document.getElementById('taxYearSel');
  if(sel) sel.addEventListener('change', function(){ S.empTaxYear = parseInt(sel.value,10); paintEmpTab(); });
  var sb = box.querySelector('[data-taxsave]');
  if(sb) sb.addEventListener('click', function(){ submitTaxForm(u, r, sb); });
  var rb = box.querySelector('[data-taxrevoke]');
  if(rb) rb.addEventListener('click', function(){ openTaxRevoke(u, r); });
}

/** เก็บค่าจากฟอร์มในหน้า → บันทึก+อนุมัติในคราวเดียว (รอบนี้ HR กรอกแทนจากแฟ้ม ล.ย.01) */
function submitTaxForm(u, r, btn){
  var p = { empId:u.empId||'', name:u.name||'', taxYear:r.taxYear, approve:'1' };
  var sp = document.getElementById('tx_spouse');
  if(sp) p.al_spouse = sp.value;
  TAX_FORM.forEach(function(grp){ grp.f.forEach(function(f){
    var el = document.getElementById('tx_'+f[0]); if(!el) return;
    var v = String(el.value||'').trim();
    if(v) p['al_'+f[0]] = v;
  }); });
  var ev = document.getElementById('tx_evidence'), nt = document.getElementById('tx_note');
  if(ev && ev.value.trim()) p.al_evidence = ev.value.trim();
  if(nt && nt.value.trim()) p.al_note = nt.value.trim();

  if(btn){ btn.disabled = true; btn.textContent = 'กำลังบันทึก…'; }
  api('emAllowSave', p).then(function(res){
 if(!res.ok){ if(btn){ btn.disabled=false; btn.textContent=' บันทึกและอนุมัติ'; } return toast(res.error||'บันทึกไม่สำเร็จ','err'); }
    toast(res.summary||'บันทึกแล้ว','ok');
    paintEmpTab();
  }).catch(function(e){
 if(btn){ btn.disabled=false; btn.textContent=' บันทึกและอนุมัติ'; }
    toast(String(e.message||e),'err');
  });
}

function openTaxRevoke(u, r){
  modalForm({ title:'ยกเลิกสิทธิ์ลดหย่อน · '+(u.name||''), emoji:ico('ban'),
    body:'<div class="cfm-row"><span class="cfm-k">ปีภาษี</span><span class="cfm-v"><b>'+r.taxYear+'</b></span></div>'+
         '<label class="field-lb">'+ico('pencil')+' เหตุผล</label>'+
         '<textarea id="txRevReason" rows="2" placeholder="เช่น หลักฐานไม่ครบ / ตรวจพบข้อมูลไม่ตรง"></textarea>'+
         '<div class="cfm-note">ยกเลิกแล้ว ระบบจะกลับไปหักเฉพาะลดหย่อนส่วนตัว + ประกันสังคม<br>'+
           'ใบเดิมยังอยู่ในประวัติ — ยื่นใบใหม่ทับได้ทุกเมื่อ</div>',
    okLabel:ico('ban')+' ยกเลิกสิทธิ์',
    onOk:function(c){
      var reason = c.querySelector('#txRevReason').value.trim();
      if(!reason){ toast('ใส่เหตุผลก่อนนะคะ','err'); return; }
      toast('กำลังบันทึก…');
      api('emAllowDecide',{empId:u.empId||'',name:u.name||'',taxYear:r.taxYear,status:'ยกเลิก',reason:reason})
        .then(function(res){
          if(!res.ok){ toast(res.error||'ไม่สำเร็จ','err'); return; }
          closeConfirm(); toast(res.summary||'ยกเลิกแล้ว'); paintEmpTab();
        }).catch(function(e){ toast(String(e.message||e),'err'); });
    } });
}

// ════════════ 📊 แดชบอร์ดหน้าแรกเมนูพนักงาน ════════════
// วาดกราฟเองด้วย SVG — ไม่พึ่ง library ภายนอก (โหลดเร็ว + ไม่มีปัญหาเน็ตบริษัท)
function loadEmpDash(){
  var box = document.getElementById('empDash'); if(!box) return;
  var yearBE = S.empDashYear || (new Date().getFullYear()+543);
  api('emStats',{yearBE:yearBE}).then(function(r){
    if(!r.ok){ box.innerHTML=''; return; }          // ไม่มีสิทธิ์/ยังไม่มีทะเบียน = ไม่ต้องโชว์
    S.empStats = r;
    paintEmpDash();
  }).catch(function(){ box.innerHTML=''; });
}

function paintEmpDash(){
  var box = document.getElementById('empDash'); if(!box || !S.empStats) return;
  var r = S.empStats;
  var yrs = []; var nowY = new Date().getFullYear()+543;
  for(var y=nowY; y>=nowY-2; y--) yrs.push('<option value="'+y+'"'+(r.yearBE===y?' selected':'')+'>'+y+'</option>');

  box.innerHTML =
    '<div class="dash-grid">'+
      '<div class="card dash-card">'+
        '<div class="card-title"><span class="ic"></span>ภาพรวมพนักงาน</div>'+
        '<div class="chips">'+
          '<div class="chip"><div class="chip-v">'+r.active+'</div><div class="chip-l">ทำงานอยู่</div></div>'+
          '<div class="chip"><div class="chip-v">'+r.left+'</div><div class="chip-l">ลาออกแล้ว</div></div>'+
          '<div class="chip"><div class="chip-v">'+r.byDept.length+'</div><div class="chip-l">แผนก</div></div>'+
          (r.notCounted ? '<div class="chip"><div class="chip-v">'+r.notCounted+'</div>'+
            '<div class="chip-l">ไม่นับเป็นพนักงาน</div></div>' : '')+
          (r.noLine ? '<div class="chip"><div class="chip-v">'+r.noLine+'</div>'+
            '<div class="chip-l">ยังไม่ผูก LINE</div></div>' : '')+
        '</div>'+
        deptDonut(r.byDept, r.active)+
      '</div>'+
      '<div class="card dash-card">'+
        '<div class="card-title"><span class="ic"></span>เข้าใหม่ / ลาออก'+
          '<select id="dashYear" class="hr-fsel" style="float:right">'+yrs.join('')+'</select></div>'+
        (r.hasJobs ? joinExitChart(r)
          : '<div class="hr-note">ยังไม่มีประวัติการจ้างในทะเบียน — ไปที่ไฟล์ payroll เมนู '+ico('folder')+' Pro-rate/ปรับฐาน → '+ico('clipboard')+' สร้างประวัติการจ้าง เพื่อให้กราฟนี้มีข้อมูล</div>')+
      '</div>'+
    '</div>';

  var ys = document.getElementById('dashYear');
  if(ys) ys.addEventListener('change', function(){ S.empDashYear = parseInt(ys.value,10); loadEmpDash(); });
}

/** โดนัทแยกตามแผนก (วาดด้วย SVG stroke-dasharray) */
function deptDonut(list, total){
  if(!list.length || !total) return '<div class="mg-sub2">ยังไม่มีข้อมูลแผนก</div>';
  // 12 สี + วนซ้ำได้ — แสดง "ทุกแผนก" ไม่ตัดที่ 8 อีกแล้ว (บริษัทมี 16 แผนก)
  var COLORS = ['#cc1019','#f2994a','#2f80ed','#27ae60','#9b51e0','#e91e8c','#00b8a9','#8d6e63',
                '#5c6bc0','#ef5350','#26a69a','#ab47bc'];
  var many = list.length > 8;
  var R = 54, C = 2*Math.PI*R, off = 0;
  var arcs = list.map(function(d,i){
    var frac = d.count/total, len = C*frac;
    var seg = '<circle cx="70" cy="70" r="'+R+'" fill="none" stroke="'+COLORS[i%COLORS.length]+'" stroke-width="22"'+
      ' stroke-dasharray="'+len.toFixed(2)+' '+(C-len).toFixed(2)+'" stroke-dashoffset="'+(-off).toFixed(2)+'"'+
      ' transform="rotate(-90 70 70)"></circle>';
    off += len; return seg;
  }).join('');
  var legend = list.map(function(d,i){
    return '<div class="lg-row" title="'+esc(d.name)+' — '+d.count+' คน">'+
      '<span class="lg-dot" style="background:'+COLORS[i%COLORS.length]+'"></span>'+
      '<span class="lg-name">'+esc(d.name)+'</span><span class="lg-num">'+d.count+' คน</span></div>'; }).join('');
  return '<div class="donut-wrap'+(many?' many':'')+'">'+
    '<svg viewBox="0 0 140 140" class="donut">'+arcs+
      '<text x="70" y="66" text-anchor="middle" class="donut-n">'+total+'</text>'+
      '<text x="70" y="84" text-anchor="middle" class="donut-l">คน</text>'+
    '</svg><div class="donut-lg'+(many?' cols2':'')+'">'+legend+'</div></div>';
}

/** กราฟแท่งเข้าใหม่(บวก)/ลาออก(ลบ) รายเดือน */
function joinExitChart(r){
  var MO = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  var max = Math.max(1, Math.max.apply(null, r.joins.concat(r.exits)));
  var bars = MO.map(function(mo,i){
    var jh = r.joins[i]/max*100, eh = r.exits[i]/max*100;
    return '<div class="bar-col">'+
      '<div class="bar-up"><div class="bar j" style="height:'+jh+'%">'+(r.joins[i]?'<span>'+r.joins[i]+'</span>':'')+'</div></div>'+
      '<div class="bar-dn"><div class="bar e" style="height:'+eh+'%">'+(r.exits[i]?'<span>'+r.exits[i]+'</span>':'')+'</div></div>'+
      '<div class="bar-mo">'+mo+'</div></div>'; }).join('');
  return '<div class="chart-lg"><span class="lg-dot j"></span>เข้าใหม่ '+r.joinTotal+' คน'+
         ' <span class="lg-dot e" style="margin-left:12px"></span>ลาออก '+r.exitTotal+' คน</div>'+
         '<div class="barchart">'+bars+'</div>';
}
