'use strict';
const fs=require('fs'),assert=require('assert'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('  // v5.39: A saved entry for ONE student');
const end=html.indexOf('  p2v58RenderRoster=function(){',start);
assert(start>0&&end>start,'v5.39 saved-attendance status module missing');
const rows=Array.from({length:37},(_,i)=>({en:{id:'EN'+(i+1),attendance:{}},p:{name:'Student '+(i+1)}}));
const nodes={p2v58Manual:{closest:()=>({insertAdjacentElement(_position,node){nodes.p2v510AttendanceNotice=node}})},
p2v58Confirm:{textContent:''}};
const element=()=>({innerHTML:'',id:'',style:{},className:'',hidden:false,
classList:{toggle(name,value){if(name==='hidden')this.owner.hidden=value}}});
const document={createElement(){const n=element();n.classList.owner=n;return n}};
const ctx={document,$:id=>nodes[id]||null,p2v538FullClassRows:()=>rows,
p2v58Date:'2026-09-06',p2v58Draft:{},
p2v58AttendanceValue:(en,date)=>Object.prototype.hasOwnProperty.call(en.attendance,date)?
(en.attendance[date]===true?true:en.attendance[date]===false?false:null):null};
vm.runInNewContext(html.slice(start,end)+';globalThis.audit={summary:p2v510AttendanceSummary,saved:p2v510AttendanceSaved,notice:p2v510AttendanceNotice,setReview:value=>{p2v541SavedReview=value}};',ctx);
const t=ctx.audit;
t.setReview(true); // Explicitly editing already saved attendance.
const redraw=()=>{t.notice();return nodes.p2v510AttendanceNotice};
const resetDraft=()=>{ctx.p2v58Draft={};for(const {en} of rows)ctx.p2v58Draft[en.id]=ctx.p2v58AttendanceValue(en,ctx.p2v58Date)};
resetDraft();
assert.equal(t.saved(),false,'Blank attendance cannot be saved');
assert.equal(redraw().hidden,true,'No green banner for a wholly unmarked class');
rows[0].en.attendance[ctx.p2v58Date]=false;resetDraft();
assert.equal(t.saved(),false,'One absence is not a completed class');
assert(redraw().innerHTML.includes('Attendance incomplete'),'Partial attendance must be warned');
assert(redraw().innerHTML.includes('1 of 37'),'Partial count must be accurate');
for(const {en} of rows)en.attendance[ctx.p2v58Date]=false;resetDraft();
assert.equal(t.saved(),true,'An explicitly fully recorded all-absent class is valid');
assert(redraw().innerHTML.includes('0 present · 37 absent'),'Zero checked boxes can still represent 37 deliberately recorded absences');
ctx.p2v58Draft.EN1=true;
assert(redraw().innerHTML.includes('Unsaved attendance changes'),'Unsaved edits must override green saved banner');
assert.notEqual(redraw().style.background,'#edf9f1','Unsaved edit cannot look successful');
ctx.p2v58Draft.EN1=false;
assert(redraw().innerHTML.includes('Attendance saved'),'Unchanged full class remains saved');
ctx.p2v58Date='2026-09-07';resetDraft();
assert.equal(t.saved(),false,'Changing date cannot inherit the prior saved status');
assert.equal(redraw().hidden,true,'New date has no saved banner');
ctx.p2v58Draft.EN1=true;
assert(redraw().innerHTML.includes('Unsaved attendance changes'),'New manual edit remains unsaved until confirmation');
assert(html.includes('if(typeof p2v510AttendanceNotice===\'function\')p2v510AttendanceNotice()'),
'Full-class renderer must refresh the visible saved-status banner');
assert(html.includes('const zeroDetected=present.size===0&&uncertain.size===0'),
'Zero-detection warning required for printed sheets');
assert(!html.includes('p2v537PermissionReady()'),
'AI scan must not require an extra administrator grant');
assert(html.includes('No students enrolled. Nothing was saved.'),
'Empty batch must not be confirmable');
console.log('PASS: 37-person missing/partial/all-absent attendance, unsaved changes, date switch, render refresh, safe AI detection and empty-batch safeguards');
