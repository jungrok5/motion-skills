#!/usr/bin/env python3
"""Start a new object: write the work-folder skeleton for a topic.

    python3 <skill>/scripts/new-scene.py <work-dir> --title "경주 첨성대" --en "CHEOMSEONGDAE, GYEONGJU" [--lang ko]

Writes BRIEF.md (fill it first), scene.json, an empty evidence.json and a geometry.js stub with
an @params block. The build refuses to run until evidence.json has scope, sources and claims and
geometry.js returns real parts: research and design come before packaging.
"""
import argparse
import json
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1]

GEOMETRY = '''// {en}: structural study. Units: metres. +X east, +Y north, Z up from the ground line.
// Every number below must trace to a claim in evidence.json. Design this object's own parts,
// joints and separation; do not copy the example's shapes.
// @params-start
const P = {{
  "todo": "shared parameters for the model and the corner diagram"
}};
// @params-end

const root = node('fixed base', null);
// 1. Build the real object's parts as nodes (parent first) with lathe / box / beam / poly.
// 2. pose(t): 0 = assembled, 1 = separated; stagger groups with ease(t, start, end).
// 3. parts: 4-7 callouts anchored on visible faces, {{node, anchor, label, text}}.
function pose(t) {{ return {{}}; }}
throw new Error('geometry.js is a stub: model the object from BRIEF.md first');
return {{root, pose, parts: []}};
'''


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('work', type=Path)
    ap.add_argument('--title', required=True, help='title in the page language')
    ap.add_argument('--en', required=True, help='English title (shown in capitals)')
    ap.add_argument('--lang', default='ko', choices=sorted(json.loads((SKILL / 'assets/locales.json').read_text(encoding='utf-8'))))
    a = ap.parse_args()
    a.work.mkdir(parents=True, exist_ok=True)
    files = {
        'scene.json': json.dumps({'schemaVersion': 1, 'lang': a.lang, 'titleLocal': a.title, 'titleEn': a.en.upper(),
                                  'edition': '01', 'geometry': 'geometry.js', 'evidence': 'evidence.json',
                                  'durationMs': 2850}, ensure_ascii=False, indent=2) + '\n',
        'evidence.json': json.dumps({'scope': {}, 'sources': [], 'claims': []}, indent=2) + '\n',
        'geometry.js': GEOMETRY.format(en=a.en.upper()),
    }
    brief = (SKILL / 'references/BRIEF.md').read_text(encoding='utf-8')
    outline = brief.split('```markdown\n', 1)[1].split('\n```', 1)[0]
    files['BRIEF.md'] = outline.replace('<local title>', a.title).replace('<ENGLISH TITLE>', a.en.upper()) + '\n'
    for name, text in files.items():
        path = a.work / name
        if path.exists():
            print('kept existing', path)
            continue
        path.write_text(text, encoding='utf-8')
        print('wrote', path)
    print('Next: research and fill BRIEF.md + evidence.json, then model geometry.js (see references/RUNTIME.md).')


if __name__ == '__main__':
    main()
