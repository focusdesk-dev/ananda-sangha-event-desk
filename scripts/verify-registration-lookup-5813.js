'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.version,'2.0.0-beta.5.81.5');
for(const x of [
 'function v5813PersonMatches(raw)',
 "(state.students||[]).forEach(p=>add('Student'",
 "(state.attendeeMaster||[]).forEach(p=>add('Attendee Master'",
 "(state.kriyabans||[]).forEach(p=>add('Kriyaban'",
 "(state.volunteers||[]).forEach(p=>add('Volunteer'",
 "(state.vips||[]).forEach(p=>add('VIP'",
 "(state.acharyas||[]).forEach(p=>add('Acharya'",
 'v5813Selected={...person}',
 'v86RefreshMasterSuggestions=function(source)',
 'v5813RegistrationRow(person)',
 'Already Registered',
 'v5813StartFromMasterRecord(r)',
 "const key=p.mobile.length===10?normName(p.name)+'|'+p.mobile",
 'v5813Select(v5813Results[Number(button.dataset.index)])',
 'v5813Status(person)'
])assert.ok(html.includes(x),'Missing registration lookup acceptance requirement: '+x);
assert.ok(!html.includes("v51RequireAdmin(action,'open existing person')"),'Event search still opens master edit modal');
console.log('PASS Beta 5.81.3 existing student/person selection, duplicate family suggestions, event-only registration and no master-edit detour');
