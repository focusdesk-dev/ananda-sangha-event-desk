'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const h=fs.readFileSync('index.html','utf8');
assert(!h.includes('Approval is recorded separately from attendance and is required before enrollment'),'Old duplicate Kriya 2 approval table remains');
assert(h.includes("function p2v567SyncKriyaMaster()"));
assert(h.includes("if(level==='Kriya')p2v567SyncKriyaMaster()"));
assert(h.includes("if(p2v519Stage(batch)==='Kriya')p2v567SyncKriyaMaster()"));
assert(h.includes("if(p2v567SyncKriyaMaster())localStorage.setItem(KEY,JSON.stringify(state))"));
assert(h.includes("Kriya initiation</strong>"));
assert(h.includes("Date not recorded"),'Never substitute course completion date for initiation');
assert(h.includes("id=\"p2v567InitiationDate\""));
assert(h.includes("const p2v520Groups=['All','In Progress','Incomplete / Withdrawn','Eligible',"));
assert(h.includes("if(group==='In Progress')return current.filter(x=>!x.b.endedAt"));
assert(h.includes('BETA 5.70</strong>'));
const start=h.indexOf('      function p2v567SyncKriyaMaster(){'),end=h.indexOf('      function p2v519Finalise(',start);
assert(start>=0&&end>start,'Kriya sync source not found');
const mock={
 classEnrollments:[{id:'e1',studentId:'s1',batchId:'b1',outcome:'Completed',completionDate:'2026-11-06'}],
 classBatches:[{id:'b1',endedAt:'2026-11-06T10:00:00',end:'2026-11-06'}],
 students:[{id:'s1',name:'Student One',mobile:'9876543210',kriyaDate:''}],
 kriyabans:[]};
let id=1;
const ctx={state:mock,uid:()=>String(id++),normMobile:s=>String(s||'').replace(/\\D/g,''),normName:s=>String(s||'').trim().toLowerCase(),
 p2v550Stage:()=> 'Kriya',p2FindStudent:id=>mock.students.find(s=>s.id===id)};
vm.createContext(ctx);vm.runInContext(h.slice(start,end)+';globalThis.sync=p2v567SyncKriyaMaster',ctx);
assert.equal(ctx.sync(),true);assert.equal(mock.kriyabans.length,1);
assert.equal(mock.kriyabans[0].kriyaDate,'','Kriya class completion must not invent initiation');
assert.equal(mock.kriyabans[0].kriyaCourseCompletionDate,'2026-11-06');
assert.equal(mock.students[0].kriyabanId,mock.kriyabans[0].id);
assert.equal(ctx.sync(),false);assert.equal(mock.kriyabans.length,1,'Repeat end/sync must not duplicate');
mock.kriyabans[0].kriyaDate='2026-10-25';assert.equal(ctx.sync(),true);
assert.equal(mock.students[0].kriyaDate,'2026-10-25');
console.log('PASS Beta 5.68: remove card, no fabricated initiation, idempotent Kriya Master, real initiation, In Progress');
