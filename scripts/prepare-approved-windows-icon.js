'use strict';
/* Prepare the exact user-approved Ananda logo as the multi-resolution Windows
 * ICO for the desktop shortcut, taskbar, application and installer.
 * This NEVER modifies the existing renderer HTML or class/event records. */
const fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto'),path=require('node:path');
const expected='6e9980c365b1dcbea45c7064406ab6b8c003ce50d35b8ed4e695046f253a5e2b';
const src=path.join(__dirname,'..','assets','approved-ananda-logo-2026.png.base64');
const png=Buffer.from(fs.readFileSync(src,'utf8').trim(),'base64');
const sha=crypto.createHash('sha256').update(png).digest('hex');
if(sha!==expected)throw Error('APPROVED ANANDA LOGO SHA-256 MISMATCH; refusing replacement');
if(!png.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))throw Error('Approved logo is not PNG');
fs.writeFileSync(path.join(__dirname,'..','ananda-approved-logo.png'),png);
const script=path.join(__dirname,'build-approved-icon.py');
cp.execFileSync('python',[script],{cwd:path.join(__dirname,'..'),stdio:'inherit'});
console.log('Approved Ananda desktop/taskbar/installer logo confirmed SHA256='+sha);
