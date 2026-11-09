'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.version,'2.0.0-beta.5.77');
for(const id of ['p2AddBatch','p2ClassBatches','p2ClassesAttendance','p2ClassesReports','p2v548ManageCourseNames','p2ClassList','p2CourseFilter','p2DeleteBatch'])assert(html.includes('id="'+id+'"'),'Missing '+id);
for(const str of ['p2v570FrozenStyles','p2v570DecorateHome','p2v570DecorateYears','p2v570OriginalRenderClasses','p2v570OriginalSwitch',"$('p2DeleteBatch').click()",'p2v56ChatOpenBatch(card.dataset.id)','p2v510ClassYear=card.dataset.year'])assert(html.includes(str),'Missing behaviour '+str);
assert(html.includes('state.classBatches.filter(b=>!b.archivedAt'),'Real records must determine counts');
console.log('PASS frozen Classes source: handlers, branding, year grouping and UI present');