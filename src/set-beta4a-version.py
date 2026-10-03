from pathlib import Path
import re

VERSION='2.0.0-beta.4a'

html=Path('src/index.html')
text=html.read_text(encoding='utf-8')
text=text.replace('2.0.0-beta.3', VERSION).replace('2.0.0-beta.2', VERSION).replace('2.0.0-beta.1', VERSION)
html.write_text(text, encoding='utf-8', newline='\n')

main=Path('src/main.js')
text=main.read_text(encoding='utf-8-sig')
text=re.sub(r"const APP_VERSION = '[^']+';", f"const APP_VERSION = '{VERSION}';", text, count=1)
main.write_text(text, encoding='utf-8', newline='\n')

package=Path('src/package.json')
text=package.read_text(encoding='utf-8-sig')
text=re.sub(r'"version"\s*:\s*"[^"]+"', f'"version": "{VERSION}"', text, count=1)
package.write_text(text, encoding='utf-8', newline='\n')

print('SET PHASE 2 VERSION:', VERSION)
