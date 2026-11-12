'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const snippet=fs.readFileSync('scripts/keyboard-focus-patch-snippet.txt','utf8');
const handlers={},queue=[];
let focused=true,visible=true,minimized=false,rendererFocused=false,repairs=0,externalWindow=false;
const contents={isDestroyed:()=>false,isFocused:()=>rendererFocused,focus:()=>{repairs++;rendererFocused=true},
  on:(event,fn)=>{handlers['web:'+event]=fn}};
const mainWindow={webContents:contents,isDestroyed:()=>false,isVisible:()=>visible,
  isMinimized:()=>minimized,isFocused:()=>focused,
  on:(event,fn)=>{handlers[event]=fn}};
const BrowserWindow={getFocusedWindow:()=>externalWindow?{}:mainWindow};
vm.runInNewContext(snippet,{mainWindow,BrowserWindow,
  anandaHealthLog:()=>{},
  setTimeout:fn=>{queue.push(fn);return queue.length},
  clearTimeout:()=>{}},{timeout:1000});
const flush=()=>{const f=queue.splice(0);for(const fn of f)fn()};
assert.equal(typeof handlers.focus,'function');
assert.equal(typeof handlers.restore,'function');
assert.equal(typeof handlers['web:before-mouse-event'],'function');
handlers.focus();flush();assert.equal(repairs,1,'Foreground activation must restore renderer focus');
externalWindow=true;rendererFocused=false;
handlers.focus();flush();assert.equal(repairs,1,'Do not steal focus from another application');
externalWindow=false;focused=false;
handlers.focus();flush();assert.equal(repairs,1,'Do not focus a background window');
focused=true;minimized=true;
handlers.restore();flush();assert.equal(repairs,1,'Do not focus a minimized window');
minimized=false;visible=false;
handlers.focus();flush();assert.equal(repairs,1,'Do not focus an invisible window');
visible=true;rendererFocused=false;
handlers['web:before-mouse-event'](null,{type:'mouseDown'});flush();
assert.equal(repairs,2,'A click in an unfocused renderer must repair focus');
handlers['web:before-mouse-event'](null,{type:'mouseDown'});flush();
assert.equal(repairs,2,'Normal clicks in already-focused content should not interrupt typing');
handlers.restore();flush();assert.equal(repairs,3,'Restore must reattach renderer keyboard focus');
assert.ok(!snippet.includes('preventDefault('),'Normal keyboard input must not be intercepted');
console.log('PASS focus activation, restore, foreground guard, mouse recovery, and normal input preservation');
