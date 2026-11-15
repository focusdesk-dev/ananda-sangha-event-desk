'use strict';
const fs=require('fs'),s=fs.readFileSync('index.html','utf8');
const needles=[
 'v48GroupMode', 'v39AddFamilyMember','v84SubmitRegistrationBase','v84Original',
 'v36SaveRegistration=function','v36OpenRegistration=function',
 'v5817BaseOpenRegistration','v5817RegistrationStatus',
 'v36FamilyMemberSection','v36RegistrationType',
 'v36RecordDays','v36WholeEventStats','renderV36Record=function',
 'function renderV36Record','function v36Records','function v36RenderEventRecord',
 'v36RecVolChecked','function v36RecordMetricList','function v68','function v36Record',
 'v36RecordAttendees','v36RecordVolunteers',
 '#v48GroupMode','#v36FamilyMemberSection','#v36RegistrationModal',
 'function v36RenderMemberRows','function v36SaveRegistration',
 'function v36SubmitRegistration','function findAttendeeMaster'
];
for(const needle of needles){
 const hits=[];let i=-1;
 while((i=s.indexOf(needle,i+1))>=0&&hits.length<200)hits.push(i);
 console.log('\n--- '+needle+' count='+hits.length+' positions='+hits.slice(0,20).join(',')+' ---');
 for(const p of (hits.length?[hits[0],...(hits.length>1?[hits[hits.length-1]]:[])]:[])){
  let span=needle.includes('SaveRegistration')||needle.includes('v84Submit')?5500:needle.includes('GroupMode')?2800:needle.includes('Record')?3600:2600;
  console.log(s.slice(Math.max(0,p-300),Math.min(s.length,p+span)).replace(/\r/g,''));
 }
}
