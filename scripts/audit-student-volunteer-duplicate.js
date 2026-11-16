'use strict';const s=require('fs').readFileSync('index.html','utf8');
const terms=['function p2RenderReports','p2ReportMode','p2OpenStudentProgressReport','p2ReportPanel','switchPage=function(id)','function switchPage(id)','(() => {','(function(){','<script>'];
for(const q of terms){const hits=[];let i=-1;while((i=s.indexOf(q,i+1))>=0&&hits.length<15)hits.push(i);console.log('\n### '+q+' at '+hits.join(','));for(const p of hits.slice(0,3))console.log(s.slice(Math.max(0,p-800),p+2800))}
