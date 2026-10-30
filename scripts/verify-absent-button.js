'use strict';
const fs=require('fs'),assert=require('assert'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const a=html.indexOf('    // Override legacy sheet-scoped listeners in the CAPTURE phase');
const z=html.indexOf('    const p2v536OriginalSwitch=switchPage;',a);
assert(a>0&&z>a,'Full-class Mark remaining absent / Confirm attendance handlers missing');
const src=html.slice(a,z);
let fresh=0,legacyAbsent=0,legacySave=0,confirmed=0;
const makeButton=()=>({onclick:null,listeners:[],addEventListener(type,fn,capture){this.listeners.push({type,fn,capture})}});
const buttons={p2v58All:makeButton(),p2v58Confirm:makeButton()};
buttons.p2v58All.onclick=()=>legacyAbsent++;
buttons.p2v58Confirm.onclick=()=>legacySave++;
// Simulate an older registered page-2-only bubbling listener that would
// reject absent marks even though the complete class is ready to save.
buttons.p2v58All.listeners.push({type:'click',capture:false,fn:()=>legacyAbsent++});
buttons.p2v58Confirm.listeners.push({type:'click',capture:false,fn:()=>legacySave++});
const ctx={$:id=>buttons[id]||null,
 p2v536MarkRemainingAbsent:()=>fresh++,p2v536ConfirmAttendance:()=>confirmed++};
vm.runInNewContext(src,ctx,{timeout:1000});
function dispatch(button){
 let prevented=false,stopped=false;
 const event={preventDefault(){prevented=true},stopImmediatePropagation(){stopped=true}};
 for(const listener of button.listeners.filter(x=>x.capture)){listener.fn(event);if(stopped)break}
 if(!stopped){button.onclick?.(event);for(const listener of button.listeners.filter(x=>!x.capture))listener.fn(event)}
 assert(prevented&&stopped,'Legacy handlers must be suppressed in capture phase');
}
for(const b of Object.values(buttons)){
 assert.strictEqual(b.onclick,null,'Old onclick must be cleared');
 assert.strictEqual(b.listeners.filter(x=>x.capture).length,1,'Exactly one authoritative capture listener per button');
}
dispatch(buttons.p2v58All);
dispatch(buttons.p2v58Confirm);
assert.strictEqual(fresh,1,'Entire-class absent handler must run exactly once');
assert.strictEqual(confirmed,1,'Entire-class save handler must run exactly once');
assert.strictEqual(legacyAbsent,0,'Legacy sheet-2-only marking cannot run');
assert.strictEqual(legacySave,0,'Legacy sheet-specific save cannot block confirmation');
assert(!html.includes('id="p2v541ViewSaved"'),'Unnecessary saved-view button must be absent');
assert(html.includes('const confirmed=rows.length>0&&rows.every'),'Saved attendance requires all students recorded');
assert(html.includes('p2v536ExpectedPages>0&&p2v536ScannedSheets.size<p2v536ExpectedPages'),
 'Mark remaining absent must reject incomplete printed pages');
console.log('PASS: Full-class Mark remaining absent and Confirm attendance capture events block legacy sheet-only handlers; one click => one save; no saved-view option');
