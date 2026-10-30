'use strict';
const fs=require('fs'),assert=require('assert'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const a=html.indexOf('    // Override legacy sheet-scoped listeners in the CAPTURE phase');
const z=html.indexOf("    $('p2v58Confirm').onclick=p2v536ConfirmAttendance;",a);
assert(a>0&&z>a,'Single authoritative Mark remaining absent handler not installed');
const src=html.slice(a,z);
let fresh=0,legacy=0,confirmed=0;const handlers=[];
const button={onclick:()=>legacy++,addEventListener:(type,fn,capture)=>handlers.push({type,fn,capture})};
const ctx={$:id=>id==='p2v58All'?button:null,
 p2v536MarkRemainingAbsent:()=>fresh++,p2v536ConfirmAttendance:()=>confirmed++};
vm.runInNewContext(src,ctx);
assert.strictEqual(button.onclick,null,'Legacy sheet-scoped onclick must be removed');
assert.strictEqual(handlers.length,1,'Exactly one new capture handler should be attached');
assert.strictEqual(handlers[0].capture,true,'Full-class handler must run before legacy bubbling listeners');
let stopped=false,prevented=false;
handlers[0].fn({preventDefault:()=>prevented=true,stopImmediatePropagation:()=>stopped=true});
if(!stopped)button.onclick?.();
assert.strictEqual(fresh,1,'Full-class handler must run exactly once');
assert.strictEqual(legacy,0,'Legacy sheet-2-only handler must never run');
assert(stopped&&prevented,'Legacy listeners must be suppressed');
assert(!html.includes('id="p2v541ViewSaved"'),'Unnecessary saved-view button must be absent');
assert(html.includes('const confirmed=rows.length>0&&rows.every'),'Saved display must require every student recorded');
assert(html.includes('p2v536ExpectedPages>0&&p2v536ScannedSheets.size<p2v536ExpectedPages'),
 'All printed pages must be scanned before marking remaining absent');
console.log('PASS: single capture handler supersedes legacy sheet-scoped action; full class save requires all printed pages; no View Saved option');
