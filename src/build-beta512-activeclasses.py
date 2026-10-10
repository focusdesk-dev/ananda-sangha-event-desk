from pathlib import Path

p=Path('src/index.html')
html=p.read_text(encoding='utf-8')
if 'PHASE2 BETA511 COMPLETE' not in html:
    raise SystemExit('Beta 5.11 marker not found')
if 'PHASE2 BETA512 ACTIVE CLASSES FIX' in html:
    print('Beta 5.12 active classes fix already applied')
    raise SystemExit(0)
marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('Insertion marker not found')

patch=r'''
  // PHASE2 BETA512 ACTIVE CLASSES FIX
  // The Beta 5.10 handler only rendered/scrolled the hidden list.
  // Active Classes must switch to the dedicated activeClasses page first.
  (function p2v512FixActiveClasses(){
    const btn=$('p2ClassBatches');
    if(!btn)return;
    btn.onclick=()=>{
      p2v510ClassYear='';
      switchPage('activeClasses');
      p2RenderClasses();
      window.scrollTo({top:0,behavior:'smooth'});
    };
  })();
'''

html=html.replace(marker,'\n'+patch+marker,1)
p.write_text(html,encoding='utf-8')
print('BETA 5.12 ACTIVE CLASSES FIX APPLIED')
