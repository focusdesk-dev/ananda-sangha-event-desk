'use strict';const assert=require('node:assert/strict'),fs=require('node:fs');
const h=fs.readFileSync('index.html','utf8'),form=h.slice(h.indexOf('<div id="p2BatchModal"'),h.indexOf('<div id="p2EnrollModal"'));
assert(!form.includes('Individual class dates'));
for(const x of ['Delete batch','p2v526StudentWise','Accepted for Kriya','p2v519Decision(prior,en)','p2v545Recalculate'])assert(h.includes(x),x);
console.log('PASS Corrections 21-26 source guards');