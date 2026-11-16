'use strict';const s=require('fs').readFileSync('index.html','utf8');const terms=[
"switchPage('studentProgress')","switchPage('phase2Reports')",'data-page="studentProgress"',
'data-page="phase2Reports"','p2v56ChatPrepareProgress','p2v56ChatRenderProgress',
'p2v520Render()','p2v526StudentWise(body)','id="studentProgress"',
'p2v520Followups',"switchPage('classes')",'data-page="classes"','STUDENT PROGRESS'
];
for(const q of terms){const a=[];let i=-1;while((i=s.indexOf(q,i+1))>=0&&a.length<25)a.push(i);console.log('\n#'+q+' at '+a.join(','));for(const p of a.slice(-4))console.log(s.slice(Math.max(0,p-650),p+1100))}
