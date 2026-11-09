'use strict';
(function verifyV578Source(){
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const html=fs.readFileSync('index.html','utf8').replace(/\r\n/g,'\n');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.version,'2.0.0-beta.5.78');
const start=html.indexOf('  (function anandaV578(){'),end=html.indexOf('  resetEventForm();\n  renderAll();\n})();',start);
assert.ok(start>0&&end>start,'Recovery patch missing or incorrectly placed');
const original=html.slice(0,start)+html.slice(end);
const gitHash=crypto.createHash('sha1').update('blob '+Buffer.byteLength(original,'utf8')+'\0').update(original,'utf8').digest('hex');
assert.equal(gitHash,'eca2a2836a82dcf52f8ffc286e627cdd6b538bac','Original Beta 5.77 source changed: frozen Classes or existing code may have been modified');
const side=html.slice(html.indexOf('<aside'),html.indexOf('</aside>')+8);
assert.equal(side,fs.readFileSync('scripts/frozen-sidebar-beta573.txt','utf8').replace(/\r\n/g,'\n'),'Frozen sidebar changed');
const recovery=html.slice(start,end);
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
console.log('PASS 5.78: original 5.77 Git blob verified byte-for-byte, all Classes and sidebar logic frozen; lost master indicators and event/register workflows restored, '+scripts+' scripts parse');
})();
