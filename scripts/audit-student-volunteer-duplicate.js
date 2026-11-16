'use strict';const s=require('fs').readFileSync('index.html','utf8');const terms=[
"switchPage('studentProgress')", 'switchPage("studentProgress")',"data-page=\\"studentProgress\\"",
"switchPage('phase2Reports')","data-page=\\"phase2Reports\\"","p2v56ChatPrepareProgress","p2v56ChatRenderProgress",
"p2v520Render()","p2v526StudentWise(body)","id=\\"studentProgress\\"","p2v520Followups",
"switchPage('classes')","data-page=\\"classes\\"","STUDENT PROGRESS"
];for(const q of terms){const positions=[];let i=-1;while((i=s.indexOf(q,i+1))>=0&&positions.length<25)positions.push(i);console.log('\\n### '+q+' at '+positions.join(','));for(const p of positions.slice(-4))console.log(s.slice(Math.max(0,p-750),p+1250).replace(/\\r/g,''));}
