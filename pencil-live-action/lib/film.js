// pencil-live-action · film.js — a graphite drawing loose in a photographed world. One take: a pencil hero on a sketchbook
// page on a real table in a real place; a real pencil (held by someone just out of frame) draws a way out; the hero
// walks off the page, down into the world; a drawing touched in the real world turns real; the pencil closes the frame.
// Every frame is a pure function of t: the plate (three.js, lib/plate.js) is rendered through the camera, then the drawing
// (Canvas 2-D, lib/draw.js) is drawn over it through the SAME camera, blurred by the same lens, under the real pencil.
//
//   const F = new Film({ dur: 30, look, paper, lead, score, title });
//   await F.load();                                   the place (HDRI backdrop + light), from assets/manifest.json or ?cdn=1
//   await F.table({ … }); await F.ground('id', { … }); const book = F.sketchbook({ … });      the real set (plate.js builders)
//   const pen = F.pencil({ colour, hold: [dx, dy, dz] });                                     the real pencil (drawn sketches move it)
//   const s = F.sketch({ plane, parts, at, dur | rate, by: 'pencil' | 'self', shadow, out, alpha, move });
//   F.hero(SPEC, t => ({ feet: { L, R }, face, hip, pose, armsW, tilt }), { height: .06 });
//   F.realify({ sketch: s, obj, at, dur, from });     the drawing becomes the real object, spreading from the touch
//   F.iris({ at, dur, centre, r, shape });            the pencil draws a frame; outside it the world goes back to paper
//   F.camera([{ t, pos, look, mm, fstop, focus | focusOn }]);  F.beat(name, t); F.action(name, { anticipation, action, recovery });
//   F.check(name, t => ok); F.start();
// Contract: window.seek(t), DURATION, FPS, SIZE, runChecks(t), shotAt(t), film (feetAt, pencilAt, drawnColours, …), __ready.
// Query: ?render=1 (fixed canvas) · ?t=12 · ?scale=.5 · ?cdn=1 (read the scans from Poly Haven) · ?off=dof,grain,grade,vignette,shadows
import * as P from './pencil.js';
import { Painter, opWeight, opHead } from './draw.js';
import { hero as drawHero, blinkAt } from './hero.js';
import { Plate, THREE as T, buildTable, buildGround, buildSketchbook, buildPencil } from './plate.js';
import { renderScore } from './score.js';
const { clamp, lerp, ease, hash, n1 } = P;
export { P, T };

const V = (a) => new T.Vector3(a[0], a[1], a[2]);
const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len3 = a => Math.hypot(a[0], a[1], a[2]);
const nrm3 = a => { const l = len3(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const L3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const v3 = { add: add3, sub: sub3, dot: dot3, len: len3, nrm: nrm3, cross: cross3, lerp: L3 };

/** Catmull-Rom over keyed values (time-uniform per segment): starts from rest at the first key, comes to rest at the last,
 *  flows through the ones between (a camera that never stops mid-take). A key with ease: 'hold' holds its value until the next. */
function flow(K0, t, prop, def) {
  const K = K0.filter(k => k[prop] !== undefined); if (!K.length) return def;
  if (K.length === 1 || t <= K[0].t) return K[0][prop]; const last = K[K.length - 1]; if (t >= last.t) return last[prop];
  let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++;
  const a = K[Math.max(0, i - 1)], b = K[i], c = K[i + 1], d = K[Math.min(K.length - 1, i + 2)];
  let u = (t - b.t) / (c.t - b.t); const first = i === 0 || b.stop, lastSeg = i === K.length - 2 || c.stop;
  const g = x => x * x * (2 - x);                      // from rest (g'(0) = 0) to unit speed (g'(1) = 1)
  if (b.ease === 'hold') u = 0; else if (first && lastSeg) u = ease.inOut(u); else if (first) u = g(u); else if (lastSeg) u = 1 - g(1 - u);
  const cr = (p0, p1, p2, p3) => { const u2 = u * u, u3 = u2 * u; return .5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3); };
  const pa = (b.stop ? b : a)[prop], pd = (c.stop ? c : d)[prop], vb = b[prop], vc = c[prop];
  return Array.isArray(vb) ? vb.map((_, j) => cr(pa[j], vb[j], vc[j], pd[j])) : cr(pa, vb, vc, pd);
}

export class Film {
  constructor(o = {}) {
    const q = new URLSearchParams(location.search);
    this.q = q; this.render = q.has('render'); this.W = 1920; this.H = 1080; this.FPS = o.fps || 24; this.boilFps = o.boil || 8;
    this.off = new Set((q.get('off') || '').split(',').filter(Boolean));
    this.S = +(q.get('scale') || (this.render ? 1 : Math.min(1, Math.max(.5, (innerWidth * devicePixelRatio) / this.W))));
    this.dur = o.dur || 30; this.seed = o.seed || 1; this.title = o.title || document.title;
    this.paper = o.paper || '#f3f0e9'; this.lead = o.lead || '#2f2f33'; this.tone = o.tone || '#55555a';   // tone: graphite shading (hair, pupils)
    this.score = o.score || null; this.fadeIn = o.fadeIn ?? .4; this.fadeOut = o.fadeOut ?? .8;
    this.grade = { vignette: .2, grain: .05, ...(o.grade || {}) };
    this.base = o.base || './'; this.cdn = q.has('cdn') || !!o.cdn || !!window.PLA_CDN;
    this.items = []; this.sketches = []; this.heroes = []; this.reals = []; this.realifies = []; this.irises = []; this.rules = []; this.beats = []; this.actions = [];
    this.cam = [{ t: 0, pos: [0, 1, 1], look: [0, .75, 0], mm: 35 }]; this.pens = [];
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
    this.mk = mk; this.canvas = mk(this.W * this.S, this.H * this.S); this.ctx = this.canvas.getContext('2d');
    this.layer = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(Math.round(this.W * this.S), Math.round(this.H * this.S)) : mk(this.W * this.S, this.H * this.S); this.lctx = this.layer.getContext('2d');
    this.pt = new Painter(this.ctx, { paper: this.paper, spot: this.tone, lead: this.lead }); this.lpt = new Painter(this.lctx, { paper: this.paper, spot: this.tone, lead: this.lead });
    for (const p of [this.pt, this.lpt]) { p.weight = 1; p.spotEdge = this.lead; }
    this.plate = new Plate({ W: this.W * this.S, H: this.H * this.S, base: this.base, cdn: this.cdn, look: { ...(o.look || {}), dof: !this.off.has('dof') } });
    this.grainTiles = P.grainTiles(this.seed + 5); this.tooth = this.ctx.createPattern(P.toothTile(this.seed + 3), 'repeat');
    this.renderScore = (spec, sr, dur) => renderScore({ ...spec, sfx: [...(spec.sfx || []), ...(spec.pen === false ? [] : this.penSfx())] }, sr, dur);
    document.body.style.margin = 0; document.body.style.background = '#0d0c0b'; document.body.style.overflow = 'hidden';
    document.body.appendChild(this.canvas);
  }
  async load() { await this.plate.load(); if (this.off.has('shadows')) this.plate.renderer.shadowMap.enabled = false; return this; }
  get scene() { return this.plate.scene; }

  // ── the real set ─────────────────────────────────────────────────────────────────────────────────────────────────────
  /** add a real object; o.track: t => ({ pos, rot: [x, y, z] (rad), quat, scale, visible }); o.front: true | [t0, t1] (covers the drawing) */
  real(obj, o = {}) { this.scene.add(obj); const r = { obj, track: o.track || null, front: o.front || false, name: o.name || 'real' }; this.reals.push(r); return r; }
  async table(o) { const mat = await this.plate.surface(o.tex, { tile: o.tile, kind: 'wood', bump: o.bump }); const g = buildTable({ ...o, mat }); this.real(g, { name: 'table' }); this.tableObj = g; return g; }
  async ground(id, o = {}) { const mat = await this.plate.surface(id, { tile: o.tile, kind: 'stone', bump: o.bump }); const g = buildGround(mat, o); this.real(g, { name: 'ground' }); return g; }
  sketchbook(o) { const b = buildSketchbook(o); this.real(b, { name: 'sketchbook' }); this.book = b; return b; }
  async model(id, o = {}) { const g = await this.plate.model(id); if (!g) return null; if (o.scale) g.scale.setScalar(o.scale); if (o.pos) g.position.set(...o.pos); this.real(g, o); return g; }
  /** the world point on the page (u, v from the page centre, metres) */
  onPage(u, v, book = this.book) { const p = new T.Vector3(u, 0, v).applyAxisAngle(new T.Vector3(0, 1, 0), book.rotation.y); return [book.position.x + p.x, book.userData.surfaceY, book.position.z + p.z]; }
  /** the real pencil, held by someone just out of frame. o: { colour, hold: [dx, dy, dz] (from the tip toward the hand), enter (s), wobble } */
  pencil(o = {}) {
    const g = buildPencil(o), pen = { obj: g, hold: nrm3(o.hold || [-.35, .8, .45]), enter: o.enter ?? .7, wobble: o.wobble ?? 1, len: g.userData.len, rest: o.rest || null };
    this.real(g, { name: 'pencil', front: true }); g.visible = false; this.pens.push(pen); this.pen = pen; return pen;
  }

  // ── the drawing ──────────────────────────────────────────────────────────────────────────────────────────────────────
  /** planes a drawing lies in: x along u, y (down) along v; `unit` metres per drawing unit (default 1 mm) */
  upright(at, yaw = 0, unit = .001) { const r = yaw * Math.PI / 180; return { o: at, u: [Math.cos(r) * unit, 0, -Math.sin(r) * unit], v: [0, -unit, 0] }; }
  flat(at, rot = 0, unit = .001) { const r = rot * Math.PI / 180; return { o: at, u: [Math.cos(r) * unit, 0, -Math.sin(r) * unit], v: [Math.sin(r) * unit, 0, Math.cos(r) * unit] }; }
  /** a plane facing the camera (turned about the vertical) through `at` — for things drawn "in the air" toward the viewer */
  facing(at, unit = .001) { return { o: at, facing: true, unit }; }
  /** a drawing: parts (or t => parts with a stable stroke count) drawn on in order from `at`. by: 'pencil' (the real pencil
   *  draws it) | 'self'. rate: drawing units a second (when no dur). out: [t0, t1] fades it; alpha: t => 0…1; shadow: casts a real shadow */
  sketch(o) {
    const s = { kind: 'sketch', name: o.name || `sketch ${this.sketches.length + 1}`, plane: o.plane, parts: typeof o.parts === 'function' ? null : o.parts, make: typeof o.parts === 'function' ? o.parts : null,
      at: o.at ?? 0, dur: o.dur, by: o.by || 'self', rate: o.rate ?? (o.by === 'pencil' ? 150 : 400), lift: o.lift ?? (o.by === 'pencil' ? .06 : .02),
      out: o.out || null, alpha: o.alpha || null, shadow: o.shadow ?? false, anchor: o.anchor || null, weight: o.weight ?? 1, z: o.z || 0, from: o.from ?? null, hidden: o.hidden || null };
    this.sketches.push(s); this.items.push(s); return s;
  }
  /** the drawn hero. track(t) → { feet: { L, R } (world ground points), face (deg, 0 = +z, 90 = +x), hip (world y), pose (lib/hero.js
   *  fields: head, look, mouth, brows, arms, blink …), armsW: { R: [x, y, z] } (a hand to a world point), tilt (deg, lean over the feet) } */
  hero(spec, track, o = {}) { const h = { kind: 'hero', spec, track, height: o.height ?? .06, name: spec.name || 'hero', shadow: o.shadow ?? true, z: o.z || 0, from: o.from ?? null }; this.heroes.push(h); this.items.push(h); return h; }
  /** the drawing turns real: obj (hidden until then) is revealed from the touch point outward while the drawing is erased */
  realify(o) { const r = { sketch: o.sketch, obj: o.obj, at: o.at, dur: o.dur ?? 1.2, from: o.from, radius: o.radius ?? .08, sparkle: o.sparkle ?? true }; this.realifies.push(r); this.prepReveal(r); return r; }
  /** the close: the pencil draws a closed frame around `centre`; outside it the picture goes back to paper */
  iris(o) { const shape = o.shape || 'circle', R = o.r ?? .05, N = 48;
    const pts = typeof shape === 'function' ? shape : (shape === 'heart'
      ? Array.from({ length: N + 1 }, (_, i) => { const a = i / N * Math.PI * 2, x = 16 * Math.sin(a) ** 3, y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); return [x / 17 * R * 1000, -y / 17 * R * 1000 - R * 150]; })
      : Array.from({ length: N + 1 }, (_, i) => { const a = -Math.PI / 2 + i / N * Math.PI * 2 * 1.04; return [Math.cos(a) * R * 1000, Math.sin(a) * R * 1000 * .94]; }));
    const sk = this.sketch({ name: o.name || 'iris', plane: this.facing(o.centre), parts: [P.part([P.line(P.hand(pts, 1.4, 7, 3), { w: 2.6, passes: 2 })])], at: o.at, dur: o.draw ?? 1.6, by: o.by || 'pencil', weight: 1.4 });
    const ir = { sketch: sk, at: o.at, fill: o.fill ?? [o.at + (o.draw ?? 1.6) * .8, o.at + (o.draw ?? 1.6) + 1.2], pts, centre: o.centre }; this.irises.push(ir); return ir; }
  camera(k) { this.cam = k; }
  beat(name, t) { this.beats.push({ name, start: t }); this.beats.sort((a, b) => a.start - b.start); }
  /** a big move: { anticipation: [t0, t1], action: [t1, t2], recovery: [t2, t3] } — check.mjs fails one without a wind-up or a settle */
  action(name, o) { this.actions.push({ name, ...o }); }
  check(name, fn) { this.rules.push({ name, fn }); }

  // ── timing ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  prepare() {
    for (const m of this.sketches) {
      const parts = m.parts || m.make(m.at), ops = parts.flatMap(p => p.ops), w = ops.map(op => opWeight(op, this.pt));
      const tot = w.reduce((a, b) => a + b, 0), gaps = m.lift * Math.max(0, ops.length - 1);
      let scale = 1 / m.rate, g = m.lift;
      if (m.dur !== undefined) { const avail = Math.max(.05, m.dur - gaps * (m.dur < gaps * 2 ? .3 : 1)); scale = avail / (tot || 1); g = m.dur < gaps * 2 ? m.lift * .3 : m.lift; }
      let t = m.at; m.alloc = ops.map((op, i) => { const a = t, b = t + w[i] * scale; t = b + g; return [a, b]; });
      m.end = m.alloc.length ? m.alloc[m.alloc.length - 1][1] : m.at; if (m.dur === undefined) m.dur = m.end - m.at;
    }
    this.penMarks = this.sketches.filter(m => m.by === 'pencil').sort((a, b) => a.at - b.at);
    this.shots = (this.beats.length ? this.beats : [{ name: 'take', start: 0 }]).map((b, i, a) => ({ name: b.name, start: b.start, dur: (a[i + 1] ? a[i + 1].start : this.dur) - b.start }));
  }
  partsOf(m, t) { return m.parts || m.make(t); }
  progFn(m, t) { const A = m.alloc; return i => { const a = A[i]; if (!a) return 1; return t >= a[1] ? 1 : t <= a[0] ? 0 : (t - a[0]) / (a[1] - a[0]); }; }
  /** where a sketch's pencil is at t (local units) → { p, drawing, lift } */
  headOf(m, t) {
    if (t < m.at || t > m.end) return null;
    const parts = this.partsOf(m, t), ops = parts.flatMap(p => p.ops), A = m.alloc;
    for (let i = 0; i < A.length; i++) {
      if (t <= A[i][1]) {
        if (t >= A[i][0]) return { p: opHead(ops[i], (t - A[i][0]) / (A[i][1] - A[i][0] || 1), this.pt), drawing: true, lift: 0 };
        const a = opHead(ops[i - 1], 1, this.pt), b = opHead(ops[i], 0, this.pt), k = ease.sine((t - A[i - 1][1]) / (A[i][0] - A[i - 1][1] || 1));
        return { p: [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], drawing: false, lift: Math.sin(Math.PI * k) };
      }
    }
    return { p: opHead(ops[ops.length - 1], 1, this.pt), drawing: false, lift: 0 };
  }

  // ── geometry through the camera ──────────────────────────────────────────────────────────────────────────────────────
  camAt(t) {
    const C = this.cam, pos = flow(C, t, 'pos', [0, 1, 1]), look = flow(C, t, 'look', [0, .75, 0]), mm = flow(C, t, 'mm', 35), fstop = flow(C, t, 'fstop', 2.8), roll = flow(C, t, 'roll', 0);
    const hand = flow(C, t, 'hand', .6), dist = len3(sub3(look, pos));
    // a little hand-held life, scaled by how far the camera is from what it looks at
    const hh = [n1(t * .55, 11) * .6 + n1(t * 1.7, 12) * .25, n1(t * .5, 13) * .5 + n1(t * 1.9, 14) * .2, 0].map(v => v * .0035 * hand * dist);
    this.setBasis(add3(pos, hh), add3(look, hh.map(v => v * .4)), mm);   // the drawing's cards need the camera before focus is found
    let focus = flow(C, t, 'focus', null);
    const fo = C.find(k => k.focusOn) ? flowFocus(C, t) : null;
    const target = fo === 'hero' ? this.heroHead(t) : typeof fo === 'function' ? fo(t) : Array.isArray(fo) ? fo : null;
    if (focus == null) focus = target ? len3(sub3(target, pos)) : dist;
    return { pos: add3(pos, hh), look: add3(look, hh.map(v => v * .4)), mm, fstop, focus, roll };
    function flowFocus(K, t) { let f = null; for (const k of K) if (k.t <= t && k.focusOn !== undefined) f = k.focusOn; return f ?? K.find(k => k.focusOn !== undefined)?.focusOn; }
  }
  heroHead(t) { const h = this.heroes[0]; if (!h) return null; const w = this.heroWorld(h, t); return w ? w.head : null; }
  /** world → stage px [x, y] (null behind the camera) */
  proj(p) { const s = this.plate.project(p); return s ? [s[0] / this.S, s[1] / this.S] : null; }
  /** px (stage) per metre at a point, along the camera's horizontal right */
  pxPerM(p) { const r = this.camRight, a = this.proj(p), b = this.proj(add3(p, r, .01)); return a && b ? Math.hypot(b[0] - a[0], b[1] - a[1]) * 100 : 0; }
  planeAt(m, t) { let pl = typeof m.plane === 'function' ? m.plane(t) : m.plane; if (pl && pl.facing) { const u = this.camRight, unit = pl.unit; pl = { o: pl.o, u: u.map(v => v * unit), v: [0, -unit, 0] }; } return pl; }
  local2world(pl, p) { return add3(add3(pl.o, pl.u, p[0]), pl.v, p[1]); }

  // ── the hero in the world ────────────────────────────────────────────────────────────────────────────────────────────
  heroWorld(h, t) {
    if (h.from !== null && t < h.from) return null;
    const tr = h.track(t); if (!tr) return null;
    const spec = h.spec, H = spec.H || 240, m = h.height / H, feet = tr.feet || { L: tr.at, R: tr.at };
    const at = tr.at || [(feet.L[0] + feet.R[0]) / 2, Math.min(feet.L[1], feet.R[1]), (feet.L[2] + feet.R[2]) / 2];
    const right = this.camRight, up = [0, 1, 0], tilt = (tr.tilt || 0) * Math.PI / 180, ct = Math.cos(tilt), st = Math.sin(tilt);
    const toLocal = p => { const d = sub3(p, at); return [dot3(d, right) / m, -d[1] / m]; };
    const toWorld = p => { const x = p[0] * ct - p[1] * st, y = p[0] * st + p[1] * ct; return add3(add3(at, right, x * m), up, -y * m); };
    // the drawing's yaw against the camera
    const fr = (tr.face || 0) * Math.PI / 180, fd = [Math.sin(fr), 0, Math.cos(fr)], toCam = nrm3(sub3(this.camPos, at));
    const yaw = Math.atan2(dot3(fd, right), dot3(fd, [toCam[0], 0, toCam[2]])) * 180 / Math.PI;
    const pose = { ...(tr.pose || {}), x: 0, y: 0, yaw: (tr.pose && tr.pose.yaw !== undefined) ? tr.pose.yaw : yaw };
    if (pose.blink === undefined) pose.blink = blinkAt(t, 3);
    if (pose.breathe === undefined) pose.breathe = t; if (pose.flow === undefined) pose.flow = t;
    const ank = H * .025, un = p => { const l = toLocal(p); return [l[0], l[1] - ank]; };
    if (tr.feet) pose.legs = { L: { to: un(feet.L) }, R: { to: un(feet.R) }, ...(pose.legs || {}) };
    if (tr.hip !== undefined) pose.hip = -(tr.hip - at[1]) / m;
    if (tr.armsW) { pose.arms = { ...(pose.arms || {}) }; for (const s of ['L', 'R']) if (tr.armsW[s]) pose.arms[s] = { to: toLocal(tr.armsW[s]), stretch: !!tr.stretch }; }
    const d = drawHero(spec, pose);
    const W = p => toWorld(p);
    return { h, tr, at, m, H, pose, d, toWorld: W, toLocal, head: W(d.at.head), hand: { L: W(d.at.hand.L), R: W(d.at.hand.R) }, top: W(d.at.top), feet, planted: tr.planted || null };
  }

  // ── reveal (the drawing turns real) ──────────────────────────────────────────────────────────────────────────────────
  prepReveal(r) {
    r.u = { uRC: { value: new T.Vector3() }, uRR: { value: -1 }, uRS: { value: .01 } };
    r.obj.visible = false;
    r.obj.traverse(o => { if (!o.isMesh) return; const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mat of mats) { mat.onBeforeCompile = sh => { Object.assign(sh.uniforms, r.u);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRW;').replace('#include <project_vertex>', '#include <project_vertex>\nvRW = (modelMatrix * vec4(transformed, 1.)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRW; uniform vec3 uRC; uniform float uRR, uRS;\nfloat rh0(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }\nfloat rh(vec3 p){ p *= 260.; vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(mix(rh0(i), rh0(i + vec3(1,0,0)), f.x), mix(rh0(i + vec3(0,1,0)), rh0(i + vec3(1,1,0)), f.x), f.y), mix(mix(rh0(i + vec3(0,0,1)), rh0(i + vec3(1,0,1)), f.x), mix(rh0(i + vec3(0,1,1)), rh0(i + vec3(1,1,1)), f.x), f.y), f.z); }')
          .replace('void main() {', 'void main() {\n  float rd = length(vRW - uRC) - uRR + (rh(vRW) - .5) * uRS;\n  if (uRR >= 0. && rd > 0.) discard;')
          .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  if (uRR >= 0.) gl_FragColor.rgb += vec3(1., .96, .88) * .9 * (1. - smoothstep(0., uRS * .6, -rd));');
      }; mat.needsUpdate = true; } });
  }
  revealK(r, t) { return clamp((t - r.at) / r.dur); }

  // ── the real pencil ──────────────────────────────────────────────────────────────────────────────────────────────────
  /** the pencil at t → { tip, axis, visible, drawing } (world) */
  pencilAt(t) {
    const pen = this.pen; if (!pen) return null;
    const L = this.penMarks, enter = pen.enter, off = pen.len * 1.6;
    let cur = null, prev = null, next = null;
    for (const m of L) { if (t >= m.at && t <= m.end) { cur = m; break; } if (m.end < t) prev = m; else if (m.at > t && !next) next = m; }
    const tipOf = (m, tt) => { const hd = this.headOf(m, tt); if (!hd) return null; const pl = this.planeAt(m, tt), w = this.local2world(pl, hd.p), nrmV = nrm3(cross3(pl.u, pl.v)), side = dot3(nrmV, sub3(this.camPos, w)) > 0 ? 1 : -1;
      return { p: add3(w, nrmV, side * hd.lift * .004), drawing: hd.drawing }; };
    const wob = k => { const a = pen.hold, w = pen.wobble * .06; return nrm3([a[0] + n1(t * 1.1, 21) * w, a[1] + n1(t * .9, 22) * w * .5, a[2] + n1(t * 1.3, 23) * w]); };
    if (cur) { const h = tipOf(cur, t); return { tip: h.p, axis: wob(), visible: true, drawing: h.drawing }; }
    if (prev && next && next.at - prev.end < enter * 2) { const a = tipOf(prev, prev.end).p, b = tipOf(next, next.at).p, k = ease.inOut((t - prev.end) / (next.at - prev.end)); return { tip: add3(L3(a, b, k), [0, 1, 0], Math.sin(Math.PI * k) * .015), axis: wob(), visible: true, drawing: false }; }
    if (next && next.at - t < enter) { const b = tipOf(next, next.at).p, k = ease.out((t - (next.at - enter)) / enter); return { tip: add3(b, pen.hold, (1 - k) * off), axis: wob(), visible: k > 0, drawing: false }; }
    if (prev && t - prev.end < enter) { const a = tipOf(prev, prev.end).p, k = ease.in((t - prev.end) / enter); return { tip: add3(a, pen.hold, k * off), axis: wob(), visible: k < 1, drawing: false }; }
    return { visible: false };
  }
  placePencil(t) {
    const pen = this.pen; if (!pen) return; const s = this.pencilAt(t); pen.state = s; pen.obj.visible = !!s.visible;
    if (!s.visible) return; pen.obj.position.set(...s.tip); pen.obj.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), V(s.axis));
    // roll the hexagon a little as the hand turns it
    pen.obj.rotateY(n1(t * .4, 31) * .6);
  }

  // ── a frame ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  frame(t) {
    const ctx = this.ctx, W = this.W, H = this.H, S = this.S, plate = this.plate, cam = this.camAt(t);
    // camera basis first (the drawing's cards need it)
    this.setBasis(cam.pos, cam.look, cam.mm);
    this.boil = Math.floor(t * this.boilFps);
    for (const r of this.reals) if (r.track) { const s = r.track(t) || {}; if (s.pos) r.obj.position.set(...s.pos); if (s.rot) r.obj.rotation.set(...s.rot); if (s.quat) r.obj.quaternion.set(...s.quat); if (s.scale !== undefined) r.obj.scale.setScalar(s.scale); if (s.visible !== undefined) r.obj.visible = s.visible; }
    this.placePencil(t);
    // the drawing's world state (heroes) — needed for shadows before the plate renders
    const hw = this.heroes.map(h => this.heroWorld(h, t));
    this.audit = []; for (const w of hw) if (w) this.audit.push(...w.d.audit);
    this.updateShadows(t, hw);
    // the reveal
    for (const r of this.realifies) { const k = this.revealK(r, t); r.obj.visible = t >= r.at; r.u.uRC.value.set(...r.from); r.u.uRR.value = k >= 1 ? -1 : ease.in(k) * r.radius; r.u.uRS.value = r.radius * .25; r.obj.traverse(o => { if (o.isMesh) o.castShadow = k > .4; }); }
    plate.front = this.reals.filter(r => r.front && r.obj.visible && (r.front === true || (t >= r.front[0] && t <= r.front[1]))).map(r => r.obj);
    plate.render({ ...cam, shadowAt: cam.look, shadowSize: Math.min(2.5, Math.max(.35, len3(sub3(cam.look, cam.pos)) * .9)) });
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
    ctx.drawImage(plate.canvas, 0, 0);
    // the drawing, far to near, through the same lens
    const list = [];
    for (const s of this.sketches) { if (t < s.at || (s.hidden && s.hidden(t))) continue; const pl = this.planeAt(s, t); if (!pl) continue; const anc = s.anchor ? this.local2world(pl, s.anchor) : pl.o; list.push({ s, pl, z: plate.depth(anc) - s.z * .001, anc }); }
    hw.forEach(w => { if (w) list.push({ hero: w, z: plate.depth(w.at) - w.h.z * .001 }); });
    list.sort((a, b) => b.z - a.z);
    for (const it of list) it.hero ? this.drawHeroItem(it.hero, t) : this.drawSketchItem(it.s, it.pl, it.anc, t);
    plate.drawFront(ctx);
    this.drawSparkles(t);
    this.drawIris(t);
    this.post(t);
  }
  /** a painter set up for a drawing that lives at world point `anc` with px-per-unit z: S(p) = stage px of xf(p) */
  setPainter(pt, z, xf, weight = 1) {
    pt.view({ x: 0, y: 0, w: this.W / z }, this.W, this.H, z); pt.xf = p => { const s = xf(p); return s ? [(s[0] - this.W / 2) / z, (s[1] - this.H / 2) / z] : [1e6, 1e6]; };
    pt.wz = Math.max(.6, (this.mmPx || 1) * .2) * weight; pt.boil = this.boil; pt.boilAmp = clamp(.35 * (this.mmPx || 1) / 5, .2, 1.1);
  }
  /** draw into the main context, or (when the lens blurs it) via the layer with a blur */
  withBlur(anc, fn, alpha = 1, erase = null) {
    const coc = this.plate.cocAt(anc) / this.S, blur = this.off.has('dof') ? 0 : coc * .55;
    if (blur < .6 && alpha >= 1 && !erase) { this.ctx.setTransform(this.S, 0, 0, this.S, 0, 0); fn(this.pt); this.ctx.setTransform(1, 0, 0, 1, 0, 0); return; }
    const L = this.lctx; L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, this.layer.width, this.layer.height); L.setTransform(this.S, 0, 0, this.S, 0, 0); fn(this.lpt);
    if (erase) erase(L);
    // a fresh bitmap each time: a filtered drawImage of a reused canvas can show an older frame's pixels (Chromium)
    const src = this.layer.transferToImageBitmap ? this.layer.transferToImageBitmap() : this.layer;
    const ctx = this.ctx; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha; if (blur >= .6) ctx.filter = `blur(${(blur * this.S).toFixed(2)}px)`; ctx.drawImage(src, 0, 0); ctx.restore(); if (src.close) src.close();
  }
  drawSketchItem(s, pl, anc, t) {
    let a = 1; if (s.out) a *= 1 - ease.sine((t - s.out[0]) / (s.out[1] - s.out[0])); if (s.alpha) a *= s.alpha(t); if (a <= 0.003) return;
    const z = this.pxPerM(anc) * len3(pl.u); if (!(z > 0)) return; this.mmPx = this.pxPerM(anc) / 1000;
    const xf = p => this.proj(this.local2world(pl, p)), parts = this.partsOf(s, t), prog = this.progFn(s, t);
    const rv = this.realifies.find(r => r.sketch === s), k = rv ? this.revealK(rv, t) : 0;
    if (rv && k >= 1) return;
    const erase = rv && t >= rv.at ? L => { const c = this.proj(rv.from); if (!c) return; const rr = this.pxPerM(rv.from) * rv.radius * ease.in(k) * 1.05, g = L.createRadialGradient(c[0], c[1], Math.max(0, rr * .7), c[0], c[1], rr + 1);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); L.save(); L.globalCompositeOperation = 'destination-out'; L.fillStyle = g; L.beginPath(); L.arc(c[0], c[1], rr + 1, 0, Math.PI * 2); L.fill(); L.restore(); } : null;
    this.withBlur(anc, pt => { this.setPainter(pt, z, xf, s.weight); pt.parts(parts, prog); pt.xf = null; }, a, erase);
  }
  drawHeroItem(w, t) {
    const anc = w.at; this.mmPx = this.pxPerM(anc) / 1000; const z = this.pxPerM(anc) * w.m; if (!(z > 0)) return;
    const xf = p => this.proj(w.toWorld(p)); let a = 1; if (w.h.from !== null) a = clamp((t - w.h.from) / .3);
    this.withBlur(w.head, pt => { this.setPainter(pt, z, xf, 1); pt.parts(w.d.parts); pt.xf = null; }, a);
  }

  // ── shadows of the drawing on the real world ─────────────────────────────────────────────────────────────────────────
  shadowRig(key, n = 256) {
    this.srigs = this.srigs || {}; if (this.srigs[key]) return this.srigs[key];
    const cv = this.mk(n, n), tex = new T.CanvasTexture(cv); tex.minFilter = T.LinearFilter;
    const geo = new T.PlaneGeometry(1, 1), m = new T.ShaderMaterial({ vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }', fragmentShader: 'void main(){ discard; }', depthWrite: false, side: T.DoubleSide });   // casts only
    const mesh = new T.Mesh(geo, m); mesh.castShadow = true; mesh.receiveShadow = false; mesh.userData.shadowOnly = true;
    mesh.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, alphaMap: tex, alphaTest: .5 });
    // a soft contact shadow under the feet (what really sits a drawing on a surface)
    const bc = this.mk(64, 64), bx = bc.getContext('2d'), gr = bx.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(.6, 'rgba(0,0,0,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); bx.fillStyle = gr; bx.fillRect(0, 0, 64, 64);
    const blob = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: new T.CanvasTexture(bc), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, color: 0x000000, opacity: 1 }));
    blob.rotation.x = -Math.PI / 2; blob.userData.shadowOnly = true; blob.material.map.colorSpace = T.SRGBColorSpace; blob.renderOrder = 2;
    this.scene.add(mesh, blob); return (this.srigs[key] = { cv, ctx: cv.getContext('2d'), tex, mesh, blob, n });
  }
  updateShadows(t, hw) {
    const sun = this.plate.sunDir || this.plate.sunInfo.dir, sh = [sun.x, 0, sun.z], shn = len3(sh) > 1e-3 ? nrm3(sh) : [0, 0, 1];
    hw.forEach((w, i) => {
      const rig = this.shadowRig('hero' + i); rig.mesh.visible = rig.blob.visible = !!w && w.h.shadow;
      if (!w || !w.h.shadow) return;
      const H = w.H, box = { x0: -H * .6, x1: H * .6, y0: -H * 1.18, y1: H * .06 }, n = rig.n, c = rig.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, n, n); c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineWidth = n / 70; c.lineJoin = 'round';
      const sx = n / (box.x1 - box.x0), sy = n / (box.y1 - box.y0);
      for (const p of w.d.parts) { const poly = p.knock; if (poly && poly.length > 2) { c.beginPath(); poly.forEach((q, j) => { const X = (q[0] - box.x0) * sx, Y = (q[1] - box.y0) * sy; j ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.closePath(); c.fill(); }
        for (const op of p.ops) if (op.type === 'line' && op.pts.length > 1) { c.beginPath(); op.pts.forEach((q, j) => { const X = (q[0] - box.x0) * sx, Y = (q[1] - box.y0) * sy; j ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.stroke(); } }
      rig.tex.needsUpdate = true;
      // the caster faces the sun (its full silhouette falls), standing on the hero's ground point
      const wM = (box.x1 - box.x0) * w.m, hM = (box.y1 - box.y0) * w.m, yaw = Math.atan2(shn[0], shn[2]);
      rig.mesh.scale.set(wM, hM, 1); rig.mesh.rotation.set(0, yaw, 0); rig.mesh.position.set(w.at[0], w.at[1] - box.y1 * w.m + hM / 2 - 0, w.at[2]);
      const lift = Math.max(0, w.feet ? Math.min(w.feet.L[1], w.feet.R[1]) - (w.tr.ground ?? Math.min(w.feet.L[1], w.feet.R[1])) : 0);
      rig.blob.scale.set(H * .46 * w.m, H * .2 * w.m, 1); rig.blob.position.set(w.at[0], (w.tr.ground ?? w.at[1]) + .0008, w.at[2]); rig.blob.material.opacity = clamp(1 - lift / (H * w.m * .5)) * (w.tr.blob ?? 1);
    });
    for (const s of this.sketches) if (s.shadow) {
      const rig = this.shadowRig(s.name, 512), on = t >= s.at && !(s.hidden && s.hidden(t)); rig.blob.visible = false; rig.mesh.visible = on; if (!on) continue;
      const pl = this.planeAt(s, t), parts = this.partsOf(s, t), prog = this.progFn(s, t), bb = P.bbox(parts.flatMap(p => [...(p.knock || []), ...p.ops.flatMap(o => o.pts)]));
      const n = rig.n, c = rig.ctx, pad = 4, sx = n / (bb.w + pad * 2), sy = n / (bb.h + pad * 2); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, n, n); c.fillStyle = c.strokeStyle = '#fff'; c.lineWidth = Math.max(2, n / 150); c.lineJoin = 'round';
      let i = 0; for (const p of parts) { const kk = p.ops.map(() => prog(i++)); const done = kk.reduce((a, b) => a + b, 0) / (kk.length || 1);
        if (p.knock && done > .5) { c.beginPath(); p.knock.forEach((q, j) => { const X = (q[0] - bb.x0 + pad) * sx, Y = (q[1] - bb.y0 + pad) * sy; j ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.closePath(); c.fill(); }
        p.ops.forEach((op, j) => { if (op.type !== 'line' || kk[j] <= 0) return; const m = Math.max(2, Math.round(op.pts.length * kk[j])); c.beginPath(); op.pts.slice(0, m).forEach((q, jj) => { const X = (q[0] - bb.x0 + pad) * sx, Y = (q[1] - bb.y0 + pad) * sy; jj ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.stroke(); }); }
      rig.tex.needsUpdate = true;
      const ctr = this.local2world(pl, [bb.cx, bb.cy]), u = V(pl.u), v = V(pl.v), nrmV = new T.Vector3().crossVectors(u, v).normalize();
      const basis = new T.Matrix4().makeBasis(u.clone().normalize(), v.clone().normalize().negate(), nrmV.clone().negate()); rig.mesh.quaternion.setFromRotationMatrix(basis);
      rig.mesh.scale.set((bb.w + pad * 2) * u.length(), (bb.h + pad * 2) * v.length(), 1); rig.mesh.position.set(...ctr);
    }
  }

  // ── the touch turns real: a few glints at the edge ───────────────────────────────────────────────────────────────────
  drawSparkles(t) {
    const ctx = this.ctx; ctx.save(); ctx.setTransform(this.S, 0, 0, this.S, 0, 0);
    for (const r of this.realifies) { if (!r.sparkle) continue; const k = this.revealK(r, t); if (k <= 0 || k >= 1) continue;
      const c = this.proj(r.from); if (!c) continue; const R = this.pxPerM(r.from) * r.radius * ease.in(k);
      for (let i = 0; i < 26; i++) { const a = hash(i, 5) * Math.PI * 2 + t * .7, rr = R * (.85 + hash(i, 6) * .3), x = c[0] + Math.cos(a) * rr, y = c[1] + Math.sin(a) * rr * .8, s = 1 + hash(i, 7) * 2.5, al = Math.sin(Math.PI * k) * (.4 + .6 * hash(i, Math.floor(t * 12)));
        ctx.globalAlpha = al; ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }
  drawIris(t) {
    for (const ir of this.irises) {
      const k = clamp((t - ir.fill[0]) / (ir.fill[1] - ir.fill[0])); if (k <= 0) continue;
      const pl = this.planeAt(ir.sketch, t), pts = ir.pts.map(p => this.proj(this.local2world(pl, p))).filter(Boolean); if (pts.length < 3) continue;
      const ctx = this.ctx; ctx.save(); ctx.setTransform(this.S, 0, 0, this.S, 0, 0); ctx.globalAlpha = ease.inOut(k);
      ctx.beginPath(); ctx.rect(-10, -10, this.W + 20, this.H + 20); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
      ctx.fillStyle = this.paper; ctx.fill('evenodd'); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = this.tooth; ctx.fill('evenodd');
      ctx.restore();
      // the frame line stays on top of the paper
      ctx.save(); ctx.setTransform(this.S, 0, 0, this.S, 0, 0); this.mmPx = this.pxPerM(ir.centre) / 1000; const z = this.pxPerM(ir.centre) * len3(pl.u);
      this.setPainter(this.pt, z, p => this.proj(this.local2world(pl, p)), 1.4); this.pt.parts(this.partsOf(ir.sketch, t), this.progFn(ir.sketch, t)); this.pt.xf = null; ctx.restore();
    }
  }
  post(t) {
    const ctx = this.ctx, W = this.W, H = this.H, G = this.grade, off = this.off;
    ctx.setTransform(this.S, 0, 0, this.S, 0, 0);
    if (!off.has('vignette') && G.vignette) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * .42, W / 2, H / 2, Math.hypot(W, H) * .62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(22,18,14,${G.vignette})`);
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    }
    if (this.fadeIn && t < this.fadeIn) { ctx.globalAlpha = 1 - ease.sine(t / this.fadeIn); ctx.fillStyle = '#0d0c0b'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (this.fadeOut && t > this.dur - this.fadeOut && !this.irises.length) { ctx.globalAlpha = ease.sine((t - (this.dur - this.fadeOut)) / this.fadeOut); ctx.fillStyle = '#0d0c0b'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (!off.has('grain') && G.grain) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); const cw = this.canvas.width, ch = this.canvas.height, f = Math.floor(t * this.FPS), tile = this.grainTiles[f % 3], ox = Math.floor(hash(f, 1) * 256), oy = Math.floor(hash(f, 2) * 256);
      ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = G.grain; for (let y = -oy; y < ch; y += 256) for (let x = -ox; x < cw; x += 256) ctx.drawImage(tile, x, y);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }

  // ── sound from the drawing ───────────────────────────────────────────────────────────────────────────────────────────
  penSfx() {
    if (!this.sketches[0] || !this.sketches[0].alloc) this.prepare();
    const out = [], step = .5;
    for (let t = 0; t < this.dur; t += step) {
      let n = 0, pen = 0;
      for (const m of this.sketches) for (const [a, b] of m.alloc) if (a < t + step && b > t) { n++; if (m.by === 'pencil') pen = 1; }
      if (n) out.push({ t: +t.toFixed(2), type: 'pencil', d: step + .08, v: Math.min(.7, .22 + .1 * Math.sqrt(n) + pen * .18), pan: (hash(t * 10, 3) - .5) * .4 });
    }
    return out;
  }

  // ── what check.mjs reads ─────────────────────────────────────────────────────────────────────────────────────────────
  /** feet of every hero at t: [{ hero, foot, planted, world, px }] (px after the camera at t) */
  feetAt(t) {
    this.frameGeom(t); const out = [];
    for (const h of this.heroes) { const w = this.heroWorld(h, t); if (!w || !w.tr.feet) continue; for (const s of ['L', 'R']) out.push({ hero: h.name, foot: s, planted: w.tr.planted ? !!w.tr.planted[s] : true, world: w.tr.feet[s], px: this.proj(w.tr.feet[s]) }); }
    return out;
  }
  /** the hero's pose summary (to prove an idle breathes): head, hands in px */
  heroPx(t) { this.frameGeom(t); return this.heroes.map(h => { const w = this.heroWorld(h, t); return w ? { hero: h.name, head: this.proj(w.head), hand: [this.proj(w.hand.L), this.proj(w.hand.R)], top: this.proj(w.top) } : null; }); }
  /** the pencil's two ends in px at t, and whether it is drawing — a held pencil whose back end is in frame floats */
  pencilPx(t) { this.frameGeom(t); const s = this.pencilAt(t); if (!s || !s.visible) return null; return { tip: this.proj(s.tip), back: this.proj(add3(s.tip, s.axis, this.pen.len)), drawing: s.drawing }; }
  /** colours used by the drawing (the drawing stays graphite: lead, tone, paper) */
  drawnColours() { const set = new Set(); for (const s of this.sketches) for (const p of this.partsOf(s, s.at + .01)) for (const op of p.ops) set.add(op.col || 'lead'); return [...set]; }
  setBasis(pos, look, mm) { const c = this.plate.camera; c.fov = 2 * Math.atan(12 / (mm || 35)) * 180 / Math.PI; c.position.set(...pos); c.up.set(0, 1, 0); c.lookAt(...look); c.updateProjectionMatrix(); c.updateMatrixWorld(); const r = new T.Vector3().setFromMatrixColumn(c.matrixWorld, 0); r.y = 0; r.normalize(); this.camRight = r.toArray(); this.camPos = pos; }
  frameGeom(t) { const cam = this.camAt(t); this.setBasis(cam.pos, cam.look, cam.mm); return cam; }

  // ── contract ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  /** the page's lit colour: one calibration render looking straight down at the sketchbook — the drawing's paper-white
   *  (knock-outs) is that colour, so a figure drawn on the page reads as the same paper wherever it walks */
  calibratePaper() {
    if (!this.book || this.q.has('rawpaper')) return;
    const c = this.book.position, y = this.book.userData.surfaceY, save = this.plate.look.dof;
    this.plate.look.dof = false; const fr = this.plate.front; this.plate.front = [];
    this.plate.render({ pos: [c.x + .001, y + .25, c.z + .02], look: [c.x, y, c.z], mm: 50, fstop: 8, focus: .25 }); this.plate.look.dof = save; this.plate.front = fr;
    const x = this.mk(1, 1).getContext('2d', { willReadFrequently: true }); x.drawImage(this.plate.canvas, this.plate.W / 2 - .5, this.plate.H / 2 - .5, 1, 1, 0, 0, 1, 1);
    const d = x.getImageData(0, 0, 1, 1).data, hex = '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('');
    this.paperLit = hex; for (const p of [this.pt, this.lpt]) p.paper = hex;
  }
  start() {
    this.calibratePaper();
    this.prepare();
    window.seek = t => this.frame(t); window.DURATION = this.dur; window.FPS = this.FPS; window.SIZE = { W: this.W, H: this.H };
    window.runChecks = t => { this.frame(t); return [...this.rules.filter(r => { try { return !r.fn(t); } catch { return true; } }).map(r => r.name), ...new Set(this.audit || [])]; };
    window.shotAt = t => { let i = 0; while (i < this.shots.length - 1 && t >= this.shots[i + 1].start) i++; return { i, name: this.shots[i].name, lt: t - this.shots[i].start }; };
    window.film = this;
    if (this.render) { this.canvas.style.width = '100%'; this.frame(+(this.q.get('t') || 0)); }
    else { this.fit(); this.credit(); this.live(+(this.q.get('t') || 0)); }
    window.__ready = true;
  }
  credit() {
    const h = this.plate.manifest?.hdri; if (!h) return; const a = document.createElement('a'); a.href = 'https://polyhaven.com/a/' + h.id; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = `Scans: Poly Haven (CC0) — ${h.name}`; a.style.cssText = 'position:fixed;right:10px;top:8px;font:11px system-ui,sans-serif;color:#e9e1d0;opacity:.45;text-decoration:none'; document.body.appendChild(a);
  }
  fit() { const s = this.canvas.style; s.position = 'fixed'; s.left = '50%'; s.top = '50%'; s.transform = 'translate(-50%,-50%)'; s.width = `min(100vw, ${16 / 9 * 100}vh)`; s.height = 'auto'; }
  live(from = 0) {
    let t0 = performance.now(), base = clamp(from, 0, this.dur - .01), paused = false, ac = null, src = null, buffer = null, loading = false;
    const st = document.createElement('style'); st.textContent = `.pla-ui{position:fixed;left:12px;right:12px;bottom:10px;display:flex;gap:10px;align-items:center;font:13px system-ui,sans-serif;color:#e9e1d0;opacity:.25;transition:opacity .3s}.pla-ui:hover{opacity:1}.pla-ui button{background:#2b241c;color:#e9e1d0;border:1px solid #5a4c3a;border-radius:4px;padding:3px 9px;cursor:pointer;font:inherit}.pla-bar{flex:1;height:6px;background:#3a3128;border-radius:3px;cursor:pointer;position:relative}.pla-bar i{position:absolute;left:0;top:0;bottom:0;background:#d8b878;border-radius:3px}`;
    document.head.appendChild(st);
    const ui = document.createElement('div'); ui.className = 'pla-ui';
    ui.innerHTML = `<button data-k="play">❚❚</button>${this.score ? '<button data-k="snd">♪ sound</button>' : ''}<div class="pla-bar"><i></i></div><span class="tm"></span>`;
    document.body.appendChild(ui);
    const bar = ui.querySelector('.pla-bar'), fill = bar.querySelector('i'), tm = ui.querySelector('.tm'), pb = ui.querySelector('[data-k=play]'), sb = ui.querySelector('[data-k=snd]');
    const now = () => paused ? base : (ac && src ? (ac.currentTime - this._acStart) : base + (performance.now() - t0) / 1000) % this.dur;
    const stopAudio = () => { if (src) { try { src.stop(); } catch { } src = null; } };
    const playAudio = at => { if (!buffer || paused) return; stopAudio(); src = ac.createBufferSource(); src.buffer = buffer; src.loop = true; src.connect(ac.destination); src.start(0, at % this.dur); this._acStart = ac.currentTime - at % this.dur; };
    const go = t => { base = (t % this.dur + this.dur) % this.dur; t0 = performance.now(); if (src) playAudio(base); };
    const toggle = () => { if (paused) { paused = false; go(base); if (buffer) playAudio(base); } else { base = now(); paused = true; stopAudio(); } pb.textContent = paused ? '▶' : '❚❚'; };
    pb.onclick = e => { e.stopPropagation(); toggle(); };
    if (sb) sb.onclick = async e => {
      e.stopPropagation();
      if (src) { base = now(); stopAudio(); t0 = performance.now(); sb.textContent = '♪ sound'; return; }
      if (loading) return; loading = true; sb.textContent = '♪ …';
      ac = ac || new AudioContext();
      if (!buffer) { await new Promise(r => setTimeout(r, 30)); const sr = ac.sampleRate, [L, R] = this.renderScore(this.score, sr, this.dur); buffer = ac.createBuffer(2, L.length, sr); buffer.copyToChannel(L, 0); buffer.copyToChannel(R, 1); }
      loading = false; sb.textContent = '♪ on'; const at = now(); paused = false; pb.textContent = '❚❚'; playAudio(at);
    };
    const scrub = e => { const r = bar.getBoundingClientRect(); go(clamp((e.clientX - r.left) / r.width) * this.dur); if (paused) this.frame(base); };
    bar.onpointerdown = e => { e.stopPropagation(); bar.setPointerCapture(e.pointerId); scrub(e); bar.onpointermove = scrub; };
    bar.onpointerup = () => { bar.onpointermove = null; };
    this.canvas.onclick = toggle;
    addEventListener('keydown', e => {
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { const t = now() + (e.code === 'ArrowRight' ? 1 : -1); paused ? (base = (t + this.dur) % this.dur, this.frame(base)) : go(t); }
    });
    let lastF = -1, busy = false;
    const loop = () => {
      const t = now(), fi = Math.floor(t * this.FPS);
      if (!paused && fi !== lastF && !busy) { busy = true; this.frame(fi / this.FPS); lastF = fi; busy = false; }
      fill.style.width = (t / this.dur * 100) + '%'; tm.textContent = `${t.toFixed(1)} / ${this.dur.toFixed(0)} s · ${window.shotAt(t).name}`;
      requestAnimationFrame(loop);
    };
    loop();
  }
}
export { buildPencil, buildTable, buildSketchbook, buildGround };
