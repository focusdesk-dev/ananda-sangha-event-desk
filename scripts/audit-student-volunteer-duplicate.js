'use strict';const s=require('fs').readFileSync('index.html','utf8');
const queries=[
  ['Student save handler',"$('p2StudentForm').onsubmit",3200],
  ['Student submit addEventListener',"p2StudentForm').addEventListener",1900],
  ['Volunteer mobile error','function v92VolunteerMobileError',3200],
  ['Kriya submit',"$('kriyabanForm').onsubmit",2800],
  ['Student History references','p2v520History',550],
  ['Student History controls','p2v520ShowHistory()',650],
  ['Volunteer checkin undo','.v5-undo',1400],
  ['Volunteer checkin v5', "function v5RenderVolunteerUI",1700],
  ['Volunteer initial state','function ensureV36State',2000],
  ['Duplicate render', 'function v80MobileMatches',1900],
  ['Old individual save',"function v36SaveRegistration",5500],
  ['Student link save','p2LinkStudent(student)',600],
];
for(const [title,needle,n] of queries){
  const hits=[];let p=-1;while((p=s.indexOf(needle,p+1))!==-1&&hits.length<22)hits.push(p);
  console.log('\\n### '+title+' hits '+hits.length+' at '+hits.join(','));
  for(const pos of hits.slice(-7))console.log(s.slice(Math.max(0,pos-350),pos+n).replace(/\\r/g,'').replace(/\\n/g,' '));
}
