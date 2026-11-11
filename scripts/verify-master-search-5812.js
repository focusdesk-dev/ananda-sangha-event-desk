'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.version,'2.0.0-beta.5.81.8');
for(const [label,source] of [
 ['Students',"(state.students||[]).forEach(p=>"],
 ['Volunteers',"(state.volunteers||[]).forEach(v=>"],
 ['Attendee Master',"(state.attendeeMaster||[]).forEach(p=>"],
 ['Kriyabans',"(state.kriyabans||[]).forEach(p=>"],
 ['VIP Master',"(state.vips||[]).forEach(p=>"],
 ['Acharya Master',"(state.acharyas||[]).forEach(p=>"],
 ['Historical attendees',"(state.attendees||[]).filter(a=>a.eventId!==state.activeEventId)"],
 ['Family history',"(state.familyGroups||[]).filter(g=>g.eventId!==state.activeEventId)"]
])assert.ok(html.includes(source),'Search omitted '+label);
assert.ok(html.includes("if(searchInput)searchInput.oninput=()=>v36RenderAttendees()"),'Input still bound to obsolete renderer');
assert.ok(html.includes("if(findButton)findButton.onclick=()=>v36RenderAttendees()"),'Find button still bound to obsolete renderer');
assert.ok(html.includes("const score=name=>name===n?0:name.startsWith(n)?1:2"),'Short-name exact search ranking missing');
assert.ok(html.includes("name===n?0"),'Single-letter names are valid');
console.log('PASS Beta 5.81.2 all six masters, historical family records, current search input and Find button, one-letter name ranking');
