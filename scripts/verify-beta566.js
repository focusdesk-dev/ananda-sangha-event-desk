'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),main=fs.readFileSync('main.js','utf8'),
  preload=fs.readFileSync('preload.js','utf8');
for(const token of ['p2v566Password','Notes (optional)','p2v566Accept','Incorrect password.',
 'status:\'Approved\'','approvedBy:\'administrator\'',
 'p2v566EditEndedStudent','classCorrectionHistory','p2v519RenderSummary()','Batch remains ended',
 'p2v565RejectAcharya'])assert(html.includes(token),'Missing release behaviour '+token);
assert(!html.includes('id="p2v550Acharya"'),'Removed selector still in UI');
assert(!html.includes('id="p2v550Decision"'),'Removed decision select still in UI');
assert(html.includes('BETA 5.67</strong>'));
assert(main.includes("anandaHealthLog('window-unresponsive')"));
assert(main.includes("'renderer-heartbeat-missing'"));
assert(preload.includes("ipcRenderer.send('ananda-renderer-heartbeat')"));
assert(main.includes("'render-process-gone'"));
console.log('PASS beta 5.67: compact approval, admin verification, ended corrections, hang diagnostics and version');
