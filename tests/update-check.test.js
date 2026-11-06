// เทสแถบ "มีระบบเวอร์ชันใหม่" : node tests/update-check.test.js
'use strict';
const U = require('../update-check.js');
let pass = 0, fail = 0;
function t(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log((ok ? '  ok  ' : '  NG  ') + name + (ok ? '' : ' ได้ ' + JSON.stringify(got)));
  ok ? pass++ : fail++;
}
const A = '<link rel="stylesheet" href="styles.css?v=32"><script src="config.js?v=36"></script><script src="app.js?v=162"></script><script src="https://x/sdk.js"></script>';
const B = A.replace('app.js?v=162', 'app.js?v=163');
const C = '<script src="app.js?v=162"></script><script src="config.js?v=36"></script><link href="styles.css?v=32">';
const sa = U.sigFromHtml(A), sb = U.sigFromHtml(B), NOW = 1000000000;

t('เก็บเฉพาะไฟล์ที่ติดเวอร์ชัน', sa.split('|').length, 3);
t('ลำดับในไฟล์เปลี่ยนไม่ถือว่าเป็นฉบับใหม่', U.sigFromHtml(C), sa);
t('เลขเปลี่ยน = ต่างกัน', sa === sb, false);
t('หน้าเว็บว่างได้ข้อความว่าง', U.sigFromHtml(''), '');

t('ฉบับเดียวกันไม่ขึ้น', U.shouldShow(sa, sa, null, NOW, ''), false);
t('มีฉบับใหม่ขึ้นแถบ', U.shouldShow(sa, sb, null, NOW, ''), true);
t('อ่านหน้าเว็บไม่ได้ไม่ขึ้น', U.shouldShow(sa, '', null, NOW, ''), false);
t('กดปิดแล้วไม่ขึ้นซ้ำฉบับเดิม', U.shouldShow(sa, sb, null, NOW, sb), false);
t('กดปิดแล้วมีฉบับใหม่กว่าขึ้นอีก', U.shouldShow(sa, sb, null, NOW, 'old'), true);
t('เพิ่งกดอัปเดตแต่แคชค้าง ไม่วนขึ้น', U.shouldShow(sa, sb, { sig: sb, ts: NOW - 60000 }, NOW, ''), false);
t('พ้น 15 นาทีแล้วขึ้นได้อีก', U.shouldShow(sa, sb, { sig: sb, ts: NOW - 16 * 60000 }, NOW, ''), true);
t('กดอัปเดตฉบับก่อน แต่มีฉบับใหม่กว่า ขึ้นได้', U.shouldShow(sa, sb, { sig: 'x', ts: NOW }, NOW, ''), true);

t('ชื่อเมนูปกติผ่าน', U.safeReturnView('empfiles'), 'empfiles');
t('ค่าแปลกไม่ผ่าน', U.safeReturnView('a/b<script>'), '');
t('ค่าว่างไม่ผ่าน', U.safeReturnView(null), '');

console.log('\nผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
