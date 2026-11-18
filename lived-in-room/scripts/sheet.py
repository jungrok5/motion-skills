#!/usr/bin/env python3
"""Sheets for looking at the room and deciding what to work on next.

  sheet.py --inventory          what was built, kind by kind, as a Markdown table (paste it into BRIEF.md)
  sheet.py --screen [version]   screen time: how long and how large each thing is on camera over a walk — finish what
                                is big on screen for long, leave what the camera never finds     → out/screen_<v>.json
  sheet.py --walk               contact sheet: eight frames along every version's walk          → out/walk.jpg
  sheet.py --motions            the list of things that move, per version
  sheet.py --camera [version]   the walk second by second: position, turn speed, focus distance
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _boot  # noqa: E402


def main():
    ap = _boot.parser(__doc__)
    ap.add_argument('--inventory', action='store_true')
    ap.add_argument('--screen', nargs='?', const='*')
    ap.add_argument('--walk', action='store_true')
    ap.add_argument('--motions', action='store_true')
    ap.add_argument('--camera', nargs='?', const='*')
    ap.add_argument('--n', type=int, default=8)
    ap.add_argument('--q', default='draft')
    a = ap.parse_args(_boot.argv())
    P = _boot.boot(a.project)
    log = P.out('blender.log')
    versions = lambda x: list(P.versions) if x == '*' else [x]

    if a.inventory:
        import numpy as np
        with _boot.Hush(log):
            r = P.build(next(iter(P.versions)), 'draft', model_only=True)
        inv = {e['id']: e for e in P.inventory}
        by = {}
        for it in r.items.values():
            by.setdefault(it.kind, []).append(it)
        print('| kind | what | built / listed | size built (mm) | made | held | used for | source |')
        print('|---|---|---|---|---|---|---|---|')
        for k, items in by.items():
            e = inv[k]
            dims = [sorted((x * 1000 for x in it.ob.dimensions), reverse=True) for it in items]
            lo, hi = np.min(dims, 0), np.max(dims, 0)
            size = ' × '.join(f'{a_:.0f}' if abs(a_ - b_) < 2 else f'{a_:.0f}–{b_:.0f}' for a_, b_ in zip(lo, hi))
            print(f"| `{k}` | {e['name']} | {len(items)} / {e['n']} | {size} | {e['method']} | {'/'.join(sorted({i.support for i in items}))} | {e['use']} | {e['ref']} |")
        print(f'\n{len(r.items)} things of {len(by)} kinds')

    if a.screen:
        from lr import audit
        for v in versions(a.screen):
            with _boot.Hush(log):
                r = P.build(v, 'draft')
                st = audit.screen_time(r)
            rows = sorted(((n, d) for n, d in st.items() if r.items[n].cls != 'skeleton'), key=lambda x: -x[1]['share'] * x[1]['size'])
            json.dump({n: d for n, d in rows}, open(P.out(f'screen_{v}.json'), 'w'), indent=1, ensure_ascii=False)
            seen = [x for x in rows if x[1]['frames']]
            never = [n for n, d in rows if not d['frames']]
            print(f'\n{v}: {len(seen)} of {len(rows)} things are on camera at some point')
            print('  the largest on screen for the longest (finish these first):')
            for n, d in rows[:14]:
                print(f"    {n:<26} {d['share'] * 100:5.0f}% of the walk   up to {d['size'] * 100:4.0f}% of the frame height   [{r.items[n].zone}]")
            byk = {}
            for n in never:
                byk[r.items[n].kind] = byk.get(r.items[n].kind, 0) + 1
            if never:
                print('  never on camera (do not polish; or move the walk): ' + ', '.join(f'{k}×{c}' if c > 1 else k for k, c in sorted(byk.items(), key=lambda x: -x[1])))

    if a.walk:
        from PIL import Image, ImageDraw
        from lr import draw, finish, scene as sc
        tiles, labels = [], []
        for v in P.versions:
            with _boot.Hush(log):
                r = P.build(v, a.q)
            n = P.frames(v)
            for i in range(a.n):
                f = 1 + round(i * (n - 1) / (a.n - 1))
                tmp = P.out('tmp', f'walk_{v}_{f}.exr')
                with _boot.Hush(log):
                    sc.render(r.scene, f, tmp, P.seed)
                img = _boot.develop(P, v, tmp, f)
                os.remove(tmp)
                st = finish.stats(img)
                tiles.append(Image.fromarray(img))
                labels.append(f'{v}  {(f - 1) / P.fps:.1f}s   median {st["median"]:.0f}  p95 {st["p95"]:.0f}')
                print(labels[-1], flush=True)
        tw = 480
        th = round(tw * tiles[0].height / tiles[0].width)
        cols = a.n // 2 if a.n >= 6 else a.n
        rows_ = (len(tiles) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * tw, rows_ * (th + 22)), '#101010')
        d = ImageDraw.Draw(sheet)
        for i, (t, lab) in enumerate(zip(tiles, labels)):
            x, y = (i % cols) * tw, (i // cols) * (th + 22)
            sheet.paste(t.resize((tw, th), Image.LANCZOS), (x, y))
            draw.text(d, (x + 6, y + th + 11), lab, size=13, fill='#c9c4b8', anchor='lm')
        sheet.save(P.out('walk.jpg'), quality=88)
        print('out/walk.jpg')

    if a.motions:
        for v in P.versions:
            with _boot.Hush(log):
                r = P.build(v, 'draft')
            print(f'\n{v}: {len(r.motions)} things move')
            for m in r.motions:
                print(f"  {m['kind']:<8} {m['name']:<24} {m['note']}")
            if r.beacons:
                print('  far lights: ' + ', '.join(f"{b['name']} {'steady' if b['per_min'] is None else str(b['per_min']) + '/min'}" for b in r.beacons))

    if a.camera:
        for v in versions(a.camera):
            with _boot.Hush(log):
                r = P.build(v, 'draft')
            print(f'\n{v}: turn cap {r.pan_cap}°/s')
            for f in range(1, r.n + 1, max(1, P.fps // 2)):
                c = r.cam_log[f]
                print(f"  {c['t']:5.1f}s  at ({c['pos'][0]:.2f}, {c['pos'][1]:.2f}, {c['pos'][2]:.2f})  walking {c['speed']:.2f} m/s  turning {c['pan']:5.1f}°/s  "
                      f"focus {c['focus']:.2f} m (subject {c['target']:.2f})  shake {c['shake']:.2f}°")
            worst = max(r.cam_log.values(), key=lambda c: c['pan'])
            print(f"  fastest turn {worst['pan']:.1f}°/s at {worst['t']:.1f}s")


if __name__ == '__main__':
    main()
