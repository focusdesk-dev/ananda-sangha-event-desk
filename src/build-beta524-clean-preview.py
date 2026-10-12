from pathlib import Path

mp=Path('src/main.js')
m=mp.read_text(encoding='utf-8')
if 'BETA524 CLEAN PREVIEW DECORATOR' in m:
    print('Beta 5.24 clean preview already applied')
    raise SystemExit(0)
if 'BETA524 PREVIEW ACTION BRIDGE' not in m:
    raise SystemExit('Beta 5.24 action bridge missing')

start=m.find('function anandaDecoratePrintPreview(source){')
end=m.find('// BETA524 PREVIEW ACTION BRIDGE',start)
if start < 0 or end < 0:
    raise SystemExit('Could not locate complete preview decorator')

clean=r"""// BETA524 CLEAN PREVIEW DECORATOR
function anandaDecoratePrintPreview(source){
  const addon=`<style>
  .ananda-preview-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;position:fixed;z-index:999999;left:0;right:0;top:0;height:58px;padding:0 18px;background:#123f7d;color:#fff;font-family:Arial,sans-serif;box-shadow:0 2px 12px #0002}
  .ananda-preview-toolbar .group{display:flex;align-items:center;gap:8px}
  .ananda-preview-toolbar button{border:1px solid #d9e7f5;background:#fff;color:#123f7d;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer}
  .ananda-preview-toolbar button.primary{background:#1762c4;color:#fff;border-color:#1762c4}
  .ananda-preview-counter{min-width:70px;text-align:center;font-weight:700}
  .ananda-preview-status{font-size:12px;min-width:70px;text-align:right;color:#e8f2ff}
  @media screen{
    body{background:#e9eef4!important;padding:76px 24px 30px!important}
    .ananda-preview-page{display:none;position:relative;margin:0 auto 24px!important}
    .ananda-preview-page.ananda-preview-page-active{display:block}
    .sheet{display:block!important;background:#fff;margin:0!important;max-width:none!important;width:297mm!important;height:210mm!important;box-shadow:0 8px 30px #102d5e22;transform-origin:top left}
  }
  @media print{
    .ananda-preview-toolbar{display:none!important}
    body{padding:0!important;background:#fff!important}
    .ananda-preview-page{display:block!important;width:auto!important;height:auto!important;margin:0!important;page-break-after:always}
    .ananda-preview-page:last-of-type{page-break-after:auto}
    .sheet{display:block!important;box-shadow:none!important;outline:none!important;transform:none!important;width:297mm!important;height:210mm!important;margin:0!important}
  }
  </style>
  <div class="ananda-preview-toolbar">
    <div class="group"><strong>CLASS ATTENDANCE PRINT PREVIEW</strong></div>
    <div class="group"><button id="anandaPrev">Previous</button><span id="anandaCounter" class="ananda-preview-counter"></span><button id="anandaNext">Next</button></div>
    <div class="group"><span id="anandaPreviewStatus" class="ananda-preview-status"></span><button id="anandaSave">Save PDF</button><button id="anandaPrint" class="primary">Print</button><button id="anandaClose">Close</button></div>
  </div>
  <script>
  (function(){
    const sheets=Array.from(document.querySelectorAll('.sheet'));
    const pages=[];
    const counter=document.getElementById('anandaCounter');
    const status=document.getElementById('anandaPreviewStatus');
    let idx=0;
    sheets.forEach(function(sheet){
      const wrap=document.createElement('div');
      wrap.className='ananda-preview-page';
      sheet.parentNode.insertBefore(wrap,sheet);
      wrap.appendChild(sheet);
      pages.push(wrap);
    });
    function fitCurrent(){
      const sheet=sheets[idx],wrap=pages[idx];
      if(!sheet||!wrap)return;
      sheet.style.transform='none';
      const bw=sheet.offsetWidth||1123,bh=sheet.offsetHeight||794;
      const available=Math.max(360,window.innerWidth-48);
      const scale=Math.min(1,available/Math.max(1,bw));
      sheet.style.transform='scale('+scale+')';
      sheet.style.transformOrigin='top left';
      wrap.style.width=(bw*scale)+'px';
      wrap.style.height=(bh*scale)+'px';
    }
    function show(scroll){
      pages.forEach(function(page,i){page.classList.toggle('ananda-preview-page-active',i===idx)});
      counter.textContent=sheets.length?((idx+1)+' / '+sheets.length):'1 / 1';
      document.getElementById('anandaPrev').disabled=idx<=0;
      document.getElementById('anandaNext').disabled=idx>=sheets.length-1;
      requestAnimationFrame(function(){
        fitCurrent();
        if(scroll&&pages[idx])pages[idx].scrollIntoView({behavior:'smooth',block:'start'});
      });
    }
    async function runAction(kind){
      if(!window.anandaPreview){alert('Preview controls are unavailable.');return}
      status.textContent=kind==='save'?'Saving...':(kind==='print'?'Opening printer...':'');
      try{
        let result;
        if(kind==='save')result=await window.anandaPreview.savePdf();
        if(kind==='print')result=await window.anandaPreview.print();
        if(result&&result.ok===false&&!result.canceled)alert(result.error||'Action failed.');
        if(kind==='save'&&result&&result.ok)status.textContent='Saved';
        else if(kind==='print')status.textContent='';
        else if(result&&result.canceled)status.textContent='';
      }catch(error){
        status.textContent='';
        alert(error&&error.message?error.message:String(error));
      }
    }
    document.getElementById('anandaPrev').onclick=function(){if(idx>0){idx--;show(true)}};
    document.getElementById('anandaNext').onclick=function(){if(idx<sheets.length-1){idx++;show(true)}};
    document.getElementById('anandaSave').onclick=function(){runAction('save')};
    document.getElementById('anandaPrint').onclick=function(){runAction('print')};
    document.getElementById('anandaClose').onclick=function(){if(window.anandaPreview)window.anandaPreview.close()};
    show(false);
    window.addEventListener('resize',function(){requestAnimationFrame(fitCurrent)});
  })();
  </script>`;
  return /<\/body>/i.test(source)?source.replace(/<\/body>/i,addon+'</body>'):source+addon
}

"""
m=m[:start]+clean+m[end:]
mp.write_text(m,encoding='utf-8')
print('BETA 5.24 CLEAN PREVIEW DECORATOR APPLIED')
