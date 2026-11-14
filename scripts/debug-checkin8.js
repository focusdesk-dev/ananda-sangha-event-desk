'use strict';
const asar=require('@electron/asar');
const b=asar.extractFile(process.argv[2],'index.html').toString('utf8');
for(const key of ['v5ManualCheckin','v5-check','v5ReversePrompt','v5RenderVolunteerUI','v5LegacyCheckin']){
 let positions=[],start=0,i;while((i=b.indexOf(key,start))>=0){positions.push(i);start=i+key.length;if(positions.length>=12)break}
 console.log('\n### '+key+' occurrences '+positions.length);
 for(const p of positions){console.log('AT '+p+'\n'+b.slice(Math.max(0,p-900),Math.min(b.length,p+1600)))}
}
