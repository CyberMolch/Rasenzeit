"""Verkleinert die Lexikon-Referenzbilder für die App und vermerkt die Änderung im Bildnachweis.
Idempotent: bereits verarbeitete Bilder werden übersprungen. Benötigt Pillow."""
import json, os
from PIL import Image

NOTE = 'auf höchstens 800 px Kantenlänge verkleinert und als JPEG (Qualität 72) neu komprimiert'
p = 'src/content/lexicon/images.json'
d = json.load(open(p, encoding='utf-8'))
for lst in d['images'].values():
    for i in lst:
        if NOTE in i['changes']:
            continue
        f = 'public/' + i['src']
        im = Image.open(f).convert('RGB')
        im.thumbnail((800, 800))
        im.save(f, 'JPEG', quality=72, optimize=True, progressive=True)
        i['bytes'] = os.path.getsize(f)
        i['width'], i['height'] = im.size
        i['changes'] = (i['changes'] + '; ' if i['changes'] != 'unverändert' else '') + NOTE
json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
open(p, 'a').write('\n')
