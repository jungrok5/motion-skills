"""caption-timing.py — burned-in captions + word times on the video timeline, from a speech-to-text of the narration take.

Shorts and Reels are mostly watched muted, so a promo for them needs captions, and animations read best when they land on
the spoken word. ElevenLabs Speech to Text (Scribe) gives a start/end time for every word of the narration take; this
script maps those times through the same cut-and-place that mix.py does (lines → cues, pauses capped by gap_cap,
speed) and writes a small JS file the page loads.

Usage (from the project root):
  python3 <skill>/scripts/caption-timing.py <video>/mix.json --words words.json --chunks <video>/captions.txt --out <video>/timing.js
  python3 <skill>/scripts/caption-timing.py --reading --chunks <video>/captions.txt --out <video>/timing.js [--start 0.6] [--cps 6]
      no narration (no ElevenLabs): every chunk stays up for its reading time (Korean ~6 syllables/s, min 1.3 s),
      0.7 s between lines; prints the total so the page's DUR = last line end + 2–4 s for the call to action.

  words.json    Scribe output: {"words": [{"text", "start", "end", "type"}, ...]} (bracketed audio tags are skipped)
  captions.txt  one line per narration line (same order as the take), caption chunks separated by " / ", e.g.
                  열심히 하는데... / 왜 우리 아이 수학은 늘 3, 4등급일까요?
                every word of the take must appear once, in order (punctuation is ignored when matching)
Writes:
  window.TIMING = {cues: [line start s...], caps: [{l, t0, t1, x}], words: [[[word, t], ...] per line]}
In the page: the caption element shows the cap whose t0 <= t < t1; wt(line, 'word') gives a word's time to animate on.
"""
import argparse, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mix, synth  # noqa: E402

PAD = 0.04       # mix.render_line pad around each speech part
EARLY = 0.08     # captions appear a hair before the word: reads as in sync
norm = lambda s: re.sub(r'[^0-9A-Za-z가-힣]', '', s)


def line_mapper(segs, gap_cap, cue, speed):
    """Return f(take_time) -> video_time for one line placed by mix.py."""
    starts, out = [], 0.0
    for k, (a, b) in enumerate(segs):
        starts.append(out)
        out += (b + PAD) - (a - PAD)
        if k < len(segs) - 1:
            out += max(0.0, min(gap_cap, segs[k + 1][0] - b) - 2 * PAD)

    def f(tt):
        k = min(range(len(segs)), key=lambda i: 0 if segs[i][0] - PAD <= tt <= segs[i][1] + PAD else
                min(abs(tt - segs[i][0]), abs(tt - segs[i][1])))
        a, b = segs[k]
        tt = min(max(tt, a - PAD), b + PAD)
        return cue + (starts[k] + tt - (a - PAD)) / speed
    return f


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('mix', nargs='?'); ap.add_argument('--words'); ap.add_argument('--chunks', required=True)
    ap.add_argument('--out', required=True); ap.add_argument('--reading', action='store_true')
    ap.add_argument('--start', type=float, default=0.6); ap.add_argument('--cps', type=float, default=6.0)
    a = ap.parse_args()
    if a.reading:
        return reading(a)
    if not (a.mix and a.words):
        sys.exit('give <mix.json> and --words (narration), or --reading (no narration)')
    base = os.path.dirname(os.path.abspath(a.mix))
    spec = json.load(open(a.mix))['narration']
    x = synth.load(os.path.join(base, spec['take']))
    lines = mix.split_lines(mix.speech_segments(x, spec.get('thr', -50)), spec['lines'], spec.get('splits'))
    chunks = [[c.strip() for c in ln.split(' / ') if c.strip()] for ln in open(a.chunks, encoding='utf-8').read().splitlines() if ln.strip()]
    if len(chunks) != spec['lines']:
        sys.exit(f'captions.txt has {len(chunks)} lines, mix.json narration has {spec["lines"]}')
    words = [w for w in json.load(open(a.words))['words']
             if w.get('type', 'word') == 'word' and norm(w['text']) and not w['text'].startswith('[') and not w['text'].endswith(']')]
    wi, caps, out_words = 0, [], []
    for li, (segs, cue) in enumerate(zip(lines, spec['cues'])):
        if cue is None:
            sys.exit(f'line {li + 1} is skipped in mix.json; drop it from captions.txt and the take, or give it a cue')
        segs = segs[:cue[2]] if len(cue) > 2 else segs
        f = line_mapper(segs, spec.get('gap_cap', 0.18), cue[0], cue[1])
        lw = []
        for text in chunks[li]:
            first = last = None
            for tok in [norm(t) for t in text.split() if norm(t)]:
                if wi >= len(words):
                    sys.exit(f'ran out of transcript words at line {li + 1} "{text}"')
                w = words[wi]
                if norm(w['text']) != tok:
                    sys.exit(f'line {li + 1}: caption word "{tok}" != transcript word "{w["text"]}" — '
                             'make captions.txt match what was actually said (split/merge words like the transcript)')
                lw.append([w['text'], round(f(w['start']) - EARLY, 2)])
                first = first or w; last = w; wi += 1
            caps.append({'l': li, 't0': round(f(first['start']) - EARLY, 2), 't1': round(f(last['end']) + 0.25, 2), 'x': text})
        out_words.append(lw)
    if wi != len(words):
        print(f'note: {len(words) - wi} transcript words after the last caption were not used')
    for c0, c1 in zip(caps, caps[1:]):
        if c0['l'] == c1['l']:
            c0['t1'] = c1['t0']  # within a line, a caption stays up until the next one
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    open(a.out, 'w', encoding='utf-8').write('window.TIMING = ' + json.dumps(
        {'cues': [c[0] for c in spec['cues']], 'caps': caps, 'words': out_words}, ensure_ascii=False) + ';\n')
    for c in caps:
        print(f"{c['t0']:7.2f}-{c['t1']:7.2f}  {c['x']}")
    print('wrote', a.out)


def reading(a):
    lines = [[c.strip() for c in ln.split(' / ') if c.strip()] for ln in open(a.chunks, encoding='utf-8').read().splitlines() if ln.strip()]
    t, cues, caps, words = a.start, [], [], []
    for li, chunks in enumerate(lines):
        cues.append(round(t, 2)); lw = []
        for text in chunks:
            n = len(re.sub(r'[^0-9A-Za-z가-힣]', '', text))
            d = max(1.3, n / a.cps + 0.4)
            toks = text.split()
            for i, w in enumerate(toks):
                lw.append([w, round(t + d * 0.8 * i / max(1, len(toks)), 2)])
            caps.append({'l': li, 't0': round(t, 2), 't1': round(t + d, 2), 'x': text})
            t += d
        words.append(lw); t += 0.7
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    open(a.out, 'w', encoding='utf-8').write('window.TIMING = ' + json.dumps({'cues': cues, 'caps': caps, 'words': words}, ensure_ascii=False) + ';\n')
    for c in caps:
        print(f"{c['t0']:7.2f}-{c['t1']:7.2f}  {c['x']}")
    print(f'last caption ends at {caps[-1]["t1"]:.1f}s → set DUR ≈ {caps[-1]["t1"] + 3:.0f}s; line starts (cues): {cues}')
    print('wrote', a.out)


if __name__ == '__main__':
    main()
