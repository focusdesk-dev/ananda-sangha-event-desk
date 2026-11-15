'use strict';
const fs=require('fs');
const s=fs.readFileSync('index.html','utf8');
console.log('INDEX CHARACTERS',s.length,'LINES',s.split('\n').length);
const needles=[
  'function v36OpenRegistration','function v36UpdateRegistrationFields','function v36CurrentMemberInputs',
  'function v36SaveRegistration','function v36RenderRecord','function v36RenderEventRecord',
  'function v36RenderAttendees','function v36AllAttendeeRows','v36RegistrationModal',
  'v36RegistrationType','v36FamilyCount','v36FamilyMembers','v36RecordUI',
  'Selected day record','DAY-WISE SUMMARY','day-wise summary','familyGroups',
  'function renderEventRecord','function renderEventWorkspace','v36RecVolChecked',
  'function v36Checkin','function v36RenderFamily','function v36RecordMetric',
  'Permanent Master','function v36UpdateRegistrationLookup',
];
for(const needle of needles){
 const start=[];let i=-1;
 while((i=s.indexOf(needle,i+1))>=0&&start.length<200)start.push(i);
 const pick=needle.startsWith('function ')?[...start.slice(0,2)]:start.length?[start[0],...(start.length>2?[start.at(-1)]:[])]:[];
 console.log('\n--- QUERY',JSON.stringify(needle),'COUNT',start.length,'MATCHES',JSON.stringify(start.slice(0,12)),'---');
 for(const pos of pick){
   const before=needle.includes('RegistrationModal')||needle.includes('RecordUI')?500:250;
   const after=needle.startsWith('function ')?5500:needle.includes('Record')?4500:2300;
   console.log(s.slice(Math.max(0,pos-before),Math.min(s.length,pos+after)).replace(/\r/g,''));
 }
}
