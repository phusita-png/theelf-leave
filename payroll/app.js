// ================================================================
// app.js — ระบบเงินเดือน (หน้าเว็บ HR) · บจก.ดิเอลฟ์
// ----------------------------------------------------------------
// คู่กับ payroll/13_WebApp.gs (Apps Script project แยกจากระบบลา)
//
// หลักการที่ยึด:
//   • ทุกปุ่มที่แก้ข้อมูล = 2 จังหวะ  ดูก่อน (dryRun) → กดยืนยัน → ทำจริง (commit)
//   • บังคับลำดับขั้น — ชีตไม่บังคับ กดสลับลำดับได้ = เงินผิดแบบไม่มี error
//   • ขั้นที่ทำทีละคน (สลิป/ส่ง) วนเรียกทีละ batch + progress bar กัน timeout 6 นาที
// ================================================================
'use strict';

var CFG = window.PAYROLL_CONFIG || {};

var S = {
  auth: null,        // {idToken} หรือ {userId} (dev)
  role: '',
  company: '',
  months: [],        // [{month, yearBE, sheetName}]
  cur: null,         // {month, yearBE}
  steps: [],
  rows: [],
  totals: null,
  busy: false,
  tab: 'close',
  repYear: null,
  repYears: [],
  repMonths: [],
};

// ── ขั้นที่ต้องวางข้อมูลก่อน / อ่านอย่างเดียว ──────────────────
var STEP_ACTION = {
  createMonth:       'createMonth',
  importOT:          'importOT',
  importUnpaidLeave: 'importUnpaidLeave',
  calcByDays:        'calcByDays',
  importStudentLoan: 'importStudentLoan',
  audit:             'auditMonth',
  updateYTD:         'updateYTD',
  genPayslips:       'genPayslips',
  sendPayslips:      'sendPayslips',
};
var BATCH_STEPS = { genPayslips: 'BATCH_SLIP', sendPayslips: 'BATCH_SEND' };

// ════════════ INIT ════════════
window.addEventListener('DOMContentLoaded', init);

function init() {
  document.getElementById('monthSel').addEventListener('change', onMonthChange);
  document.getElementById('mask').addEventListener('click', function (e) {
    if (e.target.id === 'mask' && !S.busy) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !S.busy) closeModal();
  });

  if (CFG.MOCK) { S.auth = { userId: 'MOCK' }; bootstrap(); return; }
  if (CFG.DEV_USER_ID) { S.auth = { userId: CFG.DEV_USER_ID }; bootstrap(); return; }
  initLiff();
}

function initLiff() {
  if (!window.liff || !CFG.LIFF_ID || CFG.LIFF_ID.indexOf('PASTE') === 0)
    return fail('ยังไม่ได้ตั้งค่า LIFF_ID ใน config.js', '🔧');

  liff.init({ liffId: CFG.LIFF_ID }).then(function () {
    if (!liff.isLoggedIn()) { liff.login(); return; }
    var tok = liff.getIDToken();
    // idToken อายุ ~1 ชม. · หน้านี้ HR เปิดค้างยาว → ใกล้หมดให้ล็อกอินใหม่ก่อน
    if (!tok || tokenExpMs(tok) < Date.now() + 60000) { reauth(); return; }
    S.auth = { idToken: tok };
    bootstrap();
  }).catch(function (e) { fail('LIFF init ล้มเหลว: ' + e, '🔌'); });
}

function tokenExpMs(t) {
  try {
    var p = JSON.parse(atob(String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return (p.exp || 0) * 1000;
  } catch (e) { return 0; }
}

var _reauthing = false;
function reauth() {
  if (_reauthing || CFG.MOCK || CFG.DEV_USER_ID) return;
  _reauthing = true;
  try {
    var last = +(sessionStorage.getItem('pay_reauth_ts') || 0);
    if (Date.now() - last < 8000)
      return fail('ต่ออายุเซสชันไม่สำเร็จ — ปิดแล้วเปิดหน้านี้ใหม่อีกครั้งค่ะ', '🔑');
    sessionStorage.setItem('pay_reauth_ts', Date.now());
  } catch (e) {}
  toast('เซสชันหมดอายุ · กำลังเข้าสู่ระบบใหม่…');
  setTimeout(function () {
    try { if (liff.isLoggedIn && liff.isLoggedIn()) liff.logout(); } catch (e) {}
    try { liff.login(); } catch (e) { location.reload(); }
  }, 700);
}

// ════════════ API (JSONP — เลี่ยง CORS ของ Apps Script) ════════════
var _seq = 0;
function api(action, params) {
  if (CFG.MOCK) return mockApi(action, params);

  return new Promise(function (resolve, reject) {
    if (!CFG.PAYROLL_API_URL || CFG.PAYROLL_API_URL.indexOf('PASTE') === 0)
      return reject(new Error('ยังไม่ได้ตั้งค่า PAYROLL_API_URL ใน config.js'));

    var cb = '__pay_' + (++_seq) + '_' + Date.now();
    var q  = ['action=' + encodeURIComponent(action), 'callback=' + cb];
    var all = Object.assign({}, S.auth || {}, params || {});
    Object.keys(all).forEach(function (k) {
      if (all[k] == null) return;
      var v = all[k];
      if (typeof v === 'object') v = JSON.stringify(v);
      q.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });

    var sc = document.createElement('script'), done = false;
    // สร้างสลิปเว้น 5 วิ/คน → batch 5 คน ≈ 30 วิ · เผื่อไว้ 5 นาที
    var timer = setTimeout(function () {
      if (done) return; done = true; clean();
      reject(new Error('หมดเวลาเชื่อมต่อ — ลองใหม่อีกครั้ง (ข้อมูลที่ทำไปแล้วไม่หาย)'));
    }, 300000);

    window[cb] = function (d) {
      if (done) return; done = true;
      clearTimeout(timer); clean();
      if (d && d.ok === false && isAuthErr(d.error)) reauth();
      resolve(d);
    };
    function clean() { delete window[cb]; if (sc.parentNode) sc.parentNode.removeChild(sc); }
    sc.onerror = function () {
      if (done) return; done = true;
      clearTimeout(timer); clean();
      reject(new Error('เชื่อมต่อ API ไม่ได้'));
    };
    sc.src = CFG.PAYROLL_API_URL + '?' + q.join('&');
    document.body.appendChild(sc);
  });
}

function isAuthErr(m) {
  m = String(m || '').toLowerCase();
  return m.indexOf('idtoken') >= 0 || m.indexOf('id token') >= 0 ||
         m.indexOf('expired') >= 0 || m.indexOf('หมดอายุ') >= 0;
}

// ════════════ BOOTSTRAP ════════════
function bootstrap() {
  setLoaderText('กำลังตรวจสอบสิทธิ์…');
  api('payrollBootstrap', {}).then(function (r) {
    if (!r.ok) {
      if (r.forbidden)
        return fail('หน้านี้เปิดได้เฉพาะผู้ดูแลเงินเดือน (ADMIN / OWNER) เท่านั้นค่ะ\n\n' +
                    'ถ้าคิดว่าควรมีสิทธิ์ ให้ผู้ดูแลระบบตั้ง Role ให้ในชีต LineUsers ของระบบลา', '🔒');
      return fail(r.error || 'โหลดข้อมูลไม่สำเร็จ', '😿');
    }

    S.role    = r.role;
    S.company = r.company || 'บจก.ดิเอลฟ์';
    S.months  = r.months || [];

    document.getElementById('hdCompany').textContent = S.company;
    document.getElementById('roleBadge').textContent = r.role === 'OWNER' ? '👑 เจ้าของ' : '🛡️ ผู้ดูแล';

    // เดือนที่จะเปิดตอนแรก = เดือนปัจจุบันใน "ตั้งค่าระบบ" ถ้ามีชีต ไม่งั้นเอาเดือนล่าสุด
    var cur = r.current || {};
    var has = S.months.some(function (m) { return m.month === cur.month && m.yearBE === cur.yearBE; });
    S.cur = has ? { month: cur.month, yearBE: cur.yearBE }
                : (S.months[0] ? { month: S.months[0].month, yearBE: S.months[0].yearBE } : cur);

    // เดือนถัดไปที่ยังไม่มีชีต — ให้เลือกได้เพื่อกด "สร้างทะเบียนเดือนใหม่"
    buildMonthOptions();

    document.getElementById('loader').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    loadMonth();
  }).catch(function (e) { fail(String(e && e.message || e), '🔌'); });
}

function buildMonthOptions() {
  var sel = document.getElementById('monthSel');
  var opts = S.months.slice();

  // เพิ่ม "เดือนถัดไป" ที่ยังไม่มีชีต (ต้องเลือกได้ ไม่งั้นสร้างเดือนใหม่ไม่ได้)
  if (opts.length) {
    var nm = opts[0].month + 1, ny = opts[0].yearBE;
    if (nm > 12) { nm = 1; ny++; }
    opts.unshift({ month: nm, yearBE: ny, isNew: true });
  }

  sel.innerHTML = opts.map(function (m) {
    var v = m.month + '-' + m.yearBE;
    var label = pad2(m.month) + '/' + m.yearBE + (m.isNew ? ' (ยังไม่สร้าง)' : '');
    return '<option value="' + v + '">' + label + '</option>';
  }).join('');

  if (S.cur) sel.value = S.cur.month + '-' + S.cur.yearBE;
}

function onMonthChange() {
  var v = document.getElementById('monthSel').value.split('-');
  S.cur = { month: parseInt(v[0], 10), yearBE: parseInt(v[1], 10) };
  loadMonth();
}

// ════════════ โหลดข้อมูลเดือนที่เลือก ════════════
function loadMonth() {
  if (!S.cur) return;
  document.getElementById('stepList').innerHTML = skeleton(9);
  document.getElementById('tableWrap').innerHTML = '<div class="empty">กำลังโหลด…</div>';

  var p = { month: S.cur.month, yearBE: S.cur.yearBE };
  Promise.all([api('stepStatus', p), api('registerRows', p)]).then(function (res) {
    var st = res[0], rows = res[1];
    if (!st.ok)   return toast(st.error || 'โหลดสถานะไม่สำเร็จ');
    if (!rows.ok) return toast(rows.error || 'โหลดตารางไม่สำเร็จ');

    S.steps  = st.steps || [];
    S.next   = st.next;
    S.rows   = rows.rows || [];
    S.totals = rows.totals || null;

    renderSteps(st);
    renderTable(rows);
  }).catch(function (e) { toast(String(e && e.message || e)); });
}

function skeleton(n) {
  var out = '';
  for (var i = 0; i < n; i++)
    out += '<div class="step"><div class="step-num">' + (i + 1) + '</div>' +
           '<div class="step-main"><div class="step-label muted">กำลังโหลด…</div></div></div>';
  return out;
}

// ════════════ วาดรายการ 9 ขั้น ════════════
function renderSteps(st) {
  var done = S.steps.filter(function (s) { return s.done; }).length;
  document.getElementById('stepsSub').textContent = done + '/9 ขั้น';

  document.getElementById('stepList').innerHTML = S.steps.map(function (s, i) {
    var cls = 'step';
    if (s.state === 'done')   cls += ' is-done';
    if (s.state === 'warn')   cls += ' is-warn';
    if (s.state === 'locked') cls += ' is-locked';
    if (s.key === st.next && s.state !== 'done') cls += ' is-next';

    var chip = '';
    if (s.state === 'done')
      chip = '<span class="step-chip chip-done">' + (s.confirmed ? 'ทำแล้ว' : 'มีข้อมูลแล้ว') + '</span>';
    else if (s.state === 'warn')
      chip = '<span class="step-chip chip-warn">ยังไม่ทำขั้นก่อนหน้า</span>';
    else if (s.state === 'locked')
      chip = '<span class="step-chip chip-lock">ยังกดไม่ได้</span>';

    var detail = s.detail || '';
    if (s.doneAt) detail = (detail ? detail + ' · ' : '') + s.doneAt;
    if (s.state === 'locked' && s.blockedBy) detail = 'ต้องทำ "' + labelOf(s.blockedBy) + '" ก่อน';

    var dis = s.state === 'locked' ? ' disabled' : '';
    var btn;

    if (s.state === 'done') {
      // ทำไปแล้ว → ปุ่มบอก "เสร็จสิ้น" · ชี้เมาส์ค่อยเผยว่ากดแล้วทำอะไรได้
      //   (เดิมเขียน "ทำซ้ำ" — ฟังเหมือนต้องทำงานเดิมซ้ำโดยไม่จำเป็น)
      var hoverLabel = s.key === 'audit' ? 'ตรวจใหม่' : 'แก้ไข';
      btn = '<button class="step-btn ghost swap"' + dis +
              ' title="' + hoverLabel + '" onclick="startStep(\'' + s.key + '\')">' +
              '<span class="lbl-idle">เสร็จสิ้น</span>' +
              '<span class="lbl-hover">' + hoverLabel + '</span>' +
            '</button>';
    } else {
      btn = '<button class="step-btn"' + dis +
              ' onclick="startStep(\'' + s.key + '\')">' +
              (s.key === 'audit' ? 'ตรวจ' : 'ดำเนินการ') +
            '</button>';
    }

    return '<div class="' + cls + '">' +
             '<div class="step-num">' + (s.state === 'done' ? '✓' : (i + 1)) + '</div>' +
             '<div class="step-main">' +
               '<div class="step-label">' + esc(s.label) + chip + '</div>' +
               (detail ? '<div class="step-detail">' + esc(detail) + '</div>' : '') +
             '</div>' +
             btn +
           '</div>';
  }).join('');
}

function labelOf(key) {
  var s = S.steps.filter(function (x) { return x.key === key; })[0];
  return s ? s.label.replace(/^\S+\s/, '') : key;
}

// ════════════ วาดตารางทะเบียน ════════════
function renderTable(r) {
  var wrap = document.getElementById('tableWrap');
  var sub  = document.getElementById('tableSub');

  if (!r.exists) {
    sub.textContent = '';
    wrap.innerHTML = '<div class="empty"><span class="big">📋</span>' +
      'ยังไม่มีทะเบียนเดือน ' + pad2(S.cur.month) + '/' + S.cur.yearBE + '<br>' +
      'กด “สร้างทะเบียนเดือนใหม่” ทางซ้ายเพื่อเริ่มค่ะ</div>';
    return;
  }

  sub.textContent = r.sheetName + ' · ' + r.count + ' คน';

  var head = ['ลำดับ', 'ชื่อ-สกุล', 'เงินเดือน', 'OT', 'รวมรายรับ', 'ปกส.', 'ภาษี', 'กยศ.', 'รวมหัก', 'สุทธิ', 'สลิป'];
  var body = S.rows.map(function (x) {
    return '<tr>' +
      '<td class="l muted">' + x.seq + '</td>' +
      '<td class="l">' + esc(x.name) + (x.unpaidLeave > 0
        ? ' <span class="pill wait">ลา ' + num(x.unpaidLeave) + ' วัน</span>' : '') + '</td>' +
      '<td>' + money(x.salary) + '</td>' +
      '<td>' + (x.ot ? money(x.ot) : '<span class="muted">—</span>') + '</td>' +
      '<td>' + money(x.incomeTotal) + '</td>' +
      '<td>' + money(x.sso) + '</td>' +
      '<td>' + money(x.tax) + '</td>' +
      '<td>' + (x.studentLoan ? money(x.studentLoan) : '<span class="muted">—</span>') + '</td>' +
      '<td class="neg">' + money(x.deductTotal) + '</td>' +
      '<td><b>' + money(x.net) + '</b></td>' +
      '<td class="l">' + slipCell(x) + '</td>' +
    '</tr>';
  }).join('');

  var t = r.totals || {};
  wrap.innerHTML =
    '<table class="reg"><thead><tr>' +
      head.map(function (h, i) { return '<th class="' + (i < 2 || i === 10 ? 'l' : '') + '">' + h + '</th>'; }).join('') +
    '</tr></thead><tbody>' + body + '</tbody>' +
    '<tfoot><tr>' +
      '<td class="l" colspan="2">รวม ' + r.count + ' คน</td>' +
      '<td colspan="2"></td>' +
      '<td>' + money(t.income) + '</td>' +
      '<td>' + money(t.sso) + '</td>' +
      '<td>' + money(t.tax) + '</td>' +
      '<td></td>' +
      '<td class="neg">' + money(t.deduct) + '</td>' +
      '<td>' + money(t.net) + '</td>' +
      '<td></td>' +
    '</tr></tfoot></table>';
}

function slipCell(x) {
  var em = String(x.emailStatus || '');
  if (em.indexOf('ส่งแล้ว') >= 0)  return '<span class="pill ok">ส่งแล้ว</span>';
  if (em.indexOf('สร้างแล้ว') >= 0) {
    return x.slipLink
      ? '<a class="pill wait" href="' + esc(x.slipLink) + '" target="_blank" rel="noopener">ดูสลิป</a>'
      : '<span class="pill wait">สร้างแล้ว</span>';
  }
  if (em.indexOf('Error') >= 0 || em.indexOf('❌') >= 0)
    return '<span class="pill" style="background:#fdeced;color:#a30d14">มีปัญหา</span>';
  if (em.indexOf('ข้าม') >= 0) return '<span class="pill muted">ข้าม</span>';
  return '<span class="pill">รอ</span>';
}

// ════════════ กดปุ่มขั้นตอน ════════════
// ทุกขั้น = ดูก่อน (dryRun) → ยืนยัน → ทำจริง (commit)
function startStep(key) {
  if (S.busy) return;
  var step = S.steps.filter(function (s) { return s.key === key; })[0];
  if (!step) return;

  if (key === 'audit')             return runAudit();
  if (key === 'importStudentLoan') return askStudentLoanData();

  preview(key, step);
}

function preview(key, step, extraParams) {
  var action = STEP_ACTION[key];
  openModal(step.label, 'กำลังตรวจว่าจะเกิดอะไรขึ้น…', '<div class="empty">กำลังคำนวณ…</div>', '');

  var p = Object.assign({ month: S.cur.month, yearBE: S.cur.yearBE }, extraParams || {});
  api(action, p).then(function (r) {
    if (!r.ok) return showError(step.label, r.error);

    var warn = '';
    if (step.state === 'warn' && step.blockedBy)
      warn = '<div class="finding yell">⚠️ ยังไม่ได้ทำขั้น “' + esc(labelOf(step.blockedBy)) +
             '” — ถ้าทำในชีตมาแล้วก็กดต่อได้ แต่ถ้ายังไม่ได้ทำจริง ตัวเลขจะไม่ครบ</div>';

    var nothing = isNoop(key, r);
    setModal(
      step.label,
      'ตรวจสอบก่อน — ยังไม่มีอะไรถูกแก้',
      warn + '<pre class="report">' + esc(r.report || r.summary || '(ไม่มีรายละเอียด)') + '</pre>',
      btn('ปิด', 'btn-ghost', 'closeModal()') +
      (nothing ? '' : btn('ยืนยัน ทำเลย', 'btn-primary', 'commitStep(\'' + key + '\')'))
    );
    S._pendingExtra = extraParams || null;
  }).catch(function (e) { showError(step.label, String(e && e.message || e)); });
}

// บางขั้นคำนวณแล้วพบว่า "ไม่มีอะไรต้องทำ" → ไม่ต้องโชว์ปุ่มยืนยันให้สับสน
function isNoop(key, r) {
  if (key === 'importOT')          return r.written === 0;
  if (key === 'importUnpaidLeave') return r.writes === 0;
  if (key === 'importStudentLoan') return r.plan && r.plan.writes === 0;
  if (key === 'genPayslips')       return r.pending === 0;
  if (key === 'sendPayslips')      return r.pending === 0;
  return false;
}

function commitStep(key) {
  var step = S.steps.filter(function (s) { return s.key === key; })[0];
  var extra = S._pendingExtra;

  if (BATCH_STEPS[key]) return runBatch(key, step, extra);

  S.busy = true;
  setModal(step.label, 'กำลังดำเนินการ…', '<div class="empty">กำลังบันทึก… อย่าปิดหน้านี้นะคะ</div>', '');

  var p = Object.assign({ month: S.cur.month, yearBE: S.cur.yearBE, mode: 'commit' }, extra || {});
  api(STEP_ACTION[key], p).then(function (r) {
    S.busy = false;
    if (!r.ok) return showError(step.label, r.error);
    setModal(step.label, '✅ เสร็จแล้ว',
      '<pre class="report">' + esc(r.report || r.summary) + '</pre>',
      btn('เสร็จสิ้น', 'btn-primary', 'closeModal(); loadMonth();'));
  }).catch(function (e) {
    S.busy = false;
    showError(step.label, String(e && e.message || e));
  });
}

// ── ขั้นที่ทำทีละคน: วนเรียกทีละ batch จนกว่า done ────────────
function runBatch(key, step, extra) {
  S.busy = true;
  var limit = CFG[BATCH_STEPS[key]] || 5;
  var total = 0, doneCount = 0, rounds = 0;
  var problems = [];

  setModal(step.label, 'กำลังดำเนินการ — อย่าปิดหน้านี้',
    '<div id="batchNote" class="paste-help">กำลังเริ่ม…</div>' +
    '<div class="prog"><div class="prog-bar"><i id="progBar" style="width:0%"></i></div>' +
    '<div class="prog-text" id="progText">เตรียมข้อมูล…</div></div>', '');

  function tick() {
    var p = { month: S.cur.month, yearBE: S.cur.yearBE, mode: 'commit', limit: limit };
    if (extra) Object.assign(p, extra);

    api(STEP_ACTION[key], p).then(function (r) {
      if (!r.ok) { S.busy = false; return showError(step.label, r.error); }

      rounds++;
      if (!total) total = (r.pending || 0);
      doneCount = total - (r.remaining || 0);

      (r.results || []).forEach(function (x) {
        if (key === 'genPayslips' && !x.ok) problems.push(x.name + ' — ' + x.error);
        if (key === 'sendPayslips') {
          if (x.email && !x.email.ok) problems.push(x.name + ' — Email: ' + x.email.error);
          if (x.line  && !x.line.ok)  problems.push(x.name + ' — LINE: ' + x.line.error);
        }
      });

      var pct = total ? Math.round(doneCount / total * 100) : 100;
      var bar = document.getElementById('progBar');
      var txt = document.getElementById('progText');
      if (bar) bar.style.width = pct + '%';
      if (txt) txt.textContent = 'ทำไปแล้ว ' + doneCount + '/' + total + ' คน';

      if (!r.done) { tick(); return; }   // ยังไม่ครบ → รอบถัดไป

      S.busy = false;
      var body = '<pre class="report">' + esc(r.report || r.summary) + '</pre>';
      if (problems.length)
        body += '<div style="margin-top:14px"><b>⚠️ ต้องตามแก้ ' + problems.length + ' รายการ</b>' +
                problems.map(function (t) { return '<div class="finding yell">' + esc(t) + '</div>'; }).join('') +
                '</div>';
      setModal(step.label, '✅ เสร็จแล้ว (' + rounds + ' รอบ)', body,
        btn('เสร็จสิ้น', 'btn-primary', 'closeModal(); loadMonth();'));
    }).catch(function (e) {
      S.busy = false;
      showError(step.label, String(e && e.message || e) +
        '\n\nข้อมูลที่ทำไปแล้วไม่หาย — กดขั้นนี้ใหม่จะทำต่อจากคนที่ค้างอยู่ค่ะ');
    });
  }
  tick();
}

// ════════════ ❻ ด่านตรวจ 13 ข้อ (อ่านอย่างเดียว) ════════════
function runAudit() {
  openModal('🔍 ตรวจทะเบียน 13 ข้อ', 'อ่านอย่างเดียว — ไม่แก้ข้อมูลใดๆ',
    '<div class="empty">กำลังตรวจ…</div>', '');

  api('auditMonth', { month: S.cur.month, yearBE: S.cur.yearBE }).then(function (r) {
    if (!r.ok) return showError('ตรวจทะเบียน', r.error);

    var head =
      '<div class="audit-sum">' +
        '<div class="audit-box ' + (r.red.length ? 'red' : 'green') + '">' +
          '<div class="n">' + r.red.length + '</div><div class="t">🔴 ต้องแก้ก่อนจ่าย</div></div>' +
        '<div class="audit-box ' + (r.yellow.length ? 'yell' : 'green') + '">' +
          '<div class="n">' + r.yellow.length + '</div><div class="t">🟡 ควรตรวจดู</div></div>' +
        '<div class="audit-box green"><div class="n">' + r.rows + '</div><div class="t">คนในทะเบียน</div></div>' +
      '</div>';

    var body = head;
    if (r.passed && !r.yellow.length) {
      body += '<div class="finding" style="border-color:#1e8e3e;background:#e6f4ea">' +
              '✅ ผ่านทุกข้อ — ไม่พบความผิดปกติ พร้อมทำขั้นต่อไปค่ะ</div>';
    } else {
      if (r.red.length)
        body += '<div style="margin-bottom:6px"><b>🔴 ต้องแก้ก่อนจ่าย</b></div>' +
                r.red.map(function (t) { return '<div class="finding red">' + esc(t) + '</div>'; }).join('');
      if (r.yellow.length)
        body += '<div style="margin:14px 0 6px"><b>🟡 ควรตรวจดู</b></div>' +
                r.yellow.map(function (t) { return '<div class="finding yell">' + esc(t) + '</div>'; }).join('');
      body += '<div class="paste-help" style="margin-top:14px">' +
              '📌 แก้ที่ Google Sheet แล้วกด “ตรวจ” ใหม่อีกครั้งค่ะ</div>';
    }

    setModal('🔍 ตรวจทะเบียน ' + r.sheetName, 'รอบ ' + r.periodText, body,
      btn('ปิด', 'btn-ghost', 'closeModal()') +
      btn('ตรวจใหม่', 'btn-primary', 'runAudit()'));

    // ผลตรวจนับเป็น "ทำขั้นนี้แล้ว" ต่อเมื่อผ่าน — ไม่งั้นอย่าปลดล็อกขั้นถัดไป
    if (r.passed) loadMonthQuiet();
  }).catch(function (e) { showError('ตรวจทะเบียน', String(e && e.message || e)); });
}

function loadMonthQuiet() {
  api('stepStatus', { month: S.cur.month, yearBE: S.cur.yearBE }).then(function (st) {
    if (st.ok) { S.steps = st.steps; S.next = st.next; renderSteps(st); }
  }).catch(function () {});
}

// ════════════ ❺ กยศ. — วางตารางจากไฟล์ ════════════
function askStudentLoanData() {
  var step = S.steps.filter(function (s) { return s.key === 'importStudentLoan'; })[0];
  openModal(step.label, 'วางตารางจากไฟล์ที่ กยศ. ส่งมา',
    '<div class="paste-help">' +
      'เปิดไฟล์ที่ กยศ. ส่งมา → เลือกทั้งตาราง (รวมหัวคอลัมน์) → Ctrl+C → คลิกในช่องข้างล่าง → Ctrl+V<br>' +
      'หัวคอลัมน์ต่างจากตัวอย่างก็ได้ ระบบจะหา <b>เลขบัตร</b> / <b>ชื่อ</b> / <b>จำนวนเงิน</b> ให้เอง' +
    '</div>' +
    '<textarea id="slPaste" class="paste" placeholder="เลขประจำตัวประชาชน\tชื่อ-สกุล\tจำนวนเงิน&#10;1100100100101\tสมชาย ใจดี\t1500"></textarea>',
    btn('ยกเลิก', 'btn-ghost', 'closeModal()') +
    btn('ตรวจสอบข้อมูล', 'btn-primary', 'submitStudentLoan()'));
  setTimeout(function () { var t = document.getElementById('slPaste'); if (t) t.focus(); }, 60);
}

function submitStudentLoan() {
  var raw = (document.getElementById('slPaste') || {}).value || '';
  if (!raw.trim()) return toast('ยังไม่ได้วางข้อมูลค่ะ');

  var rows = parsePasted(raw);
  if (rows.length < 1) return toast('อ่านตารางไม่ได้ — ลอง copy จากไฟล์ใหม่อีกครั้ง');

  var step = S.steps.filter(function (s) { return s.key === 'importStudentLoan'; })[0];
  preview('importStudentLoan', step, { rows: JSON.stringify(rows) });
}

/**
 * แปลงข้อความที่ paste → array 2 มิติ
 * รองรับ Tab (copy จาก Excel/Sheets — เจอบ่อยสุด) และ CSV
 * ⚠️ CSV ต้องเคารพเครื่องหมายคำพูด — ยอดเงิน "2,000" มี comma อยู่ข้างใน
 *    ถ้าตัดด้วย comma ดื้อๆ จะกลายเป็น 2 ช่อง = ยอดหักเพี้ยนโดยไม่มีใครรู้
 */
function parsePasted(text) {
  var lines = String(text).replace(/\r/g, '').split('\n').filter(function (l) { return l.trim() !== ''; });
  if (!lines.length) return [];
  var useTab = lines[0].indexOf('\t') >= 0;
  return lines.map(function (line) {
    return (useTab ? line.split('\t') : splitCsv(line)).map(cellValue);
  });
}

/** ตัดบรรทัด CSV โดยไม่ตัด comma ที่อยู่ในเครื่องหมายคำพูด */
function splitCsv(line) {
  var out = [], cur = '', inQ = false;
  for (var i = 0; i < line.length; i++) {
    var c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }   // "" = คำพูดจริง 1 ตัว
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

/** '1,500.00' → 1500 · แต่เลขบัตร 13 หลักต้องคงเป็น text ไม่งั้นเสียหลัก/ตัดเลข 0 หน้า */
function cellValue(cell) {
  var v = String(cell == null ? '' : cell).trim().replace(/^"|"$/g, '').trim();
  var noComma = v.replace(/,/g, '');
  if (/^\d{13}$/.test(noComma)) return v;                     // เลขบัตร → คงเป็นข้อความ
  if (/^-?\d+(\.\d+)?$/.test(noComma) && noComma.replace(/[-.]/g, '').length < 13)
    return parseFloat(noComma);
  return v;
}

// ════════════ แท็บ ════════════
function goTab(tab) {
  S.tab = tab;
  var isReports = tab === 'reports';
  document.getElementById('viewClose').classList.toggle('hidden', isReports);
  document.getElementById('viewReports').classList.toggle('hidden', !isReports);
  document.getElementById('tabClose').classList.toggle('is-on', !isReports);
  document.getElementById('tabReports').classList.toggle('is-on', isReports);
  // เลือกเดือนใช้เฉพาะหน้าปิดเดือน — หน้ารายงานเลือกเป็น "ปี" แทน
  document.getElementById('monthSel').classList.toggle('hidden', isReports);
  if (isReports) loadReports();
}

// ════════════ รายงานย้อนหลัง ════════════
function loadReports() {
  var year = S.repYear || (S.cur && S.cur.yearBE) || new Date().getFullYear() + 543;
  document.getElementById('yearWrap').innerHTML  = '<div class="empty">กำลังโหลด…</div>';
  document.getElementById('filesWrap').innerHTML = '<div class="empty">กำลังโหลด…</div>';

  Promise.all([api('yearSummary', { yearBE: year }), api('reportFiles', { yearBE: year })])
    .then(function (res) {
      var sum = res[0], files = res[1];
      if (!sum.ok) return toast(sum.error || 'โหลดรายงานไม่สำเร็จ');

      S.repYear   = sum.yearBE;
      S.repYears  = sum.years || [];
      S.repMonths = sum.months || [];
      buildYearOptions();
      renderYearTable(sum);
      if (files.ok) renderFiles(files);
      else document.getElementById('filesWrap').innerHTML = '<div class="empty">โหลดรายการไฟล์ไม่สำเร็จ</div>';
    })
    .catch(function (e) { toast(String(e && e.message || e)); });
}

function buildYearOptions() {
  var sel = document.getElementById('yearSel');
  var years = (S.repYears || []).slice();
  if (years.indexOf(S.repYear) < 0) years.unshift(S.repYear);
  sel.innerHTML = years.map(function (y) {
    return '<option value="' + y + '">ปี ' + y + '</option>';
  }).join('');
  sel.value = S.repYear;
  sel.onchange = function () { S.repYear = parseInt(sel.value, 10); loadReports(); };
}

function renderYearTable(r) {
  document.getElementById('yearSub').textContent =
    r.months.length ? r.months.length + ' เดือน' : '';

  var wrap = document.getElementById('yearWrap');
  if (!r.months.length) {
    wrap.innerHTML = '<div class="empty"><span class="big">📅</span>ยังไม่มีทะเบียนของปี ' + r.yearBE + '</div>';
    return;
  }

  var body = r.months.map(function (m, i) {
    var st = m.status === 'จ่ายแล้ว' ? 'paid' : (m.status === 'ส่งบางส่วน' ? 'partial' : 'none');
    return '<tr>' +
      '<td class="l muted">' + (i + 1) + '</td>' +
      '<td class="l"><button class="linklike" onclick="openMonth(' + m.month + ',' + m.yearBE + ')">' +
        pad2(m.month) + '/' + m.yearBE + '</button></td>' +
      '<td class="l">' + esc(m.from) + '</td>' +
      '<td class="l">' + esc(m.to) + '</td>' +
      // วันที่จ่ายคลิกแก้ได้ในตัว — ไม่ต้องมีปุ่มไอคอนแยกให้เดาความหมาย
      '<td class="l">' +
        '<button class="date-btn' + (m.payDate ? '' : ' empty') + '" title="คลิกเพื่อแก้วันที่จ่าย"' +
          ' onclick="askPayDate(' + m.month + ',' + m.yearBE + ')">' +
          (m.payDate ? esc(m.payDate) : '+ ระบุวันที่จ่าย') +
        '</button>' +
      '</td>' +
      '<td><b>' + money(m.net) + '</b></td>' +
      '<td>' + money(m.tax) + '</td>' +
      '<td>' + money(m.sso) + '</td>' +
      '<td>' + m.emp + '</td>' +
      '<td class="l">' +
        '<button class="icon-btn" onclick="runExportRegister(' + m.month + ',' + m.yearBE + ')">' +
          'ส่งออกไฟล์ Excel</button>' +
      '</td>' +
      '<td class="l"><span class="st ' + st + '">' + esc(m.status) + '</span></td>' +
    '</tr>';
  }).join('');

  var t = r.totals || {};
  wrap.innerHTML =
    '<table class="reg"><thead><tr>' +
      '<th class="l">ลำดับ</th><th class="l">เดือน</th><th class="l">ตั้งแต่</th><th class="l">ถึงวันที่</th>' +
      '<th class="l">วันที่จ่าย</th><th>จ่ายสุทธิ</th><th>ภาษี</th><th>ปกส.</th><th>พนักงาน</th>' +
      '<th class="l">จัดการ</th><th class="l">สถานะ</th>' +
    '</tr></thead><tbody>' + body + '</tbody>' +
    '<tfoot><tr>' +
      '<td class="l" colspan="5">รวมทั้งปี ' + r.yearBE + '</td>' +
      '<td>' + money(t.net) + '</td>' +
      '<td>' + money(t.tax) + '</td>' +
      '<td>' + money(t.sso) + '</td>' +
      '<td colspan="3"></td>' +
    '</tr></tfoot></table>';
}

function renderFiles(r) {
  document.getElementById('filesSub').textContent = r.count ? r.count + ' ไฟล์' : '';
  var wrap = document.getElementById('filesWrap');

  if (!r.count) {
    wrap.innerHTML = '<div class="empty"><span class="big">📁</span>' +
      'ยังไม่เคยออกไฟล์รายงานของปีนี้<br>' +
      'กดปุ่ม 📦 ในตารางข้างบนเพื่อออกทะเบียนจ่ายรายเดือน</div>';
    return;
  }

  wrap.innerHTML =
    '<table class="reg"><thead><tr>' +
      '<th class="l">วันที่ออก</th><th class="l">ประเภท</th><th class="l">เดือน</th>' +
      '<th class="l">ชื่อไฟล์</th><th class="l">ผู้ออก</th><th class="l"></th>' +
    '</tr></thead><tbody>' +
    r.files.map(function (f) {
      return '<tr>' +
        '<td class="l">' + esc(f.at) + '</td>' +
        '<td class="l">' + esc(f.type) + '</td>' +
        '<td class="l">' + (f.month ? pad2(f.month) + '/' + f.yearBE : 'ทั้งปี ' + (f.yearBE || '')) + '</td>' +
        '<td class="l">' + esc(f.name) + '</td>' +
        '<td class="l muted">' + esc(f.by) + '</td>' +
        '<td class="l">' + (f.url
          ? '<a class="pill ok" href="' + esc(f.url) + '" target="_blank" rel="noopener">เปิดไฟล์</a>'
          : '<span class="muted">—</span>') + '</td>' +
      '</tr>';
    }).join('') +
    '</tbody></table>';
}

/** คลิกเดือนในตารางรายงาน → สลับไปหน้าปิดเดือนของเดือนนั้น */
function openMonth(month, yearBE) {
  S.cur = { month: month, yearBE: yearBE };
  var sel = document.getElementById('monthSel');
  var v = month + '-' + yearBE;
  if (!Array.prototype.some.call(sel.options, function (o) { return o.value === v; })) {
    var op = document.createElement('option');
    op.value = v; op.textContent = pad2(month) + '/' + yearBE;
    sel.appendChild(op);
  }
  sel.value = v;
  goTab('close');
  loadMonth();
}

// ── 📅 ตั้งวันที่จ่ายจริง ────────────────────────────────────
function askPayDate(month, yearBE) {
  var cur = (S.repMonths || []).filter(function (m) { return m.month === month; })[0];
  openModal('📅 วันที่จ่ายจริง — ' + pad2(month) + '/' + yearBE,
    'ระบบคำนวณเองไม่ได้ (แต่ละเดือนโอนไม่ตรงกัน)',
    '<div class="paste-help">ใส่วันที่ที่โอนเงินให้พนักงานจริง — ใช้อ้างอิงตอนตรวจสอบย้อนหลัง<br>' +
    'เว้นว่างแล้วกดบันทึก = ล้างค่า</div>' +
    '<input type="date" id="payDateInput" class="sel" style="font-size:15px;padding:9px 12px"' +
      (cur && cur.payDateISO ? ' value="' + esc(cur.payDateISO) + '"' : '') + '>' +
    // ⚠️ ช่องเลือกวันที่ของเบราว์เซอร์เป็น ค.ศ. แต่ทั้งระบบแสดง พ.ศ. → โชว์ผลแปลงให้เห็นทันที
    '<div class="paste-help" id="payDatePreview" style="margin:10px 0 0"></div>',
    btn('ยกเลิก', 'btn-ghost', 'closeModal()') +
    btn('บันทึก', 'btn-primary', 'submitPayDate(' + month + ',' + yearBE + ')'));

  setTimeout(function () {
    var el = document.getElementById('payDateInput');
    if (!el) return;
    el.focus();
    el.addEventListener('input', paintPayDatePreview);
    paintPayDatePreview();
  }, 60);
}

/** แปลง ค.ศ. ในช่อง input → พ.ศ. ให้ HR เห็นว่ากำลังจะบันทึกวันไหน */
function paintPayDatePreview() {
  var el = document.getElementById('payDateInput');
  var out = document.getElementById('payDatePreview');
  if (!el || !out) return;
  var m = String(el.value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  out.innerHTML = m
    ? 'จะบันทึกเป็น <b>' + m[3] + '/' + m[2] + '/' + (parseInt(m[1], 10) + 543) + '</b> (พ.ศ.)'
    : '<span class="muted">ยังไม่ได้เลือกวันที่ — กดบันทึกตอนนี้ = ล้างค่าเดิม</span>';
}

function submitPayDate(month, yearBE) {
  var v = (document.getElementById('payDateInput') || {}).value || '';
  S.busy = true;
  api('setPayDate', { month: month, yearBE: yearBE, payDate: v, mode: 'commit' })
    .then(function (r) {
      S.busy = false;
      if (!r.ok) return showError('ตั้งวันที่จ่าย', r.error);
      closeModal();
      toast(r.summary || 'บันทึกแล้ว');
      loadReports();
    })
    .catch(function (e) { S.busy = false; showError('ตั้งวันที่จ่าย', String(e && e.message || e)); });
}

// ── 📦 ออกไฟล์ Excel ทะเบียนจ่ายรายเดือน ────────────────────
function runExportRegister(month, yearBE) {
  exportFlow('📦 ส่งออกทะเบียนจ่าย ' + pad2(month) + '/' + yearBE,
    'exportRegister', { month: month, yearBE: yearBE });
}

// ── 📊 ออก ภ.ง.ด.1ก รายปี ───────────────────────────────────
function runExportPND1K() {
  exportFlow('📊 ภ.ง.ด.1ก ปี ' + S.repYear, 'exportPND1K', { yearBE: S.repYear });
}

/** ออกไฟล์รายงาน: ดูก่อน → ยืนยัน → สร้างจริง → จดลงทะเบียนไฟล์ */
function exportFlow(title, action, params) {
  openModal(title, 'กำลังตรวจสอบ…', '<div class="empty">กำลังเตรียม…</div>', '');

  api(action, params).then(function (r) {
    if (!r.ok) return showError(title, r.error);
    setModal(title, 'ตรวจสอบก่อน — ยังไม่ได้สร้างไฟล์',
      '<pre class="report">' + esc(r.report || r.summary) + '</pre>',
      btn('ปิด', 'btn-ghost', 'closeModal()') +
      btn('สร้างไฟล์', 'btn-primary',
          'doExport(\'' + esc(title) + '\',\'' + action + '\',' + JSON.stringify(params).replace(/"/g, '&quot;') + ')'));
  }).catch(function (e) { showError(title, String(e && e.message || e)); });
}

function doExport(title, action, params) {
  S.busy = true;
  setModal(title, 'กำลังสร้างไฟล์…', '<div class="empty">กำลังสร้าง… อย่าปิดหน้านี้นะคะ</div>', '');

  var p = Object.assign({ mode: 'commit' }, params);
  api(action, p).then(function (r) {
    S.busy = false;
    if (!r.ok) return showError(title, r.error);
    setModal(title, '✅ สร้างไฟล์แล้ว',
      '<pre class="report">' + esc(r.report || r.summary) + '</pre>' +
      (r.xlsxUrl ? '<div style="margin-top:13px"><a class="btn btn-primary" style="text-decoration:none;display:inline-block"' +
                   ' href="' + esc(r.xlsxUrl) + '" target="_blank" rel="noopener">📊 เปิดไฟล์ Excel</a></div>' : ''),
      btn('เสร็จสิ้น', 'btn-primary', 'closeModal(); loadReports();'));
  }).catch(function (e) { S.busy = false; showError(title, String(e && e.message || e)); });
}

// ════════════ MODAL ════════════
function openModal(title, sub, body, foot) {
  document.getElementById('mTitle').textContent = title;
  document.getElementById('mSub').textContent   = sub || '';
  document.getElementById('mBody').innerHTML    = body || '';
  document.getElementById('mFoot').innerHTML    = foot || '';
  document.getElementById('mask').classList.remove('hidden');
}
var setModal = openModal;

function closeModal() {
  if (S.busy) return;
  document.getElementById('mask').classList.add('hidden');
  S._pendingExtra = null;
}

function showError(title, msg) {
  S.busy = false;
  setModal(title, 'ทำรายการไม่สำเร็จ',
    '<pre class="report">' + esc(msg || 'ไม่ทราบสาเหตุ') + '</pre>',
    btn('ปิด', 'btn-ghost', 'closeModal()'));
}

function btn(label, cls, onclick) {
  return '<button class="btn ' + cls + '" onclick="' + onclick + '">' + label + '</button>';
}

// ════════════ UTIL ════════════
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function pad2(n) { return String(n).padStart(2, '0'); }
function num(n)  { return (Math.round(n * 100) / 100).toLocaleString('en-US'); }
function money(n) {
  n = Number(n) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

var _toastTimer;
function toast(msg) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3200);
}

function setLoaderText(t) {
  var el = document.getElementById('loaderText');
  if (el) el.textContent = t;
}

function fail(msg, icon) {
  document.getElementById('loader').classList.add('hidden');
  document.getElementById('app').classList.add('hidden');
  var f = document.getElementById('fail');
  document.getElementById('failIcon').textContent = icon || '😿';
  document.getElementById('failMsg').textContent  = msg;
  f.classList.remove('hidden');
}

// ════════════ MOCK — พรีวิวหน้าจอโดยไม่ต่อ backend ════════════
var MOCK_ROWS = [
  { seq: 1, name: 'สมชาย ใจดี',      rate: 25000, salary: 25000, ot: 1250, sso: 875, tax: 420, studentLoan: 0,    unpaidLeave: 0 },
  { seq: 2, name: 'สมหญิง รักงาน',   rate: 18000, salary: 16800, ot: 0,    sso: 840, tax: 0,   studentLoan: 1500, unpaidLeave: 2 },
  { seq: 3, name: 'ประเสริฐ มั่นคง',  rate: 15000, salary: 15000, ot: 800,  sso: 790, tax: 0,   studentLoan: 800,  unpaidLeave: 0 },
  { seq: 4, name: 'ณัฐวัฒน์ พากเพียร', rate: 12000, salary: 12000, ot: 0,   sso: 600, tax: 0,   studentLoan: 0,    unpaidLeave: 0 },
];
var MOCK_STEP_DONE = { createMonth: 1, importOT: 1, importUnpaidLeave: 1 };

function mockApi(action, params) {
  return new Promise(function (resolve) {
    setTimeout(function () { resolve(mockResult(action, params)); }, 220);
  });
}

function mockResult(action, params) {
  if (action === 'payrollBootstrap') {
    return { ok: true, role: 'OWNER', company: 'บจก.ดิเอลฟ์ (พรีวิว)',
      current: { month: 8, yearBE: 2569 },
      months: [{ month: 8, yearBE: 2569 }, { month: 7, yearBE: 2569 }, { month: 6, yearBE: 2569 }] };
  }

  if (action === 'stepStatus') {
    var defs = [
      ['createMonth', '📋 สร้างทะเบียนเดือนใหม่', null],
      ['importOT', '🔗 ดึง OT', 'createMonth'],
      ['importUnpaidLeave', '💸 ดึงวันลาไม่รับเงิน', 'createMonth'],
      ['calcByDays', '💵 คำนวณเงินเดือนตามวัน', 'importUnpaidLeave'],
      ['importStudentLoan', '💳 ดึงยอด กยศ.', 'createMonth'],
      ['audit', '🔍 ตรวจทะเบียน 13 ข้อ', 'calcByDays'],
      ['updateYTD', '📊 อัปเดต YTD สะสม', 'audit'],
      ['genPayslips', '📄 สร้างสลิป PDF', 'updateYTD'],
      ['sendPayslips', '📧 ส่ง Email + LINE', 'genPayslips'],
    ];
    var byKey = {}, next = null;
    var steps = defs.map(function (d) {
      var done = !!MOCK_STEP_DONE[d[0]];
      var s = { key: d[0], label: d[1], done: done, confirmed: done,
                doneAt: done ? '25/08/2569 09:1' + (Object.keys(byKey).length) : null,
                detail: done ? 'ทำแล้ว' : '', blockedBy: null, state: done ? 'done' : 'ready' };
      if (d[2] && byKey[d[2]] && !byKey[d[2]].done) {
        s.blockedBy = d[2];
        s.state = d[0] === 'sendPayslips' ? 'locked' : 'warn';
      }
      byKey[d[0]] = s;
      if (!done && s.state !== 'locked' && !next) next = d[0];
      return s;
    });
    return { ok: true, month: 8, yearBE: 2569, sheetName: 'ทะเบียน 08-2569',
             exists: true, steps: steps, next: next, allDone: false };
  }

  if (action === 'registerRows') {
    var rows = MOCK_ROWS.map(function (x) {
      var income = x.salary + x.ot;
      var deduct = x.sso + x.tax + x.studentLoan;
      return Object.assign({}, x, {
        incomePND1: income, incomeTotal: income, deductTotal: deduct,
        net: income - deduct, slipLink: '', emailStatus: '⏳ รอดำเนินการ', lineStatus: '',
      });
    });
    var t = { income: 0, deduct: 0, net: 0, ot: 0, tax: 0, sso: 0 };
    rows.forEach(function (r) {
      t.income += r.incomeTotal; t.deduct += r.deductTotal; t.net += r.net;
      t.ot += r.ot; t.tax += r.tax; t.sso += r.sso;
    });
    return { ok: true, exists: true, sheetName: 'ทะเบียน 08-2569',
             month: 8, yearBE: 2569, rows: rows, totals: t, count: rows.length };
  }

  if (action === 'auditMonth') {
    return { ok: true, month: 8, yearBE: 2569, sheetName: 'ทะเบียน 08-2569',
      periodText: '26/07/2569 − 25/08/2569', rows: 4,
      red: ['#2 สมหญิง รักงาน: 🔴 มีลาไม่รับเงิน 2 วัน แต่เงินเดือนยังเต็ม 18,000.00 — ยังไม่ได้กด "💵 คำนวณเงินเดือนตามจำนวนวัน"'],
      yellow: ['#1 สมชาย ใจดี: ภาษี 420.00 ต่างจากที่คำนวณได้ ~455.00 (ฐาน 26,250.00) — ถ้ามีลดหย่อนพิเศษก็ข้ามได้'],
      info: [], passed: false,
      report: '(พรีวิว)', summary: '🔴 1 · 🟡 1 (4 คน)' };
  }

  if (action === 'yearSummary') {
    var yr = parseInt((params && params.yearBE) || 2569, 10);
    var mk = function (mo, sent, payDate) {
      var net = 62000 + mo * 830;
      return { month: mo, yearBE: yr, sheetName: 'ทะเบียน ' + pad2(mo) + '-' + yr,
        periodText: '26/' + pad2(mo - 1 || 12) + ' − 25/' + pad2(mo),
        from: '26/' + pad2(mo - 1 || 12) + '/' + yr, to: '25/' + pad2(mo) + '/' + yr,
        payDate: payDate || '', payDateISO: payDate ? (yr - 543) + '-' + pad2(mo) + '-28' : '',
        emp: 4, income: net + 3400, deduct: 3400, net: net,
        tax: 400 + mo * 5, sso: 3105, ot: 2050,
        slipMade: sent ? 0 : 4, sent: sent ? 4 : 0,
        status: sent ? 'จ่ายแล้ว' : 'ยังไม่ส่ง' };
    };
    var ms = [mk(5, true, '31/05/' + yr), mk(6, true, '30/06/' + yr),
              mk(7, true, '31/07/' + yr), mk(8, false, '')];
    var tt = { emp: 4, income: 0, deduct: 0, net: 0, tax: 0, sso: 0, ot: 0 };
    ms.forEach(function (m) {
      tt.income += m.income; tt.deduct += m.deduct; tt.net += m.net;
      tt.tax += m.tax; tt.sso += m.sso; tt.ot += m.ot;
    });
    return { ok: true, yearBE: yr, months: ms, totals: tt, years: [2569, 2568] };
  }

  if (action === 'reportFiles') {
    return { ok: true, yearBE: params && params.yearBE, count: 3, files: [
      { at: '01/08/2569', type: 'ทะเบียนจ่าย', month: 7, yearBE: 2569,
        name: 'ทะเบียนจ่าย_07-2569.xlsx', url: '#', by: 'phusita@moodata.me' },
      { at: '01/07/2569', type: 'ทะเบียนจ่าย', month: 6, yearBE: 2569,
        name: 'ทะเบียนจ่าย_06-2569.xlsx', url: '#', by: 'phusita@moodata.me' },
      { at: '15/01/2569', type: 'ภ.ง.ด.1ก', month: null, yearBE: 2568,
        name: 'ภงด.1ก_2568.xlsx', url: '#', by: 'phusita@moodata.me' },
    ] };
  }

  var noop = { ok: true, dryRun: params && params.mode !== 'commit',
    report: '(โหมดพรีวิว) ต่อ backend จริงถึงจะทำงานได้ค่ะ\n\nตั้ง PAYROLL_API_URL ใน config.js แล้วเปลี่ยน MOCK เป็น false',
    summary: 'พรีวิว', written: 1, writes: 1, pending: 4, remaining: 0, done: true, results: [] };
  return noop;
}
