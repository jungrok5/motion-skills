// 「The Kite」 — the props this topic needs: the drawn slide (the way out), the drawn kite (what turns real),
// and the real kite it turns into (tissue paper on bamboo, a tail of paper bows, a real string). Drawn things use
// lib/pencil.js in drawing units (mm, y down); real things are three.js meshes in metres.
import { P, T } from 'pla/film.js';
const { part, line, hand, curve, hatch, resample } = P;

const W = (pts, o = {}) => line(hand(pts, o.amp ?? .35, o.seed ?? 1, o.over ?? .8), { w: o.w ?? 2, passes: o.passes ?? 2, a: o.a ?? .92, seed: o.seed });

// ── the slide (drawn standing up from the page; local origin = the ladder's foot) ───────────────────────────────────
export const RUNG = i => { const k = (i + 1) / 5; return { a: [4 * k, -46 * k], b: [7 + 4 * k, -46 * k] }; };
const CHUTE_TOP = [[22, -46], [40, -41], [58, -27], [80, -14], [110, -8]];
/** the chute's whole run, from the platform to the ground (the second half draws itself ahead of the hero) */
export function chuteRun(groundY) {
  return [[110, -8], [170, -5], [240, -5], [300, -4], [326, 4], [345, 60], [365, 220], [390, 430], [420, 610], [455, groundY - 40], [500, groundY - 6], [560, groundY - 1], [600, groundY]];
}
const offsetDown = (pts, d) => pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [p[0] - dy / L * d, p[1] + dx / L * d]; });
export function slideTop() {
  const parts = [];
  // ladder rails, then the rungs one by one (the way a hand draws a ladder)
  parts.push(part([W([[0, 0], [4, -46]], { seed: 11 }), W([[7, 0], [11, -46]], { seed: 12 })]));
  for (let i = 0; i < 4; i++) { const r = RUNG(i); parts.push(part([W([r.a, r.b], { seed: 20 + i, over: .4, w: 1.8 })])); }
  // the platform and its little rail
  parts.push(part([W([[9, -46], [24, -46]], { seed: 30 }), W(curve([[10, -46], [10, -55], [16, -57], [22, -55], [22, -46]], 5), { seed: 31, w: 1.7 })]));
  // the chute's first sweep: two edges and the hatching that makes it a surface
  const top = curve(CHUTE_TOP, 6), low = offsetDown(top, 4.5);
  parts.push(part([W(top, { seed: 40, amp: .5 }), W(low, { seed: 41, amp: .5 })], [...top, ...low.slice().reverse()]));
  const tick = resample(top, 7).slice(1, -1).map((p, i) => { const q = offsetDown([top[Math.max(0, i)], p, top[Math.min(top.length - 1, i + 2)]], 4.5)[1]; return W([p, q], { seed: 50 + i, w: 1.1, a: .6, passes: 1, over: 0 }); });
  parts.push(part(tick));
  return parts;
}
export function slideRun(groundY) {
  const top = curve(chuteRun(groundY), 8), low = offsetDown(top, 4.5);
  const ticks = resample(top, 12).slice(1, -1).map((p, i, a) => { const j = Math.min(a.length - 1, i + 1), q = offsetDown([a[Math.max(0, i - 1)], p, a[j]], 4.5)[1]; return W([p, q], { seed: 70 + i, w: 1.1, a: .55, passes: 1, over: 0 }); });
  return [part([W(top, { seed: 60, amp: .6 }), W(low, { seed: 61, amp: .6 })], [...top, ...low.slice().reverse()]), part(ticks)];
}
/** the path the hero sits on: the chute's top edge, whole (local mm) */
export function chutePath(groundY) { return curve([...CHUTE_TOP, ...chuteRun(groundY).slice(1)], 10); }

// ── the drawn kite (local mm, centred on the cross of its spars) ────────────────────────────────────────────────────
export const KITE = { top: [0, -26], right: [19, -6], bottom: [0, 34], left: [-19, -6] };
export function kiteDrawing() {
  const k = KITE, outline = [k.top, k.right, k.bottom, k.left, k.top];
  const tail = curve([k.bottom, [4, 44], [-3, 56], [5, 68], [0, 80]], 6);
  const bows = [[3, 46], [-2, 58], [4, 70]].map(([x, y], i) => W([[x - 4, y - 2], [x + 4, y + 2], [x + 4, y - 2], [x - 4, y + 2], [x - 4, y - 2]], { seed: 90 + i, w: 1.4, over: 0, passes: 1 }));
  return [
    part([W(outline, { seed: 80, w: 2.2, over: 1.2 })], outline),
    part([W([k.top, k.bottom], { seed: 81, w: 1.6 }), W([k.left, k.right], { seed: 82, w: 1.6 })]),
    part(hatch([k.top, k.right, [0, -6], k.left], { gap: 3.2, angle: .8, a: .35, w: .9 })),
    part([W(tail, { seed: 83, w: 1.3, passes: 1 }), ...bows]),
  ];
}

// ── the real kite: red tissue on two bamboo spars, a tail of paper bows; local metres, x right, y up, facing +z ─────
export function buildKite() {
  const g = new T.Group(), s = .001, K = KITE, P3 = ([x, y], z = 0) => new T.Vector3(x * s, -y * s, z);
  const tissue = new T.MeshPhysicalMaterial({ color: new T.Color('#c8261f'), roughness: .62, sheen: .6, sheenColor: new T.Color('#ff8a70'), side: T.DoubleSide, transmission: 0, thickness: .0002 });
  const geo = new T.BufferGeometry(), c = P3([0, -6]), pts = [K.top, K.right, K.bottom, K.left].map(p => P3(p)), v = [], n = 8;
  // four panels (centre → two corners), each bowed out between its spars like a membrane under wind
  for (let q = 0; q < 4; q++) { const A = pts[q], B = pts[(q + 1) % 4];
    const P = (i, j) => { const u = i / n, w = j / n, p = c.clone().addScaledVector(A.clone().sub(c), u).addScaledVector(B.clone().sub(c), w); p.z += u * w * (1 - u - w) * 27 * .0016; return p.toArray(); };
    for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) { v.push(...P(i, j), ...P(i + 1, j), ...P(i, j + 1)); if (i + j + 1 < n) v.push(...P(i + 1, j), ...P(i + 1, j + 1), ...P(i, j + 1)); } }
  geo.setAttribute('position', new T.Float32BufferAttribute(v, 3)); geo.computeVertexNormals();
  const sail = new T.Mesh(geo, tissue); sail.castShadow = sail.receiveShadow = true; g.add(sail);
  const bamboo = new T.MeshStandardMaterial({ color: new T.Color('#b98f55'), roughness: .55 });
  const spar = (a, b, r = .0006) => { const A = P3(a, .0012), B = P3(b, .0012), m = new T.Mesh(new T.CylinderGeometry(r, r, A.distanceTo(B), 8), bamboo); m.position.copy(A).lerp(B, .5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize()); m.castShadow = true; g.add(m); };
  spar(K.top, K.bottom); spar(K.left, K.right);
  // the tail: a thread with three paper bows, rebuilt each frame so it trails the motion
  const thread = new T.MeshStandardMaterial({ color: 0xe8e1d0, roughness: .8 }), bowM = new T.MeshStandardMaterial({ color: new T.Color('#e9c46a'), roughness: .7, side: T.DoubleSide });
  const tail = new T.Mesh(new T.BufferGeometry(), thread); tail.castShadow = true; g.add(tail);
  const bows = [0, 1, 2].map(() => { const b = new T.Mesh(new T.PlaneGeometry(.008, .004), bowM); b.castShadow = true; g.add(b); return b; });
  g.userData.bridle = P3([0, 4], .004); g.userData.tail = (t, swing = 1) => {
    const pts = []; for (let i = 0; i <= 12; i++) { const k = i / 12; pts.push(new T.Vector3(Math.sin(t * 3.1 + k * 4) * .006 * k * swing, -(K.bottom[1] * s) - k * .05, -k * .004 * swing)); }
    tail.geometry.dispose(); tail.geometry = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, .00025, 4, false);
    [3, 7, 11].forEach((i, j) => { bows[j].position.copy(pts[i]); bows[j].rotation.set(0, 0, Math.sin(t * 4 + j) * .5); });
  };
  g.userData.tail(0);
  return g;
}
/** a real string from a (the drawn hand) to b (the kite's bridle), sagging a little: a thin tube, rebuilt each frame */
export function buildString() {
  const m = new T.Mesh(new T.BufferGeometry(), new T.MeshStandardMaterial({ color: 0xf2eee4, roughness: .7 }));
  m.castShadow = true; m.userData.set = (a, b, sag = .1) => {
    const A = new T.Vector3(...a), B = new T.Vector3(...b), L = A.distanceTo(B), pts = [];
    for (let i = 0; i <= 16; i++) { const k = i / 16, p = A.clone().lerp(B, k); p.y -= Math.sin(Math.PI * k) * L * sag * .5; pts.push(p); }
    m.geometry.dispose(); m.geometry = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 32, .00022, 4, false);
  };
  return m;
}
