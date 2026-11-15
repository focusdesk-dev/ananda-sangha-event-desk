const fs=require('fs');
const s=fs.readFileSync('index.html','utf8');
const queries=[
 'state.students.push(', 'state.students.unshift(', 'state.students=',
 'students.push(', 'student.mobile', 'student.phone', 'student.fullName',
 'studentName','newStudent', 'function renderStudents',
 'function saveStudent','studentForm','studentMobile',
 'studentNameLabel','function findStudent',
 'function v81', 'function v5817AttendeeType',
 'function v36VolunteerMatches', 'v84InstallVolunteerModalSearch',
 'function v10HeadEntries',
 'state.kriyabans.push(', 'kriyabanMobile', 'kriyabanName',
 'function renderV36Volunteers','function v5RenderVolunteerUI',
 '#v5VolunteerSearch', 'v5VolunteerSearch', 'v5AddVolunteer',
];
console.log('index length:',s.length);
for(let q of queries){
 let arr=[],i=-1;while((i=s.indexOf(q,i+1))!==-1&&arr.length<40)arr.push(i);
 console.log('\n=== '+q+' hits '+arr.length+' locations '+arr.slice(0,14).join(','));
 const picks=arr.length?arr.slice(0,2):[];
 for(const pos of picks) console.log(s.slice(Math.max(0,pos-350),Math.min(s.length,pos+1700)).replace(/\r/g,''));
}
