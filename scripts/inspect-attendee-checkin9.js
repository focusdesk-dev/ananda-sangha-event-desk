'use strict';
const asar=require('@electron/asar');
const text=asar.extractFile(process.argv[2],'index.html').toString('utf8');
for(const needle of ['id="checkin"','id="register"','v36NewRegistration','v36CheckIn','renderV36Checkin','function renderCheckin','function renderRegister','function switchPage','id="v36Checkin','data-page="checkin"','v36CheckinUI']){
 let pos=[],i=0;while((i=text.indexOf(needle,i))!==-1){pos.push(i);i+=needle.length;if(pos.length>4)break}
 console.log('SECTION '+needle+' hits '+pos.length);
 for(const at of pos){console.log(text.slice(Math.max(0,at-180),Math.min(text.length,at+2300)).replace(/\r/g,''))}
}
