from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent.parent
img=Image.open(root/'ananda-approved-logo.png').convert('RGBA')
if img.size != (256,256):
    raise SystemExit('Wrong approved logo size, refusing to build Windows icon')
# No design edits: preserve the exact supplied logo artwork.
img.save(root/'ananda-icon.ico', format='ICO',
         sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
ico=Image.open(root/'ananda-icon.ico')
must={(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)}
if not must.issubset(ico.info['sizes']):
    raise SystemExit('ICO lacks required desktop/taskbar sizes')
print('PASS exact Ananda logo multi-resolution Windows icon:',sorted(ico.info['sizes']))
