'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('scripts/approved-event-record-route-patch14-2.js','utf8');
let page='events';
let selected=null;
const masterLock={textContent:'  MASTER LOCK  ',style:{display:''}};
const saveButton={textContent:'SAVE',style:{display:''}};
const state={students:[{id:'test'}],families:[{id:'family'}],counts:{present:3}};
const original=JSON.stringify(state);
const sidebar='<aside id="approved-sidebar">NO CHANGE</aside>';
const ctx={
  window:{},
  document:{
    querySelector(selector){return selector==='.page.active'?{id:page}:null;},
    querySelectorAll(selector){return selector==='.topbar button'?[masterLock,saveButton]:[];}
  },
  activeEvent:()=>selected,
  switchPage(id){page=id;masterLock.style.display='';return id;},
  v6UpdateLayout(){masterLock.style.display='';return 'layout';}
};
vm.createContext(ctx);vm.runInContext(source,ctx);
assert.equal(ctx.window.anandaEventRecordRouteVersion,'14.2');
ctx.switchPage('eventWorkspace');
assert.equal(page,'eventWorkspace','No active event must not be redirected');
selected={id:'JND',name:'JND'};
ctx.switchPage('eventWorkspace');
assert.equal(page,'eventRecord','Opening a selected event must use the approved Event Record');
assert.equal(masterLock.style.display,'none','Old Master Lock must not reappear on Event Record');
assert.equal(saveButton.style.display,'','Unrelated buttons must not be changed');
ctx.v6UpdateLayout();
assert.equal(masterLock.style.display,'none','Layout refresh must not restore Master Lock');
ctx.switchPage('daily');
assert.equal(page,'daily','Volunteer route must remain available');
ctx.switchPage('register');
assert.equal(page,'register','Attendee route must remain available');
ctx.switchPage('items');
assert.equal(page,'items','Badge & Scarf route must remain available');
ctx.switchPage('eventRecord');
assert.equal(page,'eventRecord','Explicit Event Record navigation must remain available');
assert.equal(JSON.stringify(state),original,'Stored records and counters must not be modified');
assert.equal(sidebar,'<aside id="approved-sidebar">NO CHANGE</aside>');
console.log('PASS scoped Event Record routing, header guard, preserved other tabs, state and sidebar');
