'use strict';
const fs=require('fs'),s=fs.readFileSync('index.html','utf8');
console.log('Index bytes',s.length);
const targets=[
  ['Volunteer modal', 'ADD VOLUNTEER TO EVENT', 450, 2300],
  ['Volunteer master search', 'SEARCH VOLUNTEER MASTER', 500, 2600],
  ['Volunteer picker', 'v5AddVolunteer', 250, 2400],
  ['Volunteer list pick', 'v5Volunteer', 300, 2000],
  ['Volunteer match', 'function v41VolunteerMatches', 400, 1100],
  ['Family cards v89', 'v89ExpandedFamilyGroups', 200, 2600],
  ['Family render v89', 'v89FamilyMemberHtml', 200, 2300],
  ['Family rows', 'function v36RowsForDate', 100, 3400],
  ['All attendee rows', 'function v36AllAttendeeRows', 100, 2000],
  ['Attendee page', 'function v36RenderAttendees', 100, 2400],
  ['Attendee page 2', 'v85AttendeeRenderBase', 200, 1350],
  ['Group planning v89', 'v89-family-group', 300, 1200],
  ['Volunteers state', 'function v36RosterIds', 250, 1300],
  ['Add volunteer', 'ADD NEW VOLUNTEER', 200, 1400],
  ['Volunteer reg', 'state.volunteerRegistrations.push', 250, 950],
  ['Master lookup', 'function findAttendeeMaster', 200, 1100],
  ['family dialog', 'v10FamilyCheckinButton', 250, 1500],
  ['Registration edit', 'function v36OpenRegistration', 350, 1600],
  ['Master person', 'state.attendeeMaster', 150, 550],
  ['Version 77', 'Version 77:', 100, 3300],
  ['Patch5 search', 'v5-volunteer-search', 300, 2300],
];
for(const [label,key,before,after] of targets){const hits=[];let p=-1;while((p=s.indexOf(key,p+1))>=0&&hits.length<100)hits.push(p);console.log('\n---TARGET '+label+' MATCHES '+hits.length+' POS '+hits.slice(0,30).join(',')+' ---');
  const picked=hits.length?[hits[0],...(hits.length>1?[hits[hits.length-1]]:[])]:[];
  for(const pos of picked){console.log(s.slice(Math.max(0,pos-before),Math.min(s.length,pos+after)).replace(/\r/g,''));}
}
