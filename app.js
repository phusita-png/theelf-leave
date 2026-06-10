/* ================================================================
   app.js — The Elf · ระบบลา & OT  (LIFF + Apps Script API)
   ================================================================ */
'use strict';

var CFG = window.LEAVE_CONFIG || {};
var TH_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
var TH_DOW = ['อา','จ','อ','พ','พฤ','ศ','ส'];
var TYPE_EMOJI = {'ลาป่วย':'🤒','ลากิจ':'🏠','ลาพักร้อน':'🌴','ลากิจไม่รับค่าจ้าง':'📄',
  'ลาวันเกิด':'🎂','ลาวันเกิดคนพิเศษ':'💝'};
var VIEW_HEAD = {
  home:    ['ระบบลา & OT','บจก.ดิเอลฟ์'],
  leave:   ['ยื่นใบลา','เลือกประเภท · วัน · ช่วงเวลา'],
  ot:      ['ขอ OT','แจ้งทำงานล่วงเวลา'],
  payslip: ['สลิปเงินเดือน','รายได้ & รายการหัก'],
  history: ['ประวัติ','คำขอลา & OT ของคุณ'],
  profile: ['โปรไฟล์','ข้อมูล & สิทธิ์การลา'],
  documents:['เอกสาร','ดาวน์โหลดเอกสารของคุณ'],
  hr:      ['แผง HR','ภาพรวม & รออนุมัติ'],
  leavecal:['ปฏิทินการลา','ภาพรวมการลาทั้งทีม'],
  settings:['ตั้งค่าระบบ','บทบาท · โควต้า · ข้อมูลพนักงาน']
};

var S = {
  auth:null, profile:null, balances:null, holidays:[], schedule:null, leaveTypes:null, otTypes:null,
  otThisMonth:{hours:0,count:0}, recent:[], avatar:null,
  view:'home',
  leaveForm:{type:'vac',start:null,end:null,period:'full',reason:'',stime:'',etime:''},
  otForm:{date:null,start:'',end:'',type:'1',reason:''},
  calLeave:new Date(), calOt:new Date(), histTab:'leave',
  editLeaveId:null, editOtId:null, pendingEdit:null, pendingView:null,   // โหมดแก้ไข + deep-link view
  leaveCalMonth:null, leaveCalItems:[], leaveCalSel:null, leaveCalDept:'', leaveCalType:''   // ปฏิทินการลารวม (HR)
};

// ════════════ INIT ════════════
window.addEventListener('DOMContentLoaded', init);
function init() {
  bindNav();
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
    if(Date.now()-last < 8000){ return fail('ต่ออายุเซสชันไม่สำเร็จ — ปิดแล้วเปิดแอปใหม่อีกครั้งค่ะ','🔑'); }
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
    liff.getProfile().then(function(p){ S.avatar = p.pictureUrl; S.displayName = p.displayName || ''; paintAvatar(); }).catch(function(){});
    bootstrap();
  }).catch(function(e){ fail('LIFF init ล้มเหลว: ' + e); });
}

// ════════════ API (JSONP) ════════════
var _seq = 0;
function api(action, params) {
  if (CFG.MOCK) return mockApi(action, params);
  return new Promise(function(resolve, reject){
    if (!CFG.API_URL || CFG.API_URL.indexOf('PASTE') === 0)
      return reject(new Error('ยังไม่ได้ตั้งค่า API_URL ใน config.js'));
    var cb = '__lv_' + (++_seq) + '_' + Date.now();
    var q = ['action=' + encodeURIComponent(action), 'callback=' + cb];
    var all = Object.assign({}, S.auth || {}, params || {});
    Object.keys(all).forEach(function(k){ if (all[k]!=null) q.push(encodeURIComponent(k)+'='+encodeURIComponent(all[k])); });
    var sc = document.createElement('script'), done = false;
    var t = setTimeout(function(){ if(done)return; done=true; clean(); reject(new Error('หมดเวลาเชื่อมต่อ')); }, 20000);
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
      return fail(r.error || 'โหลดข้อมูลไม่สำเร็จ', '😿');
    }
    apply(r);
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    paintAvatar(); setupNavRoles(); render();
    if (S.pendingEdit) enterEditById(S.pendingEdit);   // deep-link → เปิดหน้าแก้เลย (ลา/OT)
    else if (S.pendingView === 'hr' && S.profile && S.profile.canApprove) goTo('hr');   // deep-link → เด้งแผง HR เลย
    else if (S.pendingView === 'settings' && S.profile && S.profile.canAdmin) goTo('settings');
  }).catch(function(e){ fail(String(e.message || e)); });
}
function apply(r){
  S.profile=r.profile; S.balances=r.balances; S.holidays=r.holidays||[]; S.schedule=r.schedule||null;
  S.leaveTypes=r.leaveTypes; S.otTypes=r.otTypes||{}; S.otThisMonth=r.otThisMonth||{hours:0,count:0};
  S.recent=r.recent||[];
}
function fail(msg, emo){
  document.getElementById('loader').innerHTML =
    '<div class="empty"><div class="e-emo">'+(emo||'😿')+'</div><div class="e-txt">'+esc(msg)+'</div></div>';
}

// ════════════ REGISTER (พนักงานใหม่ · ส่งคำขอ → HR อนุมัติ) ════════════
function showRegister(){
  var ld = document.getElementById('loader');
  ld.classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  ld.innerHTML =
    '<div class="reg-wrap">'+
      '<div class="reg-emo">📝</div>'+
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
      '<div class="reg-emo">'+(already?'✅':'⏳')+'</div>'+
      '<div class="reg-title">'+(already?'คุณลงทะเบียนแล้ว':'ส่งคำขอเรียบร้อย')+'</div>'+
      '<div class="reg-sub">'+(already
        ? 'บัญชีนี้อยู่ในระบบแล้ว ปิดแล้วเปิดแอปใหม่เพื่อเริ่มใช้งานได้เลยค่ะ'
        : 'กรุณารอ HR ตรวจสอบและอนุมัติ<br>เมื่ออนุมัติแล้วระบบจะแจ้งกลับทาง LINE ทันทีค่ะ 🔔')+'</div>'+
    '</div>';
}

// ════════════ ROUTER ════════════
function bindNav(){
  document.querySelectorAll('.nav-btn').forEach(function(b){
    b.addEventListener('click', function(){ goTo(b.dataset.view); });
  });
}
function goTo(view){
  S.view = view;
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.view===view); });
  render(); window.scrollTo(0,0);
}
// เปิดเมนู admin ใน sidebar (desktop) ตามสิทธิ์ — มือถือ CSS ซ่อนเสมอ (ใช้ hub link เดิม)
function setupNavRoles(){
  var p = S.profile || {};
  var hr = document.querySelector('.nav-btn[data-view="hr"]');
  var st = document.querySelector('.nav-btn[data-view="settings"]');
  var lc = document.querySelector('.nav-btn[data-view="leavecal"]');
  if (hr) hr.classList.toggle('allow', !!p.canApprove);
  if (st) st.classList.toggle('allow', !!p.canAdmin);
  if (lc) lc.classList.toggle('allow', !!p.canApprove);
}
function render(){
  var h = VIEW_HEAD[S.view] || ['',''];
  document.getElementById('hdTitle').textContent = h[0];
  document.getElementById('hdSub').textContent = h[1];
  var m = document.getElementById('main');
  if (S.view==='home')      { m.innerHTML = viewHome(); wireHome(); }
  else if (S.view==='leave'){ m.innerHTML = viewLeave(); wireLeave(); }
  else if (S.view==='ot')   { m.innerHTML = viewOt(); wireOt(); }
  else if (S.view==='payslip'){ m.innerHTML = '<div class="card"><div class="skel" style="height:120px"></div></div>'; loadPayslip(); }
  else if (S.view==='documents'){ m.innerHTML = '<div class="card"><div class="skel" style="height:60px"></div></div>'; loadDocuments(); }
  else if (S.view==='hr'){ m.innerHTML = '<div class="card"><div class="skel" style="height:120px"></div></div>'; loadHr(); }
  else if (S.view==='leavecal'){ m.innerHTML = viewLeaveCal(); wireLeaveCal(); loadLeaveCal(); }
  else if (S.view==='settings'){ m.innerHTML = '<div class="card"><div class="skel" style="height:120px"></div></div>'; loadSettings(); }
  else if (S.view==='history'){ m.innerHTML = viewHistory(); wireHistory(); }
  else if (S.view==='profile') m.innerHTML = viewProfile();
}

// ════════════ VIEW: HOME (Hub) ════════════
function viewHome(){
  var p = S.profile, b = S.balances;
  var bal = function(k){ var v=b[k]&&b[k].remaining; return v==null?'—':(Number.isInteger(v)?v:v.toFixed(1)); };
  var roleChip = p.canApprove ? '<span class="role-chip">⭐ '+esc(p.role)+'</span>' : '';
  var stat = function(cls,emo,num,lb){
    return '<div class="stat '+cls+'"><div class="stat-ic">'+emo+'</div><div>'+
      '<div class="stat-num">'+num+'</div><div class="stat-lb">'+lb+'</div></div></div>'; };

  var feed = S.recent.length ? S.recent.map(function(x){
    var emo = x.kind==='ot' ? '⏰' : (TYPE_EMOJI[x.title] || '🌴');
    return '<div class="feed-item"><div class="feed-ic '+x.kind+'">'+emo+'</div>'+
      '<div class="feed-main"><div class="feed-title">'+esc(x.title)+'</div>'+
      '<div class="feed-meta">'+esc(x.dateText)+' · '+esc(x.amount)+'</div></div>'+
      statusBadge(x.status)+'</div>';
  }).join('') : '<div class="empty" style="padding:24px"><div class="e-emo">🍃</div><div class="e-txt">ยังไม่มีกิจกรรม</div></div>';

  return ''+
  '<div class="greet"><div class="greet-hi">สวัสดีค่ะ 👋</div>'+
    '<div class="greet-name">'+esc(p.name)+'</div>'+
    '<div class="greet-meta"><span class="greet-dept">'+esc(p.dept||'')+'</span>'+roleChip+'</div></div>'+

  '<div class="section-h">ภาพรวมเดือนนี้</div>'+
  '<div class="stat-grid">'+
    stat('vac','🌴',bal('vac'),'พักร้อนคงเหลือ')+
    stat('biz','🏠',bal('biz'),'ลากิจคงเหลือ')+
    stat('sick','🤒',bal('sick'),'ลาป่วยคงเหลือ')+
    stat('ot','⏰',(S.otThisMonth.hours||0),'OT รอบนี้ (ชม.)')+
  '</div>'+

  '<div class="act-row">'+
    '<button class="act-btn primary" data-go="leave">'+
      '<svg viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></svg>ยื่นใบลา</button>'+
    '<button class="act-btn ot" data-go="ot">'+
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12.5" r="8.5"/><path d="M12 8v5l3 2"/></svg>ขอ OT</button>'+
  '</div>'+

  '<button class="hub-link" data-go="documents"><span>📎 เอกสารของฉัน</span><span class="chev">›</span></button>'+
  (p.canApprove ? '<button class="hub-link hr" data-go="hr"><span>📊 แผง HR · ภาพรวม + รออนุมัติ</span><span class="chev">›</span></button>' : '')+
  (p.canAdmin ? '<button class="hub-link admin" data-go="settings"><span>⚙️ ตั้งค่าระบบ · บทบาท + โควต้า + พนักงาน</span><span class="chev">›</span></button>' : '')+

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
    ? '<div class="edit-banner">✏️ กำลังแก้ไขใบลา <b>'+esc(S.editLeaveId)+'</b> (HR ส่งกลับให้แก้)'+
      ' <a href="#" id="cancelEdit" class="edit-cancel">ยกเลิก</a></div>'
    : '';
  return banner+'<div class="card">'+
    '<div class="card-title"><span class="ic"></span>ประเภทการลา</div>'+
    '<div id="typeGrid"></div>'+
    '<label class="field-lb">📅 เลือกวันที่ลา</label><div id="calLeave"></div>'+
    '<div id="seg" class="seg"></div>'+
    '<div id="lvTime"></div>'+
    '<label class="field-lb">📝 เหตุผล (ไม่บังคับ)</label>'+
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
    '<div style="text-align:center;color:var(--muted);font-size:13px;margin-top:8px">📅 '+dt+'</div>';
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
  if (f.period!=='hours' && days<=0) return toast('ช่วงที่เลือกเป็นวันหยุดทั้งหมด เลือกวันทำงานนะคะ 😊','err');
  var per=f.period==='morning'?'ครึ่งเช้า':f.period==='afternoon'?'ครึ่งบ่าย':f.period==='hours'?'ราย ชม.':'เต็มวัน';
  var qty=f.period==='hours'?(otHours(f.stime,f.etime)||0)+' ชม. (≈'+days+' วัน)':days+' วัน';
  var dt=fmtThai(f.start)+(f.end&&dkey(f.end)!==dkey(f.start)?' — '+fmtThai(f.end):'')+
    (f.period==='hours'&&f.stime&&f.etime?' · '+f.stime+'-'+f.etime:'');
  confirmModal({ title:S.editLeaveId?'ยืนยันการแก้ไขใบลา':'ยืนยันการยื่นลา', emoji:'📋', accent:'leave', onConfirm:doSubmitLeave, rows:[
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
    toast(editing ? ('✅ แก้ไขส่งใหม่แล้ว · '+r.leaveId) : ('✅ ส่งใบลาแล้ว · '+r.leaveId),'ok');
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
    ? '<div class="edit-banner">✏️ กำลังแก้ไข OT <b>'+esc(S.editOtId)+'</b> (HR ส่งกลับให้แก้)'+
      ' <a href="#" id="cancelEditOt" class="edit-cancel">ยกเลิก</a></div>'
    : '';
  return banner+'<div class="card">'+
    '<div class="card-title ot"><span class="ic"></span>ประเภท OT</div>'+
    '<div id="otTypeGrid"></div>'+
    '<label class="field-lb">📅 วันที่ทำ OT <span style="font-weight:400">(ย้อนหลังได้ ≤30 วัน)</span></label>'+
    '<div id="calOt"></div>'+
    '<label class="field-lb">⏰ เวลาทำงาน</label>'+
    '<div class="time-row"><input type="time" id="otStart"><span class="dash">→</span><input type="time" id="otEnd"></div>'+
    '<label class="field-lb">📝 เหตุผล / รายละเอียด</label>'+
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
function otEmoji(k){ return {'1':'🔥','2':'📦','3':'🤝','4':'✨'}[k] || '⏰'; }
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
    (otHours(f.start,f.end)>0 && endBeforeStart(f.start,f.end) ? '<div style="text-align:center;color:var(--ot);font-size:12px;margin-top:8px">🌙 ข้ามเที่ยงคืน</div>':'');
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
    {k:'เวลา',    v:f.start+' → '+f.end+(endBeforeStart(f.start,f.end)?' 🌙':'')},
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
    toast((editing?'✅ บันทึกการแก้ไข OT แล้ว · ':'✅ ส่งคำขอ OT แล้ว · ')+r.hours+' ชม.','ok');
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
    '<button class="htab'+(S.histTab==='leave'?' sel':'')+'" data-h="leave">📋 การลา</button>'+
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
  s.byType=Object.keys(byT).map(function(t){ return {type:t,emoji:TYPE_EMOJI[t]||'📋',days:Math.round(byT[t]*100)/100}; })
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
    '<div class="lv-sum-days">🗓 รวมวันลาที่อนุมัติ <b>'+num(sm.approvedDays)+'</b> วัน</div>'+
    types+'</div>';
}
function loadLeaveHistory(){
  api('history',{}).then(function(r){
    var body = document.getElementById('histBody'); if(!body) return;
    if(!r.ok) return body.innerHTML = emptyBox('😿', r.error||'โหลดไม่ได้');
    if(!r.history.length) return body.innerHTML = emptyBox('🍃','ยังไม่มีประวัติการลา');
    var sumCard = lvSummaryCard(r.summary || lvSummary(r.history));
    body.innerHTML = sumCard + '<div class="card">'+r.history.map(function(h){
      var dt = h.startDate+(h.endDate&&h.endDate!==h.startDate?' — '+h.endDate:'');
      var editBtn = isReturnEdit(h.status)
        ? '<button class="hist-edit" data-edit="'+esc(h.leaveId)+'">✏️ แก้ไขแล้วส่งใหม่</button>' : '';
      return '<div class="hist"><div class="hist-ic">'+(TYPE_EMOJI[h.type]||'📋')+'</div>'+
        '<div class="hist-main"><div class="hist-type">'+esc(h.type)+'</div>'+
        '<div class="hist-meta"><span>📅 '+dt+'</span><span>·</span><span>⏱ '+h.days+' วัน</span></div>'+editBtn+'</div>'+
        statusBadge(h.status)+'</div>'; }).join('')+'</div>';
    body.querySelectorAll('.hist-edit').forEach(function(b){
      b.addEventListener('click', function(){ enterEditByLeaveId(b.dataset.edit); }); });
  }).catch(function(e){ var b=document.getElementById('histBody'); if(b) b.innerHTML=emptyBox('😿',String(e.message||e)); });
}
function loadOtHistory(){
  api('otHistory',{}).then(function(r){
    var body = document.getElementById('histBody'); if(!body) return;
    if(!r.ok) return body.innerHTML = emptyBox('😿', r.error||'โหลดไม่ได้');
    if(!r.history.length) return body.innerHTML = emptyBox('🍃','ยังไม่มีประวัติ OT');
    body.innerHTML = '<div class="card">'+r.history.map(function(o){
      var editBtn = isReturnEdit(o.status)
        ? '<button class="hist-edit" data-edit="'+esc(o.otId)+'">✏️ แก้ไขแล้วส่งใหม่</button>' : '';
      return '<div class="hist"><div class="hist-ic">⏰</div>'+
        '<div class="hist-main"><div class="hist-type">'+esc(o.otType||'OT')+'</div>'+
        '<div class="hist-meta"><span>📅 '+esc(o.otDate)+'</span><span>·</span>'+
        '<span>🕐 '+esc(o.startTime)+'–'+esc(o.endTime)+'</span><span>·</span><span>'+o.hours+' ชม.</span></div>'+editBtn+'</div>'+
        statusBadge(o.status)+'</div>'; }).join('')+'</div>';
    body.querySelectorAll('.hist-edit').forEach(function(b){
      b.addEventListener('click', function(){ enterEditById(b.dataset.edit); }); });
  }).catch(function(e){ var b=document.getElementById('histBody'); if(b) b.innerHTML=emptyBox('😿',String(e.message||e)); });
}

// ════════════ VIEW: PROFILE ════════════
function viewProfile(){
  var p = S.profile, b = S.balances;
  var bal = function(k){ var v=b[k]&&b[k].remaining; return v==null?'—':(Number.isInteger(v)?v:v.toFixed(1)); };
  var roleChip = p.canApprove ? '<span class="role-chip">⭐ '+esc(p.role)+'</span>' : esc(p.role||'EMPLOYEE');
  return ''+
  '<div class="pf-head"><div class="pf-ava">'+(S.avatar?'<img src="'+S.avatar+'">':'🙂')+'</div>'+
    '<div><div class="pf-hname">'+esc(p.name)+'</div><div class="pf-hdept">'+esc(p.dept||'')+'</div></div></div>'+

  '<div class="card"><div class="card-title"><span class="ic"></span>วันลาคงเหลือ</div>'+
    '<div class="pf-stat">'+
      '<div class="pf-box a"><div class="pf-num">'+bal('vac')+'</div><div class="pf-lb">พักร้อน</div></div>'+
      '<div class="pf-box b"><div class="pf-num">'+bal('biz')+'</div><div class="pf-lb">ลากิจ</div></div>'+
      '<div class="pf-box c"><div class="pf-num">'+bal('sick')+'</div><div class="pf-lb">ลาป่วย</div></div></div></div>'+

  '<div class="card"><div class="card-title"><span class="ic"></span>ข้อมูลส่วนตัว</div>'+
    pfRow('ชื่อ-นามสกุล',p.name)+pfRow('รหัสพนักงาน',p.empId||'—')+pfRow('แผนก',p.dept||'—')+
    '<div class="pf-row"><span class="k">สิทธิ์การใช้งาน</span><span class="v">'+roleChip+'</span></div>'+
    '<div class="pf-row"><span class="k">OT รอบนี้</span><span class="v">'+(S.otThisMonth.hours||0)+' ชม. · '+(S.otThisMonth.count||0)+' รายการ'+(S.otThisMonth.period?' <span style="color:var(--muted);font-size:12px">('+S.otThisMonth.period+')</span>':'')+'</span></div></div>'+

  '<div class="card"><div style="display:flex;gap:10px;align-items:center;color:var(--muted);font-size:13px">'+
    '<span style="font-size:20px">🏢</span><div>The Elf · ระบบลา & OT<br>เชื่อมต่อ Google Sheets เดิม · อนุมัติผ่าน LINE ของ HR</div></div></div>';
}
function pfRow(k,v){ return '<div class="pf-row"><span class="k">'+esc(k)+'</span><span class="v">'+esc(v)+'</span></div>'; }

// ════════════ VIEW: PAYSLIP ════════════
function loadPayslip(){
  api('payslip',{}).then(function(r){
    var m = document.getElementById('main'); if(!m) return;
    if(!r.ok) return m.innerHTML = emptyBox(r.needLink?'🔗':'😿', r.error||'โหลดสลิปไม่ได้');
    if(!r.slips || !r.slips.length) return m.innerHTML = emptyBox('🧾','ยังไม่มีสลิปเงินเดือน');
    m.innerHTML = renderPayslip(r); wirePayslip();
  }).catch(function(e){ var m=document.getElementById('main'); if(m) m.innerHTML=emptyBox('😿',String(e.message||e)); });
}
function renderPayslip(r){
  var s = r.latest;
  var pdfBtn = s.slipUrl ? '<button class="slip-pdf" data-slip="'+s.month+'-'+s.yearBE+'">📄 เปิดสลิป PDF</button>' : '';
  var hero = '<div class="slip-hero">'+
    '<div class="slip-mo">'+esc(s.label)+'</div>'+
    '<div class="slip-net">'+baht(s.net)+'</div>'+
    '<div class="slip-cap">รายได้สุทธิ</div>'+pdfBtn+'</div>';

  var breakdown = '<div class="card"><div class="card-title"><span class="ic"></span>รายละเอียด</div>'+
    slipRow('รวมรายรับ', baht(s.income), '') +
    (s.ot ? slipRow('   • OT', baht(s.ot), 'sub') : '') +
    slipRow('ประกันสังคม', '−'+baht(s.sso), 'ded') +
    slipRow('ภาษีหัก ณ ที่จ่าย', '−'+baht(s.tax), 'ded') +
    slipRow('รวมรายการหัก', '−'+baht(s.deduct), 'ded') +
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
        var lnk = x.slipUrl ? '<button class="slip-mini" data-slip="'+x.month+'-'+x.yearBE+'">📄</button>' : '';
        return '<div class="hist"><div class="hist-ic">🧾</div><div class="hist-main">'+
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
  var hint = isImg ? '' : '<div class="vw-hint">📄 ซูม/บันทึกไม่ได้ในนี้ → แตะปุ่มด้านล่าง เปิดในเบราว์เซอร์</div>';
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
    return '<div class="cfm-row"><span class="cfm-k">'+esc(r.k)+'</span><span class="cfm-v">'+esc(r.v)+'</span></div>'; }).join('');
  c.innerHTML='<div class="cfm-box">'+
    '<div class="cfm-head '+ac+'">'+opts.emoji+' '+esc(opts.title)+'</div>'+
    '<div class="cfm-body">'+rows+'<div class="cfm-note">ตรวจสอบให้ถูกต้องก่อนส่งนะคะ</div></div>'+
    '<div class="cfm-act">'+
      '<button class="cfm-btn ghost" data-cfm-cancel>✕ แก้ไข</button>'+
      '<button class="cfm-btn go '+ac+'" data-cfm-ok>✅ ยืนยันส่ง</button>'+
    '</div></div>';
  c.classList.add('show');
  c.querySelector('[data-cfm-cancel]').addEventListener('click', closeConfirm);
  c.querySelector('[data-cfm-ok]').addEventListener('click', function(){ closeConfirm(); opts.onConfirm(); });
}
function closeConfirm(){ var c=document.getElementById('confirm'); if(c) c.classList.remove('show'); }
function baht(n){ return (Number(n)||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})+' ฿'; }
function baht0(n){ return (Number(n)||0).toLocaleString('th-TH',{maximumFractionDigits:0})+' ฿'; }

// ════════════ VIEW: DOCUMENTS ════════════
function backBar(){ return '<button class="backbar" data-back="1">‹ กลับหน้าหลัก</button>'; }
function bindBack(){ var b=document.querySelector('[data-back]'); if(b) b.addEventListener('click',function(){ goTo('home'); }); }
function loadDocuments(){
  api('documents',{}).then(function(r){
    var m=document.getElementById('main'); if(!m) return;
    if(!r.ok){ m.innerHTML = backBar()+emptyBox('😿', r.error||'โหลดไม่ได้'); bindBack(); return; }
    if(!r.documents.length){ m.innerHTML = backBar()+emptyBox('📭','ยังไม่มีเอกสารสำหรับคุณ'); bindBack(); return; }
    var list = r.documents.map(function(d){
      return '<div class="hist"><div class="hist-ic">📄</div><div class="hist-main">'+
        '<div class="hist-type">'+esc(d.name)+'</div>'+
        '<div class="hist-meta">'+esc(d.category)+' · '+esc(d.scope)+'</div></div>'+
        '<button class="slip-mini" data-doc="'+esc(d.url)+'">⬇</button></div>'; }).join('');
    m.innerHTML = backBar()+'<div class="card"><div class="card-title"><span class="ic"></span>เอกสาร '+r.documents.length+' รายการ</div>'+list+'</div>';
    bindBack(); wireFiles();
  }).catch(function(e){ var m=document.getElementById('main'); if(m){ m.innerHTML=backBar()+emptyBox('😿',String(e.message||e)); bindBack(); } });
}

// ════════════ VIEW: HR DASHBOARD (read-only) ════════════
function loadHr(){
  api('hrDashboard',{}).then(function(r){
    var m=document.getElementById('main'); if(!m) return;
    if(!r.ok){ m.innerHTML = backBar()+emptyBox('🔒', r.error||'ไม่มีสิทธิ์'); bindBack(); return; }
    m.innerHTML = backBar()+'<div id="pendRegSlot"></div>'+renderHr(r); bindBack(); wireHrPending();
    loadPendingRegs();
  }).catch(function(e){ var m=document.getElementById('main'); if(m){ m.innerHTML=backBar()+emptyBox('😿',String(e.message||e)); bindBack(); } });
}
// 📝 รายการรออนุมัติลงทะเบียน — โหลดแยก แล้วแทรกบนสุดของแผง HR
function loadPendingRegs(){
  api('pendingRegistrations',{}).then(function(r){
    var slot=document.getElementById('pendRegSlot');
    if(!slot || !r.ok){ return; }
    if(!r.count){ slot.innerHTML=''; return; }
    slot.innerHTML = renderPendingRegs(r.pending);
    wirePendingRegs();
  }).catch(function(){});
}
function renderPendingRegs(list){
  var canAdmin = S.profile && S.profile.canAdmin;
  var rows = list.map(function(x){
    var match = x.matched
      ? '<span class="badge ok">✅ ตรงโควต้าลา · '+esc(x.empId)+(x.dept?' · '+esc(x.dept):'')+'</span>'
      : '<span class="badge no">⚠️ ยังไม่มีข้อมูลในระบบ</span>';
    var d = 'data-uid="'+esc(x.userId)+'" data-name="'+esc(x.typedName)+'"';
    // ปุ่ม: ถ้าตรงโควต้าลา → อนุมัติ/ปฏิเสธ · ถ้าไม่ตรง + เป็น admin → เพิ่มเป็นพนักงานใหม่ (เพิ่ม+อนุมัติขั้นเดียว)
    var acts = x.matched
      ? '<div class="pend-act"><button class="pend-btn no" data-regno="1" '+d+'>❌ ปฏิเสธ</button>'+
        '<button class="pend-btn ok" data-regok="1" '+d+'>✅ อนุมัติ</button></div>'
      : (canAdmin
          ? '<div class="pend-act2"><button class="pend-btn redit" data-regadd="1" '+d+'>➕ เพิ่มเป็นพนักงานใหม่ + อนุมัติ</button></div>'+
            '<div class="pend-act"><button class="pend-btn no" data-regno="1" '+d+'>❌ ปฏิเสธ</button></div>'
          : '<div class="hr-note">ℹ️ ชื่อนี้ยังไม่มีในระบบ — ให้ ADMIN เพิ่มข้อมูลพนักงานก่อน</div>'+
            '<div class="pend-act"><button class="pend-btn no" data-regno="1" '+d+'>❌ ปฏิเสธ</button></div>');
    return '<div class="pend"><div class="pend-top"><div class="hist-ic">📝</div><div class="hist-main">'+
      '<div class="hist-type">'+esc(x.typedName)+'</div>'+
      '<div class="hist-meta">'+(x.lineDisplay?'LINE: '+esc(x.lineDisplay)+' · ':'')+esc(x.submittedAt)+'</div>'+
      '<div style="margin-top:5px">'+match+'</div></div></div>'+acts+'</div>'; }).join('');
  return '<div class="card"><div class="card-title"><span class="ic"></span>📝 รออนุมัติลงทะเบียน ('+list.length+')</div>'+
    '<div class="hr-note ok2">👇 ตรวจชื่อให้ตรงพนักงานจริงก่อนอนุมัติ · ระบบแจ้งพนักงานทาง LINE อัตโนมัติ</div>'+rows+'</div>';
}
function wirePendingRegs(){
  document.querySelectorAll('[data-regok]').forEach(function(el){
    el.addEventListener('click', function(){ decideReg(el.dataset.uid, el.dataset.name, 'approve'); }); });
  document.querySelectorAll('[data-regno]').forEach(function(el){
    el.addEventListener('click', function(){ decideReg(el.dataset.uid, el.dataset.name, 'reject'); }); });
  document.querySelectorAll('[data-regadd]').forEach(function(el){
    el.addEventListener('click', function(){ openAddEmpFromPending(el.dataset.uid, el.dataset.name); }); });
}
function decideReg(uid, name, decision){
  var send = function(reason){
    toast('กำลังดำเนินการ…');
    api('decideRegistration',{targetUserId:uid, decision:decision, reason:reason||''}).then(function(r){
      if(!r.ok){ if(r.already) loadHr(); return toast(r.error||'ทำรายการไม่สำเร็จ','err'); }
      toast((decision==='approve'?'✅ อนุมัติ ':'❌ ปฏิเสธ ')+name+' แล้ว','ok'); loadHr();
    }).catch(function(e){ toast(String(e.message||e),'err'); });
  };
  if(decision==='approve'){
    confirmModal({ title:'ยืนยันอนุมัติลงทะเบียน', emoji:'✅', accent:'leave',
      onConfirm:function(){ send(''); }, rows:[
        {k:'พนักงาน', v:name},
        {k:'ผลลัพธ์', v:'ผูก LINE + เข้าใช้ระบบได้ทันที'}
      ]});
  } else {
    confirmModal({ title:'ยืนยันปฏิเสธคำขอ', emoji:'❌', accent:'leave',
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
    var btns=r.files.map(function(f){ return '<button class="rej-opt" data-fid="'+esc(f.fileId)+'">📄 '+esc(f.name)+'</button>'; }).join('');
    c.innerHTML='<div class="cfm-box"><div class="cfm-head">📨 เอกสารแนบ ('+r.files.length+' ไฟล์)</div>'+
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
        '<span class="ls-r'+(low?' low':'')+'">'+(rem==null?'—':num3(rem))+(low?' ⚠️':'')+'</span></div>';
    }).join('');
    return '<div class="lstat"><div class="lstat-h">🎫 สิทธิ์การลา (ปีนี้)</div>'+
      '<div class="lstat-row head"><span>ประเภท</span><span>ใช้ไป</span><span>คงเหลือ</span></div>'+rows+'</div>';
  }
  if(fallbackBal) return '<div class="hr-bal">🎫 คงเหลือ · 🌴 '+balNum(fallbackBal.vac)+' · 🏠 '+balNum(fallbackBal.biz)+' · 🤒 '+balNum(fallbackBal.sick)+'</div>';
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
      head='📊 ประวัติ OT · '+nm;
      bodyInner = (r.history&&r.history.length)
        ? '<div class="card">'+r.history.map(function(o){
            return '<div class="hist"><div class="hist-ic">⏰</div><div class="hist-main">'+
              '<div class="hist-type">'+esc(o.otType||'OT')+'</div>'+
              '<div class="hist-meta">📅 '+esc(o.otDate)+' · 🕐 '+esc(o.startTime)+'–'+esc(o.endTime)+' · '+o.hours+' ชม.</div></div>'+
              statusBadge(o.status)+'</div>'; }).join('')+'</div>'
        : emptyBox('🍃','ยังไม่มีประวัติ OT');
    } else {
      head='📊 ประวัติการลา · '+nm;
      var sumCard = lvSummaryCard(r.summary || lvSummary(r.history||[]));
      // 🎫 ตารางสิทธิ์การลาครบทุกประเภท (ใช้ไป/คงเหลือ) — ข้อมูลพิจารณาหลัก วางบนสุด
      var statsTable = leaveStatsTable(r.leaveStats, r.balances);
      var list = (r.history&&r.history.length)
        ? '<div class="card">'+r.history.map(function(h){
            var dt=h.startDate+(h.endDate&&h.endDate!==h.startDate?' — '+h.endDate:'');
            return '<div class="hist"><div class="hist-ic">'+(TYPE_EMOJI[h.type]||'📋')+'</div><div class="hist-main">'+
              '<div class="hist-type">'+esc(h.type)+'</div>'+
              '<div class="hist-meta">📅 '+dt+' · '+h.days+' วัน</div></div>'+statusBadge(h.status)+'</div>'; }).join('')+'</div>'
        : emptyBox('🍃','ยังไม่มีประวัติการลา');
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
  var detail = window.prompt('📎 ขอเอกสารเพิ่มจาก '+name+'\n\nระบุเอกสารที่ต้องการ (เช่น ใบรับรองแพทย์):');
  if(detail===null) return;
  detail = String(detail).trim(); if(!detail) return toast('กรุณาระบุเอกสารที่ต้องการ','err');
  toast('กำลังส่งคำขอ…');
  api('hrRequestDoc',{kind:kind,id:id,docDetail:detail}).then(function(r){
    if(!r.ok) return toast(r.error||'ส่งคำขอไม่สำเร็จ','err');
    toast('📎 ส่งคำขอเอกสารแล้ว · แจ้งพนักงานทาง LINE','ok'); loadHr();
  }).catch(function(e){ toast(String(e.message||e),'err'); });
}
// 📝 HR ส่งกลับให้แก้ไข (พนักงานแก้ในเว็บแอป) — ใบลาเท่านั้น
function doHrReturnEdit(kind, id, name){
  confirmModal({ title:'ส่งกลับให้แก้ไข', emoji:'📝', accent: kind==='ot'?'ot':'leave',
    onConfirm:function(){
      toast('กำลังส่งกลับ…');
      api('hrReturnEdit',{kind:kind,id:id}).then(function(r){
        if(!r.ok) return toast(r.error||'ส่งกลับไม่สำเร็จ','err');
        toast('📝 ส่งกลับให้แก้ไขแล้ว · แจ้งพนักงานทาง LINE','ok'); loadHr();
      }).catch(function(e){ toast(String(e.message||e),'err'); });
    }, rows:[
      {k:'ของ',  v:name},
      {k:'รหัส',  v:id},
      {k:'ผลลัพธ์', v:'พนักงานแก้ไขในเว็บแอปแล้วส่งกลับ'}
    ]});
}
function doHrApprove(kind, id, name){
  confirmModal({ title:'ยืนยันอนุมัติ', emoji:'✅', accent: kind==='ot'?'ot':'leave',
    onConfirm:function(){ hrDecide(kind, id, 'approve', ''); }, rows:[
      {k:'ประเภท', v: kind==='ot'?'⏰ OT':'📋 ลา'},
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
  c.innerHTML='<div class="cfm-box"><div class="cfm-head" style="background:var(--red-deep)">❌ ไม่อนุมัติ — เลือกเหตุผล</div>'+
    '<div class="cfm-body"><div style="font-size:13px;color:var(--muted);margin-bottom:10px">'+esc(name)+' · '+esc(id)+'</div>'+
    '<div class="rej-grid">'+btns+'<button class="rej-opt custom" data-r="__custom__">✍️ ระบุเอง</button></div></div>'+
    '<div class="cfm-act" style="grid-template-columns:1fr"><button class="cfm-btn ghost" data-cfm-cancel>ยกเลิก</button></div></div>';
  c.classList.add('show');
  c.querySelector('[data-cfm-cancel]').addEventListener('click', closeConfirm);
  c.querySelectorAll('.rej-opt').forEach(function(el){
    el.addEventListener('click', function(){
      var rs = el.dataset.r;
      if(rs==='__custom__'){ rs = window.prompt('ระบุเหตุผลไม่อนุมัติ:'); if(!rs) return; }
      closeConfirm();
      // การ์ดยืนยันก่อนไม่อนุมัติ (consistent กับ LINE)
      confirmModal({ title:'ยืนยันไม่อนุมัติ', emoji:'❌', accent: kind==='ot'?'ot':'leave',
        onConfirm:function(){ hrDecide(kind, id, 'reject', rs); }, rows:[
          {k:'ประเภท', v: kind==='ot'?'⏰ OT':'📋 ลา'},
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
    toast((decision==='approve'?'✅ อนุมัติ ':'❌ ไม่อนุมัติ ')+id+' แล้ว','ok');
    loadHr();
  }).catch(function(e){ toast(String(e.message||e),'err'); });
}
function renderHr(r){
  var lv=r.leave, ot=r.ot;
  var stat=function(num,lb){ return '<div class="hr-stat"><div class="hr-num">'+num+'</div><div class="hr-lb">'+lb+'</div></div>'; };
  var summary='<div class="card"><div class="card-title"><span class="ic"></span>สรุปการลา · '+esc(r.monthLabel)+'</div>'+
    '<div class="hr-grid">'+stat(lv.total,'ยื่นทั้งหมด')+stat(lv.approved,'อนุมัติ')+stat(lv.pending,'รออนุมัติ')+stat(lv.rejected,'ไม่อนุมัติ')+'</div></div>';
  var otcard='<div class="card"><div class="card-title ot"><span class="ic"></span>OT · '+esc(r.monthLabel)+'</div>'+
    '<div class="hr-grid ot">'+stat(ot.count,'รายการ')+stat(ot.approved,'อนุมัติ')+stat(ot.pending,'รออนุมัติ')+stat(ot.rejected,'ไม่อนุมัติ')+'</div></div>';

  var pend = r.pending.length ? r.pending.map(function(x){
    var emo = x.kind==='ot' ? '⏰' : (TYPE_EMOJI[x.type]||'📋');
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
    if(x.reason) info += '<div class="pend-info">💬 '+esc(x.reason)+'</div>';
    if(x.kind!=='ot' && x.remaining!=null) info += '<div class="pend-info bal">🎫 สิทธิ์'+esc(x.type)+'คงเหลือ <b>'+balNum(x.remaining)+'</b> วัน</div>';
    return '<div class="pend">'+
      '<div class="pend-top"><div class="hist-ic">'+emo+'</div><div class="hist-main">'+
        '<div class="hist-type">'+esc(x.name)+(x.resubmit?' <span class="re-badge">🔄 แก้ไขส่งใหม่</span>':'')+'</div>'+
        '<div class="hist-meta">'+esc(x.type)+' · '+when+' · <b>'+amt+'</b> · '+esc(x.id)+'</div></div></div>'+
      info+
      '<div class="pend-main2">'+
        '<button class="pend-btn no" data-rej="1" '+d+'>❌ ไม่อนุมัติ</button>'+
        '<button class="pend-btn ok" data-appr="1" '+d+'>✅ อนุมัติ</button>'+
      '</div>'+
      '<div class="pend-sub">'+
        '<button class="pend-btn hist" data-hist="1" '+d+'>📊 ประวัติ</button>'+
        (x.kind!=='ot' ? '<button class="pend-btn doc" data-doc="1" '+d+'>📎 ขอเอกสาร</button>' : '')+
        '<button class="pend-btn redit" data-redit="1" '+d+'>📝 ส่งกลับแก้ไข</button>'+
        (x.docUrl ? '<button class="pend-btn viewdoc" data-viewdoc="1" '+d+'>📨 ดูแนบ</button>' : '')+
      '</div>'+
      '</div>'; }).join('')
    : '<div class="empty" style="padding:20px"><div class="e-emo">✅</div><div class="e-txt">ไม่มีรายการค้างอนุมัติ</div></div>';
  var pendCard='<div class="card"><div class="card-title"><span class="ic"></span>รออนุมัติ ('+r.pending.length+')</div>'+
    (r.pending.length?'<div class="hr-note ok2">👇 กดอนุมัติ/ไม่อนุมัติได้เลย · ระบบแจ้งพนักงานทาง LINE อัตโนมัติ</div>':'')+
    '<div class="hr-pend-list">'+pend+'</div></div>';

  // พนักงาน — แถวแบบ table (desktop กางเป็นคอลัมน์ · มือถือยุบเป็นการ์ด)
  var empHead='<div class="hr-emp head"><div class="he-name">ชื่อ</div><div class="he-dept">แผนก</div>'+
    '<div class="he-q">🌴 พักร้อน</div><div class="he-q">🏠 ลากิจ</div><div class="he-q">🤒 ลาป่วย</div><div class="he-st">สถานะ</div></div>';
  var emps = r.employees.map(function(e){
    var over = String(e.status).indexOf('เกิน')>=0;
    return '<div class="hr-emp'+(over?' over':'')+'">'+
      '<div class="he-name">👤 '+esc(e.name)+'</div>'+
      '<div class="he-dept">'+esc(e.dept||'')+'</div>'+
      '<div class="he-q"><b>🌴 '+num3(e.vac)+'</b></div>'+
      '<div class="he-q"><b>🏠 '+num3(e.biz)+'</b></div>'+
      '<div class="he-q"><b>🤒 '+num3(e.sick)+'</b></div>'+
      '<div class="he-st">'+(over?'<span class="badge no">เกินสิทธิ์</span>':'<span class="badge ok">ปกติ</span>')+'</div>'+
      '</div>'; }).join('');
  var empCard='<div class="card"><div class="card-title"><span class="ic"></span>พนักงาน ('+r.employees.length+') · สิทธิ์คงเหลือ</div>'+
    (emps?'<div class="hr-emp-list">'+empHead+emps+'</div>':'<div class="empty" style="padding:20px"><div class="e-txt">ไม่มีข้อมูล</div></div>')+'</div>';

  return '<div class="hr-top">'+summary+otcard+'</div>'+pendCard+empCard;
}

// ════════════ VIEW: ปฏิทินการลารวม (HR · APPROVER+) ════════════
var LC_TYPES = {
  sick:{e:'🤒',label:'ลาป่วย'}, biz:{e:'🏠',label:'ลากิจ'}, vac:{e:'🌴',label:'ลาพักร้อน'},
  unpaid:{e:'📄',label:'ไม่รับค่าจ้าง'}, bday:{e:'🎂',label:'ลาวันเกิด'}, special:{e:'💝',label:'วันเกิดคนพิเศษ'}
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
    if(!r.ok){ c.innerHTML=emptyBox('🔒',r.error||'ไม่มีสิทธิ์'); return; }
    S.leaveCalItems=r.items||[];
    var dp=document.getElementById('lcDept');
    if(dp && (r.depts||[]).length){ dp.innerHTML='<option value="">ทุกแผนก</option>'+r.depts.map(function(d){
      return '<option value="'+esc(d)+'"'+(S.leaveCalDept===d?' selected':'')+'>'+esc(d)+'</option>'; }).join(''); }
    renderLeaveCalGrid(); renderLeaveCalPanel(S.leaveCalSel);
  }).catch(function(e){ var c=document.getElementById('lcCal'); if(c)c.innerHTML=emptyBox('😿',String(e.message||e)); });
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
    var cls=((dow===0||dow===6)?' we':'')+(key===todayK?' today':'')+(key===S.leaveCalSel?' sel':'');
    var evs=day.slice(0,3).map(function(it){ return '<div class="lc-ev lev-'+it.typeKey+(it.pending?' pend':'')+'" title="'+esc(it.name)+' · '+esc(it.typeName)+'">'+esc(it.name)+'</div>'; }).join('');
    var more=day.length>3?'<div class="lc-more">+'+(day.length-3)+' อื่นๆ</div>':'';
    h+='<div class="lc-cell'+cls+'" data-k="'+key+'"><div class="lc-dn">'+d+'</div><div class="lc-evs">'+evs+more+'</div></div>';
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
  var foot='<div class="lc-foot">📋 เดือนนี้ <b>'+items.length+'</b> ใบลา · แตะวันบนปฏิทินเพื่อดูรายละเอียด</div>';
  if(!key){ el.innerHTML='<div class="lc-dempty"><span class="e">🗓️</span>เลือกวันบนปฏิทิน</div>'+foot; return; }
  var day=items.filter(function(it){ return it.start<=key && key<=it.end; });
  var p=key.split('-'), dlabel=(+p[2])+' '+TH_MONTHS[(+p[1])-1]+' '+((+p[0])+543);
  var head='<div class="lc-ddate">'+dlabel+'</div><div class="lc-dsub">'+day.length+' รายการลา</div>';
  var cards=day.length?day.map(function(it){
    return '<div class="lc-dcard lev-'+it.typeKey+'"><div class="lc-dnm">'+(LC_TYPES[it.typeKey]?LC_TYPES[it.typeKey].e:'📋')+' '+esc(it.name)+'</div>'+
      '<div class="lc-dmt">'+esc(it.dept||'')+' · '+esc(it.typeName)+' · '+it.days+' วัน</div>'+
      '<span class="badge '+(it.pending?'wait':'ok')+'">'+(it.pending?'⏳ รออนุมัติ':'✅ อนุมัติ')+'</span></div>'; }).join('')
    : '<div class="lc-dempty"><span class="e">🍃</span>วันนี้ไม่มีใครลา</div>';
  el.innerHTML=head+cards+foot;
}

// ════════════ VIEW: SETTINGS (admin · ADMIN/OWNER) ════════════
function loadSettings(){
  api('adminBootstrap',{}).then(function(r){
    var m=document.getElementById('main'); if(!m) return;
    if(!r.ok){ m.innerHTML=backBar()+emptyBox('🔒',r.error||'ไม่มีสิทธิ์'); bindBack(); return; }
    S.adminUsers=r.users; S.adminRoles=r.roles; S.adminCaller=r.callerId; S.adminOwnerCount=r.ownerCount; S.adminSchedules=r.schedules||[];
    m.innerHTML=backBar()+renderSettings(r); bindBack(); wireSettings();
  }).catch(function(e){ var m=document.getElementById('main'); if(m){ m.innerHTML=backBar()+emptyBox('😿',String(e.message||e)); bindBack(); } });
}
function renderSettings(r){
  var rows=r.users.map(function(u){
    var isSelf=u.lineUserId===r.callerId;
    return '<div class="set-emp"><div class="set-emp-top"><div class="hist-ic">👤</div><div class="hist-main">'+
      '<div class="hist-type">'+esc(u.name)+(isSelf?' <span class="re-badge">คุณ</span>':'')+'</div>'+
      '<div class="hist-meta">'+esc(u.empId||'-')+' · '+esc(u.dept||'-')+' · บทบาท <b>'+esc(u.role)+'</b></div></div></div>'+
      '<div class="set-acts">'+
        '<button class="set-btn" data-srole="'+esc(u.lineUserId)+'">👤 บทบาท</button>'+
        '<button class="set-btn" data-squota="'+esc(u.empId)+'">🏖️ โควต้า</button>'+
        '<button class="set-btn" data-sinfo="'+esc(u.lineUserId)+'">✏️ ข้อมูล</button>'+
      '</div></div>';
  }).join('');
  return '<div class="card"><div class="card-title"><span class="ic"></span>พนักงาน ('+r.users.length+') · OWNER '+r.ownerCount+' คน</div>'+
    '<div class="hr-note ok2">⚙️ เฉพาะ ADMIN/OWNER · ทุกการเปลี่ยนถูกบันทึก audit</div>'+
    '<button class="btn btn-primary" data-addemp style="width:100%;margin-bottom:10px">➕ เพิ่มพนักงานใหม่</button>'+
    rows+'</div>';
}
function wireSettings(){
  var add=document.querySelector('[data-addemp]'); if(add) add.addEventListener('click', openAddEmployeeModal);
  document.querySelectorAll('[data-srole]').forEach(function(el){ el.addEventListener('click',function(){ openRoleModal(el.dataset.srole); }); });
  document.querySelectorAll('[data-squota]').forEach(function(el){ el.addEventListener('click',function(){ openQuotaModal(el.dataset.squota); }); });
  document.querySelectorAll('[data-sinfo]').forEach(function(el){ el.addEventListener('click',function(){ openInfoModal(el.dataset.sinfo); }); });
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
      '<div class="set-row"><label>🤒 ป่วย</label>'+num('q_sick',30)+'</div>'+
      '<div class="set-row"><label>📋 กิจ</label>'+num('q_biz',3)+'</div>'+
      '<div class="set-row"><label>🌴 พักร้อน</label>'+num('q_vac',0)+'</div>'+
    '</div>'+
    '<div class="set-hint">ℹ️ ลาวันเกิด / คนพิเศษ / ไม่รับค่าจ้าง — ระบบใส่ค่ามาตรฐานให้ · ปรับทีหลังได้ที่หน้า ⚙️ ตั้งค่า</div>'+
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
  _settingsModal_('➕ เพิ่มพนักงานใหม่', _addEmpFormBody_('',''), function(cc){
    var pl=_collectAddEmp_(cc);
    closeConfirm(); toast('กำลังเพิ่มพนักงาน…');
    api('addEmployee',pl).then(function(r){
      if(!r.ok) return toast(r.error||'เพิ่มไม่สำเร็จ','err');
      var msg='✅ เพิ่ม '+r.fullName+' แล้ว ('+(r.written?r.written.length:0)+' ที่)';
      if(r.warnings&&r.warnings.length) msg+=' ⚠️ '+r.warnings.join('; ');
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
    _settingsModal_('➕ เพิ่มพนักงาน + อนุมัติ', body, function(cc){
      var pl=_collectAddEmp_(cc); pl.targetUserId=uid;
      closeConfirm(); toast('กำลังเพิ่ม + อนุมัติ…');
      api('addEmployeeApprove',pl).then(function(r){
        if(!r.ok) return toast(r.error||'ไม่สำเร็จ','err');
        var msg=(r.linked?'✅ เพิ่ม '+r.fullName+' + ผูก LINE แล้ว':'✅ เพิ่ม '+r.fullName+' แล้ว');
        if(r.warnings&&r.warnings.length) msg+=' ⚠️ '+r.warnings.join('; ');
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
    '<button class="cfm-btn go" data-cfm-ok>💾 บันทึก</button></div></div>';
  c.classList.add('show');
  c.querySelector('[data-cfm-cancel]').addEventListener('click', closeConfirm);
  c.querySelector('[data-cfm-ok]').addEventListener('click', function(){ onSave(c); });
  return c;
}
function _findUser_(key,val){ return (S.adminUsers||[]).filter(function(x){return x[key]===val;})[0]; }
function openRoleModal(uid){
  var u=_findUser_('lineUserId',uid); if(!u) return;
  if(uid===S.adminCaller) return toast('🚫 เปลี่ยนบทบาทตัวเองไม่ได้','err');
  var btns=S.adminRoles.map(function(rr){ return '<button type="button" class="role-opt'+(rr===u.role?' sel':'')+'" data-r="'+rr+'">'+rr+'</button>'; }).join('');
  var c=_settingsModal_('👤 บทบาท · '+esc(u.name),
    '<div class="set-cur">ปัจจุบัน: <b>'+esc(u.role)+'</b></div><div class="role-grid">'+btns+'</div>',
    function(cc){
      var sel=cc.querySelector('.role-opt.sel'); var nr=sel?sel.dataset.r:u.role;
      if(nr===u.role){ closeConfirm(); return; }
      closeConfirm(); toast('กำลังบันทึก…');
      api('setRole',{targetUserId:uid,role:nr}).then(function(r){
        if(!r.ok) return toast(r.error||'ไม่สำเร็จ','err');
        toast('✅ เปลี่ยนเป็น '+nr+' แล้ว','ok'); loadSettings();
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
  var types=[['sick','🤒 ลาป่วย'],['biz','📋 ลากิจ'],['vac','🌴 ลาพักร้อน']];
  var body='<div class="set-hint">หน่วย: วัน (สิทธิ์ต่อปี) · ลาวันเกิด/คนพิเศษ/ไม่รับค่าจ้าง ใช้ค่ามาตรฐาน (แก้ในชีตโควต้าลาถ้าต้องการ)</div>'+types.map(function(t){
    return '<div class="set-row"><label>'+t[1]+'</label><input type="number" inputmode="decimal" min="0" step="0.5" data-q="'+t[0]+'" value="'+(q[t[0]]!=null?q[t[0]]:0)+'"></div>';
  }).join('');
  _settingsModal_('🏖️ โควต้าลา · '+esc(u.name), body, function(cc){
    var quota={}; cc.querySelectorAll('[data-q]').forEach(function(el){ quota[el.dataset.q]=el.value; });
    closeConfirm(); toast('กำลังบันทึก…');
    api('setLeaveQuota',{empId:empId,quota:quota}).then(function(r){
      if(!r.ok) return toast(r.error||'ไม่สำเร็จ','err');
      toast('✅ แก้โควต้าแล้ว'+(r.changed?' ('+r.changed+' รายการ)':''),'ok'); loadSettings();
    }).catch(function(e){ toast(String(e.message||e),'err'); });
  });
}
function openInfoModal(uid){
  var u=_findUser_('lineUserId',uid); if(!u) return;
  var fields=[['dept','แผนก'],['email','Email'],['startDate','วันเริ่มงาน (dd/MM/yyyy)'],['branch','สาขา'],['status','สถานะพนักงาน']];
  var body='<div class="set-ro">ชื่อ: <b>'+esc(u.name)+'</b> · รหัส '+esc(u.empId||'-')+' <span style="color:var(--muted)">(แก้ไม่ได้)</span></div>'+
    fields.map(function(f){
      return '<div class="set-row col"><label>'+f[1]+'</label><input type="text" data-f="'+f[0]+'" value="'+esc(u[f[0]]||'')+'"></div>';
    }).join('');
  _settingsModal_('✏️ ข้อมูล · '+esc(u.name), body, function(cc){
    var payload={targetUserId:uid}; cc.querySelectorAll('[data-f]').forEach(function(el){ payload[el.dataset.f]=el.value; });
    closeConfirm(); toast('กำลังบันทึก…');
    api('updateEmployee',payload).then(function(r){
      if(!r.ok) return toast(r.error||'ไม่สำเร็จ','err');
      toast('✅ แก้ข้อมูลแล้ว'+(r.changed&&r.changed.length?' ('+r.changed.length+' ช่อง)':''),'ok'); loadSettings();
    }).catch(function(e){ toast(String(e.message||e),'err'); });
  });
}

// ════════════ HELPERS ════════════
function refresh(){ api('bootstrap',{}).then(function(r){ if(r.ok){ apply(r); if(S.view==='home'||S.view==='profile') render(); } }).catch(function(){}); }
function statusBadge(st){
  st = String(st||'');
  if (st.indexOf('แก้ไข')>=0 || st.indexOf('ส่งกลับ')>=0) return '<span class="badge edit">✏️ ต้องแก้ไข</span>';
  if (st.indexOf('รอ')>=0) return '<span class="badge wait">⏳ รออนุมัติ</span>';   // "รอการอนุมัติ" — เช็คก่อน (มีคำว่า "อนุมัติ" ข้างใน)
  if (st.indexOf('ไม่อนุมัติ')>=0) return '<span class="badge no">❌ ไม่อนุมัติ</span>';
  if (st.indexOf('อนุมัติ')>=0) return '<span class="badge ok">✅ อนุมัติ</span>';
  return '<span class="badge wait">⏳ รออนุมัติ</span>';
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
    box+='<div class="cal-sched"><span class="cs-ic">🗓️</span>'+
      '<div><div class="cs-main">กะของคุณ: '+esc(s.label||s.code)+tm+'</div>'+
      (s.offLabel?'<div class="cs-sub">หยุด: '+esc(s.offLabel)+'</div>':'')+'</div></div>';
  } else {
    box+='<div class="cal-sched"><span class="cs-ic">🗓️</span><div class="cs-main">หยุดเสาร์–อาทิตย์ (ยังไม่กำหนดกะ)</div></div>';
  }
  var hol=holidaysInMonth(y,mo);
  if(hol.length){
    box+='<div class="cal-hols"><div class="ch-title">🎉 วันหยุดบริษัทเดือนนี้</div>'+
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
function paintAvatar(){ if(!S.avatar)return; var a=document.getElementById('hd-avatar'); if(a) a.innerHTML='<img src="'+S.avatar+'">'; }
function emptyBox(emo,txt){ return '<div class="card"><div class="empty"><div class="e-emo">'+emo+'</div><div class="e-txt">'+esc(txt)+'</div></div></div>'; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
var _tt;
function toast(msg,kind){ var t=document.getElementById('toast'); t.textContent=msg; t.className='toast show'+(kind?' '+kind:''); clearTimeout(_tt); _tt=setTimeout(function(){ t.className='toast'; },3200); }

// ════════════ MOCK (พรีวิว UI) ════════════
var MOCK_LT = {vac:{name:'ลาพักร้อน',emoji:'🌴'},biz:{name:'ลากิจ',emoji:'🏠'},sick:{name:'ลาป่วย',emoji:'🤒'},
  unpaid:{name:'ลากิจไม่รับค่าจ้าง',emoji:'📄'},bday:{name:'ลาวันเกิด',emoji:'🎂'},special:{name:'ลาวันเกิดคนพิเศษ',emoji:'💝'}};
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
  S.balances={vac:{name:'พักร้อน',emoji:'🌴',remaining:16},biz:{name:'ลากิจ',emoji:'🏠',remaining:10},sick:{name:'ลาป่วย',emoji:'🤒',remaining:29},
    unpaid:{name:'ไม่รับค่าจ้าง',emoji:'📄',remaining:7},bday:{name:'วันเกิด',emoji:'🎂',remaining:1},special:{name:'คนพิเศษ',emoji:'💝',remaining:1}};
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
    else if(action==='adminBootstrap') resolve({ok:true,callerId:'MOCK',ownerCount:1,
      schedules:[{code:'S01',desc:'จ-ศ 09:00-18:00'},{code:'S02',desc:'จ-ส 08:00-17:00'},{code:'RM01',desc:'Remote'}],
      roles:['EMPLOYEE','REVIEWER','APPROVER','ADMIN','OWNER'],leaveTypes:MOCK_LT,
      users:[
        {lineUserId:'MOCK',name:'นางสาวชนัญชิดา โชคธนอนันต์',empId:'EMP-001',dept:'สำนักงานใหญ่',email:'a@theelf.co',role:'OWNER',startDate:'01/01/2566',branch:'สนญ.',status:'ปกติ',quota:{sick:30,biz:3,vac:6,bday:1,special:1,unpaid:3}},
        {lineUserId:'MOCK2',name:'นายตัวอย่าง ทดสอบ',empId:'EMP-002',dept:'ฝ่ายขาย',email:'b@theelf.co',role:'EMPLOYEE',startDate:'15/03/2567',branch:'สาขา 2',status:'ปกติ',quota:{sick:30,biz:3,vac:6,bday:1,special:1,unpaid:3}}]});
    else if(action==='setRole'||action==='setLeaveQuota'||action==='updateEmployee') resolve({ok:true,changed:1});
    else if(action==='documents') resolve({ok:true,documents:[
      {name:'หนังสือรับรองเงินเดือน พ.ค. 69',url:'#',category:'หนังสือรับรอง',scope:'ส่วนตัว'},
      {name:'นโยบายวันลา ปี 2569',url:'#',category:'นโยบาย',scope:'ทั้งบริษัท'},
      {name:'ฟอร์มเบิกค่ารักษาพยาบาล',url:'#',category:'แบบฟอร์ม',scope:'ทั้งบริษัท'}]});
    else if(action==='approve') resolve({ok:true,id:'(mock)',status:'✅'});
    else if(action==='hrDashboard') resolve({ok:true,monthLabel:'มิถุนายน 2569',
      leave:{total:8,approved:5,pending:2,rejected:1},ot:{hours:24.5,count:6,pending:1},
      employees:[{name:'นางสาวชนัญชิดา โชคธนอนันต์',dept:'สำนักงานใหญ่',vac:16,biz:10,sick:29,used:5,status:'✅ ปกติ'},
        {name:'นายตัวอย่าง ทดสอบ',dept:'ฝ่ายขาย',vac:6,biz:0,sick:28,used:12,status:'⚠️ เกินสิทธิ์'}],
      pending:[{kind:'leave',id:'LV-003',name:'นางสาวชนัญชิดา โชคธนอนันต์',type:'ลากิจ',date:'02/06/2569',endDate:'03/06/2569',days:2,reason:'ไปทำธุระที่ต่างจังหวัด',remaining:8,userId:'MOCK',empId:'EMP-001'},
        {kind:'ot',id:'OT-002',name:'นายตัวอย่าง ทดสอบ',type:'ลูกค้าร้องขอ',date:'28/05/2569',startTime:'18:00',endTime:'21:00',hours:3,reason:'ลูกค้าขอแก้งานด่วน',userId:'MOCK2',empId:'EMP-002'}]});
    else if(action==='hrLeaveCalendar'){ var ly=params.year,lm=('0'+params.month).slice(-2);
      resolve({ok:true,year:ly,month:params.month,depts:['Live Sale','CRM & Telesale','Content Creator'],items:[
        {id:'LV-1',name:'สมชาย ใจดี',dept:'Live Sale',typeName:'ลาป่วย',typeKey:'sick',start:ly+'-'+lm+'-02',end:ly+'-'+lm+'-03',days:2,status:'อนุมัติ',pending:false},
        {id:'LV-2',name:'วิชัย ตั้งใจ',dept:'CRM & Telesale',typeName:'ลาพักร้อน',typeKey:'vac',start:ly+'-'+lm+'-09',end:ly+'-'+lm+'-11',days:3,status:'อนุมัติ',pending:false},
        {id:'LV-3',name:'ก้อง พากเพียร',dept:'Content Creator',typeName:'ลากิจ',typeKey:'biz',start:ly+'-'+lm+'-09',end:ly+'-'+lm+'-09',days:1,status:'รอการอนุมัติ',pending:true},
        {id:'LV-4',name:'สุดา รักงาน',dept:'Live Sale',typeName:'ลาวันเกิด',typeKey:'bday',start:ly+'-'+lm+'-04',end:ly+'-'+lm+'-04',days:1,status:'อนุมัติ',pending:false}]}); }
    else if(action==='pendingRegistrations') resolve({ok:true,count:2,pending:[
      {userId:'MOCKP1',typedName:'นภา สดใส',lineDisplay:'Napa S.',submittedAt:'09/06/2569 08:10',matched:true,empId:'EMP-010',dept:'ฝ่ายขาย'},
      {userId:'MOCKP2',typedName:'ก้อง พากเพียร',lineDisplay:'Kong',submittedAt:'09/06/2569 08:25',matched:false,empId:'',dept:''}]});
    else if(action==='decideRegistration') resolve({ok:true,name:'(mock)',status:params.decision==='approve'?'approved':'rejected'});
    else if(action==='addEmployeeApprove') resolve({ok:true,fullName:(params&&params.name||'')+' '+(params&&params.lastName||''),written:['โควต้าลา','วันลาคงเหลือ','payroll','OT'],linked:true,warnings:[]});
    else if(action==='hrEmpHistory'){
      if(params&&params.kind==='ot') resolve({ok:true,kind:'ot',name:'นายตัวอย่าง ทดสอบ',history:MOCK_OT_HIST,count:MOCK_OT_HIST.length});
      else resolve({ok:true,kind:'leave',name:'นางสาวชนัญชิดา โชคธนอนันต์',history:MOCK_LV_HIST,count:MOCK_LV_HIST.length,
        summary:lvSummary(MOCK_LV_HIST),balances:{vac:16,biz:10,sick:29},
        leaveStats:[{key:'vac',name:'พักร้อน',emoji:'🌴',used:2.5,remaining:3.5},{key:'biz',name:'ลากิจ',emoji:'🏠',used:3,remaining:0},
          {key:'sick',name:'ลาป่วย',emoji:'🤒',used:5,remaining:25},{key:'bday',name:'ลาวันเกิด',emoji:'🎂',used:0,remaining:1},
          {key:'special',name:'วันเกิดคนพิเศษ',emoji:'💝',used:0,remaining:1},{key:'unpaid',name:'ลาไม่รับค่าจ้าง',emoji:'📄',used:2,remaining:1}]}); }
    else resolve({ok:true,profile:S.profile,balances:S.balances,holidays:S.holidays,schedule:S.schedule,leaveTypes:S.leaveTypes,
      otTypes:S.otTypes,otThisMonth:S.otThisMonth,recent:S.recent});
  },220); });
}
