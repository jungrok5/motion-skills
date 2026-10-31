#!/usr/bin/env python3
"""Start a motion-webtoon film project from the starter.

  python3 <skill>/scripts/new-film.py my-film [--title "제목"]

→ my-film/film.json            title, one scene (highfive, 10 s), the FULL webtoon fonts (install them: see below)
  my-film/scenes/              lib.js, webtoon.js, manga.js, cast-rig.js (vendored copies — scenes load them relatively),
                               starter-cast.js (Cast.define per person: edit / add people here), script-highfive.js,
                               highfive.html (a working 3-panel gag to rename and rewrite), highfive.sound.json, audio/
Fonts: film.json names Jua, Do Hyeon, Black Han Sans, Nanum Pen Script, Gaegu, Noto Sans KR, Noto Serif KR as TTFs in
$FONTS_DIR (default ~/.local/share/fonts) or my-film/fonts/. render.mjs stops if one is missing (it never draws in a
fallback face). The starter's own subset fonts are NOT copied: they only hold the starter's characters.
Then, from my-film/:  node <skill>/scripts/render.mjs v --scene highfive --stills 1,4,7
"""
import argparse, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(HERE)
STARTER = os.path.join(SKILL, 'examples', 'starter')
LIBS = ['lib.js', 'webtoon.js', 'manga.js', 'cast-rig.js']
FONTS = [['Jua', 400, 'Jua-Regular.ttf'], ['Do Hyeon', 400, 'DoHyeon-Regular.ttf'], ['Black Han Sans', 400, 'BlackHanSans-Regular.ttf'],
         ['Nanum Pen Script', 400, 'NanumPenScript-Regular.ttf'], ['Gaegu', 400, 'Gaegu-Regular.ttf'],
         ['Noto Sans KR', 400, 'NotoSansKRwght.ttf'], ['Noto Serif KR', 600, 'NotoSerifKRwght.ttf']]
FONT_LINK = ('https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Do+Hyeon&family=Gaegu:wght@400;700&family=Jua'
             '&family=Nanum+Pen+Script&family=Noto+Sans+KR:wght@400;700&family=Noto+Serif+KR:wght@600&display=swap')

ap = argparse.ArgumentParser(usage=__doc__)
ap.add_argument('dest'); ap.add_argument('--title', default='새 무빙툰')
a = ap.parse_args()
dest = os.path.abspath(a.dest)
if os.path.exists(dest) and os.listdir(dest): sys.exit(f'{dest} exists and is not empty')
src_scenes, scenes = os.path.join(STARTER, 'scenes'), os.path.join(dest, 'scenes')
shutil.copytree(src_scenes, scenes, ignore=shutil.ignore_patterns('*.wav'))
for f in LIBS: shutil.copy(os.path.join(SKILL, 'lib', f), os.path.join(scenes, f))
for name in os.listdir(scenes):
    if not name.endswith('.html'): continue
    p = os.path.join(scenes, name); s = open(p, encoding='utf-8').read()
    s = s.replace('../../../lib/', '')                                         # the vendored copies sit next to the page
    s = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^"]*">', f'<link rel="stylesheet" href="{FONT_LINK}">', s)
    open(p, 'w', encoding='utf-8').write(s)
film = json.load(open(os.path.join(STARTER, 'film.json'), encoding='utf-8'))
film['title'] = a.title; film['fonts'] = {'base': FONTS, 'local': {}}
json.dump(film, open(os.path.join(dest, 'film.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
open(os.path.join(dest, '.gitignore'), 'w').write('out/\nscenes/*.wav\n')
fonts_dir = os.path.expanduser(os.environ.get('FONTS_DIR', '~/.local/share/fonts'))
missing = [f for _, _, f in FONTS if not (os.path.exists(os.path.join(fonts_dir, f)) or os.path.exists(os.path.join(dest, 'fonts', f)))]
print('→', dest)
print('  scenes/: ' + ', '.join(sorted(os.listdir(scenes))))
if missing: print('  fonts to install into', fonts_dir, '(or', os.path.join(dest, 'fonts') + '):', ', '.join(missing))
print(f'  next: cd {a.dest} && node {os.path.relpath(os.path.join(HERE, "render.mjs"), dest)} v --scene highfive --stills 1,4,7')
