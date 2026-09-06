/**
 * Prompt Studio — Unlock Code Backend (Google Apps Script)
 * ฐานข้อมูล: Google Sheets (ฟรี) — deploy เป็น Web App ใช้กับเว็บ static ได้เลย
 *
 * ชีตที่ใช้ (สร้างอัตโนมัติเมื่อรัน setup()):
 *   Codes   : code | plan | status | created | used_at | buyer
 *   Members : joined_at | code | plan | buyer | expires
 *
 * ====== ตั้งค่า ======
 * 1. สร้าง Google Sheet ใหม่ → Extensions → Apps Script → วางไฟล์นี้ทั้งหมด
 * 2. แก้ ADMIN_PW ด้านล่าง (รหัสลับสำหรับ admin เท่านั้น)
 * 3. รันฟังก์ชัน setup() ครั้งเดียว (สร้างชีต + ใส่โค้ดตัวอย่าง)
 * 4. Deploy → New deployment → Web app
 *      Execute as: Me | Who has access: Anyone
 *    คัดลอก Web app URL ไปใส่ใน STORE.api ของ index.html
 * 5. เพิ่มรหัสใหม่: รัน addCodes('yearly', 10) ใน editor หรือเพิ่มในชีต Codes เอง
 */

const ADMIN_PW = 'CHANGE-ME-1234';   // ⚠️ เปลี่ยนเป็นรหัสลับของพี่ก่อนใช้จริง
const SHEET_ID = '';                 // เว้นว่าง = ใช้ spreadsheet ที่ script ผูกอยู่

function ss(){ return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet(); }

function setup(){
  const s = ss();
  let c = s.getSheetByName('Codes') || s.insertSheet('Codes');
  if (c.getLastRow() === 0) c.appendRow(['code','plan','status','created','used_at','buyer']);
  let m = s.getSheetByName('Members') || s.insertSheet('Members');
  if (m.getLastRow() === 0) m.appendRow(['joined_at','code','plan','buyer','expires']);
  // โค้ดตัวอย่างเริ่มต้น (ลบ/แก้ได้)
  const codes = generateCodes(5,'monthly').concat(generateCodes(5,'yearly'));
  codes.forEach(x => c.appendRow([x.code, x.plan, 'unused', new Date(), '', '']));
}

/* ---------- สร้างรหัสแบบสุ่ม ไม่ซ้ำง่าย ---------- */
function generateCodes(n, plan){
  const CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ตัดตัวอักษรสับสน (0,O,1,I)
  const out = [];
  for (let i=0;i<n;i++){
    let code;
    do { code = 'PS-' + Array.from({length:8},()=>CH[Math.floor(Math.random()*CH.length)]).join(''); }
    while (out.some(x=>x.code===code));
    out.push({code, plan});
  }
  return out;
}
function addCodes(plan, n){ // plan: 'monthly' | 'yearly'
  const c = ss().getSheetByName('Codes');
  generateCodes(n, plan).forEach(x => c.appendRow([x.code, x.plan, 'unused', new Date(), '', '']));
  return 'เพิ่ม ' + n + ' โค้ด ' + plan + ' แล้ว — ดูในชีต Codes';
}

/* ---------- API หลัก (POST จากหน้าเว็บ) ---------- */
function doPost(e){
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const r = JSON.parse(e.postData.contents);
    if (r.action === 'redeem') return json(redeemCode(r.code));
    if (r.action === 'admin')  return json(adminData(r.pw));
    return json({ok:false, error:'unknown action'});
  } catch(err){ return json({ok:false, error:String(err)}); }
  finally { lock.releaseLock(); }
}

/* GET: ?action=admin&pw=xxx จะเห็นตารางสมาชิกในเบราว์เซอร์ */
function doGet(e){
  const p = e.parameter || {};
  if (p.action === 'admin'){
    if (p.pw !== ADMIN_PW) return HtmlService.createHtmlOutput('<h3>รหัสผ่านไม่ถูกต้อง</h3>');
    const d = adminData(p.pw);
    let h = '<h2>Prompt Studio — รายงานสมาชิก</h2><style>body{font-family:sans-serif}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px 10px}</style>';
    h += '<h3>สมาชิกที่ใช้งาน (' + d.members.length + ')</h3><table><tr><th>วันที่สมัคร</th><th>แพ็ก</th><th>รหัส</th><th>ผู้ซื้อ</th><th>หมดอายุ</th></tr>';
    d.members.forEach(m => h += '<tr><td>'+m.joined+'</td><td>'+m.plan+'</td><td>'+m.code+'</td><td>'+(m.buyer||'-')+'</td><td>'+m.expires+'</td></tr>');
    h += '</table><h3>โค้ดคงเหลือ (unused)</h3><table><tr><th>รหัส</th><th>แพ็ก</th></tr>';
    d.unused.forEach(u => h += '<tr><td>'+u.code+'</td><td>'+u.plan+'</td></tr>');
    h += '</table>';
    return HtmlService.createHtmlOutput(h);
  }
  return HtmlService.createHtmlOutput('Prompt Studio API — OK');
}

/* ---------- Logic: ใช้รหัส (one-time) ---------- */
function redeemCode(raw){
  const code = String(raw||'').trim().toUpperCase().replace(/[\s-]/g,'');
  if (!code) return {ok:false, error:'กรุณาใส่รหัส'};
  const c = ss().getSheetByName('Codes');
  const rows = c.getDataRange().getValues();
  for (let i=1;i<rows.length;i++){
    const sheetCode = String(rows[i][0]).trim().toUpperCase().replace(/[\s-]/g,'');
    if (sheetCode === code){
      if (rows[i][2] === 'used') return {ok:false, error:'รหัสนี้ถูกใช้ไปแล้ว — โปรดติดต่อ LINE @238tqjem'};
      const plan = rows[i][1] === 'yearly' ? 'yearly' : 'monthly';
      const days = plan==='yearly' ? 365 : 30;
      const now = new Date(), exp = new Date(Date.now()+days*864e5);
      c.getRange(i+1,3,1,3).setValues([['used', now, '']]);
      ss().getSheetByName('Members').appendRow([now, code, plan, '', exp]);
      return {ok:true, plan:plan, expires: exp.toISOString()};
    }
  }
  return {ok:false, error:'ไม่พบรหัสนี้ในระบบ — ตรวจสอบอีกครั้ง'};
}

/* ---------- Logic: ข้อมูล admin ---------- */
function adminData(pw){
  if (pw !== ADMIN_PW) return {ok:false, error:'unauthorized'};
  const m = ss().getSheetByName('Members').getDataRange().getValues();
  const c = ss().getSheetByName('Codes').getDataRange().getValues();
  const members = m.slice(1).filter(r=>r[0]).map(r=>({
    joined: new Date(r[0]).toLocaleString('th-TH'), code:r[1], plan:r[2], buyer:r[3],
    expires: r[4] ? new Date(r[4]).toLocaleDateString('th-TH') : ''
  })).reverse();
  const unused = c.slice(1).filter(r=>r[2]==='unused').map(r=>({code:r[0], plan:r[1]}));
  return {ok:true, members, unused};
}

function json(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
