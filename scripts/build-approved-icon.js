'use strict';
const fs=require('fs');
const path=require('path');
const sharp=require('sharp');
const lib=require('png-to-ico');
const makeIco=lib.default||lib;
(async()=>{
 const root=path.resolve(__dirname,'..');
 const source=path.join(root,'assets','approved-icon-1024.svg');
 const svg=fs.readFileSync(source);
 const sizes=[16,24,32,48,64,128,256];
 const output=path.join(root,'.approved-icon-build');
 fs.mkdirSync(output,{recursive:true});
 const files=[];
 for(const size of sizes){
   const file=path.join(output,'icon-'+size+'.png');
   await sharp(svg,{density:384}).resize(size,size,{fit:'contain',kernel:'lanczos3'}).png().toFile(file);
   files.push(file);
 }
 await sharp(svg,{density:384}).resize(2048,2048,{fit:'contain'}).png().toFile(path.join(output,'approved-icon-2048.png'));
 await sharp(svg,{density:384}).resize(128,128,{fit:'contain'}).png().toFile(path.join(root,'logo-128.png'));
 const ico=await makeIco(files);
 fs.writeFileSync(path.join(root,'ananda-icon.ico'),ico);
 if(fs.statSync(path.join(root,'ananda-icon.ico')).size<10000)throw Error('ICO appears incomplete');
 console.log('PASS approved PNG 2048 and multi-size ICO (16,24,32,48,64,128,256)');
})().catch(e=>{console.error(e);process.exit(1)});
