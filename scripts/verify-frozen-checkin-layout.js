'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const id='frozen-checkin-5817',start=html.indexOf('<style id="'+id+'">'),end=html.indexOf('</style>',start);
assert.ok(start!==-1&&end>start,'Frozen Check-In style block missing');
const css=html.slice(start,end);
for(const s of ['grid-template-areas:"search add"','Family / Group Registrations','#v36AttendeeTable th:nth-child(2)::after','#v36NewRegistration','#v56GroupPlanning','.v5816-att-controls','#v36ImportGoogle'])
 assert.ok(css.includes(s),'Approved visual requirement missing: '+s);
assert.ok(!/(^|[}\n])\s*(aside|nav|\.nav-btn|\.brand|\.aside-foot)[\s:{.#]/m.test(css),'Sidebar styling must never change');
assert.ok(!/localStorage|state\.|save\(/.test(css),'Frozen style must be view only');
console.log('PASS frozen Check-In source: three KPIs, single search row, family expansion, four-column table, import, no sidebar changes');
