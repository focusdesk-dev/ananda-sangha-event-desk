'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const h=fs.readFileSync('index.html','utf8'),form=h.slice(h.indexOf('<div id="p2BatchModal"'),h.indexOf('<div id="p2EnrollModal"'));
assert(!form.includes('Individual class dates'));
for(const x of ['Delete batch','p2v526StudentWise','p2v558-review','p2v550OpenApproval','p2v519Decision(prior,en)','p2v545Recalculate','p2v558-summary','p2v558VolunteerPanel','permanently delete class batch'])
  assert(h.includes(x),'Missing approved workflow: '+x);
assert(!h.includes('Archive '+String.fromCharCode(39)+'+b.name'),'Old archive-only deletion is still present');
assert(h.includes('No active batch; approval saved for later enrolment.'));
console.log('PASS corrections 21-26 and Student Wise Review workflow');