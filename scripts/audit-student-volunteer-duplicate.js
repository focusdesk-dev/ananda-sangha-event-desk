'use strict';const fs=require('fs'),s=fs.readFileSync('index.html','utf8');
const needles=[
 ['v80MobileMatches','function v80MobileMatches',4500],
 ['v80DuplicateState','function v80DuplicateState',2000],
 ['Registration status','function v5817RegistrationStatus',5000],
 ['student form markup','id="p2StudentForm"',2300],
 ['student form handler','function p2SaveStudent',6500],
 ['volunteer form markup','id="volunteerForm"',4200],
 ['volunteer submit handler',"$('volunteerForm').onsubmit",4200],
 ['student progress show history','function p2v520ShowHistory',5700],
 ['student progress selectors','p2v520History',1200],
 ['student profile selectors','id="p2v558Volunteer"',850],
 ['kriyaban form markup','id="kriyabanForm"',2200],
 ['attendee master submit',"$('attendeeMasterForm').onsubmit",2300],
 ['legacy generic registration submit',"$('registrationForm').onsubmit",3000],
 ['volunteer new form fields','id="volunteerMobile"',2000],
 ['person registration controls','id="v36MainMobile"',1000]
];
for(const [title,needle,limit] of needles){
const positions=[];let p=-1;while((p=s.indexOf(needle,p+1))!==-1&&positions.length<15)positions.push(p);
console.log('\\n--- '+title+' '+positions.length+' positions '+positions.join(','));
for(const pos of [...new Set([positions[0],positions.at(-1)])].filter(x=>x!==undefined)){
console.log(s.slice(Math.max(0,pos-200),Math.min(s.length,pos+limit)).replace(/\\r/g,''));}
}
