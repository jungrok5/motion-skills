"""The sound of APERTURE: every cue sits on a cut or on something that moves in the picture.
Cut times come from `score.py --list`."""


def score(sc, film):
    t = {s['id'].split('_')[0]: s['start'] / film.fps for s in film.shots}
    end = film.duration
    sc.drone(0, end, 36.71, 0.24)                                    # D1 under the whole film
    sc.drone(0, t['s06'], 73.42, 0.08, air=0.5)

    # s01 iris: the blades open one detent at a time, light pours through
    sc.hit(0.08, 0.4)
    sc.ticks(0.35, 2.0, rate=5, accel=0.9, gain=0.14, pitch=2600)
    sc.shimmer(1.0, t['s02'] + 0.1, 1318.5, 0.07)
    # s02 rings: the focus ring runs, the aperture ring clicks twice
    sc.whoosh(t['s02'] - 0.35, t['s02'], 0.35)
    sc.ticks(t['s02'] + 0.05, t['s03'] - 0.2, rate=16, gain=0.05, pitch=4200)
    sc.clunk(t['s02'] + 17 / 24, 0.32, 0.8, -0.2)
    sc.clunk(t['s02'] + 28 / 24, 0.32, 0.8, 0.2)
    # s03 assembly: parts seat one after another, louder as the lens closes up
    sc.whoosh(t['s03'] - 0.35, t['s03'], 0.4, pan=(0.6, -0.6))
    sc.riser(t['s03'] + 0.3, t['s04'] - 0.05, 0.16, 110, 520)
    for k, dt in enumerate((0.95, 1.2, 1.42, 1.62, 1.8, 1.96, 2.1)):
        sc.clunk(t['s03'] + dt, 0.16 + 0.05 * k, 1.3 - 0.08 * k, -0.5 + k / 6)
    # s04 body: the lens flies in and the bayonet locks
    sc.whoosh(t['s04'] - 0.3, t['s04'], 0.45)
    sc.whoosh(t['s04'] + 0.05, t['s04'] + 0.8, 0.3, 200, 2500)
    sc.clunk(t['s04'] + 27 / 24, 0.7, 1.5)
    sc.tick(t['s04'] + 29 / 24, 0.3, 1900)
    # s05 exposure: iris snaps, shutter fires, the frame burns out
    sc.riser(t['s05'], t['s05'] + 0.36, 0.25, 300, 2400)
    sc.shutter(t['s05'] + 0.33, 0.9)
    sc.shimmer(t['s05'] + 0.4, t['s06'] + 0.9, 2093.0, 0.14)
    # s06 the coast: open air, surf, a held chord (D minor add 9)
    sc.swell(t['s06'] - 0.15, t['s07'] + 0.5, (146.83, 220.0, 329.63, 349.23), 0.30)
    sc.surf(t['s06'], t['s07'], 0.22)
    sc.rumble(t['s06'], t['s07'], 0.2)
    # s07 the print: the shutter again on the cut, then the quiet of a desk
    sc.shutter(t['s07'] - 0.04, 0.7)
    sc.whoosh(t['s07'] + 0.3, t['s07'] + 1.5, 0.12, 150, 1200)
    # s08 the dive
    sc.riser(t['s08'], t['s09'] - 0.02, 0.42, 140, 1800)
    sc.whoosh(t['s08'] + 0.7, t['s09'], 0.6, 250, 7000)
    # s09 title (D major: the minor third lifts)
    sc.hit(t['s09'], 1.0, 36.71)
    sc.swell(t['s09'], end, (73.42, 146.83, 220.0, 369.99), 0.3, attack=0.25, release=1.2, bright=0.7)
    sc.shimmer(t['s09'] + 0.1, end, 1479.98, 0.07)
    sc.ticks(t['s09'] + 0.5, end - 0.6, rate=4, gain=0.07, pitch=2600)
