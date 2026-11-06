#!/usr/bin/env python3
"""cursor-swarm · import-doc.py — turn an existing deck or document into a draft build the swarm can perform.

    python3 <skill>/scripts/import-doc.py deck.pptx my-deck          # PowerPoint / Keynote-exported .pptx
    python3 <skill>/scripts/import-doc.py book.pdf  my-book --doc book # any PDF (slides, a booklet, a poster)
    options: --doc slides|book|poster|web (default: from the page shape) · --pages 1-8 · --width 1280 · --agents N (default from the block count)

Writes my-deck/: lib/ (the engine), assets/ (every picture in the file), doc.json (what was read), BRIEF.md (the outline,
pre-filled — finish it) and build.html: one B.board() per slide / page with its boxes, pictures and text as rect / image /
text ops in reading order, ready for check.mjs. It is a faithful *draft*: then design the swarm moments (a title to paint,
a chart to fill with cells), the pace and the overlaps from the brief (references/CHOREO.md).

Needs: pip install python-pptx (for .pptx) · pip install pymupdf (for .pdf). Reads the file; never changes it.
"""
import json, os, re, shutil, sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
SERIF = re.compile(r'serif(?!.*sans)|georgia|times|garamond|minion|playfair|merriweather|myeongjo|batang|명조|바탕|nanummyeongjo|song', re.I)
MONO = re.compile(r'mono|courier|consolas|menlo|code|d2coding', re.I)


def family(name):
    name = name or ''
    if MONO.search(name): return 'mono'
    if SERIF.search(name) and not re.search(r'sans', name, re.I): return 'serif'
    return 'sans'


def hexcol(rgb):
    return '#%02x%02x%02x' % tuple(rgb)


def luma(h):
    h = h.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4)); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255


# ── PowerPoint ──
def read_pptx(path, assets, width):
    from pptx import Presentation
    from pptx.util import Emu
    from pptx.enum.shapes import MSO_SHAPE_TYPE, PP_PLACEHOLDER
    from pptx.enum.text import PP_ALIGN
    prs = Presentation(path)
    sw, sh = prs.slide_width, prs.slide_height
    k = width / sw                                   # EMU → board px
    boards = []
    for si, slide in enumerate(prs.slides, 1):
        bg = '#ffffff'
        try:
            f = slide.background.fill
            if f.type == 1: bg = hexcol(f.fore_color.rgb)
        except Exception: pass
        items = []

        def walk(shapes, T):
            for sh_ in shapes:
                x0, y0 = T(sh_.left or 0, sh_.top or 0); x1, y1 = T((sh_.left or 0) + (sh_.width or 0), (sh_.top or 0) + (sh_.height or 0))
                box = [x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k]
                if sh_.shape_type == MSO_SHAPE_TYPE.GROUP:
                    gx, gy, gw, gh = sh_.left, sh_.top, sh_.width, sh_.height
                    xf = sh_._element.grpSpPr.find('{http://schemas.openxmlformats.org/drawingml/2006/main}xfrm')
                    ch = xf.find('{http://schemas.openxmlformats.org/drawingml/2006/main}chOff'); ce = xf.find('{http://schemas.openxmlformats.org/drawingml/2006/main}chExt')
                    cx, cy, cw, chh = int(ch.get('x')), int(ch.get('y')), int(ce.get('cx')) or 1, int(ce.get('cy')) or 1
                    walk(sh_.shapes, lambda a, b, T=T, gx=gx, gy=gy, gw=gw, gh=gh, cx=cx, cy=cy, cw=cw, chh=chh: T(gx + (a - cx) * gw / cw, gy + (b - cy) * gh / chh))
                    continue
                if sh_.shape_type == MSO_SHAPE_TYPE.PICTURE:
                    img = sh_.image; name = f's{si:02d}-{len(items):02d}.{img.ext}'
                    (assets / name).write_bytes(img.blob)
                    items.append({'kind': 'image', 'src': f'assets/{name}', 'box': box}); continue
                try:
                    fill = sh_.fill
                    if fill.type == 1 and box[2] > 2 and box[3] > 2:
                        r = 0
                        try:
                            if 'ROUND' in str(sh_.auto_shape_type): r = min(box[2], box[3]) * .16
                            if 'OVAL' in str(sh_.auto_shape_type): r = min(box[2], box[3]) / 2
                        except Exception: pass
                        items.append({'kind': 'rect', 'box': box, 'fill': hexcol(fill.fore_color.rgb), 'r': round(r, 1)})
                except Exception: pass
                if getattr(sh_, 'has_table', False) and sh_.has_table:
                    rows = [' · '.join(c.text.strip() for c in row.cells) for row in sh_.table.rows]
                    items.append({'kind': 'text', 'box': box, 'text': '\n'.join(rows), 'size': 14 * 12700 * k, 'font': 'sans', 'weight': 500, 'color': None, 'align': 'left'}); continue
                if not getattr(sh_, 'has_text_frame', False) or not sh_.has_text_frame or not sh_.text_frame.text.strip(): continue
                tf = sh_.text_frame; ph = sh_.placeholder_format.type if sh_.is_placeholder else None
                is_title = ph in (PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE)
                bullets = ph in (PP_PLACEHOLDER.BODY, PP_PLACEHOLDER.OBJECT) if ph is not None else False
                paras, size, bold, color, font, align = [], None, None, None, None, 'left'
                for p in tf.paragraphs:
                    t = ''.join(r.text for r in p.runs).strip()
                    if not t: continue
                    has_bu = p._p.pPr is not None and p._p.pPr.find('{http://schemas.openxmlformats.org/drawingml/2006/main}buChar') is not None
                    paras.append(('• ' if (bullets or has_bu) and not is_title else '') + t)
                    for r in p.runs:
                        if size is None and r.font.size: size = r.font.size
                        if bold is None and r.font.bold is not None: bold = r.font.bold
                        try:
                            if color is None and r.font.color and r.font.color.type is not None: color = hexcol(r.font.color.rgb)
                        except Exception: pass
                        if font is None and r.font.name: font = r.font.name
                    if p.alignment == PP_ALIGN.CENTER: align = 'center'
                    elif p.alignment == PP_ALIGN.RIGHT: align = 'right'
                if not paras: continue
                pt = size.pt if size else (40 if is_title else 22 if bullets else 18)
                inset = 91440 * k
                items.append({'kind': 'text', 'box': [box[0] + inset, box[1] + 45720 * k, max(20, box[2] - 2 * inset), box[3]], 'text': '\n'.join(paras),
                              'size': pt * 12700 * k, 'font': family(font), 'weight': 700 if (bold or is_title) else 500, 'color': color, 'align': align, 'title': is_title})

        walk(slide.shapes, lambda a, b: (a, b))
        boards.append({'id': f'slide-{si:02d}', 'w': width, 'h': round(sh * k), 'bg': bg, 'items': items})
    return boards


# ── PDF ──
def read_pdf(path, assets, width, pages):
    import pymupdf
    doc = pymupdf.open(path); boards = []
    for pi, page in enumerate(doc, 1):
        if pages and pi not in pages: continue
        pw, ph = page.rect.width, page.rect.height; W = width if pw >= ph else round(width * .5625); k = W / pw
        items = []
        for d in page.get_drawings():
            if d.get('fill') is None: continue
            r = d['rect']
            if r.width * k < 3 or r.height * k < 3: continue
            if abs(r.width - pw) < 1 and abs(r.height - ph) < 1: continue          # the page background
            items.append({'kind': 'rect', 'box': [r.x0 * k, r.y0 * k, r.width * k, r.height * k], 'fill': hexcol([round(c * 255) for c in d['fill'][:3]]), 'r': 0})
        bg = '#ffffff'
        for d in page.get_drawings():
            r = d['rect']
            if d.get('fill') is not None and abs(r.width - pw) < 1 and abs(r.height - ph) < 1: bg = hexcol([round(c * 255) for c in d['fill'][:3]])
        for img in page.get_images(full=True):
            xref = img[0]
            for ri, r in enumerate(page.get_image_rects(xref)):
                pix = pymupdf.Pixmap(doc, xref)
                if pix.n - pix.alpha >= 4: pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
                name = f'p{pi:02d}-{xref}-{ri}.png'; pix.save(str(assets / name))
                items.append({'kind': 'image', 'src': f'assets/{name}', 'box': [r.x0 * k, r.y0 * k, r.width * k, r.height * k]})
        for b in page.get_text('dict')['blocks']:
            if b['type'] != 0: continue
            spans = [s for l in b['lines'] for s in l['spans'] if s['text'].strip()]
            if not spans: continue
            text = ' '.join(' '.join(s['text'] for s in l['spans']).strip() for l in b['lines']).strip()
            text = re.sub(r'\s+', ' ', text)
            s0 = max(spans, key=lambda s: s['size']); x0, y0, x1, y1 = b['bbox']
            items.append({'kind': 'text', 'box': [x0 * k, y0 * k, (x1 - x0) * k * 1.06 + 4, (y1 - y0) * k], 'text': text, 'size': s0['size'] * k,
                          'font': family(s0['font']), 'weight': 700 if s0['flags'] & 16 or 'Bold' in s0['font'] else 500,
                          'color': '#%06x' % s0['color'], 'align': 'left'})
        boards.append({'id': f'page-{pi:02d}', 'w': W, 'h': round(ph * k), 'bg': bg, 'items': items})
    return boards


# ── the draft build ──
def js(v): return json.dumps(v, ensure_ascii=False)


def write_build(boards, doc, title, out, agents):
    W = {'slides': 1920, 'book': 1920, 'poster': 1080, 'web': 1080}[doc]; H = {'slides': 1080, 'book': 1080, 'poster': 1350, 'web': 1350}[doc]
    L = [f"// Draft made by import-doc.py from {title}. Reading order per board: boxes (largest first), pictures, then text top to bottom.",
         "// Next: finish BRIEF.md, then design the swarm moments and the pace (references/CHOREO.md) — this draft only places things.",
         "import { Build, defineArt } from 'cs/build.js';", "",
         f"const B = new Build({{ doc: {js(doc)}, title: {js(title)}, url: {js((re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')[:28] or 'my-deck') + '.deck')},",
         f"  prompt: {js(('rebuild ' + title)[:58])}, W: {W}, H: {H}, agents: {agents}, board: {{ w: {boards[0]['w']}, h: {boards[0]['h']} }} }});",
         "B.wait(.5);   // let the agents spread out before the first drop", ""]
    for b in boards:
        dark = luma(b['bg']) < .45; ink = '#f4f4f6' if dark else '#16161a'
        name = next((it['text'].split('\n')[0][:28] for it in b['items'] if it['kind'] == 'text' and it.get('title')), None) or next((it['text'].split('\n')[0][:28] for it in b['items'] if it['kind'] == 'text'), b['id'])
        L.append(f"B.board({js(b['id'])}, {{ name: {js(name)}, w: {b['w']}, h: {b['h']}, bg: {js(b['bg'])} }});")
        n = 0
        rects = sorted([i for i in b['items'] if i['kind'] == 'rect'], key=lambda i: -i['box'][2] * i['box'][3])
        imgs = [i for i in b['items'] if i['kind'] == 'image']
        texts = sorted([i for i in b['items'] if i['kind'] == 'text'], key=lambda i: (round(i['box'][1] / 8), i['box'][0]))
        for it in rects:
            x, y, w, h = (round(v) for v in it['box']); n += 1
            L.append(f"B.rect('{b['id']}-r{n}', {{ x: {x}, y: {y}, w: {w}, h: {h}, fill: {js(it['fill'])}{', r: ' + str(it['r']) if it['r'] else ''}, next: .22 }});")
        for it in imgs:
            x, y, w, h = (round(v) for v in it['box']); n += 1
            L.append(f"B.image('{b['id']}-i{n}', {{ x: {x}, y: {y}, w: {w}, h: {h}, src: {js(it['src'])}, file: {js(os.path.basename(it['src']))}, next: .35 }});")
        for it in texts:
            x, y, w, h = (round(v) for v in it['box']); n += 1
            x = max(0, x); w = max(24, min(w, b['w'] - x - 4))          # a text box hanging off the slide in the source
            size = max(12, round(it['size'])); st = f"font: {js(it['font'])}, size: {size}, weight: {it['weight']}, color: {js(it['color'] or ink)}"
            al = f", align: {js(it['align'])}" if it['align'] != 'left' else ''
            L.append(f"B.text('{b['id']}-t{n}', {{ x: {x}, y: {y}, w: {w}, text: {js(it['text'])}, {st}{al}, lh: 1.25, next: .3 }});")
        L.append("B.sync(.3);"); L.append("")
    L.append("B.start();")
    html = f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — cursor swarm</title>
<script type="importmap">{{ "imports": {{ "cs/": "./lib/" }} }}</script>
</head>
<body>
<script type="module">
{chr(10).join(L)}
</script>
</body>
</html>
"""
    (out / 'build.html').write_text(html)


def write_brief(boards, doc, title, src, out):
    rows = []
    for i, b in enumerate(boards, 1):
        texts = [it['text'].replace('\n', ' / ')[:90] for it in b['items'] if it['kind'] == 'text'][:4]
        n_img = sum(1 for it in b['items'] if it['kind'] == 'image')
        rows.append(f"| {i} | {b['id']} | {' · '.join(texts) or '—'} | {n_img} picture(s) | |")
    (out / 'BRIEF.md').write_text(f"""# BRIEF — {title}

**Topic (as given):** rebuild `{src.name}` ({len(boards)} {'slides' if doc == 'slides' else 'pages'}) as a cursor-swarm build.

## 1. The document (read from the file — check it)
- **Kind:** {doc} · board {boards[0]['w']} × {boards[0]['h']} · backgrounds {', '.join(sorted(set(b['bg'] for b in boards)))}
- **Keep:** the content, order and layout of the file. **Design:** the build (who does what, when), the swarm moments, the pace.
- **Agents:** <count> named after <something from the topic>. **Prompt:** <the request line> · **URL:** <where it "publishes">

| # | board | text (first lines) | pictures | swarm moment |
|---|---|---|---|---|
{chr(10).join(rows)}

## 2. Swarm moments to design (pick 1–3)
- a title or logo repainted in pixels (`paint` with a `defineArt` of it, or `pixel-text`)
- a chart / table / timeline rebuilt as `cells` or `bars` so the swarm fills it
- many small items (tags, team photos, icons) placed at once by many agents (`chips`, several `image` with small `next`)

## 3. Timing
≈ 3–5 s per board + intro + finale. Long decks: fewer agents per board, or render a chapter at a time (`--from/--to`).

## 4. Review — references/BRIEF.md rubric, plus: every board matches the source file (nothing lost, nothing invented).
""")


def main():
    a = sys.argv[1:]
    if len(a) < 2: print(__doc__); sys.exit(1)
    src, out = Path(a[0]).resolve(), Path(a[1]).resolve()
    opt = lambda k, d=None: a[a.index('--' + k) + 1] if '--' + k in a else d
    width = int(opt('width', 1280)); agents = opt('agents')
    pages = None
    if opt('pages'): lo, _, hi = opt('pages').partition('-'); pages = set(range(int(lo), int(hi or lo) + 1))
    if (out / 'build.html').exists(): print(f'{out}/build.html exists — not overwriting'); sys.exit(1)
    assets = out / 'assets'; assets.mkdir(parents=True, exist_ok=True); (out / 'out').mkdir(exist_ok=True)
    ext = src.suffix.lower()
    if ext == '.pptx': boards = read_pptx(src, assets, width)
    elif ext == '.pdf': boards = read_pdf(src, assets, width, pages)
    else: print('reads .pptx and .pdf — export other formats (Keynote, Google Slides, Word, InDesign) to one of them'); sys.exit(1)
    if pages and ext == '.pptx': boards = [b for i, b in enumerate(boards, 1) if i in pages]
    if not boards: print('nothing to import'); sys.exit(1)
    b0 = boards[0]; doc = opt('doc') or ('slides' if b0['w'] > b0['h'] else 'book')
    title = opt('title', src.stem.replace('_', ' ').replace('-', ' '))
    shutil.copytree(SKILL / 'lib', out / 'lib', dirs_exist_ok=True)
    (out / 'doc.json').write_text(json.dumps({'source': src.name, 'doc': doc, 'boards': boards}, ensure_ascii=False, indent=1))
    n_items = sum(len(b['items']) for b in boards)
    agents = int(agents) if agents else max(8, min(30, 4 + max(len(b['items']) for b in boards) // 2))   # hands for the busiest board
    write_build(boards, doc, title, out, agents); write_brief(boards, doc, title, src, out)
    (out / '.gitignore').write_text('out/\n')
    n = sum(len(b['items']) for b in boards)
    print(f"{out}/build.html  ({len(boards)} boards, {n} blocks, {len(list(assets.iterdir()))} pictures, doc '{doc}')")
    print(f"next:  finish BRIEF.md, then  cd {a[1]} && node {SKILL / 'scripts/check.mjs'} build.html")


if __name__ == '__main__':
    main()
