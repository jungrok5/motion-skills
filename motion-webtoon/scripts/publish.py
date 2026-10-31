#!/usr/bin/env python3
"""Publish a film's scene pages as LIVE web pages (the scenes draw in the browser; no video file).

  python3 <skill>/scripts/publish.py <film-dir> <out-dir> [--scenes a,b] [--kbps 64] [--poster 1.5]

For every scene page (scenes/<id>.html, or --scenes):
  · every <script src> it loads is copied next to it (flattened to its file name) and the src rewritten;
  · the Google Fonts <link> becomes fonts.css: each film.json font (from <film>/fonts/ or $FONTS_DIR) subset to the characters
    in the copied pages and scripts → fonts/<family>.woff2 (needs fonttools + brotli: pip install fonttools brotli);
  · scenes/<id>.wav (from mix.py), if there, → <id>.m4a (AAC) and the page plays it as its clock (Pilot.run's audio);
  · until playback starts, the paused page shows the frame at --poster seconds (or ?t=<s>) instead of the black frame 0;
  · index.html lists the scenes (portrait links, ?o=v).
Deploy <out-dir> anywhere static. Pages open paused with a play button; ?o=v is portrait (all webtoon scenes are).
The draw cost is the render's: Manga.grade ≈ 40–120 ms a frame, so a graded scene plays at ~8–20 fps on a laptop.
"""
import argparse, glob, html, json, os, re, shutil, subprocess, sys

ap = argparse.ArgumentParser(usage=__doc__)
ap.add_argument('film'); ap.add_argument('out'); ap.add_argument('--scenes', default=''); ap.add_argument('--kbps', type=int, default=64); ap.add_argument('--poster', type=float, default=1.5)
a = ap.parse_args()
film, out = os.path.abspath(a.film), os.path.abspath(a.out)
F = json.load(open(os.path.join(film, 'film.json'), encoding='utf-8'))
ids = [x for x in a.scenes.split(',') if x] or [s['id'] for s in F['scenes']]
os.makedirs(os.path.join(out, 'fonts'), exist_ok=True)
copied, text = {}, ''
for sid in ids:
    page = os.path.join(film, 'scenes', sid + '.html')
    s = open(page, encoding='utf-8').read()
    def repl(m):
        src = m.group(1)
        if re.match(r'https?:', src): return m.group(0)
        p = os.path.normpath(os.path.join(os.path.dirname(page), src)); name = os.path.basename(p)
        if name in copied and copied[name] != p and open(copied[name], 'rb').read() != open(p, 'rb').read():
            sys.exit(f'two different files named {name} ({copied[name]}, {p}) — publish them to separate folders')
        copied[name] = p; shutil.copy(p, os.path.join(out, name)); return f'<script src="{name}"></script>'
    s = re.sub(r'<script src="([^"]+)"></script>', repl, s)
    s = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^"]*">', '<link rel="stylesheet" href="fonts.css">', s)
    wav = os.path.join(film, 'scenes', sid + '.wav'); audio = ''
    if os.path.exists(wav):
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', f'{a.kbps}k', '-movflags', '+faststart', os.path.join(out, sid + '.m4a')], check=True)
        audio = sid + '.m4a'
    # without touching the scene's code: Pilot.run gets the sound as its clock (cfg.audio), and until playback starts the paused
    # page shows a poster moment instead of frame 0 (which is the fade from black): ?t=<s> on the URL, else --poster (1.5 s)
    wrap = ('<script>(function (run) { Pilot.run = c => { let go = false; const d = c.draw, q = new URLSearchParams(location.search), '
            f'P = q.has("t") ? +q.get("t") : {a.poster}; c = Object.assign({{}}, c, {{ draw: (x, t) => {{ if (t > 0) go = true; d(x, go ? t : Math.min(P, c.dur - .01)); }} }}); '
            + (f'if (!c.audio) c.audio = "{audio}"; ' if audio else '') + 'return run(c); }; })(Pilot.run);</script>')
    s = s.replace('<script src="lib.js"></script>', '<script src="lib.js"></script>\n' + wrap, 1)
    open(os.path.join(out, sid + '.html'), 'w', encoding='utf-8').write(s); text += s
for p in copied.values(): text += open(p, encoding='utf-8').read()

# fonts: subset every film.json face to the characters the pages and scripts contain
chars = ''.join(sorted(set(c for c in text if ord(c) > 0x7e))) + ''.join(chr(i) for i in range(0x20, 0x7f))
open(os.path.join(out, 'fonts', '.chars.txt'), 'w', encoding='utf-8').write(chars)
home = os.path.expanduser('~'); fdir = os.path.expanduser(os.environ.get('FONTS_DIR', os.path.join(home, '.local/share/fonts')))
css = []
faces = [(fam, f) for fam, _, f in F['fonts'].get('base', [])] + list(F['fonts'].get('local', {}).items())
for fam, f in faces:
    src = next((p for p in (os.path.join(film, 'fonts', f), os.path.join(fdir, f)) if os.path.exists(p)), None)
    if not src: print('font missing (skipped):', fam, f); continue
    name = re.sub(r'\W+', '', fam) + '.woff2'
    subprocess.run(['pyftsubset', src, '--text-file=' + os.path.join(out, 'fonts', '.chars.txt'), '--flavor=woff2', '--layout-features=*',
                    '--output-file=' + os.path.join(out, 'fonts', name)], check=True)
    css.append(f"@font-face{{font-family:'{fam}';src:url('fonts/{name}') format('woff2');font-weight:100 900;font-display:block}}")
os.remove(os.path.join(out, 'fonts', '.chars.txt'))
open(os.path.join(out, 'fonts.css'), 'w').write('\n'.join(css) + '\n')
links = ''.join(f'<li><a href="{i}.html?o=v">{html.escape(next((s.get("label", i) for s in F["scenes"] if s["id"] == i), i))}</a></li>' for i in ids)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(
    f'<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    f'<title>{html.escape(F.get("title", ""))}</title><body style="font:16px/1.6 system-ui,sans-serif;padding:16px;background:#111;color:#eee">'
    f'<h1 style="font-size:20px">{html.escape(F.get("title", ""))}</h1><ol>{links}</ol></body></html>\n')
size = sum(os.path.getsize(p) for p in glob.glob(os.path.join(out, '**', '*'), recursive=True) if os.path.isfile(p))
print(f'→ {out} · {len(ids)} scene(s), {len(copied)} scripts, {len(css)} fonts, {size / 1e6:.2f} MB')
