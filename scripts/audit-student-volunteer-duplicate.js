'use strict';const s=require('fs').readFileSync('index.html','utf8');for(const q of ['p2v526Search','p2v526-result','p2v520-history-btn','p2v520Followups','p2v520History','p2v520Render(){','function p2v520Render','p2v526Results','p2v526Input']){
let i=-1,h=[];while((i=s.indexOf(q,i+1))>=0&&h.length<35)h.push(i);
console.log('\\n### '+q+' at '+h.join(','));
for(const p of h.slice(0,12))console.log('POS '+p+'\\n'+s.slice(Math.max(0,p-700),p+950).replace(/\\r/g,''));
}
