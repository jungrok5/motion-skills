#!/usr/bin/env python3
"""Copy every canvas-film kit's template into docs/canvas-film/kits/<slug>/ as a live page for the samples site.

  python3 tools/build-kit-demos.py           rewrite docs/canvas-film/kits/<slug>/ and kits/_shared/
  python3 tools/build-kit-demos.py --check   exit 1 if a copy is missing or differs from canvas-film/kits (nothing written)

Each page is the kit's template.html with lib.js / story.js loaded once from ../_shared/, plus script.js (the kit's
script.example.js) and kit-<slug>.js. Fonts come from the Google Fonts link the template already has; there is no audio.
Two small changes for the site, both only in these copies:
  - ?t=<sec> shows that frame as the poster until the viewer presses play (then it plays from 0), like the
    motion-webtoon demo pages; the gallery links each tile to its thumbnail's moment.
  - the play button reads "▶ 재생" instead of "▶ 소리와 함께" (the templates have no soundtrack).
Thumbnails (docs/canvas-film/kits/<slug>.jpg) are stills rendered with canvas-film/scripts/render.mjs, not made here.
"""
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KITS = os.path.join(ROOT, 'canvas-film', 'kits')
OUT = os.path.join(ROOT, 'docs', 'canvas-film', 'kits')
CHECK = '--check' in sys.argv

POSTER = ('<script>/* site copy: ?t=<sec> holds that frame as the poster until play (tools/build-kit-demos.py) */'
          '(function (run) { Pilot.run = c => { let go = false; const d = c.draw, q = new URLSearchParams(location.search), '
          'P = q.has("t") ? +q.get("t") : 0; c = Object.assign({}, c, { draw: (x, t) => { if (t > 0) go = true; '
          'd(x, go ? t : Math.min(P, c.dur - .01)); } }); return run(c); }; })(Pilot.run);</script>')


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def want():
    files = {}
    lib = read(os.path.join(ROOT, 'canvas-film', 'harness', 'lib.js'))
    label = ">▶ 소리와 함께</button>"
    assert label in lib, 'harness/lib.js: play button label changed; update tools/build-kit-demos.py'
    files['_shared/lib.js'] = lib.replace(label, ">' + (cfg.audio ? '▶ 소리와 함께' : '▶ 재생') + '</button>")
    files['_shared/story.js'] = read(os.path.join(KITS, '_shared', 'story.js'))
    for k in sorted(os.listdir(KITS)):
        d = os.path.join(KITS, k)
        if not os.path.exists(os.path.join(d, 'kit.js')):
            continue
        page = read(os.path.join(d, 'template.html'))
        for a, b in [('<script src="lib.js"></script>', '<script src="../_shared/lib.js"></script>\n' + POSTER),
                     ('<script src="story.js"></script>', '<script src="../_shared/story.js"></script>')]:
            assert page.count(a) == 1, f'{k}/template.html: expected one {a}'
            page = page.replace(a, b)
        files[f'{k}/index.html'] = page
        files[f'{k}/script.js'] = read(os.path.join(d, 'script.example.js'))
        files[f'{k}/kit-{k}.js'] = read(os.path.join(d, 'kit.js'))
    return files


bad = []
for rel, text in want().items():
    p = os.path.join(OUT, rel)
    if CHECK:
        if not os.path.exists(p) or read(p) != text:
            bad.append(rel)
        continue
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(text)
if CHECK:
    if bad:
        sys.exit('out of date: ' + ', '.join(bad) + ' (run python3 tools/build-kit-demos.py)')
    print('kit demos up to date')
else:
    print('wrote', OUT)
