'use strict';
(function verifyV574Source(){
  'use strict';
  const assert=require('node:assert/strict'),fs=require('node:fs');
  const html=fs.readFileSync('index.html','utf8');
  const sidebar=fs.readFileSync('scripts/frozen-sidebar-beta573.txt','utf8');
  assert.equal(html.slice(html.indexOf('<aside'),html.indexOf('</aside>')+8),sidebar,'Frozen left blue sidebar markup changed');
  assert.match(html,/function anandaV574\(/,'Unified report implementation missing');
  for(const id of ['v574Course','v574Batch','v574Year','v574Group','v574Tbody','v574Export','v574Search','v574Detail','v574Annual','v574Session'])assert(html.includes(id),'Missing '+id);
  assert.match(html,/p2v59OpenClassReports=function\(\)/,'Class Reports route not consolidated');
  assert(html.includes('v51RequireAdmin(()=>p2Csv(records().map(csvEntry)'), 'Full filtered-list export not protected and wired');
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  assert.equal(pkg.version,'2.0.0-beta.5.74');
  console.log('PASS 5.74 single Class Reports panel and byte-identical frozen sidebar');
})();
