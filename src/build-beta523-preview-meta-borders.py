from pathlib import Path

hp=Path('src/index.html')
html=hp.read_text(encoding='utf-8')
if 'PHASE2 BETA521 APPROVED A4 30' not in html:
    raise SystemExit('Beta 5.21 approved sheet missing')
if 'PHASE2 BETA523 PAGE BY PAGE PREVIEW' in html:
    print('Beta 5.23 already applied')
    raise SystemExit(0)

# Fix clipped top-right metadata: Beta 5.21 accidentally defined THREE grid
# columns for only TWO children (label + value), squeezing the value into 2 mm.
old_meta='.sheetmeta div{display:grid;grid-template-columns:15mm 2mm minmax(0,1fr);align-items:center}.sheetmeta div:before{content:"";display:none}.sheetmeta span{font-weight:400}.sheetmeta span:after{content:" :";float:right}.sheetmeta b{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:1mm}'
new_meta='.sheetmeta div{display:grid;grid-template-columns:18mm minmax(0,1fr);align-items:center;column-gap:1.5mm}.sheetmeta span{font-weight:400;white-space:nowrap}.sheetmeta span:after{content:" :"}.sheetmeta b{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:0}'
if old_meta not in html:
    raise SystemExit('Beta 5.21 metadata CSS not found')
html=html.replace(old_meta,new_meta,1)

# Close every ATTENDANCE cell visibly on both sides.  Scanner already ignores a
# 2 mm safety margin at the lane edges, so this border cannot be detected as ink.
old_mark='.mark{background:#fff!important;border-left:.18mm solid #9cc7ed}'
new_mark='.mark{background:#fff!important;border-left:.22mm solid #8fbce5;border-right:.22mm solid #8fbce5}'
if old_mark not in html:
    raise SystemExit('Beta 5.21 mark-lane CSS not found')
html=html.replace(old_mark,new_mark,1)

# Strengthen the bottom line slightly so each row reads as a closed box.
html=html.replace('border-bottom:.18mm solid #9cc7ed}.num,.nm',
                  'border-bottom:.22mm solid #8fbce5}.num,.nm',1)

insert='\n  // PHASE2 BETA523 PAGE BY PAGE PREVIEW\n'
marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('Renderer insertion marker missing')
html=html.replace(marker,insert+marker,1)
hp.write_text(html,encoding='utf-8')

mp=Path('src/main.js')
m=mp.read_text(encoding='utf-8')
if 'BETA523 TRUE PAGE BY PAGE PREVIEW' not in m:
    old_css='.ananda-preview-page{position:relative;margin:0 auto 24px!important}.sheet{display:block!important;background:#fff;margin:0!important;max-width:none!important;width:297mm!important;height:210mm!important;box-shadow:0 8px 30px #102d5e22;transform-origin:top left}.sheet.ananda-preview-active{outline:2px solid #1762c4;outline-offset:2px}'
    new_css='.ananda-preview-page{display:none;position:relative;margin:0 auto 24px!important}.ananda-preview-page.ananda-preview-page-active{display:block}.sheet{display:block!important;background:#fff;margin:0!important;max-width:none!important;width:297mm!important;height:210mm!important;box-shadow:0 8px 30px #102d5e22;transform-origin:top left}.sheet.ananda-preview-active{outline:2px solid #1762c4;outline-offset:2px}'
    if old_css not in m:
        raise SystemExit('Beta 5.22 wrapper CSS not found')
    m=m.replace(old_css,new_css,1)

    old_js="const sheets=[...document.querySelectorAll('.sheet')],counter=document.getElementById('anandaCounter'),pages=[];let idx=0;function prepare(){sheets.forEach(s=>{const w=document.createElement('div');w.className='ananda-preview-page';s.parentNode.insertBefore(w,s);w.appendChild(s);pages.push(w)})}function fitAll(){const available=Math.max(360,window.innerWidth-48);sheets.forEach((s,i)=>{s.style.transform='none';const bw=s.offsetWidth||1123,bh=s.offsetHeight||794,scale=Math.min(1,available/Math.max(1,bw));s.style.transform='scale('+scale+')';s.style.transformOrigin='top left';pages[i].style.width=(bw*scale)+'px';pages[i].style.height=(bh*scale)+'px'})}function show(scroll){sheets.forEach((x,i)=>x.classList.toggle('ananda-preview-active',i===idx));counter.textContent=sheets.length?((idx+1)+' / '+sheets.length):'1 / 1';document.getElementById('anandaPrev').disabled=idx<=0;document.getElementById('anandaNext').disabled=idx>=sheets.length-1;if(scroll&&pages[idx])pages[idx].scrollIntoView({behavior:'smooth',block:'start'})}prepare();requestAnimationFrame(()=>{fitAll();show(false)});window.addEventListener('resize',()=>requestAnimationFrame(fitAll))"
    new_js="const sheets=[...document.querySelectorAll('.sheet')],counter=document.getElementById('anandaCounter'),pages=[];let idx=0;function prepare(){sheets.forEach(s=>{const w=document.createElement('div');w.className='ananda-preview-page';s.parentNode.insertBefore(w,s);w.appendChild(s);pages.push(w)})}function fitCurrent(){const s=sheets[idx],w=pages[idx];if(!s||!w)return;s.style.transform='none';const bw=s.offsetWidth||1123,bh=s.offsetHeight||794,available=Math.max(360,window.innerWidth-48),scale=Math.min(1,available/Math.max(1,bw));s.style.transform='scale('+scale+')';s.style.transformOrigin='top left';w.style.width=(bw*scale)+'px';w.style.height=(bh*scale)+'px'}function show(scroll){pages.forEach((p,i)=>p.classList.toggle('ananda-preview-page-active',i===idx));sheets.forEach((x,i)=>x.classList.toggle('ananda-preview-active',i===idx));counter.textContent=sheets.length?((idx+1)+' / '+sheets.length):'1 / 1';document.getElementById('anandaPrev').disabled=idx<=0;document.getElementById('anandaNext').disabled=idx>=sheets.length-1;requestAnimationFrame(()=>{fitCurrent();if(scroll&&pages[idx])pages[idx].scrollIntoView({behavior:'smooth',block:'start'})})}prepare();show(false);window.addEventListener('resize',()=>requestAnimationFrame(fitCurrent))"
    if old_js not in m:
        raise SystemExit('Beta 5.22 preview JS not found')
    m=m.replace(old_js,new_js,1)

    # Printing must still include every sheet, even though preview displays one wrapper at a time.
    old_print='.ananda-preview-page{display:block!important;width:auto!important;height:auto!important;margin:0!important}'
    new_print='.ananda-preview-page{display:block!important;width:auto!important;height:auto!important;margin:0!important;page-break-after:always}.ananda-preview-page:last-of-type{page-break-after:auto}'
    if old_print not in m:
        raise SystemExit('Beta 5.22 print wrapper rule not found')
    m=m.replace(old_print,new_print,1)

    m=m.replace('// BETA522 PREVIEW FAILSAFE',
                '// BETA523 TRUE PAGE BY PAGE PREVIEW\n// BETA522 PREVIEW FAILSAFE',1)
    mp.write_text(m,encoding='utf-8')

print('BETA 5.23 META + CLOSED ATTENDANCE CELLS + TRUE PAGE-BY-PAGE PREVIEW APPLIED')
