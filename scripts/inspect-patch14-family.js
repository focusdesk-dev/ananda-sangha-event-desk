'use strict';const s=require('fs').readFileSync('index.html','utf8');
const q=[
 ['v88ToggleEdit','function v88ToggleEdit'],
 ['v88EditMember','function v88EditMember'],
 ['v89SaveMember','function v89SaveMember'],
 ['v91DeleteMember','function v91DeleteMember'],
 ['v88CheckMember','function v88CheckMember'],
 ['v88SavedButton','v88ToggleEdit=function'],
 ['v88InitialSets','const v88ExpandedGroups'],
 ['v88VolunteerGroup','function v88ValidateMember'],
 ['latest group renderer','v56RenderGroupPlanning=function'],
 ['group save','function v88Save'],
 ['v89 revision','Version 89'],
 ['v91 revision','Version 91'],
 ['group title','v88-edit-group'],
 ['Date relation','v89SaveMember=']
];for(const [label,k] of q){let a=[],i=-1;while((i=s.indexOf(k,i+1))>=0&&a.length<120)a.push(i);console.log('\n### '+label+' | '+k+' | '+a.length+' '+a.slice(0,30).join(','));for(const pos of [...new Set([a[0],a.at(-1)])].filter(x=>x!==undefined))console.log('START '+pos+'\n'+s.slice(Math.max(0,pos-350),pos+7000));}
