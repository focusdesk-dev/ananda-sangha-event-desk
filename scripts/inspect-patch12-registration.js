'use strict';
const fs=require('fs'),s=fs.readFileSync('index.html','utf8');
const needles=[
'function v36OpenRegistration','function v36UpdateRegistrationFields','function v36AllAttendeeRows',
'function v36RowsForDate','function v36SetAttendeeCheckin','function v36SaveRegistration',
'function v36RenderMemberRows','function v36RenderAttendees','function v36RegistrationMember',
'function v48SyncRegistration','v36RegistrationForm','v36FamilyMemberSection',
'v36FamilyCount','v36MainRegistrationFields','v36MemberRows',
'v36RegistrationType','function v84','v84SubmitRegistrationBase',
'function v36EnsureMaster','function v36NewMemberRow','function v5817RegistrationStatus',
'function v36RenderFamily','function v89','familyGroup.members',
'familyGroups.push','function v48Family','function v39AddFamilyMember',
'function v48GroupMode','function v36Contact','function v36Group',
'function v36AttendeeRowsForDate',
'v36MainName','v36MainMobile','v36RegistrationStatus','v36RegistrationEditKey',
'v36SaveRegistration','v36Register','function v36RenderAttendeeTable'];
for(const key of needles){
 const hits=[];let i=-1;while((i=s.indexOf(key,i+1))>=0&&hits.length<100)hits.push(i);
 console.log('\n=== '+key+' '+hits.length+' at '+hits.slice(0,18).join(','));
 for(const p of [...new Set([hits[0],hits.at(-1)])].filter(x=>x!==undefined)){
  console.log(s.slice(Math.max(0,p-250),Math.min(s.length,p+(key.startsWith('function ')?5500:1800))).replace(/\r/g,''));
 }
}
