/* Beta 5.81: personal identity is NOT the same as a family contact. */
(function (root,factory) {
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.AnandaIdentity581=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  function name(value){return String(value??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
  function mobile(value){let digits=String(value??'').replace(/\D/g,'');if(digits.length>10&&digits.startsWith('91'))digits=digits.slice(-10);return digits}
  function personal(record){
    if(!record)return '';
    const personal=mobile(record.personalMobile);
    if(personal.length===10)return personal;
    // A family master can contain an old shared contact in "mobile".
    if(record.kind==='family'||record.category==='family'||record.familyContactOnly)return '';
    const direct=mobile(record.mobile);
    return direct.length===10?direct:'';
  }
  function assess(candidate,existing){
    const n1=name(candidate?.name),n2=name(existing?.name);
    const p1=personal(candidate),p2=personal(existing);
    if(p1&&p2&&p1===p2)return n1&&n1===n2?'confirmed':'phone-conflict';
    if(n1&&n1===n2)return p1&&p2?'different':'possible';
    return 'different';
  }
  function searchMatch(record,query){
    const raw=String(query??'').trim();
    if(!raw)return false;
    const n=name(raw.replace(/[\d+()[\].,\-]/g,' '));
    const digits=mobile(raw);
    const words=name(record?.name).includes(n)||name(record?.detail).includes(n);
    const phones=[personal(record),mobile(record?.contactMobile)].filter(Boolean);
    return (!n||words)&&(!digits||(digits.length>=3&&phones.some(p=>p.includes(digits))));
  }
  return Object.freeze({name,mobile,personal,assess,searchMatch});
});
