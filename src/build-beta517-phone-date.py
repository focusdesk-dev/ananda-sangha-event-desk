from pathlib import Path

p=Path('src/main.js')
m=p.read_text(encoding='utf-8')
if 'BETA517 PHONE CLASS DATE' in m:
    print('Phone class/date patch already applied')
    raise SystemExit(0)
needle="function anandaMobilePage(meta,encoded){"
if needle not in m:
    raise SystemExit('Mobile attendance page missing')
m=m.replace(needle,needle+"\n  // BETA517 PHONE CLASS DATE",1)
old='<div class="details"><b>\${course}\${course&&batch?\' · \':\'\'}\${batch}</b><span>\${date}\${meta?.sheet?\' · Sheet \'+safe(meta.sheet)+\' of \'+safe(meta.total||1):\'\'}</span></div>'
new='<div class="details"><b>\${course}\${course&&batch?\' · \':\'\'}\${batch}</b><span><strong>DATE:</strong> \${date}\${meta?.sheet?\' · Sheet \'+safe(meta.sheet)+\' of \'+safe(meta.total||1):\'\'}</span></div>'
if old in m:
    m=m.replace(old,new,1)
old2='<div class="details" style="display:\${has?\'block\':\'none\'}"><b>\${course}\${course&&batch?\' · \':\'\'}\${batch}</b><span>\${date}</span></div>'
new2='<div class="details" style="display:\${has?\'block\':\'none\'}"><b>\${course}\${course&&batch?\' · \':\'\'}\${batch}</b><span><strong>DATE:</strong> \${date}</span></div>'
if old2 in m:
    m=m.replace(old2,new2,1)
p.write_text(m,encoding='utf-8')
print('BETA 5.17 PHONE CLASS + DATE APPLIED')
