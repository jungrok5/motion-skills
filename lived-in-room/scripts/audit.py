#!/usr/bin/env python3
"""Measure the room: floating, sunk, tipping, held by nothing, intersecting, open meshes. Numbers in millimetres.

  audit.py                 the summary and every fault            (exit 1 when there is one)
  audit.py --all           every thing, with its support and its gap / distance
  audit.py --json          the full result → out/audit.json
  audit.py --break         prove the audit can see: lift one thing 18 cm, sink another 10 mm, and expect both caught
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _boot  # noqa: E402


def selftest(r, audit, geo):
    """Lift one placed thing 18 cm and sink another 10 mm: the audit must report both."""
    placed = [it for it in r.items.values() if it.support == 'place' and it.cls == 'thing' and not it.soft]
    carried = {o for it in r.items.values() for o in it.on}
    free = [it for it in placed if it.name not in carried]
    if len(free) < 2:
        return ['not enough free-standing things to test with']
    a, b = free[0], free[len(free) // 2]
    za, zb = a.ob.location.z, b.ob.location.z
    geo.place(a.ob, (a.ob.location.x, a.ob.location.y, za + 0.18))
    geo.place(b.ob, (b.ob.location.x, b.ob.location.y, zb - 0.010))
    res = audit.run(r)
    rows = {x['name']: x for x in res['rows']}
    out = []
    if 'floats' not in rows[a.name]['why']:
        out.append(f'{a.name} lifted 180 mm was NOT reported as floating')
    sunk = 'sunk' in rows[b.name]['why'] or any(b.name in (p['a'], p['b']) for p in res['pairs'])
    if not sunk:
        out.append(f'{b.name} pushed 10 mm into its support was NOT reported')
    geo.place(a.ob, (a.ob.location.x, a.ob.location.y, za))
    geo.place(b.ob, (b.ob.location.x, b.ob.location.y, zb))
    if not out:
        print(f'audit sees: {a.name} lifted 180 mm → "{rows[a.name]["why"]}";  {b.name} sunk 10 mm → caught')
    return out


def main():
    ap = _boot.parser(__doc__)
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--break', dest='brk', action='store_true')
    a = ap.parse_args(_boot.argv())
    P = _boot.boot(a.project)
    from lr import audit, geo
    with _boot.Hush(P.out('blender.log')):
        r = P.build(next(iter(P.versions)), 'draft', model_only=True)
    res = audit.run(r)
    print(audit.report(res))
    if a.all:
        for x in res['rows']:
            if x['verdict'] == 'skeleton':
                continue
            num = f"gap {x['gap_mm']:+.1f} mm" if x['gap_mm'] is not None else f"dist {x['dist_mm']:.1f} mm" if x['dist_mm'] is not None else ''
            print(f"  {x['verdict']:<5} {x['name']:<30} {x['support']:<8} {num:<16} on {', '.join(x.get('rests_on') or x['on'])}")
    if a.json:
        json.dump(res, open(P.out('audit.json'), 'w'), indent=1, ensure_ascii=False, default=float)
        print('out/audit.json')
    bad = not audit.ok(res)
    if a.brk:
        errs = selftest(r, audit, geo)
        for e in errs:
            print('  FAIL ', e)
        bad = bad or bool(errs)
    print('audit: FAIL' if bad else 'audit: ok — nothing floats, nothing is sunk, every thing is held')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
