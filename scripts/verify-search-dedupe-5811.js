'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.version,'2.0.0-beta.5.81.5');
for(const x of [
  'Matching records',
  "const visible=records.filter(item=>!eventRows.some(row=>matchesEvent(item,row)))",
  "table.insertAdjacentElement('beforebegin',host)",
  'v5811-student-history',
  "const student=(state.students||[]).find",
  'tr.style.display=\'none\'',
  "v36RowsForDate($('workingDate').value)",
  'v36RenderAttendees=function(){before.apply(this,arguments);paintOtherRecords()}'
])assert.ok(html.includes(x),'Missing Event search correction: '+x);
assert.ok(html.includes('if(personal.length===10&&their.length===10&&personal===their)'),'Unique personal-mobile identity guard missing');
console.log('PASS Beta 5.81.1 unified student Event search, personal identity de-duplication, read-only event history links');
