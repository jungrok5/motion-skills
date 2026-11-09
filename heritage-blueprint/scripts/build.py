#!/usr/bin/env python3
"""Package a researched scene into one offline HTML file. Python standard library only.

    python3 <skill>/scripts/build.py <work>/scene.json <out>/model.html [--force]

Adapted from heritage-blueprint (MIT, @tanglele): adds locale packs (assets/locales.json),
so the title, controls and callouts can be Korean ("lang": "ko", default) or Chinese ("zh").
"""
import argparse
import base64
import html
import json
import re
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1]
FONTS = SKILL / 'assets/fonts'
STATES = {'documented', 'reported', 'photo-estimate', 'unknown'}


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def local_file(folder, value):
    path = (folder / value).resolve()
    if not path.is_relative_to(folder.resolve()):
        raise ValueError('Scene resources must be inside the scene folder: ' + value)
    if not path.is_file():
        raise ValueError('Missing scene resource: ' + str(path))
    return path


def check_evidence(data):
    """Check traceability structure, not truth or photographic similarity."""
    if not data.get('scope') or not data.get('sources') or not data.get('claims'):
        raise ValueError('Evidence needs scope, sources and claims; research before building.')
    ids = [s['id'] for s in data['sources']]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate evidence source IDs')
    for source in data['sources']:
        if not source.get('title') or not (source.get('url') or source.get('file')):
            raise ValueError('A source needs a title and a URL or local reference file')
    for claim in data['claims']:
        if claim.get('status') not in STATES or not claim.get('parameter') or not claim.get('basis'):
            raise ValueError('Every claim needs parameter, status and a short basis')
        if claim['status'] != 'unknown' and not claim.get('sources'):
            raise ValueError('Non-unknown claims need source IDs: ' + claim['parameter'])
        if not set(claim.get('sources', [])).issubset(ids):
            raise ValueError('Unresolved evidence source ID: ' + claim['parameter'])


def json_script(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')


def check_offline(content):
    # Metadata citation URLs and ordinary hyperlinks are permitted; runtime resources are not.
    if re.search(r'<(?:script|img|iframe|audio|video|source|link)\b[^>]*(?:src|href)\s*=\s*["\'](?!data:|#)', content, re.I):
        raise ValueError('External resource found; inline all runtime assets')
    if re.search(r'\b(?:fetch|XMLHttpRequest|WebSocket|importScripts)\s*\(|\bimport\s*(?:\(|["\'])|@import\b', content):
        raise ValueError('Network/import code found; keep output offline')
    if re.search(r'url\(\s*["\']?(?!data:|#)[^\s"\')]', content, re.I):
        raise ValueError('Non-embedded CSS asset found')


def face(font, text=None):
    data = base64.b64encode((FONTS / font['file']).read_bytes()).decode('ascii')
    rule = ('@font-face{font-family:"' + font['family'] + '";src:url(data:font/woff2;base64,' + data +
            ') format("woff2");font-style:normal;font-weight:' + str(font['weight']) + ';font-display:swap')
    if text:
        rule += ';unicode-range:' + ','.join('U+' + format(ord(c), 'X') for c in sorted(set(text)) if not c.isspace())
    return rule + '}'


def missing_glyphs(font, text):
    coverage = set(read_json(FONTS / font['coverage']))
    return ''.join(sorted({c for c in text if not c.isspace() and ord(c) not in coverage}))


def build(scene_path, output, force=False):
    scene_path = scene_path.resolve()
    scene = read_json(scene_path)
    if scene.get('schemaVersion') != 1:
        raise ValueError('Use schemaVersion: 1')
    title = scene.get('titleLocal') or scene.get('titleZh')
    lang = scene.get('lang') or ('zh' if scene.get('titleZh') and not scene.get('titleLocal') else 'ko')
    locales = read_json(SKILL / 'assets/locales.json')
    if lang not in locales:
        raise ValueError('Unknown lang "' + lang + '"; add a pack to assets/locales.json (have: ' + ', '.join(locales) + ')')
    loc = locales[lang]
    if not isinstance(title, str) or not title.strip():
        raise ValueError('Missing scene field: titleLocal')
    for key in ('titleEn', 'geometry', 'evidence'):
        if not isinstance(scene.get(key), str) or not scene[key].strip():
            raise ValueError('Missing scene field: ' + key)
    folder = scene_path.parent
    geometry = local_file(folder, scene['geometry']).read_text(encoding='utf-8-sig')
    if re.search(r'</script', geometry, re.I):
        raise ValueError('Geometry must not contain a closing script tag')
    evidence = read_json(local_file(folder, scene['evidence']))
    check_evidence(evidence)
    inset = local_file(folder, scene['inset']).read_text(encoding='utf-8-sig') if scene.get('inset') else ''
    if re.search(r'<script|\bon\w+\s*=|javascript:', inset, re.I):
        raise ValueError('Inset must be static inline HTML/SVG')

    ui = loc['ui']
    title_font, label_font = loc['titleFont'], loc.get('labelFont')
    font_text = title + ui['unfold'] + ui['fold']
    missing = missing_glyphs(title_font, font_text)
    if missing:
        raise ValueError('The ' + title_font['family'] + ' face lacks these title/control glyphs: ' + missing +
                         '. Ask for an approved spelling or add a font to the locale pack; do not silently fall back or enlarge text.')
    faces = [face(title_font, font_text if title_font.get('unicodeRangeFromText') else None)]
    label_text = ''
    if label_font:
        # Callout labels live in geometry.js; verify.cjs checks each label against the same coverage list.
        code = re.sub(r'/\*[\s\S]*?\*/|//[^\n]*', '', geometry)  # comments are never drawn
        label_text = ''.join(sorted(set(re.findall(r'[^\x00-\x7f]', code + inset))))
        missing = missing_glyphs(label_font, label_text + inset)
        if missing:
            raise ValueError('The ' + label_font['family'] + ' face lacks glyphs used in geometry/inset text: ' + missing +
                             '. Rephrase with common Hangul (KS X 1001) or add a font to the locale pack.')
        faces.append(face(label_font))
    licenses = sorted({f['license'] for f in (title_font, label_font) if f})
    license_text = '\n\n'.join((FONTS / name).read_text(encoding='utf-8').replace('--', '—') for name in licenses)
    duration = scene.get('durationMs', 2850)
    if not isinstance(duration, (int, float)) or not 100 <= duration <= 60000:
        raise ValueError('durationMs must be between 100 and 60000')
    fmt = lambda s: s.replace('{title}', title)
    meta = {'lang': lang, 'titleLocal': title, 'titleEn': scene['titleEn'], 'fontText': font_text,
            'titleFamily': title_font['family'], 'titleWeight': title_font['weight'],
            'labelFamily': label_font['family'] if label_font else None, 'labelText': label_text or 'A',
            'labelStack': loc['labelStack'], 'labelCoverage': label_font['coverage'] if label_font else None,
            'ui': ui, 'durationMs': duration}
    tokens = {
        'SCENE_JS': geometry,
        'META_JSON': json_script(meta),
        'EVIDENCE_JSON': json_script(evidence),
        'FONT_FACE': ''.join(faces),
        'FONT_LICENSE': '<!-- Embedded fonts: ' + ', '.join(f['family'] + ' (' + f['file'] + ')' for f in (title_font, label_font) if f) +
                        '.\n' + license_text + '\n-->',
        'PAGE_TITLE': html.escape(title + ' / ' + str(scene.get('edition', '01')) + ' — ' + scene['titleEn']),
        'MODEL_LABEL': html.escape(fmt(ui['modelLabel']) + ' / ' + scene['titleEn'] + ' structural study', quote=True),
        'TITLE_LOCAL': html.escape(title),
        'TITLE_EN': html.escape(scene['titleEn']),
        'EDITION': html.escape(str(scene.get('edition', '01'))),
        'INSET': inset,
        'HTML_LANG': loc['htmlLang'],
        'TITLE_FAMILY': title_font['family'],
        'LABEL_STACK': loc['labelStack'],
        'UI_ACTION_ARIA': html.escape(ui['actionAria'].replace('{action}', ui['unfold']), quote=True),
    }
    for key, value in ui.items():
        if key == 'actionAria':
            continue
        tokens['UI_' + re.sub(r'([A-Z])', r'_\1', key).upper()] = html.escape(value, quote=True)
    template = (SKILL / 'assets/blueprint.template.html').read_text(encoding='utf-8')
    content = re.sub(r'@@([A-Z_]+)@@', lambda match: tokens[match[1]], template)
    check_offline(content)
    if output.exists() and not force:
        raise ValueError('Output exists; use --force only when replacing this output is intended.')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(content, encoding='utf-8')
    return {'output': str(output.resolve()), 'bytes': output.stat().st_size, 'lang': lang,
            'fonts': [f['file'] for f in (title_font, label_font) if f], 'embeddedGlyphCoverage': True,
            'evidenceClaims': len(evidence['claims']),
            'historicalAccuracy': 'Requires source and visual review; not established by packaging.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('scene', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    try:
        print(json.dumps(build(args.scene, args.output, args.force), ensure_ascii=False, indent=2))
    except (ValueError, KeyError, OSError, json.JSONDecodeError) as error:
        parser.exit(1, 'Build stopped: ' + str(error) + '\n')


if __name__ == '__main__':
    main()
