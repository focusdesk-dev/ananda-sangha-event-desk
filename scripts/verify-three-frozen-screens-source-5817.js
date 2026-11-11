'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.version,'2.0.0-beta.5.81.7');
for(const text of [
  'function v5817VerifiedKriyaban(name,mobile)',
  'function v5817AttendeeType(name,mobile)',
  "return'KRIYABAN'","return'STUDENT'","return'OUTSIDER'",
  "['ATTENDEE','TYPE','MOBILE','ACTION']",
  "const v5817BaseAttendeeRender=v36RenderAttendees",
  "function v5817RegistrationStatus()",
  "v5817-status-green","v5817-status-red",
  "KRIYABAN RECOGNISED","ALREADY CHECKED IN","ALREADY REGISTERED",
  "OPEN REGISTRATION",
  "form.querySelectorAll('button[type=\"submit\"][data-mode]').forEach(b=>b.disabled=blocked)",
  "const attendees=allEventAttendees().filter(a=>",
  "v36RosterOnly=false;",
  "ensureVolunteerCheckin(volunteer,eventId,date,'badge/scarf')",
  "const v5817BadgeRenderBase=renderItems",
  "const result=v5817BadgeRenderBase.apply(this,arguments)"
])assert.ok(html.includes(text),'Frozen screen requirement missing: '+text);
assert.ok(html.includes("body:has(#checkin.page.active) #v51SecurityButton")&&html.includes("body:has(#items.page.active) #v51SecurityButton"),'Page-only Master Lock suppression missing');
assert.ok(html.includes("const next=!Boolean(a[item+'Issued'])"),'Independent issue and receive state missing');
assert.ok(html.includes("if(next)v116MarkCheckedIn(type,id)"),'Issue -> automatic check-in missing');
assert.ok(html.includes("if(action==='return'&&a[item+'Issued'])"),'Receive state missing');
assert.ok(!html.includes("v5817AttendeeType(name,mobile){\n    if(v5817VerifiedKriyaban(name,mobile))return'STUDENT'"),'Kriyaban cannot be shown as Student');
const live=html.slice(0,html.indexOf('  <!-- Version 96'));
for(const needle of ['const v5817OriginalItemPeople=itemPeople','const v5817LiveBadgeBase=renderItems','itemControls=v72ItemControlsBefore','allEventAttendees().forEach(a=>']){
 assert.ok(live.includes(needle),'Live Badge & Scarf correction missing from active script: '+needle);
}
console.log('PASS frozen event screens: classification, recognition priority, one message, context-only styling, automatic item check-in and existing actions');
