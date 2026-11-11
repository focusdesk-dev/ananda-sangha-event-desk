'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.version,'2.0.0-beta.5.81.7');
const sidebar=fs.readFileSync('scripts/frozen-sidebar-beta573.txt','utf8').replace(/\r\n/g,'\n');
const main=html.replace(/\r\n/g,'\n');
assert.equal(main.slice(main.indexOf('<aside'),main.indexOf('</aside>')+8),sidebar,'5.80 frozen blue sidebar changed');
assert(main.includes('function p2v56ChatStudentEnrollments('),'Class history must be retained');
assert(main.includes('function p2v550OpenApproval(')||main.includes('p2v550OpenApproval('),'Kriya approvals must be retained');
assert(main.includes('function anandaV575('),'Master screens must be retained');
assert(main.includes('function anandaV578('),'5.80 recovery logic must be retained');
assert(main.includes('function ananda5801RegistrationHotfix('),'Scoped registration hotfix missing');
assert(main.includes('const before=v36RenderAttendees;'),'Existing 5.80 search/table must remain the base');
assert(main.includes('v80DuplicateState=function()'),'Only existing duplicate detector should be corrected');
assert(main.includes('familyContactMobile:mainMobile'),'Family contact must be distinct from member phone');
assert(main.includes("mobile:m.mobile||'',familyContactMobile:mainMobile"),'Group mobile copied into personal mobile column');
assert(main.includes('data-master-id=')&&main.includes('m.masterId=master.id'),'Existing member must reuse permanent person');
assert(main.includes('window.ananda580ShowDuplicate?.'),'Compact already-registered message must be wired');
for(const key of ['state.students','state.classEnrollments','state.classBatches','state.kriyabans','state.volunteers','state.attendeeMaster','state.attendees','state.familyGroups']){
  assert(main.includes(key),'Missing cross-module search input '+key);
}
assert(!main.includes('v581UnifiedSearch')&&!main.includes('identity-beta581.js'),'Bad 5.81 redesign accidentally included');
assert(!main.includes('mobile:m.mobile||mainMobile'),'Old household-number display bug remains');
let scripts=0;
for(const m of main.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
  assert.doesNotThrow(()=>new Function(m[1]),'Invalid inline JS '+scripts);
  scripts++;
}
console.log('PASS Beta 5.80.1 minimal hotfix source: frozen Classes/sidebar, no 5.81 redesign, existing person search, family/mobile safeguards, '+scripts+' scripts');
