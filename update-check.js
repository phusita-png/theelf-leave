// ================================================================
// update-check.js — บอกผู้ใช้เมื่อหน้าเว็บมีฉบับใหม่
// ----------------------------------------------------------------
// ทำไม: เปิดหน้าเว็บค้างไว้จะใช้ฉบับเก่าไปเรื่อย ๆ และ GitHub Pages แคชหน้า ~10 นาที
// วิธี: อ่าน index.html ล่าสุด แล้วเทียบไฟล์ที่ติด ?v=N กับไฟล์ที่หน้านี้โหลดอยู่
//       เลข ?v= ขยับอยู่แล้วทุกครั้งที่ขึ้นเว็บ จึงไม่ต้องจำขั้นตอนเพิ่ม
//
// กฎ:
//   • ห้ามรีเฟรชเอง ต้องให้ผู้ใช้กด ไม่งั้นข้อมูลที่กรอกค้างหาย
//   • เช็คไม่สำเร็จ = เงียบ ห้ามรบกวนผู้ใช้เพราะเน็ตหลุด
//   • กดแล้วยังได้ฉบับเดิม (แคชค้าง) ไม่ขึ้นแถบซ้ำภายใน 15 นาที กันวนกดไม่จบ
//   • ไฟล์นี้ต้องไม่อ้างของใน app.js ตอนโหลด เพราะใช้กับหน้า payroll เดี่ยวด้วย
// ================================================================
(function (root) {
  'use strict';

  var CHECK_EVERY_MS = 10 * 60 * 1000;
  var REFOCUS_GAP_MS = 60 * 1000;
  var TRIED_HOLD_MS = 15 * 60 * 1000;
  var KEY_TRIED = 'upd_tried', KEY_VIEW = 'upd_return_view';
  var BAR_ID = 'updBar';

  /** รายการไฟล์ที่ติดเวอร์ชันจากข้อความ HTML · เรียงแล้วต่อกันเป็นข้อความเดียวเพื่อเทียบ */
  function sigFromHtml(html) {
    var re = /(?:src|href)\s*=\s*["']([^"']+\?v=[^"']+)["']/g, out = [], m;
    while ((m = re.exec(String(html || '')))) out.push(m[1]);
    return out.sort().join('|');
  }

  /** ควรขึ้นแถบไหม · remote ว่าง = อ่านไม่ได้ ถือว่าไม่มีของใหม่ */
  function shouldShow(local, remote, tried, now, dismissedSig) {
    if (!local || !remote || local === remote) return false;
    if (dismissedSig && dismissedSig === remote) return false;
    if (tried && tried.sig === remote && now - tried.ts < TRIED_HOLD_MS) return false;
    return true;
  }

  function safeReturnView(v) { return /^[a-z]+$/i.test(String(v || '')) ? String(v) : ''; }

  var api = { sigFromHtml: sigFromHtml, shouldShow: shouldShow, safeReturnView: safeReturnView };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  var doc = root.document, dismissedSig = '', lastCheck = 0;

  function store(fn) { try { return fn(root.sessionStorage); } catch (e) { return null; } }

  function localSig() {
    var els = doc.querySelectorAll('script[src*="?v="],link[href*="?v="]'), out = [];
    for (var i = 0; i < els.length; i++) out.push(els[i].getAttribute('src') || els[i].getAttribute('href'));
    return out.sort().join('|');
  }

  function readTried() {
    var raw = store(function (s) { return s.getItem(KEY_TRIED); });
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function applyUpdate(remote) {
    store(function (s) {
      s.setItem(KEY_TRIED, JSON.stringify({ sig: remote, ts: Date.now() }));
      if (typeof S !== 'undefined' && S && S.view) s.setItem(KEY_VIEW, S.view);
    });
    var u = new URL(root.location.href);
    u.searchParams.set('_u', String(Date.now()));   // เลี่ยงหน้าเก่าในแคช
    root.location.replace(u.href);
  }

  function removeBar() { var b = doc.getElementById(BAR_ID); if (b) b.parentNode.removeChild(b); }

  function showBar(remote) {
    removeBar();
    var bar = doc.createElement('div');
    bar.id = BAR_ID;
    bar.setAttribute('role', 'status');
    bar.style.cssText = 'position:sticky;top:0;z-index:70;display:flex;align-items:center;gap:10px;flex-wrap:wrap;' +
      'padding:9px 14px;background:#cc1019;color:#fff;font-size:14px;line-height:1.4;box-shadow:0 2px 8px rgba(0,0,0,.18)';
    var txt = doc.createElement('div');
    txt.style.cssText = 'flex:1 1 180px;min-width:0';
    txt.innerHTML = '<b>มีระบบเวอร์ชันใหม่</b><div style="font-size:12px;opacity:.9">ถ้ากรอกฟอร์มค้างอยู่ ให้บันทึกก่อนกดอัปเดต</div>';
    var go = doc.createElement('button');
    go.type = 'button';
    go.textContent = 'อัปเดตเลย';
    go.style.cssText = 'border:none;border-radius:8px;padding:8px 14px;background:#fff;color:#cc1019;font:inherit;font-weight:700;cursor:pointer';
    go.addEventListener('click', function () { go.disabled = true; go.textContent = 'กำลังอัปเดต…'; applyUpdate(remote); });
    var later = doc.createElement('button');
    later.type = 'button';
    later.textContent = '✕';
    later.setAttribute('aria-label', 'ไว้ทีหลัง');
    later.title = 'ไว้ทีหลัง';
    later.style.cssText = 'border:none;background:transparent;color:#fff;font:inherit;font-size:16px;padding:6px 8px;cursor:pointer';
    later.addEventListener('click', function () { dismissedSig = remote; removeBar(); });
    bar.appendChild(txt); bar.appendChild(go); bar.appendChild(later);
    doc.body.insertBefore(bar, doc.body.firstChild);
  }

  function check() {
    lastCheck = Date.now();
    return root.fetch(root.location.pathname + '?_uc=' + Date.now(), { cache: 'no-store' }).then(function (r) {
      return r.ok ? r.text() : '';
    }).then(function (html) {
      var remote = sigFromHtml(html), local = localSig();
      if (shouldShow(local, remote, readTried(), Date.now(), dismissedSig)) showBar(remote);
      else if (remote === local) removeBar();
    }).catch(function () { /* เน็ตหลุด: รอรอบหน้า */ });
  }

  function cleanUrl() {
    try {
      var u = new URL(root.location.href);
      if (!u.searchParams.has('_u')) return;
      u.searchParams.delete('_u');
      root.history.replaceState(root.history.state, '', u.href);
    } catch (e) {}
  }

  /** app.js เรียกตอนเปิดหน้า: กลับเมนูเดิมหลังกดอัปเดต · ใช้ได้ครั้งเดียว */
  api.takeReturnView = function () {
    return safeReturnView(store(function (s) {
      var v = s.getItem(KEY_VIEW);
      s.removeItem(KEY_VIEW);
      return v;
    }));
  };
  api.check = check;
  root.UPDATE_CHECK = api;

  // รอ LIFF ทำงานกับ URL ให้จบก่อน จึงค่อยเก็บ _u และเริ่มเช็ค
  root.setTimeout(function () { cleanUrl(); check(); }, 5000);
  root.setInterval(function () { if (!doc.hidden) check(); }, CHECK_EVERY_MS);
  doc.addEventListener('visibilitychange', function () {
    if (!doc.hidden && Date.now() - lastCheck > REFOCUS_GAP_MS) check();
  });
})(typeof window !== 'undefined' ? window : this);
