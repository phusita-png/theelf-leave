// ================================================================
// เทสคิวเรียก API ฝั่งเว็บ (app.js — api / _apiPump / _apiSend)
// ----------------------------------------------------------------
//   node tests/api-queue.test.js
//
// ที่มา (2 ก.ย. 2569): HR เจอ "หมดเวลาเชื่อมต่อ" บ่อยมาก
//   Apps Script ทำคำขอของผู้ใช้คนเดียวทีละคำขอ แต่หน้าอนุมัติยิงทีเดียว 6 ชุด
//   ตัวท้ายรอคิวจนนาฬิกา 20 วิของฝั่งเว็บหมดก่อน ทั้งที่เซิร์ฟเวอร์ยังทำงานปกติ
//
// กฎที่ต้องไม่พลาด:
//   ① ยิงพร้อมกันไม่เกิน API_MAX_PARALLEL
//   ② นาฬิกาเริ่มนับตอนยิงจริง ไม่ใช่ตอนเข้าคิว
//   ③ คำขออ่านที่หมดเวลา → ลองใหม่อัตโนมัติ 1 ครั้ง
//   ④ คำขอเขียน (ยื่นใบลา/อนุมัติ/บันทึก) ห้ามลองใหม่ — เดี๋ยวได้ใบซ้ำ
//   ⑤ ทุกคำขอต้องจบ (คิวไม่ค้าง) แม้ตัวก่อนหน้าจะพัง
// ================================================================
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const block = SRC.slice(SRC.indexOf('var API_TIMEOUT_MS'), SRC.indexOf('function _apiRaw('));

let pass = 0, fail = 0;
function t(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log((ok ? '  ok  ' : '  NG  ') + name +
    (ok ? '' : `\n        ได้: ${JSON.stringify(got)}\n        ควรได้: ${JSON.stringify(want)}`));
  ok ? pass++ : fail++;
}

/** สร้างบริบทจำลอง — _apiRaw ปลอมคุมได้ว่าคำขอไหนช้า/พัง */
function load(behave) {
  const ctx = {
    console, JSON, Date, String, Promise, Error, Object, setTimeout, clearTimeout,
    CFG: {}, S: {}, __live: 0, __peak: 0, __calls: [],
    mockApi: () => Promise.reject(new Error('ไม่ควรเรียก mock')),
  };
  ctx.global = ctx;
  vm.createContext(ctx);
  vm.runInContext(block, ctx);
  // _apiRaw ปลอม: นับจำนวนที่วิ่งพร้อมกัน แล้วตอบตามสคริปต์ที่เทสกำหนด
  ctx._apiRaw = function (action, params) {
    ctx.__live++; ctx.__peak = Math.max(ctx.__peak, ctx.__live);
    ctx.__calls.push(action);
    return new Promise((res, rej) => setTimeout(() => {
      ctx.__live--;
      const r = behave(action, ctx.__calls.filter(a => a === action).length);
      r && r.err ? rej(new Error(r.err)) : res(r || { ok: true, action });
    }, 5));
  };
  return ctx;
}

const done = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('\n── ① ยิงพร้อมกันไม่เกิน 2 ──');
  {
    const ctx = load(() => ({ ok: true }));
    t('ตั้งค่าเพดานไว้ที่ 2', ctx.API_MAX_PARALLEL, 2);
    const jobs = ['a', 'b', 'c', 'd', 'e', 'f'].map(a => ctx.api(a, {}));
    await Promise.all(jobs);
    t('คำขอ 6 ชุดเสร็จครบ', ctx.__calls.length, 6);
    t('ไม่เคยวิ่งพร้อมกันเกินเพดาน', ctx.__peak <= 2, true);
    t('คิวว่างหลังจบ', [ctx._apiQueue.length, ctx._apiActive], [0, 0]);
  }

  console.log('\n── ② เวลารอ 45 วิ (ยาวพอสำหรับ GAS ตื่นจากหลับ) ──');
  {
    const ctx = load(() => ({ ok: true }));
    t('API_TIMEOUT_MS', ctx.API_TIMEOUT_MS, 45000);
  }

  console.log('\n── ③ คำขออ่านหมดเวลา → ลองใหม่ให้เอง ──');
  {
    // ครั้งแรกหมดเวลา ครั้งที่สองผ่าน
    const ctx = load((action, nth) => (nth === 1 ? { err: 'หมดเวลาเชื่อมต่อ' } : { ok: true, action }));
    const r = await ctx.api('hrDashboard', {});
    t('สุดท้ายได้คำตอบ ไม่เด้ง error ใส่ผู้ใช้', r.ok, true);
    t('ยิงจริง 2 ครั้ง (ลองใหม่ 1)', ctx.__calls.length, 2);
    t('คิวว่าง', [ctx._apiQueue.length, ctx._apiActive], [0, 0]);
  }
  {
    // หมดเวลาทั้งสองครั้ง → ยอมแพ้ พร้อมข้อความที่อ่านรู้เรื่อง
    const ctx = load(() => ({ err: 'หมดเวลาเชื่อมต่อ' }));
    let msg = '';
    await ctx.api('hrDashboard', {}).catch(e => { msg = e.message; });
    t('ลองใหม่แล้วยังไม่ได้ → ยิงรวม 2 ครั้ง', ctx.__calls.length, 2);
    t('ข้อความบอกให้กดใหม่ ไม่ใช่ศัพท์เทคนิค', msg.indexOf('กดใหม่') >= 0, true);
    t('คิวว่าง ไม่ค้าง', [ctx._apiQueue.length, ctx._apiActive], [0, 0]);
  }

  console.log('\n── ④ คำขอเขียนห้ามลองใหม่ (กันใบซ้ำ) ──');
  for (const act of ['submitLeave', 'decideRegistration', 'addEmployee', 'setLeaveQuota',
                     'emLineMove', 'mgProxySubmit', 'emPhotoSync', 'genPayslips']) {
    const ctx = load(() => ({ err: 'หมดเวลาเชื่อมต่อ' }));
    await ctx.api(act, {}).catch(() => {});
    t(act + ' → ยิงครั้งเดียว', ctx.__calls.length, 1);
  }
  {
    const ctx = load(() => ({ err: 'หมดเวลาเชื่อมต่อ' }));
    await ctx.api('emLineInfo', {}).catch(() => {});
    t('emLineInfo (อ่าน) → ลองใหม่ได้', ctx.__calls.length, 2);
  }

  console.log('\n── ⑤ พังบางตัว คิวต้องเดินต่อ ──');
  {
    const ctx = load(a => (a === 'boom' ? { err: 'เชื่อมต่อ API ไม่ได้' } : { ok: true }));
    const results = await Promise.all([
      ctx.api('x', {}).then(() => 'ok'),
      ctx.api('boom', {}).then(() => 'ok').catch(() => 'err'),
      ctx.api('y', {}).then(() => 'ok'),
    ]);
    t('ตัวที่เหลือยังได้คำตอบ', results, ['ok', 'err', 'ok']);
    t('คิวว่าง', [ctx._apiQueue.length, ctx._apiActive], [0, 0]);
  }

  console.log('\n── ⑥ เก็บสถิติคำขอที่ช้าไว้ไล่ดูทีหลัง ──');
  {
    const ctx = load(() => ({ ok: true }));
    await ctx.api('bootstrap', {});
    t('มีที่เก็บสถิติ (ยังไม่มีตัวช้าในเทสนี้)', Array.isArray(ctx.S.apiSlow), true);
  }

  console.log(`\n${fail ? '❌' : '✅'} ผ่าน ${pass} · ตก ${fail}`);
  process.exit(fail ? 1 : 0);
})();
