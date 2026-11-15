#!/usr/bin/env python3
"""Brush font for a world: subset a font to the characters the world writes.

  python3 <skill>/scripts/font.py <project> [<project> …] [--font path/or/url.ttf] [--family NAME] [--out lib/fonts/NAME.woff2]

Reads world.js in each <project>, collects every character of its words, title, subtitle and rule lines (plus basic Latin),
and writes a woff2 holding only those. Use it
  - for a script the bundled font does not cover (Hanja, kana, Cyrillic …): give --font an OFL brush font
    (e.g. https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/MaShanZheng-Regular.ttf) and point the
    world at the result:  font: { family: 'NAME', url: new URL('./lib/fonts/NAME.woff2', import.meta.url).href }
  - to publish a small page: the bundled YeonSung.woff2 is 490 KB; a subset for one world is 10–30 KB.
Needs: pip install fonttools brotli. Keep the font's licence file next to the output.
"""
import re, sys, os, argparse, tempfile, urllib.request
from fontTools import subset
from fontTools.ttLib import TTFont

ap = argparse.ArgumentParser(); ap.add_argument('project', nargs='+'); ap.add_argument('--font'); ap.add_argument('--family'); ap.add_argument('--out')
a = ap.parse_args()
here = os.path.dirname(os.path.abspath(__file__))
src = a.font or os.path.join(here, '..', 'lib', 'fonts', 'YeonSung.woff2')
if src.startswith('http'):
    tmp = tempfile.NamedTemporaryFile(suffix=os.path.splitext(src)[1], delete=False); tmp.write(urllib.request.urlopen(src).read()); tmp.close(); src = tmp.name
text = '\n'.join(open(os.path.join(p, 'world.js'), encoding='utf-8').read() for p in a.project)
strings = re.findall(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"|`((?:[^`\\]|\\.)*)`", text)
chars = set(chr(c) for c in range(0x20, 0x7F)) | set('·…캐스트 시트')        # the cast sheet's own title is in the brush font too
for s in strings:
    for part in s:
        chars |= set(ch for ch in part if ord(ch) > 0x7F)
font = TTFont(src); cmap = font.getBestCmap(); missing = sorted(ch for ch in chars if ord(ch) not in cmap and ord(ch) > 0x7F)
family = a.family or os.path.splitext(os.path.basename(src))[0].split('-')[0]
out = a.out or os.path.join(a.project[0], 'lib', 'fonts', family + '.woff2'); os.makedirs(os.path.dirname(out), exist_ok=True)
opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = ['*']; opt.name_IDs = ['*']
sub = subset.Subsetter(opt); sub.populate(unicodes=[ord(c) for c in chars]); sub.subset(font); font.flavor = 'woff2'; font.save(out)
print(f'{out}: {len(chars)} characters, {os.path.getsize(out) / 1024:.0f} KB')
if missing: print('not in this font (fine if they are never written in the brush face; scripts/check.mjs tells): ' + ' '.join(missing))
