'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.version,'2.0.0-beta.5.81.7');
const start=html.indexOf('function v5816CompactAttendeeTable()');
assert.ok(start>0,'Missing attendee four-column decorator');
const relevant=html.slice(start,html.indexOf('const v5816PreviousAttendees=',start));
for(const token of ["['ATTENDEE','MOBILE','STATUS','ACTION']","row.replaceChildren(nameCell,mobileCell,status,action)","panel.append(registration)","select.v36-att-item","editCell.querySelectorAll('.v36-att-edit,.v36-att-delete')","checkCell.querySelector('.v36-att-check')","checkCell.querySelector('.v36-att-undo')","v5816-kriyaban-label"]){
 assert.ok(relevant.includes(token),'Missing four-column behavior: '+token);
}
assert.ok(!relevant.includes('state.attendees='),'Table decorator must not alter registration data');
assert.ok(html.includes('const result=v5816PreviousAttendees.apply(this,arguments);'),'Decorator must wrap final attendee rendering');
assert.ok(html.includes("type:master?.category==='family'?'Volunteer family':a.referenceVolunteerId?'Friend / referred':'Outside / general'"),'Registration category changed');
console.log('PASS: four-column attendee table, category moved to menu, Kriyaban and all operations retained');
