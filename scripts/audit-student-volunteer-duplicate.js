'use strict';
const fs=require('fs');const s=fs.readFileSync('index.html','utf8');
const topics=[
 ['student-progress-volunteer-functions',/function\s+[\w$]*(?:volunt|Volunt|History|history|StudentProgress|studentProgress)[\w$]*\s*\(/g,120,500],
 ['student-progress-volunteer-mentions',/volunteer(?:Events|History|Participation|Count|Attendance)|volunteering|Volunteer history|VOLUNTEER HISTORY|VOLUNTEERING|VOLUNTEER EVENTS/gi,150,500],
 ['student-volunteer-linkage',/volunteerId\s*=|studentId\s*=|linkedIdentityRefs|linkedPersonId/g,160,450],
 ['duplicate-sources',/function\s+[\w$]*(?:Duplicate|duplicate|Match|match|Identity|identity)[\w$]*\s*\(/g,120,450],
 ['duplicate-user-messages',/already registered|ALREADY REGISTERED|Already registered|duplicate mobile|Duplicate mobile|phone-conflict|mobile already belongs|same mobile|same phone|already exists in/gi,110,300]
];
for(const [section,re,limit,context] of topics){
 console.log('\\n### '+section);
 let hits=[],m;while((m=re.exec(s))!==null&&hits.length<limit){hits.push(m.index);if(!re.global)break}
 console.log('HITS',hits.length,'positions',hits.slice(0,100).join(','));
 for(const pos of hits.slice(0,limit)){
  const excerpt=s.slice(Math.max(0,pos-context),pos+context*2).replace(/\\r/g,'').replace(/\\n/g,' ');
  console.log('MATCH '+pos+' '+excerpt+'\\n');
 }
}
const focus=[
 'function p2LinkStudent','function p2Volunteer','function p2v','function p2RenderStudent','function p2Student',
 'function v5RenderVolunteerUI','function ensureVolunteerRoster','function ensureVolunteerCheckin',
 'function v36CheckedVolunteerIds','function v6RegisteredVolunteerIds','function v36AllAttendeeRows',
 'function v80DuplicateState','function v11RegisterExistingVolunteer','function v12SaveRegistration',
 'function v12Save','function v11PersonDirectory',
 'function v46KriyabanMatch','function findVolunteerIdentity','function findAttendeeMaster',
 'function v39MatchVolunteerFromRegistration'
];
for(const q of focus){const pos=s.indexOf(q);console.log('\\n##TARGET '+q+' at '+pos+'\\n'+(pos<0?'':s.slice(pos,pos+6500).replace(/\\r/g,'')))}
