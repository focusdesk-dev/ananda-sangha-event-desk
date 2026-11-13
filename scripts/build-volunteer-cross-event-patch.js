'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),asar=require('@electron/asar');
const old=path.resolve(process.argv[2]||''),out=path.resolve(process.argv[3]||''),dir=path.resolve(process.argv[4]||'');
const base='AE4D114DF4CD429CDCB4340826472FB708C31C0AB91EE2AC1BB4B156A06F2100';
const htmlGit='5a02fea1b1ecdc3049a94bcac17fdafffbb6cb4a';
const sha256=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const git=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
function once(s,a,b){assert.equal(s.split(a).length,2,'Expected one unique identity guard');return s.replace(a,b)}
async function main(){
 assert.ok(fs.existsSync(old),'Missing Patch5.1 archive');assert.equal(sha256(old),base,'Unverified Patch5.1 archive');
 fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});asar.extractAll(old,dir);
 const file=path.join(dir,'index.html'),before=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 assert.equal(git(Buffer.from(before)),htmlGit,'Approved Patch 5 HTML unexpectedly changed');
 const guard1='      if(sameList){\n        event.preventDefault();event.stopImmediatePropagation();';
 const replacement1="      if(sameList&&!(key==='volunteer'&&addVolunteerForToday&&!id&&normName(cfg.nameOf(sameList))===normalizedName)){\n        event.preventDefault();event.stopImmediatePropagation();";
 const guard2="      blocked=p2v514BlockIdentity('volunteer',$('volunteerId')?.value||'',name,$('volunteerMobile')?.value||'')";
 const replacement2="      const volunteerMobile=normMobile($('volunteerMobile')?.value||'');\n"+
 "      const existingForEvent=addVolunteerForToday&&!$('volunteerId')?.value&&volunteerMobile.length===10&&\n"+
 "        state.volunteers.some(v=>normMobile(v.mobile||'')===volunteerMobile&&normName(volName(v))===normName(name));\n"+
 "      blocked=!existingForEvent&&p2v514BlockIdentity('volunteer',$('volunteerId')?.value||'',name,$('volunteerMobile')?.value||'')";
 let next=once(before,guard1,replacement1);next=once(next,guard2,replacement2);
 assert.equal(once(once(next,replacement2,guard2),replacement1,guard1),before,'No other HTML changes allowed');
 fs.writeFileSync(file,next,'utf8');await asar.createPackage(dir,out);
 assert.deepEqual(asar.extractFile(out,'index.html'),Buffer.from(next));
 assert.deepEqual(asar.extractFile(out,'main.js'),asar.extractFile(old,'main.js'));
 assert.equal(JSON.parse(asar.extractFile(out,'package.json').toString()).version,'2.0.0-beta.5.81.8');
 const report={baseSha256:sha256(old),patchSha256:sha256(out),htmlBefore:htmlGit,htmlAfter:git(Buffer.from(next)),onlyChangedFile:'index.html',previousBytes:Buffer.byteLength(before),patchedBytes:Buffer.byteLength(next)};
 fs.writeFileSync('volunteer-cross-event-hashes.json',JSON.stringify(report,null,2)+'\n');
 console.log('PASS exact Patch5.1; only two master-identity guard changes, all other screens and data preserved',report);
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
