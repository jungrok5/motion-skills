"""The sound of the film, placed on its timeline (seconds). Run: python3 <skill>/scripts/score.py
`score.py --list` prints the cut times. Delete this file to get the automatic score."""


def score(sc, film):
    cut = film.shot('s02')['start'] / film.fps
    sc.drone(0, film.duration, 49.0, 0.22)                 # a bed under everything
    sc.hit(0.05, 0.45)                                     # the picture opens
    sc.ticks(0.4, cut - 0.3, rate=7, gain=0.12)            # the dial turning through its detents
    sc.whoosh(cut - 0.4, cut, 0.4)                         # air into the cut
    sc.hit(cut, 0.85)                                      # the title lands
    sc.shimmer(cut, film.duration, 1760, 0.08)
