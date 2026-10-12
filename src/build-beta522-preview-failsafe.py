from pathlib import Path

p=Path('src/main.js')
m=p.read_text(encoding='utf-8')
if 'BETA522 PREVIEW FAILSAFE' in m:
    print('Beta 5.22 preview fix already applied')
    raise SystemExit(0)
if 'BETA521 APPROVED LANDSCAPE PREVIEW' not in m:
    raise SystemExit('Beta 5.21 preview patch missing')

old_css=".sheet{display:none!important;background:#fff;margin:0 auto 22px!important;max-width:none!important;width:297mm!important;height:210mm!important;box-shadow:0 8px 30px #102d5e22}.sheet.ananda-preview-active{display:block!important}"
new_css=".ananda-preview-page{position:relative;margin:0 auto 24px!important}.sheet{display:block!important;background:#fff;margin:0!important;max-width:none!important;width:297mm!important;height:210mm!important;box-shadow:0 8px 30px #102d5e22;transform-origin:top left}.sheet.ananda-preview-active{outline:2px solid #1762c4;outline-offset:2px}"
if old_css not in m:
    raise SystemExit('Beta 5.21 preview sheet CSS not found')
m=m.replace(old_css,new_css,1)

old_print="@media print{.ananda-preview-toolbar{display:none!important}body{padding:0!important;background:#fff!important}.sheet{display:block!important;box-shadow:none!important;zoom:1!important;width:297mm!important;height:210mm!important}}"
new_print="@media print{.ananda-preview-toolbar{display:none!important}body{padding:0!important;background:#fff!important}.ananda-preview-page{display:block!important;width:auto!important;height:auto!important;margin:0!important}.sheet{display:block!important;box-shadow:none!important;outline:none!important;transform:none!important;zoom:1!important;width:297mm!important;height:210mm!important;margin:0!important}}"
if old_print not in m:
    raise SystemExit('Beta 5.21 print CSS not found')
m=m.replace(old_print,new_print,1)

old_js="const sheets=[...document.querySelectorAll('.sheet')],counter=document.getElementById('anandaCounter');let idx=0;function fit(){const p=sheets[idx];if(!p)return;p.style.zoom='1';const available=Math.max(420,window.innerWidth-56),z=Math.min(1,available/Math.max(1,p.offsetWidth));p.style.zoom=String(z)}function show(){sheets.forEach((x,i)=>{x.classList.toggle('ananda-preview-active',i===idx);x.style.zoom='1'});counter.textContent=sheets.length?((idx+1)+' / '+sheets.length):'1 / 1';document.getElementById('anandaPrev').disabled=idx<=0;document.getElementById('anandaNext').disabled=idx>=sheets.length-1;requestAnimationFrame(fit)}window.addEventListener('resize',fit)"
new_js="const sheets=[...document.querySelectorAll('.sheet')],counter=document.getElementById('anandaCounter'),pages=[];let idx=0;function prepare(){sheets.forEach(s=>{const w=document.createElement('div');w.className='ananda-preview-page';s.parentNode.insertBefore(w,s);w.appendChild(s);pages.push(w)})}function fitAll(){const available=Math.max(360,window.innerWidth-48);sheets.forEach((s,i)=>{s.style.transform='none';const bw=s.offsetWidth||1123,bh=s.offsetHeight||794,scale=Math.min(1,available/Math.max(1,bw));s.style.transform='scale('+scale+')';s.style.transformOrigin='top left';pages[i].style.width=(bw*scale)+'px';pages[i].style.height=(bh*scale)+'px'})}function show(scroll){sheets.forEach((x,i)=>x.classList.toggle('ananda-preview-active',i===idx));counter.textContent=sheets.length?((idx+1)+' / '+sheets.length):'1 / 1';document.getElementById('anandaPrev').disabled=idx<=0;document.getElementById('anandaNext').disabled=idx>=sheets.length-1;if(scroll&&pages[idx])pages[idx].scrollIntoView({behavior:'smooth',block:'start'})}prepare();requestAnimationFrame(()=>{fitAll();show(false)});window.addEventListener('resize',()=>requestAnimationFrame(fitAll))"
if old_js not in m:
    raise SystemExit('Beta 5.21 preview JS not found')
m=m.replace(old_js,new_js,1)

m=m.replace("document.getElementById('anandaPrev').onclick=()=>{if(idx>0){idx--;show()}};document.getElementById('anandaNext').onclick=()=>{if(idx<sheets.length-1){idx++;show()}};",
            "document.getElementById('anandaPrev').onclick=()=>{if(idx>0){idx--;show(true)}};document.getElementById('anandaNext').onclick=()=>{if(idx<sheets.length-1){idx++;show(true)}};",1)

m=m.replace("<strong>QR ATTENDANCE PRINT PREVIEW</strong>","<strong>CLASS ATTENDANCE PRINT PREVIEW</strong>",1)
m=m.replace("// BETA521 APPROVED LANDSCAPE PREVIEW","// BETA522 PREVIEW FAILSAFE\n// BETA521 APPROVED LANDSCAPE PREVIEW",1)

p.write_text(m,encoding='utf-8')
print('BETA 5.22 FAILSAFE PREVIEW APPLIED')
