// "Pounce" — the starter: a grey cat spots a leaf, wiggles, pounces and pins it. Topic → BRIEF.md → this file.
// The story keys (no `pass`) are what a first pass would key; both panels play them. The keys marked `pass: true`
// exist only in the after panel: the eyes leading, the wiggle and load (anticipation), the squash on landing and the
// overshoot (follow-through). Feet are planted by `plants`; tail, ears and squash ride springs (`follow`).
const X0 = -260;                       // where the cat stands at the start (hips, px from the panel centre)
const XL = -30; 
const Y0 = 106;                        // hip height standing (Critter.hipHeight(): legs at 92 % of their reach)
                       // where its hips land
export const piece = {
  title: 'Pounce',
  duration: 9,
  cam: { x: -40, ground: .8, zoom: 1.25 },
  look: { paper: '#f0ebe1', ground: '#e2dacb', seed: 21 },
  critter: {
    plan: 'quad', seed: 4, daub: 17,
    body: { len: 150, girth: 72, hip: 1, belly: 1.02, chest: .98 },
    neck: { len: 18, girth: 46 },
    head: { len: 46, girth: 56, snout: .66, eye: [.56, .16], eyeR: 5.5, ear: { len: 28, w: 24 } },
    tail: { len: 150, girth: 16, segs: 7, bushy: .45, tip: .2 },
    limbs: { fore: { len: [44, 42, 16], girth: 17 }, hind: { len: [50, 48, 30], girth: 21 } },
    palette: { inner: '#c99a8e', coat: '#8f8a82', shade: '#5d5954', light: '#cfc9be', belly: '#ece6da', dark: '#7a756e', tip: '#3d3a36', eye: '#3a3a1e', nose: '#b9786e' },
  },
  props: [{ kind: 'leaf', at: [XL + 140, 3], r: 20, color: '#b9853a', seed: 3 }],
  beats: [
    { name: 'Spot it', t0: 1.3, t1: 2.2, tags: ['eyes lead', 'overlap', 'slow in / out'] },
    { name: 'Wiggle, pounce', t0: 2.2, t1: 3.5, big: true, tags: ['anticipation', 'arcs', 'squash & stretch'] },
    { name: 'Land, pin it', t0: 3.5, t1: 4.6, tags: ['follow-through', 'squash', 'settle'] },
  ],
  rest: [{ t0: .2, t1: 1.25 }, { t0: 4.8, t1: 5.9 }],
  keys: [
    { t: 0, x: X0, y: Y0, stop: true },
    { t: .55, ear: .25, pass: true }, { t: .8, ear: 0, pass: true },
    { t: 1.3, x: X0, y: Y0, neck: .55, head: -.55, ear: 0, tail: .25, stop: true },
    { t: 1.45, head: -.3, ear: -.3, pass: true },                                  // the eyes and ears go first
    { t: 2.2, x: X0, y: Y0 - 20, pitch: -.07, neck: .2, head: -.12, tail: .08, curl: .1, ear: -.25, stop: true },
    { t: 2.42, x: X0 - 7, y: Y0 - 24, pitch: -.1, tail: .02, pass: true },              // wiggle …
    { t: 2.6, x: X0 + 1, y: Y0 - 22, pitch: -.08, pass: true },
    { t: 2.76, x: X0 - 8, y: Y0 - 26, pitch: -.11, pass: true },
    { t: 2.95, x: X0 - 14, y: Y0 - 32, pitch: -.13, sq: .94, tail: -.05, hindTuck: 0, pass: true, stop: true }, // … and load
    { t: 3.2, x: -150, y: Y0 + 64, pitch: .02, neck: .1, head: -.05, sq: 1, ear: .45, tail: .25, curl: .03, fore: 1, foreTuck: .1, hind: -1.05, hindTuck: 0 },
    { t: 3.48, x: XL, y: Y0 - 14, pitch: -.12, neck: .05, head: -.1, impact: true, fore: .2, hind: .2 },
    { t: 3.52, sq: .86, pass: true },
    { t: 3.66, x: XL + 7, y: Y0 - 19, pitch: -.17, neck: -.02, pass: true, stop: true }, // overshoot
    { t: 4.25, x: XL, y: Y0 - 11, pitch: -.1, neck: .05, head: -.38, ear: -.1, tail: .3, curl: .1, sq: 1, stop: true },
  ],
  plants: {
    FN: [{ t0: 0, t1: 2.97, x: X0 + 136 }, { t0: 3.4, t1: 99, x: XL + 145 }],
    FF: [{ t0: 0, t1: 3.0, x: X0 + 139 }, { t0: 3.43, t1: 99, x: XL + 133 }],
    HN: [{ t0: 0, t1: 2.45, x: X0 }, { t0: 2.53, t1: 3.04, x: X0 - 2 }, { t0: 3.56, t1: 99, x: XL - 4 }],
    HF: [{ t0: 0, t1: 2.62, x: X0 + 3 }, { t0: 2.7, t1: 3.06, x: X0 + 1 }, { t0: 3.6, t1: 99, x: XL - 12 }],
  },
  follow: { tail: { f: 1.5, z: .4, droop: .5 }, ears: { f: 3.2, z: .3 }, sq: { f: 4.5, z: .3 } },
  life: { breath: 2.3, blink: 3.2, flicks: [{ t: .6, part: 'ear', side: 0 }, { t: 5.2, part: 'ear', side: 1 }] },
  study: { t0: 6, from: 1.2, points: ['nose', 'pelvis', 'tailTip'], ghosts: 6 },
};
