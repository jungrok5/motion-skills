#!/usr/bin/env python3
"""Synthesise the film's sound → out/score.wav (48 kHz stereo). Uses the project's score.py
(def score(sc, film): place sounds on the timeline) or, without one, an automatic score from the cut list.

  score.py [--list]      --list prints the cut times to write cues against
"""
import importlib.util
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _boot  # noqa: E402


def main():
    ap = _boot.parser(__doc__)
    ap.add_argument('--list', action='store_true')
    a = ap.parse_args(_boot.argv())
    film = _boot.boot(a.project, need_bpy=False)
    if a.list:
        for s in film.shots:
            print(f'{s["start"] / film.fps:6.2f}s  {s["id"]:<16} {s["frames"]:3d} f  {s["frames"] / film.fps:.2f}s'
                  f'{"  in " + str(s["fade_in"]) if s.get("fade_in") else ""}{"  out " + str(s["fade_out"]) if s.get("fade_out") else ""}')
        print(f'{film.duration:6.2f}s  end')
        return
    from pf import sound
    sc = sound.Score(film.duration, film.seed)
    p = os.path.join(film.root, 'score.py')
    if os.path.exists(p):
        spec = importlib.util.spec_from_file_location('project_score', p)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.score(sc, film)
    else:
        sound.auto(film, sc)
    out = sc.save(film.out('score.wav'))
    print(os.path.relpath(out, film.root), f'{film.duration:.2f}s')


if __name__ == '__main__':
    main()
