const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const checks=[
 ['unified event attendee/volunteer lookup',html.includes('vNewVolunteerQuickResults')&&html.includes('vNewVolunteerQuickCheck')],
 ['quick volunteer check-in uses existing assignment',html.includes('ensureVolunteerCheckin(volunteer,state.activeEventId,date)')&&html.includes('registered.has(person.id)')],
 ['event attendee check-in still present',html.includes('v36SetAttendeeCheckin(findRow(b.dataset.kind,b.dataset.id),true)')],
 ['duplicate person blocked across families and individuals',html.includes('Already Pre-Registered')&&html.includes('v36AllAttendeeRows().filter(row=>')],
 ['Kriyaban status read-only in attendee list',html.includes('Verified in Kriyaban Master')&&!html.includes("button.className='btn ghost small v75-add-kriyaban'")],
 ['volunteer history requires actual check-in',html.includes('Confirmed volunteering means actual event check-in')&&html.includes("state.daily[String(r.eventId)+'|'+String(day)]")],
 ['frozen navigation still present',html.includes('data-go="classes"')&&html.includes('data-go="events"')]
];
for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' '+name);assert.ok(ok,name)}
