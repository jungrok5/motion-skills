"""Publish the film as a web page that draws the scenes LIVE in the browser (no video file), in every language you have.
   Run from the film project root:   python3 <skill>/scripts/publish.py [--out site]
   → site/index.html       the player (player/index.html filled from film.json)
     site/s/<scene>.html   scene pages (Google Fonts link swapped for the local subset fonts.css)
     site/s/<scene>.m4a    per-scene sound (from scenes/<scene>.wav, AAC 96 kb/s, −16 LUFS)
     site/s/lib.js, *.js   harness + helpers;  site/s/i18n/<lang>.json  language files;  site/s/*.woff2 + fonts.css
   Fonts: film.json "fonts.base" = the scenes' own faces [[family, weight, file.ttf], …] (subset to the glyphs of the
   scenes + source-language text); "fonts.local" = {family: file.ttf} for faces a language's _fonts names (subset to that
   language's glyphs). TTFs are read from $FONTS_DIR (default ~/.local/share/fonts).
   Posters: put poster-h.jpg / poster-v.jpg (and poster-h-<lang>.jpg …) in site/ yourself — a still of the title card.
   Needs: ffmpeg, fonttools + brotli (pip install fonttools brotli)."""
import os, re, sys, glob, json, shutil, subprocess

ROOT = os.path.abspath(os.environ.get('FILM_ROOT', '.'))
SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SC = os.path.join(ROOT, 'scenes')
SITE = os.path.join(ROOT, sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else 'site')
OUT = os.path.join(SITE, 's')
FONTS = os.path.expanduser(os.environ.get('FONTS_DIR', '~/.local/share/fonts'))
FILM = json.load(open(os.path.join(ROOT, 'film.json'), encoding='utf-8'))
SCENES = [s if isinstance(s, dict) else {'id': s} for s in FILM['scenes']]
ORDER = [s['id'] for s in SCENES]
GF = re.compile(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com/[^"]*">')
os.makedirs(os.path.join(OUT, 'i18n'), exist_ok=True)

def subset(src, glyphs, dst):
    tf = os.path.join(OUT, '.glyphs.txt'); open(tf, 'w', encoding='utf-8').write(''.join(sorted(c for c in glyphs if c >= ' ')))
    subprocess.run(['pyftsubset', src, f'--text-file={tf}', '--flavor=woff2', '--layout-features=*', f'--output-file={dst}'], check=True)
    os.remove(tf)

BASIC = {chr(c) for c in range(0x20, 0x7f)} | set('·—–…“”‘’«»「」『』()•→←↑↓')
langs = [p for p in glob.glob(os.path.join(SC, 'i18n', '*.json'))]
css = []
# the scenes' own faces: glyphs of every scene + helper + language files that do not bring their own _fonts
srcs = [os.path.join(SC, s + '.html') for s in ORDER] + glob.glob(os.path.join(SC, '*.js')) + [p for p in langs if '"_fonts"' not in open(p, encoding='utf-8').read()]
glyphs = set(''.join(open(p, encoding='utf-8').read() for p in srcs)) | BASIC
for fam, w, f in FILM.get('fonts', {}).get('base', []):
    name = f"{fam.replace(' ', '')}-{w}.woff2"; subset(os.path.join(FONTS, f), glyphs, os.path.join(OUT, name))
    css.append(f"@font-face{{font-family:'{fam}';font-weight:{w};font-style:normal;font-display:block;src:url({name}) format('woff2')}}")
# faces a language names in its _fonts
LOCAL = FILM.get('fonts', {}).get('local', {}); need = {}
for p in langs:
    j = json.load(open(p, encoding='utf-8')); f = j.get('_fonts')
    if not f: continue
    txt = json.dumps(j, ensure_ascii=False)
    for fam in re.findall(r"'([^']+)'", (f.get('serif') or '') + ',' + (f.get('sans') or '')):
        if fam in LOCAL and os.path.exists(os.path.join(FONTS, LOCAL[fam])): need.setdefault(fam, set()).update(txt)
for fam, gl in sorted(need.items()):
    name = fam.replace(' ', '') + '.woff2'; subset(os.path.join(FONTS, LOCAL[fam]), gl | BASIC, os.path.join(OUT, name))
    css.append(f"@font-face{{font-family:'{fam}';font-weight:100 900;font-style:normal;font-display:block;src:url({name}) format('woff2')}}")
open(os.path.join(OUT, 'fonts.css'), 'w').write('\n'.join(css) + '\n')

for s in ORDER:
    h = open(os.path.join(SC, s + '.html'), encoding='utf-8').read()
    h, n = GF.subn('<link rel="stylesheet" href="fonts.css">', h)
    if not n: h = h.replace('</head>', '<link rel="stylesheet" href="fonts.css">\n</head>', 1)
    open(os.path.join(OUT, s + '.html'), 'w', encoding='utf-8').write(h)
    wav, m4a = os.path.join(SC, s + '.wav'), os.path.join(OUT, s + '.m4a')
    if os.path.exists(m4a) and os.path.exists(wav) and os.path.getmtime(m4a) >= os.path.getmtime(wav): pass   # unchanged
    elif os.path.exists(wav):
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000',
                        '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', m4a], check=True)
    else: print('no sound yet:', s)
for p in glob.glob(os.path.join(SC, '*.js')): shutil.copy(p, OUT)
for p in langs: shutil.copy(p, os.path.join(OUT, 'i18n'))

# the player page, in the source language (other languages come from each file's "_ui")
pl = FILM.get('player', {})
tpl = open(os.path.join(SKILL, 'player', 'index.html'), encoding='utf-8').read()
fill = {'LANG': FILM.get('source', 'ko'), 'TITLE': pl.get('title', FILM.get('title', 'Film')), 'DESC': pl.get('desc', ''),
        'HOME': pl.get('home', '/'), 'HOME_LABEL': pl.get('homeLabel', '←'), 'LEN': pl.get('len', ''), 'H1': pl.get('h1', pl.get('title', '')),
        'SUB': pl.get('sub', ''), 'BACK': pl.get('back', ''), 'LEGAL': pl.get('legal', ''),
        'SCENES_JSON': json.dumps([[s['id'], s.get('label', s['id']), s.get('dur', 30)] for s in SCENES], ensure_ascii=False),
        'UI_JSON': json.dumps(pl.get('ui', {}), ensure_ascii=False)}
for k, v in fill.items(): tpl = tpl.replace('{{' + k + '}}', str(v))
open(os.path.join(SITE, 'index.html'), 'w', encoding='utf-8').write(tpl)
tot = sum(os.path.getsize(p) for p in glob.glob(os.path.join(OUT, '*')) + glob.glob(os.path.join(OUT, 'i18n', '*')))
print(f'→ {os.path.relpath(SITE, ROOT)}/ · {len(ORDER)} scenes · {tot / 1e6:.1f} MB')
