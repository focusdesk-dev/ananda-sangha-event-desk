'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const asar=require('@electron/asar');
const old=path.resolve(process.argv[2]||''),output=path.resolve(process.argv[3]||''),dir=path.resolve(process.argv[4]||'');
if(!fs.existsSync(old)||!output||!dir)throw Error('Usage: node build-patch5.js <patch4.asar> <patch5.asar> <workdir>');
const hashGit=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const sha256=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase();
async function main(){
 if(fs.existsSync(dir))fs.rmSync(dir,{recursive:true,force:true});
 fs.mkdirSync(dir,{recursive:true});asar.extractAll(old,dir);
 const entry=path.join(dir,'index.html');
 const previous=fs.readFileSync(entry).toString('utf8').replace(/\r\n/g,'\n');
 assert.equal(hashGit(Buffer.from(previous)),'75af30791685b6293e2e83ca6b683091f1f2ab60',
   'This app.asar is NOT exactly verified Patch 4; refusing to change files');
 const after=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/\r\n/g,'\n');
 const jsMarker='    // PATCH 5 (approved): existing registration Check-In + unified Volunteer counter.';
 const jsFinish='    // PATCH 5 END (fresh build)';
 const jsStart=after.indexOf(jsMarker),markEnd=after.indexOf(jsFinish,jsStart);
 const jsEnd=markEnd+jsFinish.length+1;
 const styleMarker='<style id="v5-approved-layout">';
 const styleStart=after.indexOf(styleMarker),styleEnd=after.indexOf('</style>',styleStart)+8;
 assert.ok(jsStart>0&&markEnd>jsStart&&styleStart>jsEnd&&styleEnd>styleStart,'Fresh Patch 5 blocks missing');
 assert.ok(jsStart<after.indexOf('    if(false){'),'Fresh Patch 5 must run in live app, never the disabled legacy script');
 const regMarker='    // PATCH 5 REGISTRATION MODULE START (fresh)';
 const regEndMarker='    // PATCH 5 REGISTRATION MODULE END (fresh)';
 const regStart=after.indexOf(regMarker),regStop=after.indexOf(regEndMarker,regStart);
 assert.ok(regStart>0&&regStop>regStart&&regStop<jsStart,'Registration handler must be installed in its own live module before the core Patch 5');
 const js=after.slice(jsStart,markEnd),css=after.slice(styleStart,styleEnd);
 assert.ok(js.includes('v5PreviousRegistrationStatus')&&js.includes('v5PreviousToggleItem')&&js.includes('v5RenderVolunteerUI'),'All three approved functions must exist');
 assert.ok(js.includes('v5ManualCheckin')&&js.includes('v5AutoCheckin')&&js.includes('v5LegacyCheckin'),'Missing attendance provenance safeguard');
 assert.ok(!/\.nav-btn\s*\{|aside\s*\{|#classes\s/.test(css),'Sidebar/Classes changed');
 assert.equal(after[jsStart-1],'\n','Patch JS insertion must start on a new line');
 const withoutCss=after.slice(0,styleStart)+after.slice(styleEnd+1);
 const regEnd=withoutCss.indexOf(regEndMarker,regStart)+regEndMarker.length+1;
 const withoutReg=withoutCss.slice(0,regStart-1)+withoutCss.slice(regEnd);
 const coreStart=withoutReg.indexOf(jsMarker),coreEnd=withoutReg.indexOf(jsFinish,coreStart)+jsFinish.length+1;
 const restored=withoutReg.slice(0,coreStart-1)+withoutReg.slice(coreEnd);
 assert.equal(restored,previous,'Fresh Patch 5 would alter previously approved files outside its two isolated blocks');
 const pkg=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));
 assert.equal(pkg.version,'2.0.0-beta.5.81.8','Patch 5 only for app 5.81.8');
 fs.writeFileSync(entry,fs.readFileSync(path.join(__dirname,'..','index.html')));
 await asar.createPackage(dir,output);
 assert.deepEqual(asar.extractFile(output,'index.html'),fs.readFileSync(entry));
 const report={baseSha256:sha256(old),patchSha256:sha256(output),version:pkg.version,
    previousHtmlBytes:Buffer.byteLength(previous),patchedHtmlBytes:fs.statSync(entry).size,patchBytes:fs.statSync(output).size};
 fs.writeFileSync('patch5-hashes.json',JSON.stringify(report,null,2)+'\n');
 console.log('PASS exact Patch4 baseline, isolated Patch5 source, archive repack and integrity',report);
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
