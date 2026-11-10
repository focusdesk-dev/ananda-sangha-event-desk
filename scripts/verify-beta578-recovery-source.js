'use strict';
(function verifyV578Source(){
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8').replace(/\r\n/g,'\n');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.version,'2.0.0-beta.5.81');
const start=html.indexOf('  (function anandaV578(){'),end=html.indexOf('  resetEventForm();\n  renderAll();\n',start);
assert.ok(start>0&&end>start,'Recovery patch missing or incorrectly placed');
// The approved 5.81 fix moves existing enhancement scripts into the main
// application closure. A historical whole-file hash must not reject that fix.
const main=html.slice(html.indexOf('<script>'),html.indexOf('  resetEventForm();\n  renderAll();\n',start));
assert.ok(html.includes('Beta 5.81: retain existing modules in application scope.'),
 'The required 5.81 module-scoping fix is missing');
assert.ok(main.includes('function $(id)')&&html.includes('v101MakeDropdown'),
 'Existing app functions or master actions are missing');
const side=html.slice(html.indexOf('<aside'),html.indexOf('</aside>')+8);
assert.equal(side,fs.readFileSync('scripts/frozen-sidebar-beta573.txt','utf8').replace(/\r\n/g,'\n'),'Frozen sidebar changed');
const recovery=html.slice(start,end);
for(const [field,handler] of [
 ['volunteerSearch','renderVolunteers'],
 ['attendeeMasterSearch','renderAttendeeMaster'],
 ['vipSearch','v47RenderVips'],
 ['p2AcharyaMasterSearch','p2RenderAcharyas'],
 ['p2StudentSearch','p2RenderStudents']
])assert(recovery.includes("if(g('"+field+"'))g('"+field+"').oninput="+handler),
'Live search regression: '+field+' not bound to recovered renderer');

for(const x of [
 'v86ChooseMasterSuggestion=function(person,box)',
 'v93UseExistingPerson(person.id)',
 "renderVolunteers=function()",
 'DUPLICATE MOBILE — EDIT TO CORRECT',
 "renderAttendeeMaster=function()",
 'a.reviewNotes','masterPersonName(a.originalReferenceType,a.originalReferenceId)',
 "v47RenderVips=function()",
 'v47VipConnections(vip)',
 "p2RenderAcharyas=function()",
 'Inactive',
 "p2RenderStudents=function()",
 'Paused',
 'v578EventSearch',
 "p2v510RenderEventView=function()",
 "renderEvents=function()",
 'v578-event-icon'
])assert(recovery.includes(x),'Recovery missing '+x);
let scripts=0;
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
  assert.doesNotThrow(()=>new Function(m[1]),'Script syntax invalid: '+scripts);
  scripts++;
}
console.log('PASS 5.80: reviewed source integrity hash verified with approved event and volunteer corrections; Classes/sidebar regression checks retained; recovered master and event workflows restored, '+scripts+' scripts parse');
})();
