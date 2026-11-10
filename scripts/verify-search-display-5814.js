'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.version,'2.0.0-beta.5.81.4');
for(const x of [
 "window.ananda580ShowDuplicate?.(row,person.name)",
 "$('v5813RegistrationStatus')?.remove();",
 '#v5813RegistrationStatus.is-registered strong{color:#9b2e26}',
 "b.textContent='Open registration';",
 "esc(p.mobile||p.contact||'—')",
 "esc(p.phone||p.items.find(x=>x.contact)?.contact||'—')",
 '<strong>Matching records</strong>',
 "host.innerHTML='<strong>Existing person selected</strong><span>'",
 "v5813PersonMatches(raw)",
 "v5813RegistrationRow(person)"
])assert.ok(html.includes(x),'Missing approved display correction: '+x);
assert.ok(!html.includes('Matching students and other records'),'Search header still reveals person role');
assert.ok(!html.includes("p.kind+(p.mobile?' · '+p.mobile"),'New Registration suggestions show type');
assert.ok(!html.includes('esc([...new Set(p.items.map(x=>x.detail))]'),'Search results still show course or role history');
console.log('PASS Beta 5.81.4: one consolidated existing-registration warning, unchanged open registration, name and mobile only in both searches');
