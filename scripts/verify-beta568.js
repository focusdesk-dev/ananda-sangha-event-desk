'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const h=fs.readFileSync('index.html','utf8');
assert(h.includes("(x.target==='Kriya'?'Approve':'Review')"),'Existing Student Wise Kriya action missing');
assert(h.includes("x.target==='Kriya'?!completedKriya"),'Must hide pending approval when Kriya already completed');
assert(h.includes("if(x?.source)p2v550OpenApproval(student.id,x.source.b.id)"),'Existing modal must be reused');
assert(h.includes("function p2v568RepeatFee(en,b)"));
assert(h.includes("en.paymentStatus='Waived — Repeat'"));
assert(h.includes("const p2v568CreateEnrollmentBase=p2CreateEnrollment"));
assert(h.includes("p2v514RefreshPaymentUi"));
assert(h.includes('BETA 5.72</strong>'));
const begin=h.indexOf("  function p2v568RepeatFee(en,b){"),
      end=h.indexOf("  function p2v563FreeBatch",begin);
assert(begin>0&&end>begin);
const state={classEnrollments:[],classBatches:[
{id:'b1',courseId:'course-l1',level:'Level 1',courseFee:'1000'},
{id:'b2',courseId:'course-l1',level:'Level 1',courseFee:'1500'},
{id:'b3',courseId:'course-l2',level:'Level 2',courseFee:'1800'}
]};
const ctx={state,p2v550Stage:b=>b.level,p2v563FreeBatch:b=>Number(b.courseFee)===0};
vm.createContext(ctx);
vm.runInContext(h.slice(begin,end)+';globalThis.policy={repeat:p2v568RepeatFee,apply:p2v568ApplyRepeatWaiver};',ctx);
state.classEnrollments.push({id:'en1',studentId:'F',batchId:'b1',outcome:'Completed',paymentStatus:'Paid',paymentMode:'UPI',paymentDate:'2025-01-01',feeAmount:'1000'});
const rep={id:'en2',studentId:'F',batchId:'b2',outcome:'Enrolled'};
assert(ctx.policy.repeat(rep,state.classBatches[1]));
assert(ctx.policy.apply(rep,state.classBatches[1]));
assert.equal(rep.paymentStatus,'Waived — Repeat');assert.equal(rep.feeAmount,'0');assert.equal(rep.paymentDate,'');
assert.equal(state.classEnrollments[0].paymentMode,'UPI','Historical payment must remain intact');
assert(!ctx.policy.repeat({id:'en3',studentId:'F'},state.classBatches[2]),'Next level is chargeable');
assert(!ctx.policy.repeat({id:'en4',studentId:'Q'},state.classBatches[1]),'Different student is chargeable');
state.classEnrollments[0].outcome='Did Not Complete';
assert(!ctx.policy.repeat({id:'en5',studentId:'F'},state.classBatches[1]),'Paused/incomplete is not automatic free repeat');
console.log('PASS Beta 5.68 existing Kriya approval + repeat-fee regression');
