'use strict';const fs=require('fs');const s=fs.readFileSync('index.html','utf8');
const queries=[
['HRIDAY GUEST DETAILS','GUEST DETAILS',1600],
['SAVE & REGISTER','SAVE & REGISTER',2500],
['GROUP MEMBER BUTTON','v75-save',2500],
['v89 family headers','v89-family-group',1700],
['v89 member','function v89FamilyMemberHtml',5600],
['v89 group detail','function v89AttachFamilyDetailHandlers',5600],
['v89 save linked','function v89AttachLinkedHandlers',5600],
['v89 base render','v56RenderGroupPlanning=function',8200],
['v75 linked family','function v75RenderLinkedFamilyBoxes',7500],
['group guest detail','function v75GuestDetail',5400],
['SAVE GUEST','Save guest',1800],
['v75 family mutators','function v75',3000],
['v36 edit member','function v36OpenRegistration',3700],
['v36 attendee rows','function v36AllAttendeeRows',2600],
['v36 family save','function v36SaveRegistration',6400],
['v36 duplicate','v80DuplicateState',3000],
['group planning','v56GroupPlanning',2700],
['v36 group display','function v56RenderGroupPlanning',4500],
['registration contact','registrationContactRef',750]
];
for(const [label,needle,n] of queries){const found=[];let p=-1;while((p=s.indexOf(needle,p+1))>=0&&found.length<120)found.push(p);
 console.log('\n### '+label+' | '+needle+' | '+found.length+' | '+found.slice(0,60).join(','));
 for(const at of [...new Set([found[0],found[found.length-1]])].filter(x=>x!==undefined))
 console.log('EXCERPT '+at+'\n'+s.slice(Math.max(0,at-350),Math.min(s.length,at+n)).replace(/\r/g,''));
}
