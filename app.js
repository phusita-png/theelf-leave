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
  hr:      ['แผง HR','ภาพรวม & รออนุมัติ']
};

var S = {
  auth:null, profile:null, balances:null, holidays:[], leaveTypes:null, otTypes:null,
  otThisMonth:{hours:0,count:0}, recent:[], avatar:null,
  view:'home',
  leaveForm:{type:'vac',start:null,end:null,period:'full',reason:'',stime:'',etime:''},
  otForm:{date:null,start:'',end:'',type:'1',reason:''},
  calLeave:new Date(), calOt:new Date(), histTab:'leave',
  editLeaveId:null, pendingEdit:null   // โหมดแก้ไขใบลาที่ HR ส่งกลับ
};

// ════════════ INIT ════════════
window.addEventListener('DOMContentLoaded', init);
function init() {
  bindNav();
  if (CFG.MOCK) { mockBootstrap(); return; }
  if (CFG.DEV_USER_ID) { S.auth = {userId:CFG.DEV_USER_ID}; bootstrap(); return; }
  initLiff();
}
function initLiff() {
  if (!window.liff || !CFG.LIFF_ID || CFG.LIFF_ID.indexOf('PASTE') === 0)
    return fail('ยังไม่ได้ตั้งค่า LIFF_ID ใน config.js');
  liff.init({liffId:CFG.LIFF_ID}).then(function(){
    if (!liff.isLoggedIn()) { liff.login(); return; }
    S.auth = {idToken:liff.getIDToken()};
    // deep-link ?edit=LV-xxx (HR ส่งกลับให้แก้) — รับจาก query หรือ liff.state
    try {
      var qs = new URLSearchParams(location.search);
      S.pendingEdit = qs.get('edit');
      if (!S.pendingEdit && liff.state) S.pendingEdit = new URLSearchParams(String(liff.state).replace(/^\?/,'')).get('edit');
    } catch(e){}
    liff.getProfile().then(function(p){ S.avatar = p.pictureUrl; paintAvatar(); }).catch(function(){});
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
    window[cb] = function(d){ if(done)return; done=true; clearTimeout(t); clean(); resolve(d); };
    function clean(){ delete window[cb]; if(sc.parentNode) sc.parentNode.removeChild(sc); }
    sc.onerror = function(){ if(done)return; done=true; clearTimeout(t); clean(); reject(new Error('เชื่อมต่อ API ไม่ได้')); };
    sc.src = CFG.API_URL + '?' + q.join('&');
    document.body.appendChild(sc);
  });
}

// ════════════ BOOTSTRAP ════════════
function bootstrap() {
  api('bootstrap', {}).then(function(r){
    if (!r.ok) return fail(r.error || 'โหลดข้อมูลไม่สำเร็จ', r.needRegister ? '📝' : '😿');
    apply(r);
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    paintAvatar(); render();
    if (S.pendingEdit) enterEditByLeaveId(S.pendingEdit);   // deep-link → เปิดหน้าแก้เลย
  }).catch(function(e){ fail(String(e.message || e)); });
}
function apply(r){
  S.profile=r.profile; S.balances=r.balances; S.holidays=r.holidays||[];
  S.leaveTypes=r.leaveTypes; S.otTypes=r.otTypes||{}; S.otThisMonth=r.otThisMonth||{hours:0,count:0};
  S.recent=r.recent||[];
}
function fail(msg, emo){
  document.getElementById('loader').innerHTML =
    '<div class="empty"><div class="e-emo">'+(emo||'😿')+'</div><div class="e-txt">'+esc(msg)+'</div></div>';
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
  var lt = S.leaveTypes, keys = ['vac','biz','sick'];   // แสดงแค่ 3 ประเภทหลัก
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
  return '<div class="card">'+
    '<div class="card-title ot"><span class="ic"></span>ประเภท OT</div>'+
    '<div id="otTypeGrid"></div>'+
    '<label class="field-lb">📅 วันที่ทำ OT <span style="font-weight:400">(ย้อนหลังได้ ≤30 วัน)</span></label>'+
    '<div id="calOt"></div>'+
    '<label class="field-lb">⏰ เวลาทำงาน</label>'+
    '<div class="time-row"><input type="time" id="otStart"><span class="dash">→</span><input type="time" id="otEnd"></div>'+
    '<label class="field-lb">📝 เหตุผล / รายละเอียด</label>'+
    '<textarea id="otReason" rows="2" placeholder="ระบุรายละเอียดงาน (ถ้ามี)…"></textarea>'+
    '<div id="otSummary" style="margin-top:16px"></div>'+
    '<div style="margin-top:12px"><button id="btnOt" class="btn btn-ot">ส่งคำขอ OT</button></div>'+
  '</div>';
}
function wireOt(){
  renderOtTypeGrid(); renderCal('ot'); renderOtSummary();
  document.getElementById('otStart').value = S.otForm.start;
  document.getElementById('otEnd').value = S.otForm.end;
  document.getElementById('otStart').addEventListener('input', function(e){ S.otForm.start=e.target.value; renderOtSummary(); });
  document.getElementById('otEnd').addEventListener('input', function(e){ S.otForm.end=e.target.value; renderOtSummary(); });
  document.getElementById('otReason').addEventListener('input', function(e){ S.otForm.reason=e.target.value; });
  document.getElementById('btnOt').addEventListener('click', submitOt);
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
  var f = S.otForm;
  if (!f.date) return toast('กรุณาเลือกวันที่ทำ OT','err');
  if (!f.start || !f.end) return toast('กรุณาใส่เวลาเริ่ม-สิ้นสุด','err');
  if (otHours(f.start,f.end)<=0) return toast('เวลาเริ่ม-สิ้นสุดต้องไม่เท่ากัน','err');
  var hrs=otHours(f.start,f.end);
  confirmModal({ title:'ยืนยันการขอ OT', emoji:'⏰', accent:'ot', onConfirm:doSubmitOt, rows:[
    {k:'ประเภท', v:S.otTypes[f.type]||'-'},
    {k:'วันที่',  v:fmtThai(f.date)},
    {k:'เวลา',    v:f.start+' → '+f.end+(endBeforeStart(f.start,f.end)?' 🌙':'')},
    {k:'รวม',     v:hrs+' ชม.'},
    {k:'เหตุผล',  v:f.reason||'—'}
  ]});
}
function doSubmitOt(){
  var f = S.otForm;
  var btn = document.getElementById('btnOt'); if(btn){ btn.disabled=true; btn.textContent='กำลังส่ง…'; }
  api('otSubmit',{otDate:fmtThai(f.date),startTime:f.start,endTime:f.end,otType:f.type,reason:f.reason||''})
  .then(function(r){
    if(!r.ok){ if(btn){btn.disabled=false;btn.textContent='ส่งคำขอ OT';} return toast(r.error||'ส่งไม่สำเร็จ','err'); }
    toast('✅ ส่งคำขอ OT แล้ว · '+r.hours+' ชม.','ok');
    S.otForm={date:null,start:'',end:'',type:'1',reason:''};
    refresh(); setTimeout(function(){ S.histTab='ot'; goTo('history'); },1100);
  }).catch(function(e){ if(btn){btn.disabled=false;btn.textContent='ส่งคำขอ OT';} toast(String(e.message||e),'err'); });
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

  var h = '<div class="cal-head"><button class="cal-nav" id="cP">‹</button>'+
    '<div class="cal-month">'+TH_MONTHS[mo]+' '+(y+543)+'</div>'+
    '<button class="cal-nav" id="cN">›</button></div><div class="cal-grid">';
  TH_DOW.forEach(function(d,i){ h += '<div class="cal-dow'+(i===0||i===6?' we':'')+'">'+d+'</div>'; });
  for (var i=0;i<first;i++) h += '<div class="cal-day empty"></div>';
  for (var d=1;d<=days;d++){
    var dt = new Date(y,mo,d), k = dkey(dt), dow = dt.getDay();
    var dim = isOt && (dt>today || (minD && dt<minD));
    var cls = 'cal-day';
    if (dow===0||dow===6) cls+=' we';
    if (isHoliday(dt)) cls+=' holiday';
    if (k===todayK) cls+=' today';
    if (dim) cls+=' dim';
    if (isOt){ if(form.date && k===dkey(form.date)) cls+=' sel ot'; }
    else {
      if (form.start && k===dkey(form.start)) cls+=' sel';
      if (form.end && k===dkey(form.end)) cls+=' sel';
      if (form.start && form.end && dt>form.start && dt<form.end) cls+=' inrange';
    }
    h += '<div class="'+cls+'"'+(dim?'':' data-d="'+d+'"')+'>'+d+'</div>';
  }
  h += '</div>';
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
function loadLeaveHistory(){
  api('history',{}).then(function(r){
    var body = document.getElementById('histBody'); if(!body) return;
    if(!r.ok) return body.innerHTML = emptyBox('😿', r.error||'โหลดไม่ได้');
    if(!r.history.length) return body.innerHTML = emptyBox('🍃','ยังไม่มีประวัติการลา');
    body.innerHTML = '<div class="card">'+r.history.map(function(h){
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
      return '<div class="hist"><div class="hist-ic">⏰</div>'+
        '<div class="hist-main"><div class="hist-type">'+esc(o.otType||'OT')+'</div>'+
        '<div class="hist-meta"><span>📅 '+esc(o.otDate)+'</span><span>·</span>'+
        '<span>🕐 '+esc(o.startTime)+'–'+esc(o.endTime)+'</span><span>·</span><span>'+o.hours+' ชม.</span></div></div>'+
        statusBadge(o.status)+'</div>'; }).join('')+'</div>';
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
function openSlipFile(month, yearBE){ fetchFile('slipFile', {month:month, yearBE:yearBE}); }
function openDocFile(url){ fetchFile('docFile', {url:url}); }
function fetchFile(action, params){
  if (CFG.MOCK){ toast('โหมดพรีวิว — ต่อข้อมูลจริงถึงเปิดไฟล์ได้ค่ะ'); return; }
  showViewer('loading');
  api(action, params).then(function(r){
    if(!r.ok){
      if(r.openDirect && r.url){ closeViewer(); return openUrl(r.url); }
      closeViewer(); return toast(r.error||'เปิดไฟล์ไม่ได้','err');
    }
    var blob = b64toBlob(r.b64, r.mime||'application/pdf');
    showViewer('file', URL.createObjectURL(blob), r.name);
  }).catch(function(e){ closeViewer(); toast(String(e.message||e),'err'); });
}
function b64toBlob(b64, mime){
  var bin=atob(b64), len=bin.length, arr=new Uint8Array(len);
  for(var i=0;i<len;i++) arr[i]=bin.charCodeAt(i);
  return new Blob([arr], {type:mime});
}
function showViewer(state, url, name){
  var v=document.getElementById('viewer');
  if(!v){ v=document.createElement('div'); v.id='viewer'; v.className='viewer'; document.body.appendChild(v); }
  if(state==='loading'){
    v.innerHTML='<div class="vw-box"><div class="vw-load">⏳ กำลังเปิดไฟล์…</div></div>';
    v.classList.add('show'); return;
  }
  v.innerHTML='<div class="vw-box"><div class="vw-bar"><span class="vw-name">'+esc(name||'เอกสาร')+'</span>'+
    '<button class="vw-x" data-vwclose>✕</button></div>'+
    '<iframe class="vw-frame" src="'+url+'"></iframe>'+
    '<a class="vw-dl" href="'+url+'" download="'+esc(name||'file.pdf')+'">⬇ ดาวน์โหลด / เปิดด้วยแอปอ่าน PDF</a></div>';
  v.classList.add('show');
  v.querySelector('[data-vwclose]').addEventListener('click', closeViewer);
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
    m.innerHTML = backBar()+renderHr(r); bindBack(); wireHrPending();
  }).catch(function(e){ var m=document.getElementById('main'); if(m){ m.innerHTML=backBar()+emptyBox('😿',String(e.message||e)); bindBack(); } });
}
function wireHrPending(){
  document.querySelectorAll('[data-appr]').forEach(function(el){
    el.addEventListener('click', function(){ doHrApprove(el.dataset.kind, el.dataset.id, el.dataset.name); }); });
  document.querySelectorAll('[data-rej]').forEach(function(el){
    el.addEventListener('click', function(){ doHrReject(el.dataset.kind, el.dataset.id, el.dataset.name); }); });
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
      closeConfirm(); hrDecide(kind, id, 'reject', rs);
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
    var amt = x.kind==='ot' ? (x.hours+' ชม.') : (x.days+' วัน');
    var d = 'data-kind="'+x.kind+'" data-id="'+esc(x.id)+'" data-name="'+esc(x.name)+'"';
    return '<div class="pend"><div class="pend-top"><div class="hist-ic">'+emo+'</div><div class="hist-main">'+
      '<div class="hist-type">'+esc(x.name)+'</div>'+
      '<div class="hist-meta">'+esc(x.type)+' · '+esc(x.date)+' · '+amt+' · '+esc(x.id)+'</div></div></div>'+
      '<div class="pend-act">'+
        '<button class="pend-btn no" data-rej="1" '+d+'>❌ ไม่อนุมัติ</button>'+
        '<button class="pend-btn ok" data-appr="1" '+d+'>✅ อนุมัติ</button>'+
      '</div></div>'; }).join('')
    : '<div class="empty" style="padding:20px"><div class="e-emo">✅</div><div class="e-txt">ไม่มีรายการค้างอนุมัติ</div></div>';
  var pendCard='<div class="card"><div class="card-title"><span class="ic"></span>รออนุมัติ ('+r.pending.length+')</div>'+
    (r.pending.length?'<div class="hr-note ok2">👇 กดอนุมัติ/ไม่อนุมัติได้เลย · ระบบแจ้งพนักงานทาง LINE อัตโนมัติ</div>':'')+pend+'</div>';

  var emps = r.employees.map(function(e){
    var over = String(e.status).indexOf('เกิน')>=0;
    return '<div class="hist"><div class="hist-ic">👤</div><div class="hist-main">'+
      '<div class="hist-type">'+esc(e.name)+'</div>'+
      '<div class="hist-meta">'+esc(e.dept||'')+' · 🌴'+e.vac+' 🏠'+e.biz+' 🤒'+e.sick+'</div></div>'+
      (over?'<span class="badge no">เกินสิทธิ์</span>':'')+'</div>'; }).join('');
  var empCard='<div class="card"><div class="card-title"><span class="ic"></span>พนักงาน ('+r.employees.length+') · สิทธิ์คงเหลือ</div>'+
    (emps||'<div class="empty" style="padding:20px"><div class="e-txt">ไม่มีข้อมูล</div></div>')+'</div>';

  return summary+otcard+pendCard+empCard;
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
function isHoliday(d){ var k=fmtThai(d); return S.holidays.some(function(h){ return h.date===k; }); }
function countLeaveDays(f){
  if (f.period==='morning'||f.period==='afternoon') return 0.5;
  if (f.period==='hours'){ var h=otHours(f.stime,f.etime); return h>0?Math.round(h/8*100)/100:0; }
  if (!f.end || dkey(f.end)===dkey(f.start)) return 1;
  return Math.round((f.end-f.start)/86400000)+1;
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
  {otId:'OT-001',otDate:'03/06/2569',startTime:'18:00',endTime:'21:30',hours:3.5,otType:'มีงานด่วน',status:'อนุมัติ'},
  {otId:'OT-002',otDate:'28/05/2569',startTime:'22:00',endTime:'01:00',hours:3,otType:'ลูกค้าร้องขอ',status:'รอการอนุมัติ'}];
var MOCK_SLIPS = [
  {label:'พฤษภาคม 2569',net:27850,income:30000,sso:750,tax:400,deduct:2150,ot:1200,ytdInc:148000,ytdTax:1900,ytdSso:3750,slipUrl:''},
  {label:'เมษายน 2569',net:26500,income:28500,sso:750,tax:350,deduct:2000,ot:0,ytdInc:118000,ytdTax:1500,ytdSso:3000,slipUrl:''}];
function mockBootstrap(){
  S.auth={userId:'MOCK'};
  S.profile={name:'นางสาวชนัญชิดา โชคธนอนันต์',empId:'EMP-001',dept:'สำนักงานใหญ่',role:'APPROVER',canApprove:true};
  S.balances={vac:{name:'พักร้อน',emoji:'🌴',remaining:16},biz:{name:'ลากิจ',emoji:'🏠',remaining:10},sick:{name:'ลาป่วย',emoji:'🤒',remaining:29},
    unpaid:{name:'ไม่รับค่าจ้าง',emoji:'📄',remaining:7},bday:{name:'วันเกิด',emoji:'🎂',remaining:1},special:{name:'คนพิเศษ',emoji:'💝',remaining:1}};
  S.holidays=[{date:'12/06/2569',name:'ตัวอย่างวันหยุด'}];
  S.leaveTypes=MOCK_LT; S.otTypes=MOCK_OTT; S.otThisMonth={hours:6.5,count:2,period:'26/5 – 25/6/2569'};
  S.recent=[
    {kind:'ot',title:'OT · มีงานด่วน',dateText:'03/06/2569',amount:'3.5 ชม.',status:'อนุมัติ'},
    {kind:'leave',title:'ลากิจ',dateText:'02/06/2569',amount:'1 วัน',status:'รอการอนุมัติ'},
    {kind:'ot',title:'OT · ลูกค้าร้องขอ',dateText:'28/05/2569',amount:'3 ชม.',status:'รอการอนุมัติ'}];
  document.getElementById('loader').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  render();
}
function mockApi(action){
  return new Promise(function(resolve){ setTimeout(function(){
    if(action==='history') resolve({ok:true,count:MOCK_LV_HIST.length,history:MOCK_LV_HIST});
    else if(action==='otHistory') resolve({ok:true,count:MOCK_OT_HIST.length,history:MOCK_OT_HIST});
    else if(action==='submit') resolve({ok:true,leaveId:'LV-MOCK'});
    else if(action==='otSubmit') resolve({ok:true,otId:'OT-MOCK',hours:otHours(S.otForm.start,S.otForm.end)});
    else if(action==='payslip') resolve({ok:true,latest:MOCK_SLIPS[0],slips:MOCK_SLIPS});
    else if(action==='documents') resolve({ok:true,documents:[
      {name:'หนังสือรับรองเงินเดือน พ.ค. 69',url:'#',category:'หนังสือรับรอง',scope:'ส่วนตัว'},
      {name:'นโยบายวันลา ปี 2569',url:'#',category:'นโยบาย',scope:'ทั้งบริษัท'},
      {name:'ฟอร์มเบิกค่ารักษาพยาบาล',url:'#',category:'แบบฟอร์ม',scope:'ทั้งบริษัท'}]});
    else if(action==='approve') resolve({ok:true,id:'(mock)',status:'✅'});
    else if(action==='hrDashboard') resolve({ok:true,monthLabel:'มิถุนายน 2569',
      leave:{total:8,approved:5,pending:2,rejected:1},ot:{hours:24.5,count:6,pending:1},
      employees:[{name:'นางสาวชนัญชิดา โชคธนอนันต์',dept:'สำนักงานใหญ่',vac:16,biz:10,sick:29,used:5,status:'✅ ปกติ'},
        {name:'นายตัวอย่าง ทดสอบ',dept:'ฝ่ายขาย',vac:6,biz:0,sick:28,used:12,status:'⚠️ เกินสิทธิ์'}],
      pending:[{kind:'leave',id:'LV-003',name:'นางสาวชนัญชิดา โชคธนอนันต์',type:'ลากิจ',date:'02/06/2569',days:1},
        {kind:'ot',id:'OT-002',name:'นายตัวอย่าง ทดสอบ',type:'ลูกค้าร้องขอ',date:'28/05/2569',hours:3}]});
    else resolve({ok:true,profile:S.profile,balances:S.balances,holidays:S.holidays,leaveTypes:S.leaveTypes,
      otTypes:S.otTypes,otThisMonth:S.otThisMonth,recent:S.recent});
  },220); });
}
