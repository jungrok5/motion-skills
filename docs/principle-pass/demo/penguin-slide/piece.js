// "Belly slide" — the worked example: a penguin waddles four steps, flops onto its belly and slides to a fish.
// A different body plan from the starter (an upright biped with flippers, a stub tail, flat feet), keyed from its own
// brief. Story keys (no `pass`) are what both panels play; `pass: true` keys are the principles pass.
const X0 = -300;                 // hips at the start (px from the panel centre)
const X1 = X0 + 80;              // after the waddle (4 short steps: the hips travel 20 px a step)
const XS = X1 + 118;             // where the belly lands
const XE = X1 + 300;             // where the slide stops
const Y0 = 42;                   // hip height standing, knees a little bent (Critter.hipHeight() is 46)
const F = 20;                    // a flat foot is planted by its toe, ~20 px ahead of the hips (Critter.footHome)
const YB = 44;                   // hip height lying on the belly (about half the body's girth)
export const piece = {
  title: 'Belly slide',
  duration: 10.4,
  cam: { x: -40, ground: .8, zoom: 1.5 },
  look: { paper: '#edf0ee', ground: '#d9e3e7', line: '#8a9aa2', seed: 5 },
  critter: {
    plan: 'biped', seed: 9, daub: 16,
    body: { len: 118, girth: 92, hip: .95, belly: 1.05, chest: .82, bellyFrom: -.08 },
    neck: { len: 6, girth: 52 },
    head: { len: 50, girth: 52, snout: .3, beak: true, eye: [.46, .22], eyeR: 4.5 },
    tail: { len: 24, girth: 16, segs: 3, bushy: .3, tip: .3 },
    limbs: { leg: { len: [24, 22, 26], girth: 16 }, arm: { len: [42, 34], girth: 16, free: true } },
    attach: { arm: [-.18, .05], leg: [0, -.05] },
    palette: { coat: '#2c2e35', shade: '#1a1b20', light: '#4c505b', belly: '#f2efe7', dark: '#24262c', tip: '#1c1d22', eye: '#121214', beak: '#e08a32', feet: '#e39040' },
  },
  props: [{ kind: 'fish', at: [XE + 195, 7], r: 18, color: '#9db2bc', seed: 4 }],
  beats: [
    { name: 'Waddle', t0: 1.0, t1: 2.5, tags: ['planted feet', 'arcs', 'slow in / out'] },
    { name: 'Belly flop', t0: 2.6, t1: 3.42, big: true, point: 'head', tags: ['anticipation', 'squash & stretch', 'overlap'] },
    { name: 'Slide, stop', t0: 3.42, t1: 5.9, tags: ['timing', 'follow-through', 'settle'] },
  ],
  rest: [{ t0: .1, t1: 1 }, { t0: 6.0, t1: 7.1 }],
  keys: [
    { t: 0, x: X0, y: Y0, arm: .05, stop: true },
    // waddle: the hips dip on each contact and rise over the passing foot; the body rocks; flippers out
    { t: 1.0, x: X0, y: Y0, pitch: 0, arm: .05, stop: true },
    { t: 1.12, x: X0 + 4, y: Y0 + 1, pitch: .05, arm: -.35, pass: true },
    { t: 1.25, x: X0 + 10, y: Y0 - 3, pitch: -.04, pass: true }, { t: 1.42, x: X0 + 22, y: Y0 + 1, pitch: .05, pass: true },
    { t: 1.55, x: X0 + 30, y: Y0 - 3, pitch: -.04, pass: true }, { t: 1.72, x: X0 + 42, y: Y0 + 1, pitch: .05, pass: true },
    { t: 1.85, x: X0 + 50, y: Y0 - 3, pitch: -.04, pass: true }, { t: 2.02, x: X0 + 62, y: Y0 + 1, pitch: .05, pass: true },
    { t: 2.15, x: X0 + 70, y: Y0 - 3, pitch: -.04, pass: true }, { t: 2.32, x: X0 + 77, y: Y0, pitch: .02, pass: true },
    { t: 2.5, x: X1, y: Y0, pitch: 0, arm: .05, stop: true },
    // belly flop
    { t: 2.6, x: X1, y: Y0, pitch: 0, neck: 0, head: -1.45, arm: .05, stop: true },
    { t: 2.88, x: X1 - 4, y: Y0 - 7, pitch: .2, neck: .12, head: -1.32, arm: -1.25, armTuck: .15, sq: .93, stop: true, pass: true }, // gather: lean back, flippers up
    { t: 3.12, x: X1 + 48, y: Y0 + 22, pitch: -.75, neck: .3, head: -1.05, arm: -1.55, sq: 1.06, leg: -.6, pass: true },
    { t: 3.4, x: XS, y: YB, pitch: -1.53, neck: .62, head: -.36, arm: -1.62, armTuck: 0, leg: -1.35, legTuck: .25, impact: 'skid' },
    { t: 3.45, sq: 1.14, pass: true },
    // slide: long, slowing; the head rides up; it stops, rocks forward, settles
    { t: 4.3, neck: .72, head: -.4, sq: 1.03, pass: true },
    { t: 5.4, x: XE, y: YB, pitch: -1.53, neck: .62, head: -.36, arm: -1.62, sq: 1, stop: true },
    { t: 5.55, pitch: -1.62, neck: .5, head: -.3, arm: -1.25, pass: true },
    { t: 5.85, pitch: -1.53, neck: .66, head: -.42, arm: -1.55, pass: true },
  ],
  plants: {
    LN: [{ t0: 0, t1: 1.05, x: X0 + F }, { t0: 1.25, t1: 1.65, x: X0 + F + 20 }, { t0: 1.85, t1: 2.25, x: X0 + F + 60 }, { t0: 2.45, t1: 2.93, x: X0 + F + 80, release: .2 }],
    LF: [{ t0: 0, t1: 1.35, x: X0 + F + 3 }, { t0: 1.55, t1: 1.95, x: X0 + F + 43 }, { t0: 2.15, t1: 2.96, x: X0 + F + 83, release: .2 }],
  },
  follow: { tail: { f: 2.4, z: .35, droop: .3 }, sq: { f: 4, z: .32 }, head: { f: 3, z: .5 } },
  life: { breath: 2.1, blink: 3.6, blinkSeed: 8 },
  study: { t0: 7.3, from: 2.4, points: ['nose', 'pelvis', 'footLN'], ghosts: 6, legend: ['beak', 'hips', 'near foot'] },
};
