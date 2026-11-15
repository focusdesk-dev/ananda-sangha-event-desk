'use strict';
const fs=require('fs'),s=fs.readFileSync('index.html','utf8');
const targets=[
 ['VOLUNTEER_MAIN',1250000,13000],
 ['VOLUNTEER_MODAL',1297000,13500],
 ['VOLUNTEER_LEGACY',352000,9000],
 ['STUDENTS_STATE',0,0]
];
for(const [label,pos,len] of targets){if(len)console.log('\n### '+label+' ###\n'+s.slice(pos,pos+len))}
const keys=[
 'v48AddVolunteer','v48VolunteerModal','v5VolunteerPicker','v5VolunteerSearch','v5AddVolunteer','v36OpenNewVolunteer',
 'v36VolunteerMatches','volunteerPicker','v48Volunteer','function v36RegisterVolunteer',
 'state.students','studentMaster','classStudents','classEnrolments','localStorage.getItem(',
 'function v11','function v6RegisteredVolunteerIds','function ensureVolunteerRoster',
 'function v36CheckedVolunteerIds','function v36RosterIds','function v5RenderVolunteerUI',
 'function v36OpenNewVolunteer','function openVolunteer','function v36RegistrationType',
 'function v47RegistrationVips','function v83',
];
for(const key of keys){
 const hits=[];let i=-1;while((i=s.indexOf(key,i+1))>=0&&hits.length<100)hits.push(i);
 console.log('\nKEY '+key+' '+hits.length+' '+hits.slice(0,30).join(','));
 if(hits.length)console.log(s.slice(Math.max(0,hits.at(-1)-350),hits.at(-1)+1600).replace(/\r/g,''));
}
