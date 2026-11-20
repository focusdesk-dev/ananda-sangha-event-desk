'use strict';
const fs=require('fs'),assert=require('assert'),path=require('path');
const file=process.env.ANANDA_INDEX_PATH||'index.html';
const original=fs.readFileSync(file,'utf8');let src=original;
function replaceOnce(a,b,label){
  const i=src.indexOf(a);
  assert(i>=0,'Missing Patch14.12 source: '+label);
  assert(src.indexOf(a,i+a.length)<0,'Ambiguous source: '+label);
  src=src.slice(0,i)+b+src.slice(i+a.length);
}
assert(src.includes('// PATCH 14.12 END'),'Must use approved Patch14.12 archive');
assert(!src.includes('p1413HistoricalStudentRecords'),'Rejected patch must not be in baseline');

// 1. Correct Classes Conducted: past date is not evidence of a held class.
replaceOnce(
  'conducted:!!date&&date<=today()&&!cancelled.has(date)}));',
  'conducted:!!date&&date<=today()&&!cancelled.has(date)&&'+
  '((Array.isArray(b.conductedDates)&&b.conductedDates.includes(date))||'+
  'state.classEnrollments.some(en=>String(en.batchId)===String(b.id)&&en.attendance&&'+
  '(en.attendance[date]===true||en.attendance[date]===false)))}));',
  'conducted date calculation'
);

// 2. Replace Review Required dialog only, do not change global security or other enrolment UI.
const begin='      function p2v557OpenReviewApproval(studentId,sourceBatchId,targetBatchId){';
const finish='      function p2v550RenderApprovals(){';
const a=src.indexOf(begin),z=src.indexOf(finish,a);
assert(a>=0&&z>a&&z-a<10000,'Cannot isolate original review function');
const review=fs.readFileSync(path.join(__dirname,'patch14-14-review.txt'),'utf8');
assert(review.startsWith(begin)&&review.includes('v51PasswordHash'),'Invalid review implementation');
src=src.slice(0,a)+review+src.slice(z);

// 3. Add exactly four optional historical fields inside existing student modal.
const mobile='<div class="field"><label>MOBILE NUMBER *</label><input id="p2StudentMobile" inputmode="numeric" maxlength="10" required></div>';
replaceOnce(mobile,mobile+
 '<div class="field"><label>CLASS LEVEL (HISTORICAL)</label><select id="p1414HistoryLevel"><option value="">Not specified</option><option>Level 1</option><option>Level 2</option><option>Level 3</option><option>Level 4</option></select></div>'+
 '<div class="field"><label>BATCH</label><input id="p1414HistoryBatch" placeholder="e.g. Batch 1" maxlength="80"></div>'+
 '<div class="field"><label>YEAR</label><input id="p1414HistoryYear" placeholder="e.g. 2020" inputmode="numeric" maxlength="4"></div>'+
 '<div class="field"><label>COMPLETION STATUS</label><select id="p1414HistoryStatus"><option value="">Not specified</option><option>Completed</option><option>Paused</option><option>Unknown</option></select></div>'+
 '<div class="field full hidden" id="p1414HistoryPasswordField"><label>ADMIN PASSWORD TO CONFIRM HISTORICAL COMPLETION</label><input id="p1414HistoryPassword" type="password" autocomplete="current-password"></div>',
 'add student fields');
const openTitle="'p2StudentModalTitle').textContent=s?'Edit student':'Add student';";
replaceOnce(openTitle,openTitle+
 "const history=(Array.isArray(s?.historicalClassRecords)?s.historicalClassRecords:[]).slice().sort((a,b)=>Number(b.year)-Number(a.year))[0]||{};"+
 "$('p1414HistoryLevel').value=history.level||'';"+
 "$('p1414HistoryBatch').value=history.batch||'';"+
 "$('p1414HistoryYear').value=history.year||'';"+
 "$('p1414HistoryStatus').value=history.status||'';"+
 "$('p1414HistoryPassword').value='';"+
 "$('p1414HistoryPasswordField').classList.toggle('hidden',history.status!=='Completed');",
 'student form prefill');
replaceOnce("  $('p2StudentForm').onsubmit=e=>{e.preventDefault();",
            "  $('p2StudentForm').onsubmit=async e=>{e.preventDefault();",
            'student save handler async');
const saveAnchor="if(!id)state.students.push(s);p2LinkStudent(s);";
const saveHistory=fs.readFileSync(path.join(__dirname,'patch14-14-history-save.txt'),'utf8');
replaceOnce(saveAnchor,saveHistory+saveAnchor,'historical save');
const saveEnd="toast(id?'Student updated':'Student added')};";
replaceOnce(saveEnd,saveEnd+
 "\n  $('p1414HistoryStatus').onchange=()=>{$('p1414HistoryPasswordField').classList.toggle('hidden',$('p1414HistoryStatus').value!=='Completed');};",
 'completion password visibility');
const qualifier="          return qualifies?{ok:true,reason:''}:";
replaceOnce(qualifier,
 "          const verifiedHistorical=Array.isArray(student.historicalClassRecords)&&"+
 "student.historicalClassRecords.some(r=>r.level===previous&&r.status==='Completed'&&"+
 "r.verifiedByAdmin===true&&Number(r.year)>=1900&&Number(r.year)<=new Date().getFullYear());\n"+
 "          return (qualifies||verifiedHistorical)?{ok:true,reason:''}:",
 'level 2-4 historical eligibility');
assert(!src.includes('p1413HistoricalStudentRecords'),'Rejected code detected');
assert(src.includes('p1414ReviewAccept')&&src.includes('p1414HistoryStatus'));
fs.writeFileSync(file,src);
console.log('PASS three targeted changes, existing app structure and attendance preserved.');
