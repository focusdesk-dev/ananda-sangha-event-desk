'use strict';
const fs=require('fs'),assert=require('assert'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const a=html.indexOf('    // BETA536: One class-wide attendance list.');
const b=html.indexOf('    // Simplify visible UI without breaking QR photo receipt or settings.',a);
assert(a>0&&b>a,'Unified class-wide attendance module missing');
const fragment=html.slice(a,b);
const students=Array.from({length:37},(_,i)=>({en:{id:'EN'+(i+1),attendance:{}},p:{name:'Student '+String(i+1).padStart(2,'0'),mobile:''}}));
const bch={id:'B1',name:'Batch 1'};
let date='2026-11-05',saved=0,confirmations=0;
students[30].en.attendance[date]=true; // Previously saved: must NOT precheck new scan.
const toasts=[];
const ui={p2v58Roster:{innerHTML:'',querySelectorAll:()=>[]},p2v58Totals:{innerHTML:''},p2v536Progress:{textContent:''},p2v511Review:{classList:{add:()=>{}}}};
const ctx={p2v58CurrentBatch:()=>bch,p2v58Date:date,p2v518CurrentRowsBase:()=>students.slice(30),
 state:{classEnrollments:students.map(x=>({...x.en,batchId:'B1'}))},
 p2v5Person:en=>students.find(x=>x.en.id===en.id)?.p||{name:'Unknown'},
 p2v58AttendanceValue:(en,d)=>en.attendance[d]===undefined?null:en.attendance[d],
 p2v58Draft:{},p2v531Active:false,document:{},p2v531MoveReview:()=>{},p2v530SetStatus:()=>{},
 $:id=>ui[id]||null,p2v58ApplySearch:()=>{},esc:s=>String(s),
 toast:s=>toasts.push(String(s)),save:()=>{saved++},window:{confirm:()=>{confirmations++;return true}},setTimeout,console};
vm.runInNewContext(fragment+'\n;globalThis.test={print:p2v536OnPrint,merge:p2v536MergeAiSheet,mark:p2v536MarkRemainingAbsent,confirm:p2v536ConfirmAttendance,render:p2v536RenderFullRoster,draft:()=>p2v536Draft,scanned:()=>Array.from(p2v536ScannedSheets),expected:()=>p2v536ExpectedPages};',ctx,{timeout:1000});
const t=ctx.test;
t.render();
assert.strictEqual(t.draft().EN31,null,'Reopened page 2 must never preload previous saved marks');
function sheet(number,first,last){
 const rows=students.slice(first-1,last),nums=rows.map((_,i)=>first+i);
 return{data:{batchId:'B1',date,sheet:number,totalSheets:2,printRunId:'ONE-RUN'},rows,nums};
}
t.print(2,'ONE-RUN');
const s1=sheet(1,1,30),s2=sheet(2,31,37);
t.merge(s1.data,s1.rows,s1.nums,new Set([1,4,16,30]));
assert.strictEqual(t.scanned().length,1);
t.render();
assert(ui.p2v58Roster.innerHTML.includes('Student 37'),'Full class must show before second page');
assert(ui.p2v58Roster.innerHTML.includes('Student 01'),'Sheet 1 must show even if legacy active rows only include Sheet 2');
assert(ui.p2v58Roster.innerHTML.includes('37</span>'),'37th student must appear with continuous numbering');
t.mark();
assert(toasts.some(x=>/More printed pages/.test(x)),'Cannot mark unscanned page absent');
assert.strictEqual(saved,0);
const invalidPage2={...s2,rows:[...s2.rows].reverse()};
assert.throws(()=>t.merge({...s2.data,printRunId:'DIFFERENT-RUN'},invalidPage2.rows,s2.nums,new Set([31])),
 /different student roster/i,'Mismatched frozen page 2 must be refused without touching page 1');
assert.strictEqual(t.scanned().length,1,'Invalid second page cannot count as received');
t.merge({...s2.data,printRunId:'DIFFERENT-RUN'},s2.rows,s2.nums,new Set([31,37]));
assert.strictEqual(t.scanned().length,2);
assert([1,4,16,30,31,37].every(x=>t.draft()['EN'+x]===true),'All scanned-page detections must survive');
assert.strictEqual(t.draft().EN32,null,'Blank last-page rows must remain Unmarked');
assert.strictEqual(students[0].en.attendance[date],undefined,'Scans cannot save records automatically');
t.mark();
assert.strictEqual(t.draft().EN32,false,'Only explicit mark-remaining-absent applies absence');
assert.strictEqual(t.draft().EN2,false,'All remaining unmarked students on Sheet 1 must become Absent');
assert.strictEqual(t.draft().EN29,false,'Sheet 1 end must become Absent despite active Sheet 2 scope');
t.confirm();
assert.strictEqual(saved,1,'One final confirmation saves once');
assert.strictEqual(confirmations,1);
assert.strictEqual(students[0].en.attendance[date],true);
assert.strictEqual(students[30].en.attendance[date],true);
assert.strictEqual(students[31].en.attendance[date],false);
assert.strictEqual(students[36].en.attendance[date],true);
assert(ui.p2v58Roster.innerHTML.includes('Student 37'),'Full class remains visible after saving');
const before=saved;
t.merge(s2.data,s2.rows,s2.nums,new Set([32]));
assert.strictEqual(saved,before,'A rescan is not a save');
assert.strictEqual(t.draft().EN1,true,'Rescan of page 2 cannot overwrite page 1');
assert.strictEqual(t.draft().EN32,true,'A later photo can update its student');
t.print(2,'FRESH-PRINT');
assert.strictEqual(t.scanned().length,0,'Printing a new set must start a clean scan');
assert.strictEqual(t.draft().EN31,null,'New scan must clear old page-2 checkmarks');
assert.strictEqual(t.draft().EN1,null,'New scan must clear old page-1 checkmarks');
assert.strictEqual(students[0].en.attendance[date],true,'Previously confirmed attendance remains stored');
console.log('PASS: 37 students; clean reopening; mixed-run page 2 with identical roster; reject changed roster; 30+7 QR photos; safe rescan and restart; final save preserved');