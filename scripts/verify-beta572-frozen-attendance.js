'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.ok(['2.0.0-beta.5.79','2.0.0-beta.5.80'].includes(pkg.version));
for(const id of ['p2v572AttendanceStyle','p2v58Roster','p2v58Course','p2v58Batch','p2v58Date','p2v58All','p2v58Clear','p2v58Confirm','p2v531Print','p2v530Status','p2v510AttendanceNotice']){
 assert(html.includes(id),'Missing approved attendance component or handler: '+id);
}
assert(html.includes('p2v536RenderFullRoster'),'Class-wide attendance roster must remain');
assert(html.includes('p2v536ConfirmAttendance'),'Full-class confirm handler must remain');
assert(html.includes('p2v536MarkRemainingAbsent'),'Absent handling must remain');
assert(html.includes('p2v58HandleDataUrl'),'Phone/photo handler must remain');
assert(html.includes('#classAttendanceHub .p2v58-namebar'),'Frozen navy header missing');
assert(html.includes('background:#174e94!important'),'Frozen navy header changed');
assert(html.includes('#classAttendanceHub .p2v58-row.absent'),'Absent red shading missing');
assert(html.includes('background:#fff0f1!important'),'Absent row tint missing');
assert(html.includes('#classAttendanceHub .p2v58-row{'),'Row separation missing');
assert(html.includes('border-bottom:1px solid #e2e9f1!important'),'Subtle row dividers missing');
assert(html.includes('border-bottom:3px solid #ffc329!important'),'Gold divider missing');
assert(html.includes('#classAttendanceHub .p2v58-title-row{display:none!important}'),'Redundant attendance title still visible');
assert(html.includes('body:has(#classAttendanceHub.page.active) .topbar #v51SecurityButton{display:none!important}'),'Master Lists button not hidden');
assert(!html.includes("s.absent+' absent. Editing enabled.'"),'Duplicate saved notice still present');
console.log('PASS: frozen attendance source and preserved QR, photo, and full-class handlers');